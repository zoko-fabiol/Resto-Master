import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from './firebase.js';
import { UserRole } from './types.js';

export interface CallerContext {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  outlets: string[];
  organizationId: string;
  active: boolean;
}

/**
 * Valide que l'utilisateur est authentifié et renvoie son profil contextuel
 */
export function getCallerContext(request: CallableRequest): CallerContext {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentification requise pour exécuter cette opération.'
    );
  }

  const token = request.auth.token;
  const role: UserRole = (token.role as UserRole) || 'aucun';
  const active: boolean = token.active !== false;

  return {
    uid: request.auth.uid,
    email: request.auth.token.email || '',
    role,
    name: (token.name as string) || (token.email as string)?.split('@')[0] || 'Utilisateur',
    outlets: (token.outlets as string[]) || [],
    organizationId: (token.organizationId as string) || '',
    active,
  };
}

/**
 * Exige qu'un utilisateur possède l'un des rôles spécifiés
 */
export function assertRoles(caller: CallerContext, allowedRoles: UserRole[]): void {
  if (!caller.active || caller.role === 'aucun') {
    throw new HttpsError(
      'permission-denied',
      'Votre compte est inactif ou en attente d\'attribution de rôle.'
    );
  }

  if (caller.role === 'superadmin' || caller.role === 'direction') {
    return; // Superadmin et Direction possèdent un accès universel
  }

  if (!allowedRoles.includes(caller.role)) {
    throw new HttpsError(
      'permission-denied',
      `Accès refusé. Rôle "${caller.role}" non autorisé pour cette action.`
    );
  }
}

// -----------------------------------------------------------------------------
// Sécurité PIN : Hachage PBKDF2 avec Sel par Utilisateur
// -----------------------------------------------------------------------------

export function hashPin(pin: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 100_000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPinHash(pin: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPin(pin, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// -----------------------------------------------------------------------------
// Jetons Superviseur Éphémères (2 minutes max, usage unique, lié à l'action)
// -----------------------------------------------------------------------------

export async function createSupervisorToken(
  supervisorUid: string,
  supervisorName: string,
  supervisorRole: UserRole,
  action: string,
  entityId?: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes

  await db.collection('_supervisor_tokens').doc(token).set({
    token,
    supervisorUid,
    supervisorName,
    supervisorRole,
    action,
    entityId: entityId || null,
    expiresAt,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return token;
}

export async function consumeSupervisorToken(
  tokenString: string,
  expectedAction: string,
  expectedEntityId?: string
): Promise<{ supervisorUid: string; supervisorName: string; supervisorRole: UserRole }> {
  if (!tokenString) {
    throw new HttpsError(
      'permission-denied',
      'Un jeton d\'autorisation superviseur valide est obligatoire pour cette action.'
    );
  }

  const tokenRef = db.collection('_supervisor_tokens').doc(tokenString);

  return await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(tokenRef);
    if (!snap.exists) {
      throw new HttpsError('permission-denied', 'Jeton superviseur invalide ou inexistant.');
    }

    const data = snap.data()!;
    if (data.used) {
      throw new HttpsError('permission-denied', 'Ce jeton superviseur a déjà été utilisé.');
    }

    if (Date.now() > data.expiresAt) {
      throw new HttpsError('permission-denied', 'Ce jeton superviseur a expiré (validité 2 minutes).');
    }

    if (data.action !== expectedAction) {
      throw new HttpsError(
        'permission-denied',
        `Le jeton superviseur n'est pas autorisé pour l'action "${expectedAction}".`
      );
    }

    if (expectedEntityId && data.entityId && data.entityId !== expectedEntityId) {
      throw new HttpsError(
        'permission-denied',
        'Le jeton superviseur ne correspond pas à l\'entité ciblée.'
      );
    }

    // Marquer comme utilisé immédiatement de manière atomique
    transaction.update(tokenRef, {
      used: true,
      consumedAt: FieldValue.serverTimestamp(),
    });

    return {
      supervisorUid: data.supervisorUid,
      supervisorName: data.supervisorName,
      supervisorRole: data.supervisorRole,
    };
  });
}
