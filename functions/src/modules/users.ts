import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, auth, FieldValue } from '../firebase.js';
import { getCallerContext, assertRoles } from '../auth.js';
import { UserRole } from '../types.js';

interface CreateUserData {
  email: string;
  password?: string;
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

/**
 * Création sécurisée d'un utilisateur et attribution de ses Custom Claims
 * Accessible uniquement par la Direction
 */
export async function handleCreateUser(request: CallableRequest<CreateUserData>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction']);

  const { email, password, name, role, phone, outlets, organizationId } = request.data;
  if (!email || !name || !role) {
    throw new HttpsError('invalid-argument', 'Les champs email, nom et rôle sont obligatoires.');
  }

  // Création du compte dans Firebase Auth
  const userRecord = await auth.createUser({
    email,
    password: password || 'RestoMaster2026!',
    displayName: name,
    phoneNumber: phone && /^\+?[1-9]\d{1,14}$/.test(phone) ? phone : undefined,
  });

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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: caller.name,
  };

  await db.collection('users').doc(userRecord.uid).set(userDoc);

  // Journal d'audit serveur
  await db.collection('audit_logs').add({
    action: 'Création Utilisateur',
    module: 'Personnel',
    details: `Création du compte ${name} (${email}) avec rôle ${role}`,
    entityId: userRecord.uid,
    userName: caller.name,
    userRole: caller.role,
    userId: caller.uid,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true, userId: userRecord.uid };
}

/**
 * Modification des privilèges RBAC et Custom Claims d'un utilisateur
 * Accessible uniquement par la Direction
 */
export async function handleSetUserRole(request: CallableRequest<SetUserRoleData>) {
  const caller = getCallerContext(request);
  assertRoles(caller, ['direction']);

  const { userId, role, outlets, organizationId, active = true } = request.data;
  if (!userId || !role) {
    throw new HttpsError('invalid-argument', 'Les paramètres userId et role sont obligatoires.');
  }

  // Ne pas permettre à la direction de se retirer ses propres droits de direction
  if (userId === caller.uid && role !== 'direction') {
    throw new HttpsError(
      'failed-precondition',
      'Impossible de rétrograder votre propre compte administrateur.'
    );
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
    action: 'Modification Rôle Utilisateur',
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
