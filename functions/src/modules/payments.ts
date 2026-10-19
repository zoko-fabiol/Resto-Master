import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';
import { RecordPaymentRequest } from '../types.js';

export async function handleRecordPayment(request: CallableRequest<RecordPaymentRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'caisse', 'finance']);

  const { orderId, amount, method, cashSessionId, idempotencyKey, cashGiven, notes } = request.data;

  // 1. Validation de l'idempotence
  if (!idempotencyKey) {
    throw new HttpsError('invalid-argument', 'Une clé d\'idempotence (UUID) est obligatoire pour sécuriser le paiement.');
  }

  const idempotencyRef = db.collection('_idempotency_keys').doc(idempotencyKey);
  const existingIdempotency = await idempotencyRef.get();
  if (existingIdempotency.exists) {
    // Paiement déjà exécuté précédemment (ex: double-clic de l'utilisateur)
    return existingIdempotency.data()!.response;
  }

  // 2. Validation du montant (strictement entier et positif, FCFA)
  const paymentAmount = Math.round(Number(amount));
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new HttpsError('invalid-argument', 'Le montant du paiement doit être supérieur à zéro.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const paymentId = crypto.randomUUID();

  const result = await db.runTransaction(async (transaction) => {
    // 3. Relecture de la commande
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Commande introuvable.');
    }

    const orderData = orderSnap.data()!;
    if (orderData.status === 'annulee') {
      throw new HttpsError('failed-precondition', 'Impossible d\'encaisser une commande annulée.');
    }

    const existingPayments = (orderData.payments as Array<{ amount: number }>) || [];
    const totalPaidSoFar = existingPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const orderTotal = Math.round(Number(orderData.total) || 0);
    const remainingToPay = orderTotal - totalPaidSoFar;

    // Refus strict si le montant dépasse le reste à payer (plus de tolérance 1 FCFA codée en dur)
    if (paymentAmount > remainingToPay) {
      throw new HttpsError(
        'failed-precondition',
        `Le montant (${paymentAmount} FCFA) dépasse le reste à payer exact (${remainingToPay} FCFA).`
      );
    }

    // 4. Si paiement en espèces : validation stricte d'une session de caisse ouverte
    let sessionRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null = null;
    let currentSessionData: FirebaseFirestore.DocumentData | null = null;
    if (method === 'especes') {
      if (!cashSessionId) {
        throw new HttpsError(
          'failed-precondition',
          'Une session de caisse active est obligatoire pour tout encaissement en espèces.'
        );
      }
      sessionRef = db.collection('cash_sessions').doc(cashSessionId);
      const sessionSnap = await transaction.get(sessionRef);
      if (!sessionSnap.exists) {
        throw new HttpsError('not-found', 'Session de caisse introuvable.');
      }
      currentSessionData = sessionSnap.data()!;
      if (currentSessionData.status !== 'ouverte') {
        throw new HttpsError('failed-precondition', 'La session de caisse indiquée est déjà clôturée.');
      }
    }

    const newPayment = {
      id: paymentId,
      orderId,
      amount: paymentAmount,
      method,
      cashGiven: cashGiven ? Math.round(Number(cashGiven)) : paymentAmount,
      changeDue: cashGiven ? Math.max(0, Math.round(Number(cashGiven)) - paymentAmount) : 0,
      timestamp: new Date().toISOString(),
      processedBy: caller.name,
      processedByUid: caller.uid,
      processedByRole: caller.role,
      cashSessionId: cashSessionId || null,
      notes: notes || '',
    };

    const updatedPayments = [...existingPayments, newPayment];
    const newTotalPaid = totalPaidSoFar + paymentAmount;
    const isFullyPaid = newTotalPaid >= orderTotal;

    // Mise à jour de la commande
    transaction.update(orderRef, {
      payments: updatedPayments,
      totalPaid: newTotalPaid,
      status: isFullyPaid ? 'payee' : 'partiellement_payee',
      paidAt: isFullyPaid ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Libération de la table si la commande est soldée
    if (isFullyPaid && orderData.tableId) {
      const tableRef = db.collection('tables').doc(orderData.tableId);
      transaction.update(tableRef, {
        status: 'a_nettoyer',
        currentOrderId: null,
      });
    }

    // Enregistrement du mouvement de caisse si espèces
    if (method === 'especes' && sessionRef && currentSessionData) {
      const cashMovementId = crypto.randomUUID();
      const cashMovement = {
        id: cashMovementId,
        sessionId: cashSessionId,
        restaurantId: orderData.restaurantId || currentSessionData.restaurantId,
        type: 'encaissement_vente',
        amount: paymentAmount,
        reason: `Règlement espèces Bon ${orderData.orderNumber}`,
        user: caller.name,
        userUid: caller.uid,
        referenceDocId: orderId,
        timestamp: FieldValue.serverTimestamp(),
      };
      transaction.set(db.collection('cash_movements').doc(cashMovementId), cashMovement);

      transaction.update(sessionRef, {
        totalCashIn: (Number(currentSessionData.totalCashIn) || 0) + paymentAmount,
        expectedTotal: (Number(currentSessionData.expectedTotal) || 0) + paymentAmount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Mise à jour de la fidélité client une seule fois à la clôture de la commande
    if (isFullyPaid && orderData.customerId && !orderData.loyaltyPointsAwarded) {
      const customerRef = db.collection('customers').doc(orderData.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (customerSnap.exists) {
        const custData = customerSnap.data()!;
        const earnedPoints = Math.floor(orderTotal / 1000); // 1 pt par 1 000 FCFA
        transaction.update(customerRef, {
          loyaltyPoints: (Number(custData.loyaltyPoints) || 0) + earnedPoints,
          totalSpent: (Number(custData.totalSpent) || 0) + orderTotal,
          totalVisits: (Number(custData.totalVisits) || 0) + 1,
          lastVisitDate: FieldValue.serverTimestamp(),
        });
        transaction.update(orderRef, { loyaltyPointsAwarded: true });
      }
    }

    // Journalisation d'audit serveur
    const auditId = crypto.randomUUID();
    transaction.set(db.collection('audit_logs').doc(auditId), {
      action: 'Encaissement Commande',
      module: 'Caisse',
      details: `Paiement de ${paymentAmount} FCFA (${method}) enregistré pour ${orderData.orderNumber} (Reste: ${orderTotal - newTotalPaid} FCFA)`,
      entityId: orderId,
      restaurantId: orderData.restaurantId || null,
      userName: caller.name,
      userRole: caller.role,
      userId: caller.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    const responsePayload = {
      success: true,
      paymentId,
      orderId,
      amountPaid: paymentAmount,
      totalPaid: newTotalPaid,
      remainingToPay: Math.max(0, orderTotal - newTotalPaid),
      isFullyPaid,
    };

    // Mémoriser la réponse dans la clé d'idempotence
    transaction.set(idempotencyRef, {
      idempotencyKey,
      response: responsePayload,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return responsePayload;
  });

  return result;
}
