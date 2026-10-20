import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, auth, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';
import { UserRole } from '../types.js';

interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  outlets?: string[];
  organizationId?: string;
}

interface SetUserRoleData {
  userId: string;
  role: UserRole;
  outlets?: string[];
  organizationId?: string;
  active?: boolean;
}

function generateSecureTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;

  const bytes = crypto.randomBytes(12);
  let result = '';
  // Ensure at least one of each required class
  result += upper[bytes[0] % upper.length];
  result += lower[bytes[1] % lower.length];
  result += digits[bytes[2] % digits.length];
  result += symbols[bytes[3] % symbols.length];

  for (let i = 4; i < 12; i++) {
    result += all[bytes[i] % all.length];
  }

  // Shuffle the result
  return result.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

/**
 * Création sécurisée d'un utilisateur et attribution de ses Custom Claims
 * Accessible uniquement par le Super Administrateur et la Direction
 */
export async function handleCreateUser(request: CallableRequest<CreateUserData>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['superadmin', 'direction']);

  const { email, name, role, phone, outlets, organizationId } = request.data;
  if (!email || !name || !role) {
    throw new HttpsError('invalid-argument', 'Les champs email, nom et rôle sont obligatoires.');
  }

  // Seul un superadmin peut créer un autre superadmin
  if (role === 'superadmin' && caller.role !== 'superadmin') {
    throw new HttpsError(
      'permission-denied',
      'Seul un Super Administrateur peut créer un compte Super Administrateur.'
    );
  }

  // Génération d'un mot de passe temporaire aléatoire fort
  const temporaryPassword = generateSecureTemporaryPassword();

  // Création du compte dans Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: temporaryPassword,
      displayName: name,
      phoneNumber: phone && /^\+?[1-9]\d{1,14}$/.test(phone) ? phone : undefined,
    });
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Un compte avec cette adresse e-mail existe déjà.');
    }
    throw new HttpsError('internal', err.message || 'Erreur lors de la création du compte Auth.');
  }

  const assignedOutlets = outlets || caller.outlets;
  const assignedOrg = organizationId || caller.organizationId;

  // Attribution des Custom Claims immuables
  await auth.setCustomUserClaims(userRecord.uid, {
    role,
    outlets: assignedOutlets,
    organizationId: assignedOrg,
    active: true,
  });

  // Création du profil utilisateur dans Firestore
  const userDoc = {
    id: userRecord.uid,
    email,
    name,
    role,
    phone: phone || '',
    accessibleRestaurantIds: assignedOutlets,
    organizationId: assignedOrg,
    active: true,
    mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: caller.name,
  };

  await db.collection('users').doc(userRecord.uid).set(userDoc);

  // Journal d'audit serveur
  await db.collection('audit_logs').add({
    action: 'Création Utilisateur',
    module: 'Personnel',
    details: `Création du compte ${name} (${email}) avec rôle ${role} et mot de passe temporaire obligatoire`,
    entityId: userRecord.uid,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    userId: userRecord.uid,
    temporaryPassword,
  };
}

/**
 * Modification des privilèges RBAC et Custom Claims d'un utilisateur
 * Accessible uniquement par le Super Administrateur et la Direction
 */
export async function handleSetUserRole(request: CallableRequest<SetUserRoleData>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['superadmin', 'direction']);

  const { userId, role, outlets, organizationId, active = true } = request.data;
  if (!userId || !role) {
    throw new HttpsError('invalid-argument', 'Les paramètres userId et role sont obligatoires.');
  }

  // Seul un superadmin peut attribuer le rôle superadmin
  if (role === 'superadmin' && caller.role !== 'superadmin') {
    throw new HttpsError(
      'permission-denied',
      'Seul un Super Administrateur peut attribuer le rôle Super Administrateur.'
    );
  }

  // Ne pas permettre de modifier ou désactiver son propre compte administrateur
  if (userId === caller.uid && (role !== caller.role || active === false)) {
    throw new HttpsError(
      'failed-precondition',
      'Impossible de rétrograder ou désactiver votre propre compte.'
    );
  }

  // Révocation immédiate des jetons d'accès en cas de désactivation
  if (!active) {
    try {
      await auth.revokeRefreshTokens(userId);
    } catch (err: any) {
      console.warn(`[handleSetUserRole] Impossible de révoquer les refresh tokens pour ${userId}:`, err);
    }
  }

  const assignedOutlets = outlets || caller.outlets;
  const assignedOrg = organizationId || caller.organizationId;

  // Mise à jour des Custom Claims
  await auth.setCustomUserClaims(userId, {
    role,
    outlets: assignedOutlets,
    organizationId: assignedOrg,
    active,
  });

  // Mise à jour du document Firestore
  await db.collection('users').doc(userId).set(
    {
      role,
      accessibleRestaurantIds: assignedOutlets,
      organizationId: assignedOrg,
      active,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.name,
    },
    { merge: true }
  );

  // Journal d'audit serveur
  await db.collection('audit_logs').add({
    action: active ? 'Modification Rôle Utilisateur' : 'Désactivation Compte Utilisateur',
    module: 'Sécurité',
    details: `Attribution du rôle ${role} à l'utilisateur ${userId} (Actif: ${active})`,
    entityId: userId,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, userId, role, active };
}
