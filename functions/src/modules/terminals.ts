import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';

interface GeneratePairingCodeData {
  terminalId: string;
}

interface PairDeviceData {
  pairingCode: string;
  deviceName?: string;
  ipAddress?: string;
}

/**
 * Génération sécurisée d'un code d'appairage temporaire pour un terminal
 * Accessible uniquement aux Managers et à la Direction
 */
export async function handleGeneratePairingCode(request: CallableRequest<GeneratePairingCodeData>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction', 'manager']);

  const { terminalId } = request.data;
  if (!terminalId) {
    throw new HttpsError('invalid-argument', 'Identifiant de terminal (terminalId) obligatoire.');
  }

  const termRef = db.collection('terminals').doc(terminalId);
  const termSnap = await termRef.get();
  if (!termSnap.exists) {
    throw new HttpsError('not-found', `Terminal ${terminalId} introuvable.`);
  }

  // Contrôle du plafond de postes/terminaux (effectiveLimits.maxTerminals)
  const termOrgId = termSnap.data()?.organizationId || caller.organizationId;
  if (caller.role !== 'superadmin' && termOrgId) {
    try {
      const entitlementsDoc = await db
        .collection('tenants')
        .doc(termOrgId)
        .collection('entitlements')
        .doc('current')
        .get();
      if (entitlementsDoc.exists) {
        const entData = entitlementsDoc.data();
        const maxTerminals = entData?.effectiveLimits?.maxTerminals;
        if (typeof maxTerminals === 'number' && maxTerminals > 0) {
          const terminalsSnap = await db
            .collection('terminals')
            .where('organizationId', '==', termOrgId)
            .where('active', '==', true)
            .count()
            .get();
          const currentCount = terminalsSnap.data().count;
          if (currentCount >= maxTerminals && !termSnap.data()?.active) {
            throw new HttpsError(
              'resource-exhausted',
              `Plafond de terminaux / caisses atteint (${currentCount}/${maxTerminals}). Souscrivez à des postes supplémentaires (3 000 FCFA/mois) ou mettez à niveau votre formule.`
            );
          }
        }
      }
    } catch (quotaErr: any) {
      if (quotaErr instanceof HttpsError) throw quotaErr;
      console.warn('Vérification quota terminaux Firestore non bloquante:', quotaErr);
    }
  }

  const code = `TRM-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  await termRef.update({
    pairingCode: code,
    pairingExpiresAt: expiresAt,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    terminalId,
    pairingCode: code,
    expiresAt,
  };
}

/**
 * Appairage atomique d'un équipement client (tablette, POS, KDS) via son code d'appairage
 */
export async function handlePairDevice(request: CallableRequest<PairDeviceData>) {
  const { pairingCode, deviceName, ipAddress } = request.data;
  if (!pairingCode) {
    throw new HttpsError('invalid-argument', 'Code d\'appairage obligatoire.');
  }

  const snapshot = await db
    .collection('terminals')
    .where('pairingCode', '==', pairingCode.trim().toUpperCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Code d\'appairage invalide ou terminal introuvable.');
  }

  const termDoc = snapshot.docs[0];
  const data = termDoc.data();

  if (data.pairingExpiresAt && new Date(data.pairingExpiresAt).getTime() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Ce code d\'appairage a expiré. Veuillez en générer un nouveau.');
  }

  const pairedAt = new Date().toISOString();
  const updates: Record<string, unknown> = {
    pairedAt,
    isLocked: false,
    active: true,
  };

  if (deviceName && deviceName.trim()) {
    updates.name = deviceName.trim();
  }
  if (ipAddress && ipAddress.trim()) {
    updates.ipAddress = ipAddress.trim();
  }

  await termDoc.ref.update(updates);

  return {
    success: true,
    terminal: {
      terminalId: termDoc.id,
      terminalName: updates.name || data.name,
      type: data.type,
      outletId: data.outletId,
      assignedRole: data.assignedRole,
      assignedTableId: data.assignedTableId,
      assignedZone: data.assignedZone,
      kdsStation: data.kdsStation,
      pairedAt,
      pairingCode: data.pairingCode,
    },
  };
}
