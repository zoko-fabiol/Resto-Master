import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';
import { OpenCashSessionRequest, CloseCashSessionRequest } from '../types.js';
import { getDoualaDateKey } from '../utils/timezone.js';

const DEFAULT_VARIANCE_THRESHOLD = 500; // 500 FCFA seuil de justification obligatoire

/**
 * Générateur séquentiel continu de numéros de rapport Z et X
 */
async function generateZSequence(restaurantId: string): Promise<string> {
  const dateKey = getDoualaDateKey();

  const counterRef = db.collection('_counters').doc(`z_reports_${restaurantId}_${dateKey}`);

  const nextSeq = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists ? (snap.data()!.seq as number) || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { seq: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });

  return `Z-${dateKey}-${String(nextSeq).padStart(3, '0')}`;
}

export async function handleOpenCashSession(request: CallableRequest<OpenCashSessionRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'caisse']);

  const { restaurantId, registerId, terminalId, initialFloat, notes } = request.data;
  if (!restaurantId || !registerId) {
    throw new HttpsError('invalid-argument', 'restaurantId et registerId requis.');
  }

  const floatAmount = Math.max(0, Math.round(Number(initialFloat) || 0));

  // Vérifier qu'il n'y a pas déjà une session active ouverte sur cette caisse ou terminal
  const openSessionsSnap = await db
    .collection('cash_sessions')
    .where('restaurantId', '==', restaurantId)
    .where('registerId', '==', registerId)
    .where('status', '==', 'ouverte')
    .get();

  if (!openSessionsSnap.empty) {
    const activeDoc = openSessionsSnap.docs[0].data();
    throw new HttpsError(
      'failed-precondition',
      `Une session de caisse est déjà active (${activeDoc.id}) ouverte par ${activeDoc.openedBy}.`
    );
  }

  const sessionId = crypto.randomUUID();
  const newSession = {
    id: sessionId,
    restaurantId,
    registerId,
    terminalId: terminalId || 'default-terminal',
    openedBy: caller.name,
    openedByUid: caller.uid,
    openedByRole: caller.role,
    openedAt: FieldValue.serverTimestamp(),
    initialFloat: floatAmount,
    totalCashIn: 0,
    totalCashOut: 0,
    expectedTotal: floatAmount,
    status: 'ouverte',
    notes: notes || '',
  };

  await db.collection('cash_sessions').doc(sessionId).set(newSession);

  // Mouvement initial de fond de caisse
  const movementId = crypto.randomUUID();
  await db.collection('cash_movements').doc(movementId).set({
    id: movementId,
    sessionId,
    restaurantId,
    type: 'fond_initial',
    amount: floatAmount,
    reason: 'Ouverture de caisse - Fond initial',
    user: caller.name,
    timestamp: FieldValue.serverTimestamp(),
  });

  // Journalisation d'audit
  await db.collection('audit_logs').add({
    action: 'Ouverture Session de Caisse',
    module: 'Caisse',
    details: `Session ${sessionId} ouverte avec un fond de ${floatAmount} FCFA par ${caller.name}`,
    entityId: sessionId,
    restaurantId,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, session: newSession };
}

export async function handleCloseCashSession(request: CallableRequest<CloseCashSessionRequest>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager', 'caisse']);

  const { sessionId, blindCountAmount, varianceJustification, notes } = request.data;
  if (!sessionId || blindCountAmount === undefined) {
    throw new HttpsError('invalid-argument', 'sessionId et blindCountAmount (comptage réel) requis.');
  }

  const counted = Math.max(0, Math.round(Number(blindCountAmount)));

  const sessionRef = db.collection('cash_sessions').doc(sessionId);

  return await db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    if (!sessionSnap.exists) {
      throw new HttpsError('not-found', 'Session de caisse introuvable.');
    }

    const sessionData = sessionSnap.data()!;
    if (sessionData.status !== 'ouverte') {
      throw new HttpsError('failed-precondition', 'Cette session de caisse est déjà clôturée.');
    }

    const restaurantId = sessionData.restaurantId;

    // 1. Vérification : aucune commande en cours ne doit subsister sur cet établissement
    const pendingOrdersSnap = await db
      .collection('orders')
      .where('restaurantId', '==', restaurantId)
      .where('status', 'in', ['en_cours', 'partiellement_payee'])
      .get();

    if (!pendingOrdersSnap.empty) {
      throw new HttpsError(
        'failed-precondition',
        `Clôture impossible : il reste ${pendingOrdersSnap.size} commande(s) non soldée(s) en salle/comptoir.`
      );
    }

    // 2. Calcul des montants et de l'écart
    const expected = Math.round(Number(sessionData.expectedTotal) || 0);
    const variance = counted - expected;
    const absVariance = Math.abs(variance);

    // 3. Justification obligatoire si écart dépasse le seuil
    if (absVariance > DEFAULT_VARIANCE_THRESHOLD && !varianceJustification?.trim()) {
      throw new HttpsError(
        'invalid-argument',
        `Un écart de caisse de ${absVariance} FCFA dépasse le seuil toléré (${DEFAULT_VARIANCE_THRESHOLD} FCFA). Une justification écrite est obligatoire.`
      );
    }

    // 4. Numéro de rapport Z continu
    const zReportNumber = await generateZSequence(restaurantId);

    // 5. Clôture de la session
    transaction.update(sessionRef, {
      status: 'fermee',
      closedBy: caller.name,
      closedByUid: caller.uid,
      closedAt: FieldValue.serverTimestamp(),
      closingFloat: counted,
      countedTotal: counted,
      variance,
      varianceJustification: varianceJustification || '',
      zReportNumber,
      closingNotes: notes || '',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 6. Mouvement de clôture
    const movementId = crypto.randomUUID();
    transaction.set(db.collection('cash_movements').doc(movementId), {
      id: movementId,
      sessionId,
      restaurantId,
      type: 'cloture_session',
      amount: counted,
      reason: `Clôture Z (${zReportNumber}) - Compté: ${counted} FCFA (Écart: ${variance > 0 ? '+' : ''}${variance} FCFA)`,
      user: caller.name,
      timestamp: FieldValue.serverTimestamp(),
    });

    // 7. Journalisation d'audit
    const auditId = crypto.randomUUID();
    transaction.set(db.collection('audit_logs').doc(auditId), {
      action: 'Clôture Session de Caisse (Z)',
      module: 'Caisse',
      details: `Session ${sessionId} clôturée avec Z ${zReportNumber}. Attendu: ${expected} FCFA, Compté: ${counted} FCFA (Écart: ${variance} FCFA)`,
      entityId: sessionId,
      restaurantId,
      userName: caller.name,
      userRole: caller.role,
      userId: caller.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      sessionId,
      zReportNumber,
      expectedTotal: expected,
      countedTotal: counted,
      variance,
      status: 'fermee',
    };
  });
}
