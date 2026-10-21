import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';
import { IssueInvoiceRequest } from '../types.js';
import { getDoualaDateParts } from '../utils/timezone.js';

/**
 * Calcul du hachage cryptographique SHA-256 chaîné
 */
function computeInvoiceHash(payload: string, previousHash: string): string {
  return crypto.createHash('sha256').update(`${previousHash}|${payload}`).digest('hex');
}

/**
 * Numérotation continue et chronologique de facture par exercice fiscal serveur
 */
async function getNextInvoiceSequence(restaurantId: string, fiscalYear: number): Promise<{ seq: number; invoiceNumber: string }> {
  const counterRef = db.collection('_counters').doc(`invoices_${restaurantId}_${fiscalYear}`);

  const nextSeq = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists ? (snap.data()!.seq as number) || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { seq: next, fiscalYear, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  const invoiceNumber = `FAC-${fiscalYear}-${String(nextSeq).padStart(5, '0')}`;
  return { seq: nextSeq, invoiceNumber };
}

export async function handleIssueInvoice(request: CallableRequest<IssueInvoiceRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'caisse', 'comptable', 'finance']);

  const { orderId, clientInfo } = request.data;
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'orderId requis pour émettre une facture certifiée.');
  }

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Commande introuvable.');
  }

  const orderData = orderSnap.data()!;
  if (orderData.status !== 'payee') {
    throw new HttpsError('failed-precondition', 'Une facture certifiée ne peut être émise que pour une commande soldée.');
  }

  // Vérifier si une facture a déjà été émise pour cette commande
  const existingInvoices = await db.collection('invoices').where('orderId', '==', orderId).get();
  if (!existingInvoices.empty) {
    const existing = existingInvoices.docs[0].data();
    return {
      success: true,
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      alreadyIssued: true,
    };
  }

  const restaurantId = orderData.restaurantId || caller.outlets[0];
  if (!restaurantId || (!caller.outlets.includes('*') && !caller.outlets.includes(restaurantId))) {
    throw new HttpsError('permission-denied', 'Accès refusé pour cet établissement.');
  }
  const fiscalYear = getDoualaDateParts().year; // Exercice selon Africa/Douala

  // Récupérer le hash de la dernière facture pour le chaînage fiscal DGI
  const lastInvoiceSnap = await db
    .collection('invoices')
    .where('restaurantId', '==', restaurantId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const previousHash = !lastInvoiceSnap.empty && lastInvoiceSnap.docs[0].data().chainHash
    ? (lastInvoiceSnap.docs[0].data().chainHash as string)
    : 'GENESIS-INITIAL-HASH-RESTOMASTER-2026';

  const { seq, invoiceNumber } = await getNextInvoiceSequence(restaurantId, fiscalYear);
  const invoiceId = crypto.randomUUID();

  const amountHT = Number(orderData.subtotal) || 0;
  const amountTVA = Number(orderData.tax) || 0;
  const amountTTC = Number(orderData.total) || (amountHT + amountTVA);

  // Payload à sceller cryptographiquement
  const sealPayload = JSON.stringify({
    invoiceNumber,
    restaurantId,
    fiscalYear,
    seq,
    orderId,
    amountHT,
    amountTVA,
    amountTTC,
    clientName: clientInfo?.name || orderData.customerName || 'Client Comptoir',
    clientNiu: clientInfo?.niu || '',
  });

  const chainHash = computeInvoiceHash(sealPayload, previousHash);

  const invoiceDoc = {
    id: invoiceId,
    invoiceNumber,
    orderId,
    restaurantId,
    fiscalYear,
    sequence: seq,
    type: 'facture_vente',
    client: {
      name: clientInfo?.name || orderData.customerName || 'Client Comptoir',
      niu: clientInfo?.niu || orderData.companyBillingNiu || '',
      rccm: clientInfo?.rccm || '',
      address: clientInfo?.address || '',
      phone: clientInfo?.phone || '',
      regime: clientInfo?.regime || 'reel',
    },
    items: orderData.items || [],
    subtotalHT: amountHT,
    taxRate: orderData.taxRate || 19.25,
    taxAmount: amountTVA,
    totalTTC: amountTTC,
    chainHash,
    previousHash,
    issuedBy: caller.name,
    issuedByUid: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
  };

  // Enregistrement dans invoices et fiscal_journal (immuables)
  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection('invoices').doc(invoiceId), invoiceDoc);

    const journalId = crypto.randomUUID();
    transaction.set(db.collection('fiscal_journal').doc(journalId), {
      id: journalId,
      invoiceId,
      invoiceNumber,
      orderId,
      restaurantId,
      fiscalYear,
      amountHT,
      amountTVA,
      amountTTC,
      chainHash,
      previousHash,
      timestamp: FieldValue.serverTimestamp(),
    });

    transaction.update(orderRef, {
      invoiceId,
      invoiceNumber,
      invoicedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    invoiceId,
    invoiceNumber,
    chainHash,
    totalTTC: amountTTC,
  };
}
