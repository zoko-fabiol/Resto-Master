import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext } from '../auth.js';
import { AppendAuditLogRequest } from '../types.js';

function computeAuditHash(payload: string, prevHash: string): string {
  return crypto.createHash('sha256').update(`${prevHash}|${payload}`).digest('hex');
}

export async function handleAppendAuditLog(request: CallableRequest<AppendAuditLogRequest>) {
  const caller = getCallerContext(request);
  const { action, module, details, entityId, restaurantId } = request.data;

  if (!action || !module || !details) {
    throw new HttpsError('invalid-argument', 'action, module et details sont requis pour l\'audit trail.');
  }

  const logId = crypto.randomUUID();

  // Chaînage cryptographique
  const lastLogSnap = await db
    .collection('audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  const prevHash = !lastLogSnap.empty && lastLogSnap.docs[0].data().chainHash
    ? (lastLogSnap.docs[0].data().chainHash as string)
    : 'GENESIS-INITIAL-AUDIT-HASH';

  const logPayload = JSON.stringify({
    logId,
    action,
    module,
    details,
    entityId: entityId || null,
    uid: caller.uid,
    role: caller.role,
    name: caller.name,
  });

  const chainHash = computeAuditHash(logPayload, prevHash);

  const newLog = {
    id: logId,
    action,
    module,
    details,
    entityId: entityId || null,
    restaurantId: restaurantId || caller.outlets[0] || null,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    chainHash,
    prevHash,
    timestamp: FieldValue.serverTimestamp(),
  };

  await db.collection('audit_logs').doc(logId).set(newLog);

  return { success: true, logId, chainHash };
}
