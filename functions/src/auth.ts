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

/**
 * Valide que l'appelant possède un rôle d'administration de plateforme
 */
export function getCallerPlatformContext(request: CallableRequest): import('./types.js').CallerPlatformContext {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Authentification requise pour accéder aux fonctions de la plateforme.'
    );
  }

  const token = request.auth.token;
  const platformRole = token.platformRole as import('./types.js').PlatformRole | undefined;

  if (!platformRole) {
    throw new HttpsError(
      'permission-denied',
      'Accès refusé. Privilèges de plateforme RestoMaster requis.'
    );
  }

  const active = token.active !== false;

  return {
    uid: request.auth.uid,
    email: request.auth.token.email || '',
    platformRole,
    name: (token.name as string) || (token.email as string)?.split('@')[0] || 'Admin Plateforme',
    active,
  };
}

/**
 * Exige qu'un administrateur plateforme possède l'un des rôles de plateforme spécifiés
 */
export function assertPlatformRole(
  caller: import('./types.js').CallerPlatformContext,
  allowedRoles: import('./types.js').PlatformRole[]
): void {
  if (!caller.active) {
    throw new HttpsError(
      'permission-denied',
      'Votre compte d\'administration de plateforme est inactif.'
    );
  }

  if (caller.platformRole === 'platform_owner') {
    return; // Le propriétaire de la plateforme possède un accès universel
  }

  if (!allowedRoles.includes(caller.platformRole)) {
    throw new HttpsError(
      'permission-denied',
      `Accès refusé. Rôle plateforme "${caller.platformRole}" insuffisant pour cette action.`
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

// -----------------------------------------------------------------------------
// Contrôle de Statut et d'Entitlements Multi-Tenant
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Table d'États et Permissions Multi-Tenant (Matrice de Sécurité Éprouvée)
// -----------------------------------------------------------------------------

export type TenantOperation = 'vente' | 'config' | 'lecture';

export interface TenantStateRule {
  allowVente: boolean;
  allowConfig: boolean;
  allowReadOnly: boolean;
  statusMessage: string;
}

export const TENANT_STATE_ACCESS_RULES: Record<string, TenantStateRule> = {
  demande: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: false,
    statusMessage: 'Votre demande d’adhésion est en cours d’examen par l’équipe RestoMaster.',
  },
  inscription_en_attente: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: false,
    statusMessage: 'Votre demande d’adhésion est en cours d’examen par l’équipe RestoMaster.',
  },
  installation: {
    allowVente: false,
    allowConfig: true,
    allowReadOnly: true,
    statusMessage: 'Établissement en cours d’installation. La vente en caisse exige l’activation d’un abonnement.',
  },
  paiement_en_attente: {
    allowVente: false,
    allowConfig: true,
    allowReadOnly: true,
    statusMessage: 'Commande d’abonnement en attente de paiement. La vente est verrouillée.',
  },
  paiement_a_verifier: {
    allowVente: false,
    allowConfig: true,
    allowReadOnly: true,
    statusMessage: 'Paiement en cours de vérification par l’administration. Vente verrouillée temporairement.',
  },
  actif: {
    allowVente: true,
    allowConfig: true,
    allowReadOnly: true,
    statusMessage: 'Établissement actif et pleinement opérationnel.',
  },
  impaye: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: true,
    statusMessage: 'Abonnement impayé. Accès restreint en lecture seule.',
  },
  suspendu: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: true, // Applicable si suspensionMode == 'read_only'
    statusMessage: 'Établissement suspendu par la plateforme.',
  },
  resilie: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: false,
    statusMessage: 'Compte résilié. Toute opération est définitivement désactivée.',
  },
  archive: {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: false,
    statusMessage: 'Compte archivé.',
  },
};

/**
 * Évalue logiquement l'accès selon l'état et l'opération demandée.
 */
export function evaluateTenantAccess(
  status: string,
  operation: TenantOperation,
  suspensionMode?: string,
  allowReadOnlyOption?: boolean
): { allowed: boolean; reason: string } {
  const rule = TENANT_STATE_ACCESS_RULES[status] || {
    allowVente: false,
    allowConfig: false,
    allowReadOnly: false,
    statusMessage: `Statut d’établissement inconnu : ${status}`,
  };

  if (operation === 'vente') {
    if (!rule.allowVente) {
      return { allowed: false, reason: rule.statusMessage };
    }
    return { allowed: true, reason: '' };
  }

  if (operation === 'config') {
    if (!rule.allowConfig) {
      return { allowed: false, reason: rule.statusMessage };
    }
    return { allowed: true, reason: '' };
  }

  if (operation === 'lecture') {
    if (status === 'suspendu') {
      if (suspensionMode === 'full_block' || !allowReadOnlyOption) {
        return { allowed: false, reason: rule.statusMessage };
      }
      return { allowed: true, reason: '' };
    }
    if (!rule.allowReadOnly) {
      return { allowed: false, reason: rule.statusMessage };
    }
    return { allowed: true, reason: '' };
  }

  return { allowed: false, reason: 'Opération non reconnue.' };
}

/**
 * Vérifie que le tenant est actif et autorise l'opération spécifiée (Zéro Fail-Open).
 */
export async function assertTenantActive(
  orgId: string,
  operation: TenantOperation = 'vente',
  options?: { allowReadOnly?: boolean }
): Promise<void> {
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'Identifiant d’organisation manquant.');
  }

  const tenantDoc = await db.collection('tenants').doc(orgId).get();
  if (!tenantDoc.exists) {
    throw new HttpsError(
      'permission-denied',
      `Organisation "${orgId}" introuvable ou compte non provisionné.`
    );
  }

  const tenantData = tenantDoc.data();
  const status = tenantData?.status || 'demande';
  const suspensionMode = tenantData?.suspensionMode;

  const access = evaluateTenantAccess(
    status,
    operation,
    suspensionMode,
    options?.allowReadOnly
  );

  if (!access.allowed) {
    throw new HttpsError(
      'permission-denied',
      `${access.reason} (Opération "${operation}" refusée pour le statut "${status}").`
    );
  }
}

/**
 * Vérifie qu'une fonctionnalité spécifique est autorisée pour ce tenant
 */
export async function assertFeature(
  orgId: string,
  featureKey: string
): Promise<void> {
  if (!orgId) return;

  const entitlementsDoc = await db
    .collection('tenants')
    .doc(orgId)
    .collection('entitlements')
    .doc('current')
    .get();

  if (!entitlementsDoc.exists) return;

  const data = entitlementsDoc.data();
  const feature = data?.features?.[featureKey];

  if (feature && feature.status === 'DÉSACTIVÉ') {
    throw new HttpsError(
      'permission-denied',
      `La fonctionnalité "${featureKey}" n’est pas activée pour votre établissement.`
    );
  }
}

