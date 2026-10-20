import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, auth, FieldValue } from '../firebase.js';
import { getCallerContext, hashPin, verifyPinHash, createSupervisorToken } from '../auth.js';
import { UserRole } from '../types.js';

interface SetPinData {
  userId?: string;
  pin: string;
}

interface VerifyPinData {
  userId?: string;
  pin: string;
}

interface VerifySupervisorData {
  pin: string;
  action: string;
  entityId?: string;
}

interface UnlockWithPinData {
  pin: string;
  terminalId?: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes de blocage après 5 erreurs

/**
 * Définit ou met à jour le code PIN sécurisé (haché PBKDF2)
 */
export async function handleSetPin(request: CallableRequest<SetPinData>) {
  const caller = getCallerContext(request);
  const targetUserId = request.data.userId || caller.uid;

  // Seul l'utilisateur lui-même, la direction ou le superadmin peut modifier un PIN
  if (targetUserId !== caller.uid && caller.role !== 'superadmin' && caller.role !== 'direction') {
    throw new HttpsError(
      'permission-denied',
      'Seul un Super Administrateur ou la Direction peut modifier le code PIN d\'un autre utilisateur.'
    );
  }

  const pin = request.data.pin;
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'Le code PIN doit comporter entre 4 et 6 chiffres.');
  }

  const { hash, salt } = hashPin(pin);

  await db.collection('user_pins').doc(targetUserId).set({
    userId: targetUserId,
    hash,
    salt,
    failedAttempts: 0,
    lockoutUntil: null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: caller.name,
  });

  return { success: true };
}

/**
 * Vérifie un code PIN avec protection anti force-brute (blocage après 5 échecs)
 */
export async function handleVerifyPin(request: CallableRequest<VerifyPinData>) {
  const caller = getCallerContext(request);
  const targetUserId = request.data.userId || caller.uid;
  const pin = request.data.pin;

  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'Code PIN invalide.');
  }

  const pinRef = db.collection('user_pins').doc(targetUserId);
  const snap = await pinRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Aucun code PIN n\'est configuré pour ce compte.');
  }

  const data = snap.data()!;

  // Vérifier si le compte est temporairement verrouillé
  const lockoutUntil = data.lockoutUntil ? data.lockoutUntil.toMillis() : null;
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
    throw new HttpsError(
      'resource-exhausted',
      `Compte temporairement bloqué suite à des tentatives erronées. Réessayez dans ${remainingSeconds} secondes.`
    );
  }

  const isValid = verifyPinHash(pin, data.hash, data.salt);

  if (!isValid) {
    const failedAttempts = (data.failedAttempts || 0) + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;

    await pinRef.update({
      failedAttempts: shouldLock ? 0 : failedAttempts,
      lockoutUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      lastFailedAt: FieldValue.serverTimestamp(),
    });

    if (shouldLock) {
      throw new HttpsError(
        'resource-exhausted',
        'Trop de tentatives erronées. Votre compte a été verrouillé pour 5 minutes.'
      );
    }

    const remainingTries = MAX_FAILED_ATTEMPTS - failedAttempts;
    throw new HttpsError(
      'permission-denied',
      `Code PIN incorrect. ${remainingTries} tentative(s) restante(s).`
    );
  }

  // Succès : réinitialiser les tentatives échouées
  await pinRef.update({
    failedAttempts: 0,
    lockoutUntil: null,
    lastSuccessAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

/**
 * Vérifie le code PIN d'un superviseur et délivre un jeton d'autorisation éphémère (2 min)
 */
export async function handleVerifySupervisor(request: CallableRequest<VerifySupervisorData>) {
  const caller = getCallerContext(request);
  const { pin, action, entityId } = request.data;

  if (!pin || !action) {
    throw new HttpsError('invalid-argument', 'Le code PIN et l\'action ciblée sont requis.');
  }

  // Récupérer tous les comptes de rôle 'superadmin', 'direction' ou 'manager'
  const supervisorsSnap = await db
    .collection('users')
    .where('role', 'in', ['superadmin', 'direction', 'manager'])
    .where('active', '==', true)
    .get();

  if (supervisorsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Aucun compte superviseur actif trouvé.');
  }

  let matchedSupervisor: { uid: string; name: string; role: UserRole } | null = null;

  for (const doc of supervisorsSnap.docs) {
    const supervisorData = doc.data();
    const pinDoc = await db.collection('user_pins').doc(doc.id).get();

    if (pinDoc.exists) {
      const pinData = pinDoc.data()!;
      // Vérifier le lockout
      const lockoutUntil = pinData.lockoutUntil ? pinData.lockoutUntil.toMillis() : null;
      if (lockoutUntil && Date.now() < lockoutUntil) {
        continue;
      }

      if (verifyPinHash(pin, pinData.hash, pinData.salt)) {
        matchedSupervisor = {
          uid: doc.id,
          name: supervisorData.name || 'Superviseur',
          role: supervisorData.role as UserRole,
        };
        // Reset failed attempts
        await pinDoc.ref.update({ failedAttempts: 0, lockoutUntil: null });
        break;
      }
    }
  }

  if (!matchedSupervisor) {
    throw new HttpsError(
      'permission-denied',
      'Code PIN incorrect ou aucun superviseur autorisé ne correspond.'
    );
  }

  // Génération du jeton d'autorisation éphémère (2 min) à usage unique
  const supervisorToken = await createSupervisorToken(
    matchedSupervisor.uid,
    matchedSupervisor.name,
    matchedSupervisor.role,
    action,
    entityId
  );

  // Journalisation d'audit
  await db.collection('audit_logs').add({
    action: 'Délivrance Autorisation Superviseur',
    module: 'Sécurité',
    details: `Autorisation "${action}" accordée par ${matchedSupervisor.name} (${matchedSupervisor.role}) pour ${caller.name}`,
    entityId: entityId || null,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    supervisorToken,
    supervisorName: matchedSupervisor.name,
    supervisorRole: matchedSupervisor.role,
    expiresInSeconds: 120,
  };
}

/**
 * Déverrouille une session de caisse ou terminal via code PIN vérifié côté serveur.
 * Applique un verrouillage progressif (5 essais -> 1 min, 6 -> 5 min, 7+ -> 15 min),
 * journalise dans audit_logs et renvoie un jeton personnalisé Firebase Auth avec les claims.
 */
export async function handleUnlockWithPin(request: CallableRequest<UnlockWithPinData>) {
  const { pin, terminalId } = request.data || {};
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    throw new HttpsError('invalid-argument', 'Le code PIN doit comporter entre 4 et 6 chiffres.');
  }

  // Clé de verrouillage pour le terminal ou poste de travail
  const lockKey = terminalId ? `term_${terminalId}` : 'term_default';
  const lockRef = db.collection('_terminal_pin_locks').doc(lockKey);
  const lockSnap = await lockRef.get();

  if (lockSnap.exists) {
    const lockData = lockSnap.data()!;
    const lockoutUntil = lockData.lockoutUntil ? lockData.lockoutUntil.toMillis() : null;
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      throw new HttpsError(
        'resource-exhausted',
        `Terminal temporairement verrouillé suite à plusieurs tentatives erronées. Réessayez dans ${remainingSeconds} secondes.`
      );
    }
  }

  // Déterminer l'établissement si terminalId est renseigné
  let targetRestaurantId: string | null = null;
  if (terminalId) {
    const terminalSnap = await db.collection('terminals').doc(terminalId).get();
    if (terminalSnap.exists) {
      const tData = terminalSnap.data()!;
      targetRestaurantId = tData.restaurantId || tData.outletId || null;
    }
  }

  // Récupérer les utilisateurs actifs
  const usersSnap = await db.collection('users').where('active', '==', true).get();
  if (usersSnap.empty) {
    throw new HttpsError('not-found', 'Aucun compte utilisateur actif n\'est configuré sur le système.');
  }

  // Filtrer les utilisateurs habilités sur cet établissement
  const candidateDocs = usersSnap.docs.filter((d) => {
    const data = d.data();
    if (data.role === 'superadmin' || data.role === 'direction') return true;
    if (!targetRestaurantId) return true;
    const accessible = data.accessibleRestaurantIds || [];
    return accessible.includes(targetRestaurantId) || accessible.includes('*');
  });

  let matchedUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    accessibleRestaurantIds: string[];
    organizationId: string;
  } | null = null;

  for (const userDoc of candidateDocs) {
    const pinSnap = await db.collection('user_pins').doc(userDoc.id).get();
    if (!pinSnap.exists) continue;

    const pinData = pinSnap.data()!;
    const userLockout = pinData.lockoutUntil ? pinData.lockoutUntil.toMillis() : null;
    if (userLockout && Date.now() < userLockout) continue;

    if (verifyPinHash(pin, pinData.hash, pinData.salt)) {
      const uData = userDoc.data();
      matchedUser = {
        id: userDoc.id,
        name: uData.name || 'Personnel',
        email: uData.email,
        role: uData.role as UserRole,
        accessibleRestaurantIds: uData.accessibleRestaurantIds || [],
        organizationId: uData.organizationId || '',
      };

      // Réinitialiser les tentatives échouées de cet utilisateur
      await pinSnap.ref.update({
        failedAttempts: 0,
        lockoutUntil: null,
        lastSuccessAt: FieldValue.serverTimestamp(),
      });
      break;
    }
  }

  if (matchedUser) {
    // Réinitialiser le verrouillage du terminal
    if (lockSnap.exists) {
      await lockRef.set({ failedAttempts: 0, lockoutUntil: null }, { merge: true });
    }

    // Créer un Custom Token Firebase Auth avec les custom claims complets
    const customToken = await auth.createCustomToken(matchedUser.id, {
      role: matchedUser.role,
      outlets: matchedUser.accessibleRestaurantIds,
      organizationId: matchedUser.organizationId,
      active: true,
    });

    // Journal d'audit de sécurité
    await db.collection('audit_logs').add({
      action: 'Déverrouillage Terminal PIN',
      module: 'Sécurité',
      details: `${matchedUser.name} (${matchedUser.role}) a déverrouillé le terminal ${terminalId || 'Générique'} par code PIN serveur`,
      userName: matchedUser.name,
      userRole: matchedUser.role,
      userId: matchedUser.id,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      customToken,
      user: matchedUser,
    };
  }

  // Échec : incrémenter les tentatives du terminal avec verrouillage progressif (5: 1m, 6: 5m, 7+: 15m)
  const currentFails = lockSnap.exists ? (lockSnap.data()?.failedAttempts || 0) + 1 : 1;
  let lockoutMs = 0;
  if (currentFails >= 7) {
    lockoutMs = 15 * 60 * 1000; // 15 minutes
  } else if (currentFails >= 6) {
    lockoutMs = 5 * 60 * 1000; // 5 minutes
  } else if (currentFails >= 5) {
    lockoutMs = 1 * 60 * 1000; // 1 minute
  }

  await lockRef.set(
    {
      failedAttempts: currentFails,
      lockoutUntil: lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null,
      lastFailedAt: FieldValue.serverTimestamp(),
      terminalId: terminalId || null,
    },
    { merge: true }
  );

  await db.collection('audit_logs').add({
    action: 'Échec Déverrouillage PIN',
    module: 'Sécurité',
    details: `Tentative de code PIN erronée sur le terminal ${terminalId || 'Générique'} (Échec ${currentFails})`,
    timestamp: FieldValue.serverTimestamp(),
  });

  if (lockoutMs > 0) {
    const minutes = Math.ceil(lockoutMs / 60000);
    throw new HttpsError(
      'resource-exhausted',
      `Trop de tentatives erronées. Terminal bloqué pendant ${minutes} minute(s).`
    );
  }

  const remaining = 5 - currentFails;
  throw new HttpsError(
    'permission-denied',
    remaining > 0
      ? `Code PIN incorrect. ${remaining} tentative(s) restante(s).`
      : 'Code PIN incorrect.'
  );
}
