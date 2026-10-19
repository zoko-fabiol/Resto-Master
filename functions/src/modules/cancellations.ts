import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles, consumeSupervisorToken } from '../auth.js';
import { CancelOrderRequest, VoidItemRequest } from '../types.js';

export async function handleCancelOrder(request: CallableRequest<CancelOrderRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'serveur', 'caisse']);

  const { orderId, reason, supervisorToken, actionAfterCancel = 'restock' } = request.data;
  if (!orderId || !reason || !supervisorToken) {
    throw new HttpsError('invalid-argument', 'orderId, motif et jeton superviseur requis.');
  }

  // 1. Validation stricte du jeton superviseur
  const supervisor = await consumeSupervisorToken(supervisorToken, 'cancel_order', orderId);

  const orderRef = db.collection('orders').doc(orderId);

  return await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Commande introuvable.');
    }

    const orderData = orderSnap.data()!;
    if (orderData.status === 'annulee') {
      throw new HttpsError('failed-precondition', 'Cette commande est déjà annulée.');
    }

    const wasPaid = (Number(orderData.totalPaid) || 0) > 0;
    const paidAmount = Number(orderData.totalPaid) || 0;

    // 2. Si des paiements en espèces avaient eu lieu : contre-passation en caisse
    const payments = (orderData.payments as Array<{ method: string; amount: number; cashSessionId?: string }>) || [];
    for (const p of payments) {
      if (p.method === 'especes' && p.cashSessionId) {
        const sessionRef = db.collection('cash_sessions').doc(p.cashSessionId);
        const sessionSnap = await transaction.get(sessionRef);
        if (sessionSnap.exists) {
          const sData = sessionSnap.data()!;
          const reversalId = crypto.randomUUID();
          transaction.set(db.collection('cash_movements').doc(reversalId), {
            id: reversalId,
            sessionId: p.cashSessionId,
            restaurantId: orderData.restaurantId,
            type: 'decaissement_annulation',
            amount: p.amount,
            reason: `Remboursement suite annulation Bon ${orderData.orderNumber} : ${reason}`,
            user: caller.name,
            supervisor: supervisor.supervisorName,
            referenceDocId: orderId,
            timestamp: FieldValue.serverTimestamp(),
          });

          transaction.update(sessionRef, {
            totalCashOut: (Number(sData.totalCashOut) || 0) + p.amount,
            expectedTotal: (Number(sData.expectedTotal) || 0) - p.amount,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // 3. Si des points de fidélité avaient été attribués : déduction
    if (orderData.customerId && orderData.loyaltyPointsAwarded) {
      const customerRef = db.collection('customers').doc(orderData.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (customerSnap.exists) {
        const cData = customerSnap.data()!;
        const pointsToRevert = Math.floor((Number(orderData.total) || 0) / 1000);
        transaction.update(customerRef, {
          loyaltyPoints: Math.max(0, (Number(cData.loyaltyPoints) || 0) - pointsToRevert),
          totalSpent: Math.max(0, (Number(cData.totalSpent) || 0) - (Number(orderData.total) || 0)),
        });
      }
    }

    // 4. Gestion des stocks : remise en stock ou perte
    const items = (orderData.items as Array<{ quantity: number; ingredients?: Array<{ stockItemId: string; quantityRequired: number }> }>) || [];
    for (const it of items) {
      if (it.ingredients && Array.isArray(it.ingredients)) {
        for (const ing of it.ingredients) {
          if (ing.stockItemId && ing.quantityRequired) {
            const consumedQty = ing.quantityRequired * it.quantity;
            const stockRef = db.collection('stock_items').doc(ing.stockItemId);
            const stockSnap = await transaction.get(stockRef);
            if (stockSnap.exists) {
              const currentStock = Number(stockSnap.data()!.currentQuantity) || 0;
              if (actionAfterCancel === 'restock') {
                transaction.update(stockRef, {
                  currentQuantity: Math.round((currentStock + consumedQty) * 100) / 100,
                  lastUpdated: FieldValue.serverTimestamp(),
                });
              }
            }
          }
        }
      }
    }

    // 5. Si déjà facturée : émission d'une facture d'avoir
    let creditNoteId: string | null = null;
    if (wasPaid) {
      creditNoteId = crypto.randomUUID();
      transaction.set(db.collection('invoices').doc(creditNoteId), {
        id: creditNoteId,
        invoiceNumber: `AVOIR-${orderData.orderNumber}`,
        originalOrderId: orderId,
        type: 'facture_avoir',
        amount: -paidAmount,
        reason,
        issuedBy: caller.name,
        supervisorName: supervisor.supervisorName,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    // 6. Marquer la commande comme annulée
    transaction.update(orderRef, {
      status: 'annulee',
      cancellationReason: reason,
      cancelledBy: caller.name,
      cancelledBySupervisor: supervisor.supervisorName,
      cancelledAt: FieldValue.serverTimestamp(),
      actionAfterCancel,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 7. Libérer la table si occupée
    if (orderData.tableId) {
      const tableRef = db.collection('tables').doc(orderData.tableId);
      transaction.update(tableRef, {
        status: 'libre',
        currentOrderId: null,
      });
    }

    // 8. Enregistrer dans la collection immuable cancellation_logs
    const cancellationLogId = crypto.randomUUID();
    transaction.set(db.collection('cancellation_logs').doc(cancellationLogId), {
      id: cancellationLogId,
      orderId,
      orderNumber: orderData.orderNumber,
      amount: orderData.total,
      paidAmount,
      reason,
      requesterName: caller.name,
      requesterRole: caller.role,
      supervisorUid: supervisor.supervisorUid,
      supervisorName: supervisor.supervisorName,
      supervisorRole: supervisor.supervisorRole,
      actionAfterCancel,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 9. Enregistrer dans audit_logs
    const auditId = crypto.randomUUID();
    transaction.set(db.collection('audit_logs').doc(auditId), {
      action: 'Annulation Commande Validée',
      module: 'Commandes',
      details: `Bon ${orderData.orderNumber} (${orderData.total} FCFA) annulé. Motif: ${reason}. Autorisé par ${supervisor.supervisorName}`,
      entityId: orderId,
      restaurantId: orderData.restaurantId || null,
      userName: caller.name,
      userRole: caller.role,
      userId: caller.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId,
      creditNoteId,
      status: 'annulee',
    };
  });
}

export async function handleVoidItem(request: CallableRequest<VoidItemRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'serveur', 'caisse']);

  const { orderId, itemIndex, reason, supervisorToken, actionAfterCancel = 'restock' } = request.data;
  if (!orderId || itemIndex === undefined || !reason || !supervisorToken) {
    throw new HttpsError('invalid-argument', 'orderId, itemIndex, motif et jeton superviseur requis.');
  }

  const supervisor = await consumeSupervisorToken(supervisorToken, 'void_item', orderId);

  const orderRef = db.collection('orders').doc(orderId);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Commande introuvable.');

    const data = snap.data()!;
    if (data.status === 'payee' || data.status === 'annulee') {
      throw new HttpsError('failed-precondition', 'Impossible d\'annuler une ligne sur une commande soldée ou annulée.');
    }

    const items = data.items || [];
    if (itemIndex < 0 || itemIndex >= items.length) {
      throw new HttpsError('out-of-range', 'Indice d\'article invalide.');
    }

    const [removedItem] = items.splice(itemIndex, 1);

    // Recalcul des montants serveur
    let subtotal = 0;
    for (const it of items) {
      subtotal += (Number(it.price) || 0) * (Number(it.quantity) || 1);
    }

    const discountPercent = Number(data.discountPercent) || 0;
    const discount = Math.round((subtotal * discountPercent) / 100);
    const subtotalAfterDiscount = subtotal - discount;

    const vatRate = Number(data.taxRate) || 0;
    const tax = vatRate > 0 ? Math.round((subtotalAfterDiscount * vatRate) / 100) : 0;
    const total = subtotalAfterDiscount + tax;

    // Remise en stock si demandée
    if (actionAfterCancel === 'restock' && removedItem.ingredients) {
      for (const ing of removedItem.ingredients) {
        if (ing.stockItemId && ing.quantityRequired) {
          const qty = ing.quantityRequired * (removedItem.quantity || 1);
          const stockRef = db.collection('stock_items').doc(ing.stockItemId);
          const sSnap = await transaction.get(stockRef);
          if (sSnap.exists) {
            const currentStock = Number(sSnap.data()!.currentQuantity) || 0;
            transaction.update(stockRef, {
              currentQuantity: Math.round((currentStock + qty) * 100) / 100,
              lastUpdated: FieldValue.serverTimestamp(),
            });
          }
        }
      }
    }

    transaction.update(orderRef, {
      items,
      subtotal: subtotalAfterDiscount,
      tax,
      total,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Journalisation d'audit
    const auditId = crypto.randomUUID();
    transaction.set(db.collection('audit_logs').doc(auditId), {
      action: 'Ligne Commande Annulée (Void)',
      module: 'Commandes',
      details: `Article "${removedItem.productName}" retiré de ${data.orderNumber}. Motif: ${reason}. Autorisé par ${supervisor.supervisorName}`,
      entityId: orderId,
      restaurantId: data.restaurantId || null,
      userName: caller.name,
      userRole: caller.role,
      userId: caller.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      orderId,
      newTotal: total,
      remainingItemsCount: items.length,
    };
  });
}
