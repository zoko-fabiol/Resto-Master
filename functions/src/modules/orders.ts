import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles, consumeSupervisorToken } from '../auth.js';
import { CreateOrderRequest, AddItemsToOrderRequest, UserRole } from '../types.js';

const ROLE_MAX_DISCOUNT: Record<UserRole, number> = {
  direction: 100,
  finance: 20,
  manager: 15,
  comptable: 10,
  caisse: 5,
  serveur: 5,
  cuisine: 0,
  bar: 0,
  stock: 0,
  rh: 0,
  auditeur: 0,
  tablette: 0,
  aucun: 0,
};

/**
 * Générateur atomique et séquentiel de numéro de commande : CMD-AAAAMMJJ-NNNN
 */
async function generateOrderNumber(restaurantId: string): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}${mm}${dd}`;

  const counterRef = db.collection('_counters').doc(`orders_${restaurantId}_${dateKey}`);

  const nextSeq = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists ? (snap.data()!.seq as number) || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return `CMD-${dateKey}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Calcul et validation des lignes de commande en relisant les prix du catalogue
 */
async function resolveAndCalculateItems(
  items: Array<{ productId: string; quantity: number; notes?: string; options?: Record<string, unknown>; destination?: 'cuisine' | 'bar' }>
) {
  if (!items || items.length === 0) {
    throw new HttpsError('invalid-argument', 'Une commande doit comporter au moins un article.');
  }

  const resolvedItems = [];
  let subtotal = 0;

  for (const item of items) {
    if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new HttpsError('invalid-argument', 'Quantité d\'article invalide.');
    }

    const prodSnap = await db.collection('products').doc(item.productId).get();
    if (!prodSnap.exists) {
      throw new HttpsError('not-found', `Produit ${item.productId} introuvable dans le catalogue.`);
    }

    const prodData = prodSnap.data()!;
    if (prodData.available === false) {
      throw new HttpsError('failed-precondition', `Le produit "${prodData.name}" est actuellement indisponible.`);
    }

    const unitPrice = Math.round(Number(prodData.price) || 0);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    const destination: 'cuisine' | 'bar' =
      item.destination ||
      (prodData.category === 'boissons' || prodData.category === 'bar' ? 'bar' : 'cuisine');

    resolvedItems.push({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: prodData.name as string,
      price: unitPrice,
      quantity: item.quantity,
      total: lineTotal,
      notes: item.notes || '',
      options: item.options || {},
      status: 'en_attente',
      destination,
      ingredients: prodData.ingredients || prodData.recipeIngredients || [],
    });
  }

  return { resolvedItems, subtotal };
}

/**
 * Création d'une commande certifiée par le serveur
 */
export async function handleCreateOrder(request: CallableRequest<CreateOrderRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'serveur', 'caisse', 'tablette']);

  const data = request.data;
  const restaurantId = data.restaurantId || caller.outlets[0] || 'default-restaurant';

  // 1. Validation de la remise demandée
  const discountPercent = Math.min(100, Math.max(0, Number(data.discountPercentRequested) || 0));
  const maxAllowedDiscount = ROLE_MAX_DISCOUNT[caller.role] || 0;

  if (discountPercent > maxAllowedDiscount) {
    if (!data.supervisorToken) {
      throw new HttpsError(
        'permission-denied',
        `Une remise de ${discountPercent}% dépasse le plafond de votre rôle (${maxAllowedDiscount}%). Jeton superviseur requis.`
      );
    }
    await consumeSupervisorToken(data.supervisorToken, 'apply_discount');
  }

  // 2. Relecture des prix réels du catalogue et calcul des montants
  const { resolvedItems, subtotal } = await resolveAndCalculateItems(data.items);

  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;

  // Récupération des paramètres fiscaux de l'établissement
  const settingsSnap = await db.collection('settings').doc(restaurantId).get();
  const settings = settingsSnap.exists ? settingsSnap.data()! : {};
  const isTaxApplicable = settings.assujettiTVA !== false;
  const vatRate = isTaxApplicable ? (Number(settings.taxRate) || 19.25) : 0; // Cameroun: 17.5% + CAC 10% = 19.25%

  const taxAmount = isTaxApplicable ? Math.round((subtotalAfterDiscount * vatRate) / 100) : 0;
  const grandTotal = subtotalAfterDiscount + taxAmount;

  // 3. Attribution du numéro de commande serveur continu
  const orderNumber = await generateOrderNumber(restaurantId);
  const orderId = crypto.randomUUID();

  const newOrder = {
    id: orderId,
    orderNumber,
    restaurantId,
    type: data.type || 'sur_place',
    tableId: data.tableId || null,
    tableName: data.tableName || null,
    customerId: data.customerId || null,
    customerName: data.customerName || null,
    guestCount: data.guestCount || 1,
    items: resolvedItems,
    subtotal: subtotalAfterDiscount,
    rawSubtotal: subtotal,
    tax: taxAmount,
    taxRate: vatRate,
    discount: discountAmount,
    discountPercent,
    total: grandTotal,
    status: 'nouveau',
    paymentStatus: 'non_paye',
    totalPaid: 0,
    paidAmount: 0,
    serverName: caller.name,
    serverUid: caller.uid,
    serverRole: caller.role,
    notes: data.notes || '',
    isProforma: data.isProforma === true,
    companyBillingName: data.companyBillingName || null,
    companyBillingNiu: data.companyBillingNiu || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // 4. Écriture atomique Firestore (Création commande + Statut Table + Déduction Stock)
  await db.runTransaction(async (transaction) => {
    // Écrire la commande
    transaction.set(db.collection('orders').doc(orderId), newOrder);

    // Si sur place avec table : mettre à jour le statut de la table
    if (data.tableId) {
      const tableRef = db.collection('tables').doc(data.tableId);
      transaction.update(tableRef, {
        status: 'en_service',
        currentOrderId: orderId,
        assignedServerName: caller.name,
        guestsCount: data.guestCount || 1,
        timeOccupied: FieldValue.serverTimestamp(),
      });
    }

    // Déduction des stocks selon les fiches techniques des ingrédients
    for (const item of resolvedItems) {
      if (item.ingredients && Array.isArray(item.ingredients)) {
        for (const ing of item.ingredients) {
          if (ing.stockItemId && ing.quantityRequired) {
            const consumedQty = ing.quantityRequired * item.quantity;
            const stockRef = db.collection('stock_items').doc(ing.stockItemId);
            const stockSnap = await transaction.get(stockRef);
            if (stockSnap.exists) {
              const currentStock = Number(stockSnap.data()!.currentQuantity) || 0;
              const newQty = Math.max(0, Math.round((currentStock - consumedQty) * 100) / 100);
              transaction.update(stockRef, {
                currentQuantity: newQty,
                lastUpdated: FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
    }
  });

  return { success: true, order: newOrder };
}

/**
 * Ajout d'articles à une commande existante
 */
export async function handleAddItemsToOrder(request: CallableRequest<AddItemsToOrderRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'serveur', 'caisse']);

  const { orderId, items, guestCount } = request.data;
  if (!orderId || !items || items.length === 0) {
    throw new HttpsError('invalid-argument', 'orderId et articles requis.');
  }

  const orderRef = db.collection('orders').doc(orderId);

  return await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      throw new HttpsError('not-found', 'Commande introuvable.');
    }

    const orderData = orderSnap.data()!;
    if (orderData.status === 'payee' || orderData.status === 'annulee') {
      throw new HttpsError('failed-precondition', `Impossible d'ajouter des articles à une commande ${orderData.status}.`);
    }

    const { resolvedItems, subtotal: additionalSubtotal } = await resolveAndCalculateItems(items);

    const existingItems = orderData.items || [];
    const updatedItems = [...existingItems, ...resolvedItems];

    const discountPercent = Number(orderData.discountPercent) || 0;
    const additionalDiscount = Math.round((additionalSubtotal * discountPercent) / 100);
    const newSubtotal = (Number(orderData.subtotal) || 0) + (additionalSubtotal - additionalDiscount);

    const vatRate = Number(orderData.taxRate) || 0;
    const newTax = vatRate > 0 ? Math.round((newSubtotal * vatRate) / 100) : 0;
    const newTotal = newSubtotal + newTax;

    const updates: Record<string, unknown> = {
      items: updatedItems,
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (guestCount && guestCount > 0) {
      updates.guestCount = guestCount;
    }

    transaction.update(orderRef, updates);

    // Déduction des stocks selon les fiches techniques des ingrédients pour les nouveaux articles
    for (const item of resolvedItems) {
      if (item.ingredients && Array.isArray(item.ingredients)) {
        for (const ing of item.ingredients) {
          if (ing.stockItemId && ing.quantityRequired) {
            const consumedQty = ing.quantityRequired * item.quantity;
            const stockRef = db.collection('stock_items').doc(ing.stockItemId);
            const stockSnap = await transaction.get(stockRef);
            if (stockSnap.exists) {
              const currentStock = Number(stockSnap.data()!.currentQuantity) || 0;
              const newQty = Math.max(0, Math.round((currentStock - consumedQty) * 100) / 100);
              transaction.update(stockRef, {
                currentQuantity: newQty,
                lastUpdated: FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
    }

    return {
      success: true,
      orderId,
      total: newTotal,
      itemsCount: updatedItems.length,
    };
  });
}
