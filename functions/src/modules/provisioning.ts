import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, auth, FieldValue } from '../firebase.js';
import { getCallerPlatformContext, assertPlatformRole } from '../auth.js';
import {
  PlatformRole,
  SubmitSignupRequest,
  ApproveSignupRequest,
  RejectSignupRequest,
  CreateTenantRequest,
  SetTenantStatusRequest,
} from '../types.js';

// -----------------------------------------------------------------------------
// Journal d'Audit Plateforme Immuable (Chaînage Cryptographique SHA-256)
// -----------------------------------------------------------------------------

export async function appendPlatformAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: PlatformRole;
  action: string;
  detail: string;
  reason: string;
  targetOrgId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ticketNumber?: string;
  ipAddress?: string;
}): Promise<string> {
  const logId = crypto.randomUUID();

  // Récupération de la dernière empreinte pour le chaînage
  const lastLogSnap = await db
    .collection('platform_audit_logs')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  const prevHash =
    !lastLogSnap.empty && lastLogSnap.docs[0].data().sha256Hash
      ? (lastLogSnap.docs[0].data().sha256Hash as string)
      : 'GENESIS-PLATFORM-AUDIT-ROOT-HASH';

  const payload = JSON.stringify({
    logId,
    actorUid: params.actorUid,
    actorRole: params.actorRole,
    action: params.action,
    targetOrgId: params.targetOrgId || null,
    reason: params.reason,
    before: params.before || null,
    after: params.after || null,
  });

  const sha256Hash = crypto.createHash('sha256').update(`${prevHash}|${payload}`).digest('hex');

  await db.collection('platform_audit_logs').doc(logId).set({
    id: logId,
    timestamp: FieldValue.serverTimestamp(),
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    targetOrgId: params.targetOrgId || null,
    action: params.action,
    detail: params.detail,
    before: params.before || null,
    after: params.after || null,
    reason: params.reason,
    ticketNumber: params.ticketNumber || null,
    ipAddress: params.ipAddress || null,
    prevHash,
    sha256Hash,
  });

  return logId;
}

// -----------------------------------------------------------------------------
// 1. Soumission d'Inscription Publique (Anti-Spam & Rate-Limiting)
// -----------------------------------------------------------------------------

export async function handleSubmitSignup(request: CallableRequest<SubmitSignupRequest>) {
  const {
    companyName,
    legalForm,
    city,
    country,
    phone,
    email,
    applicantName,
    desiredPlanId,
    estimatedTables,
  } = request.data || {};

  if (!companyName || !city || !phone || !email || !applicantName) {
    throw new HttpsError(
      'invalid-argument',
      'Veuillez renseigner tous les champs obligatoires (Société, Ville, Téléphone, E-mail, Responsable).'
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new HttpsError('invalid-argument', 'Adresse e-mail invalide.');
  }

  // Rate Limiting : une seule demande par e-mail toutes les 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recentSnap = await db
    .collection('tenant_signups')
    .where('email', '==', cleanEmail)
    .where('submittedAt', '>=', tenMinutesAgo)
    .limit(1)
    .get();

  if (!recentSnap.empty) {
    throw new HttpsError(
      'resource-exhausted',
      'Une demande récente a déjà été enregistrée pour cette adresse. Veuillez patienter avant de renouveler votre soumission.'
    );
  }

  const signupId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  const signupRecord = {
    id: signupId,
    companyName: companyName.trim(),
    legalForm: legalForm || 'SARL',
    city: city.trim(),
    country: country ? country.trim() : 'Cameroun',
    phone: phone.trim(),
    email: cleanEmail,
    applicantName: applicantName.trim(),
    desiredPlanId: desiredPlanId || 'plan_pro',
    estimatedTables: estimatedTables ? Number(estimatedTables) : 10,
    status: 'en_attente',
    submittedAt: now,
  };

  await db.collection('tenant_signups').doc(signupId).set(signupRecord);

  return {
    success: true,
    signupId,
    message: 'Votre demande d\'inscription a été reçue avec succès. Notre équipe prendra contact avec vous sous peu pour activer votre établissement.',
  };
}

// -----------------------------------------------------------------------------
// 2. Création Directe de Tenant par la Plateforme
// -----------------------------------------------------------------------------

function getPlanLimits(planId: string) {
  switch (planId) {
    case 'plan_starter':
      return { maxOutlets: 1, maxUsers: 3, maxTerminals: 1, maxOrdersPerMonth: 1500 };
    case 'plan_enterprise':
      return { maxOutlets: 10, maxUsers: 100, maxTerminals: 50, maxOrdersPerMonth: 100000 };
    case 'plan_pro':
    default:
      return { maxOutlets: 1, maxUsers: 10, maxTerminals: 4, maxOrdersPerMonth: 10000 };
  }
}

function getPlanModules(planId: string): Record<string, boolean> {
  const baseModules = {
    mod_dashboard: true,
    mod_pos: true,
    mod_menu: true,
    mod_caisse: true,
    mod_documents: true,
    mod_reports: true,
  };

  if (planId === 'plan_starter') {
    return baseModules;
  }

  const proModules = {
    ...baseModules,
    mod_bar_pos: true,
    mod_tables: true,
    mod_cuisine: true,
    mod_bar: true,
    mod_recipes_yield: true,
    mod_stock: true,
    mod_purchases: true,
    mod_clients: true,
    mod_staff: true,
    mod_audit: true,
    mod_settings: true,
  };

  if (planId === 'plan_pro') {
    return proModules;
  }

  // Enterprise : tous les modules actifs
  return {
    ...proModules,
    mod_hygiene: true,
    mod_main_courante: true,
    mod_fiscal: true,
    mod_finance: true,
    mod_delivery: true,
    mod_events: true,
  };
}

export async function handleCreateTenant(request: CallableRequest<CreateTenantRequest>) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const {
    companyName,
    legalName,
    legalForm,
    taxId,
    rccm,
    taxCenter,
    city,
    country,
    address,
    phone,
    email,
    ownerName,
    ownerEmail,
    ownerPhone,
    planId,
    channel,
    currency,
    reason,
    ticketNumber,
  } = request.data || {};

  if (!companyName || !city || !address || !phone || !email || !ownerName || !ownerEmail) {
    throw new HttpsError(
      'invalid-argument',
      'Informations incomplètes pour la création de l\'établissement client.'
    );
  }

  if (!reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Un motif explicite (au moins 5 caractères) est obligatoire pour toute création de tenant.'
    );
  }

  const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
  const cleanOrgId = `org_${crypto.randomBytes(6).toString('hex')}`;
  const cleanRestoId = `rst_${crypto.randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();
  const limits = getPlanLimits(planId);
  const modules = getPlanModules(planId);

  // 1. Création ou liaison du compte Propriétaire dans Firebase Auth
  let ownerUid = '';
  let isExistingAuthUser = false;
  try {
    const existing = await auth.getUserByEmail(cleanOwnerEmail);
    ownerUid = existing.uid;
    isExistingAuthUser = true;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const tempPassword = crypto.randomBytes(16).toString('base64');
      const newUser = await auth.createUser({
        email: cleanOwnerEmail,
        displayName: ownerName.trim(),
        phoneNumber: ownerPhone && /^\+?[1-9]\d{1,14}$/.test(ownerPhone) ? ownerPhone : undefined,
        password: tempPassword,
      });
      ownerUid = newUser.uid;
    } else {
      throw new HttpsError('internal', `Erreur Auth: ${err.message}`);
    }
  }

  // 2. Attribution des Custom Claims immuables au Propriétaire
  await auth.setCustomUserClaims(ownerUid, {
    role: 'superadmin', // Rôle propriétaire d'établissement
    organizationId: cleanOrgId,
    outlets: [cleanRestoId],
    active: true,
  });

  // 3. Lien de définition/réinitialisation de mot de passe sécurisé
  let passwordResetLink = '';
  try {
    passwordResetLink = await auth.generatePasswordResetLink(cleanOwnerEmail);
  } catch (err) {
    console.warn('[handleCreateTenant] Échec génération lien réinitialisation:', err);
  }

  // 4. Création des documents Firestore dans un batch atomique
  const batch = db.batch();

  // Fiche Organisation
  const orgRef = db.collection('organizations').doc(cleanOrgId);
  batch.set(orgRef, {
    id: cleanOrgId,
    name: companyName.trim(),
    legalName: (legalName || companyName).trim(),
    taxId: taxId ? taxId.trim() : '',
    rccm: rccm ? rccm.trim() : '',
    headquartersAddress: address.trim(),
    city: city.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    currency: currency || 'FCFA',
    active: true,
    createdAt: now,
  });

  // Fiche Restaurant / Outlet
  const restoRef = db.collection('restaurants').doc(cleanRestoId);
  batch.set(restoRef, {
    id: cleanRestoId,
    organizationId: cleanOrgId,
    name: companyName.trim(),
    legalName: (legalName || companyName).trim(),
    legalForm: legalForm || 'SARL',
    niu: taxId ? taxId.trim() : '',
    rccm: rccm ? rccm.trim() : '',
    taxCenter: taxCenter ? taxCenter.trim() : '',
    city: city.trim(),
    address: address.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    currency: currency || 'FCFA',
    isMain: true,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  // Profil Utilisateur Propriétaire dans users/{ownerUid}
  const userRef = db.collection('users').doc(ownerUid);
  batch.set(
    userRef,
    {
      id: ownerUid,
      name: ownerName.trim(),
      email: cleanOwnerEmail,
      role: 'superadmin',
      organizationId: cleanOrgId,
      accessibleRestaurantIds: [cleanRestoId],
      defaultRestaurantId: cleanRestoId,
      activeRestaurantId: cleanRestoId,
      active: true,
      mustChangePassword: !isExistingAuthUser,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  // Fiche Canonique Tenant dans tenants/{cleanOrgId}
  const tenantRef = db.collection('tenants').doc(cleanOrgId);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  batch.set(tenantRef, {
    id: cleanOrgId,
    status: 'actif',
    planId: planId || 'plan_pro',
    trialEndsAt,
    creationSource: 'cree_par_admin',
    channel: channel || 'stable',
    labels: ['nouveau_client'],
    healthScore: 100,
    company: {
      name: companyName.trim(),
      legalName: (legalName || companyName).trim(),
      legalForm: legalForm || 'SARL',
      taxId: taxId ? taxId.trim() : '',
      rccm: rccm ? rccm.trim() : '',
      taxCenter: taxCenter ? taxCenter.trim() : '',
      headquartersAddress: address.trim(),
      city: city.trim(),
      country: country ? country.trim() : 'Cameroun',
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
    },
    owner: {
      uid: ownerUid,
      name: ownerName.trim(),
      email: cleanOwnerEmail,
      phone: ownerPhone ? ownerPhone.trim() : undefined,
    },
    limits,
    currency: currency || 'FCFA',
    createdAt: now,
    updatedAt: now,
  });

  // Droits effectifs dans tenants/{cleanOrgId}/entitlements/current
  const entitlementsRef = db.collection(`tenants/${cleanOrgId}/entitlements`).doc('current');
  batch.set(entitlementsRef, {
    orgId: cleanOrgId,
    modules,
    operationRules: {},
    lockedConfigKeys: [],
    effectiveLimits: limits,
    features: {
      pos_vente_directe: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: caller.email,
        activatedAt: now,
      },
      pos_plan_tables: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: caller.email,
        activatedAt: now,
      },
    },
    updatedAt: now,
    updatedBy: caller.email,
  });

  await batch.commit();

  // 5. Journalisation d'audit immuable
  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'CREATE_TENANT',
    detail: `Création du restaurant client "${companyName}" (${cleanOrgId}) sur le plan ${planId}.`,
    reason,
    targetOrgId: cleanOrgId,
    after: {
      orgId: cleanOrgId,
      restaurantId: cleanRestoId,
      ownerUid,
      planId,
      limits,
    },
    ticketNumber,
  });

  return {
    success: true,
    orgId: cleanOrgId,
    restaurantId: cleanRestoId,
    ownerUid,
    passwordResetLink,
  };
}

// -----------------------------------------------------------------------------
// 3. Approbation d'une Inscription
// -----------------------------------------------------------------------------

export async function handleApproveSignup(request: CallableRequest<ApproveSignupRequest>) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { signupId, planId, reason, profileType } = request.data || {};

  if (!signupId || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Un identifiant de demande et un motif d\'approbation (min. 5 caractères) sont obligatoires.'
    );
  }

  const signupRef = db.collection('tenant_signups').doc(signupId);
  const signupSnap = await signupRef.get();

  if (!signupSnap.exists) {
    throw new HttpsError('not-found', 'Demande d\'inscription introuvable.');
  }

  const signup = signupSnap.data()!;
  if (signup.status !== 'en_attente') {
    throw new HttpsError(
      'failed-precondition',
      `Cette demande a déjà été traitée (statut: ${signup.status}).`
    );
  }

  // Création du tenant
  const tenantResult = await handleCreateTenant({
    auth: request.auth,
    rawRequest: request.rawRequest,
    data: {
      companyName: signup.companyName,
      legalName: signup.companyName,
      legalForm: signup.legalForm || 'SARL',
      city: signup.city,
      country: signup.country || 'Cameroun',
      address: signup.city,
      phone: signup.phone,
      email: signup.email,
      ownerName: signup.applicantName,
      ownerEmail: signup.email,
      ownerPhone: signup.phone,
      planId: (planId || signup.desiredPlanId || 'plan_pro') as any,
      profileType,
      currency: 'FCFA',
      reason: `Approbation de la demande d'inscription ${signupId} : ${reason}`,
    },
  } as any);

  // Mise à jour de la demande d'inscription
  await signupRef.update({
    status: 'approuvee',
    reviewedAt: new Date().toISOString(),
    reviewedBy: caller.email,
    resultingOrgId: tenantResult.orgId,
  });

  return {
    success: true,
    orgId: tenantResult.orgId,
    passwordResetLink: tenantResult.passwordResetLink,
    message: `La demande ${signupId} a été approuvée avec succès. Le compte client ${tenantResult.orgId} est actif.`,
  };
}

// -----------------------------------------------------------------------------
// 4. Rejet d'une Inscription
// -----------------------------------------------------------------------------

export async function handleRejectSignup(request: CallableRequest<RejectSignupRequest>) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { signupId, reason } = request.data || {};

  if (!signupId || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Un identifiant de demande et un motif de rejet explicite (min. 5 caractères) sont obligatoires.'
    );
  }

  const signupRef = db.collection('tenant_signups').doc(signupId);
  const signupSnap = await signupRef.get();

  if (!signupSnap.exists) {
    throw new HttpsError('not-found', 'Demande d\'inscription introuvable.');
  }

  const signup = signupSnap.data()!;
  if (signup.status !== 'en_attente') {
    throw new HttpsError(
      'failed-precondition',
      `Cette demande a déjà été traitée (statut: ${signup.status}).`
    );
  }

  const now = new Date().toISOString();
  await signupRef.update({
    status: 'rejetee',
    rejectionReason: reason.trim(),
    reviewedAt: now,
    reviewedBy: caller.email,
  });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'REJECT_SIGNUP',
    detail: `Rejet de la demande d'inscription ${signupId} pour "${signup.companyName}".`,
    reason: reason.trim(),
    after: { signupId, status: 'rejetee', reason },
  });

  return {
    success: true,
    message: `La demande ${signupId} a été rejetée.`,
  };
}

// -----------------------------------------------------------------------------
// 5. Modification du Statut d'un Tenant (Suspension / Réactivation)
// -----------------------------------------------------------------------------

export async function handleSetTenantStatus(request: CallableRequest<SetTenantStatusRequest>) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, status, suspensionMode, reason } = request.data || {};

  if (!orgId || !status || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'L\'identifiant du tenant, le nouveau statut et un motif explicite (min. 5 caractères) sont obligatoires.'
    );
  }

  const tenantRef = db.collection('tenants').doc(orgId);
  const tenantSnap = await tenantRef.get();

  if (!tenantSnap.exists) {
    throw new HttpsError('not-found', `Tenant "${orgId}" introuvable.`);
  }

  const beforeData = tenantSnap.data()!;
  const oldStatus = beforeData.status;

  if (status === 'suspendu' && !suspensionMode) {
    throw new HttpsError(
      'invalid-argument',
      'Pour une suspension, veuillez spécifier le mode : "read_only" (consultation permise) ou "full_block" (blocage total).'
    );
  }

  const updates: Record<string, any> = {
    status,
    suspensionReason: reason.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (status === 'suspendu') {
    updates.suspensionMode = suspensionMode;
  } else if (status === 'actif') {
    updates.suspensionMode = FieldValue.delete();
    updates.suspensionReason = FieldValue.delete();
  }

  await tenantRef.update(updates);

  // Si blocage total, révocation des jetons d'authentification du propriétaire
  if (status === 'suspendu' && suspensionMode === 'full_block' && beforeData.owner?.uid) {
    try {
      await auth.revokeRefreshTokens(beforeData.owner.uid);
    } catch (err) {
      console.warn('[handleSetTenantStatus] Impossible de révoquer les refresh tokens:', err);
    }
  }

  // Journalisation d'audit
  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: status === 'suspendu' ? 'SUSPEND_TENANT' : 'ACTIVATE_TENANT',
    detail: `Changement de statut pour le tenant "${orgId}" : ${oldStatus} -> ${status}${suspensionMode ? ` (mode: ${suspensionMode})` : ''}.`,
    reason: reason.trim(),
    targetOrgId: orgId,
    before: { status: oldStatus, suspensionMode: beforeData.suspensionMode || null },
    after: { status, suspensionMode: suspensionMode || null },
  });

  return {
    success: true,
    orgId,
    oldStatus,
    newStatus: status,
    suspensionMode: suspensionMode || null,
  };
}
