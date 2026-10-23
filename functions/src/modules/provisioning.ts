import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, auth, FieldValue } from '../firebase.js';
import { assertRoles, getCallerContext, getCallerPlatformContext, assertPlatformRole } from '../auth.js';
import {
  PlatformRole,
  SubmitSignupRequest,
  ApproveSignupRequest,
  RejectSignupRequest,
  CreateTenantRequest,
  InitialSetupRequest,
  CompleteRestaurantSetupRequest,
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
  // Exigence App Check anti-abus en production
  if (process.env.NODE_ENV === 'production' && !request.app) {
    throw new HttpsError(
      'failed-precondition',
      'Requête non certifiée : App Check est requis pour cette opération.'
    );
  }

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

  // Rate Limiting par e-mail : une seule demande toutes les 10 minutes
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

  // Rate Limiting par adresse IP : max 3 soumissions par heure
  const clientIp = request.rawRequest?.ip || 'unknown';
  if (clientIp !== 'unknown') {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const ipSnap = await db
      .collection('tenant_signups')
      .where('clientIp', '==', clientIp)
      .where('submittedAt', '>=', oneHourAgo)
      .get();
    if (ipSnap.size >= 3) {
      throw new HttpsError(
        'resource-exhausted',
        'Nombre maximal de soumissions atteint pour votre adresse IP. Veuillez patienter.'
      );
    }
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
    clientIp,
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
import {
  resolveEntitlements,
  PackId,
  RestaurantTypeId,
  CATALOG_PACKS,
} from '../shared/catalog/index.js';

export function mapPlanToPackId(planId?: string): PackId {
  if (planId === 'plan_starter' || planId === 'starter' || planId === 'minimum') return 'minimum';
  if (planId === 'plan_enterprise' || planId === 'enterprise' || planId === 'premium') return 'premium';
  return 'medium';
}

export function mapProfileToRestaurantType(profileId?: string): RestaurantTypeId {
  const validTypes: RestaurantTypeId[] = [
    'snack_takeaway',
    'fast_food',
    'restaurant_classique',
    'maquis_bar_restaurant',
    'bar_lounge',
    'boulangerie_cafe',
    'traiteur_banquets',
    'hotel_restaurant',
  ];
  if (profileId && validTypes.includes(profileId as RestaurantTypeId)) {
    return profileId as RestaurantTypeId;
  }
  if (profileId === 'evenementiel_traiteur') return 'traiteur_banquets';
  if (profileId === 'hotel_complexe') return 'hotel_restaurant';
  if (profileId === 'depart_essentiel') return 'snack_takeaway';
  return 'restaurant_classique';
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRestaurantCode(): string {
  const bytes = crypto.randomBytes(8);
  const value = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `RMS-${value.slice(0, 4)}-${value.slice(4)}`;
}

function hashRestaurantCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function handleValidateRestaurantAccessCode(request: CallableRequest<{ restaurantCode: string }>) {
  const caller = getCallerContext(request);
  const normalizedCode = request.data?.restaurantCode?.trim().toUpperCase();
  if (!normalizedCode || !/^RMS-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalizedCode)) {
    throw new HttpsError('invalid-argument', 'Code restaurant invalide.');
  }

  const codeSnap = await db.collection('tenant_access_codes').doc(hashRestaurantCode(normalizedCode)).get();
  const codeData = codeSnap.data();
  if (!codeSnap.exists || !codeData || codeData.status !== 'active' || codeData.orgId !== caller.organizationId) {
    throw new HttpsError('permission-denied', 'Le code restaurant ne correspond pas à votre espace.');
  }

  return { success: true, orgId: caller.organizationId };
}

export async function handleCompleteRestaurantSetup(
  request: CallableRequest<CompleteRestaurantSetupRequest>
) {
  const caller = getCallerContext(request);
  const isAuthorized =
    caller.role === 'superadmin' ||
    caller.role === 'direction';

  if (!isAuthorized) {
    throw new HttpsError('permission-denied', 'Seul le propriétaire de l’établissement (direction) peut terminer la configuration initiale.');
  }
  if (!caller.organizationId) {
    throw new HttpsError('failed-precondition', 'Aucune organisation restaurant n’est associée à ce compte.');
  }
  const reason = request.data?.reason?.trim();
  if (!reason || reason.length < 5) {
    throw new HttpsError('invalid-argument', 'Un motif de certification d’au moins 5 caractères est obligatoire.');
  }
  const setupSessionId = request.data?.setupSessionId?.trim();
  if (!setupSessionId) {
    throw new HttpsError('invalid-argument', 'La session de configuration est obligatoire.');
  }

  const sessionRef = db.collection('setup_sessions').doc(setupSessionId);
  const sessionSnap = await sessionRef.get();
  if (sessionSnap.exists) {
    const sessionData = sessionSnap.data();
    if (sessionData?.actorUid !== caller.uid) {
      throw new HttpsError('permission-denied', 'Cette session de configuration appartient à un autre utilisateur.');
    }
    if (sessionData?.status === 'completed') {
      return { success: true, codeAlreadyDelivered: true };
    }
  } else {
    await sessionRef.create({
      id: setupSessionId,
      status: 'in_progress',
      currentStep: 9,
      actorUid: caller.uid,
      actorEmail: caller.email,
      orgId: caller.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const existingCode = await db
    .collection('tenant_access_codes')
    .where('orgId', '==', caller.organizationId)
    .where('status', '==', 'active')
    .limit(1)
    .get();
  if (!existingCode.empty) {
    await sessionRef.set({
      status: 'completed',
      currentStep: 12,
      codeDeliveredAt: existingCode.docs[0].data().createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true, codeAlreadyDelivered: true };
  }

  const restaurantCode = generateRestaurantCode();
  const codeHash = hashRestaurantCode(restaurantCode);
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.create(db.collection('tenant_access_codes').doc(codeHash), {
    orgId: caller.organizationId,
    codeHash,
    codeSuffix: restaurantCode.slice(-4),
    status: 'active',
    version: 1,
    createdAt: now,
    createdBy: caller.uid,
  });
  batch.set(db.collection('tenant_setup_snapshots').doc(`${caller.organizationId}_initial`), {
    id: `${caller.organizationId}_initial`,
    orgId: caller.organizationId,
    type: 'initial_setup',
    createdAt: now,
    createdBy: caller.uid,
  });
  batch.set(db.collection('organizations').doc(caller.organizationId), {
    setupStatus: 'completed',
    setupCompletedAt: now,
    setupCompletedBy: caller.uid,
    restaurantCodeVersion: 1,
    updatedAt: now,
  }, { merge: true });
  batch.set(sessionRef, {
    status: 'completed',
    currentStep: 12,
    codeDeliveredAt: now,
    updatedAt: now,
  }, { merge: true });
  await batch.commit();

  await db.collection('audit_logs').add({
    action: 'COMPLETE_INITIAL_RESTAURANT_SETUP',
    actorUid: caller.uid,
    actorName: caller.name,
    actorRole: caller.role,
    organizationId: caller.organizationId,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, restaurantCode, codeAlreadyDelivered: false };
}

export async function handleProvisionRestaurantInitialSetup(
  request: CallableRequest<InitialSetupRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const data = request.data || ({} as InitialSetupRequest);
  const setupSessionId = data.setupSessionId?.trim();
  if (!setupSessionId || !data.companyName?.trim() || !data.city?.trim() || !data.address?.trim()) {
    throw new HttpsError('invalid-argument', 'La session et les informations de l’établissement sont obligatoires.');
  }
  if (!data.ownerName?.trim() || !data.ownerEmail?.trim() || !data.reason?.trim() || data.reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Le propriétaire et un motif d’au moins 5 caractères sont obligatoires.');
  }

  const sessionRef = db.collection('setup_sessions').doc(setupSessionId);
  const existingSession = await sessionRef.get();
  if (existingSession.exists && existingSession.data()?.actorUid !== caller.uid) {
    throw new HttpsError('permission-denied', 'Cette session de configuration appartient à un autre administrateur.');
  }

  if (!existingSession.exists) {
    const now = new Date().toISOString();
    await sessionRef.create({
      id: setupSessionId,
      status: 'in_progress',
      currentStep: 1,
      actorUid: caller.uid,
      actorEmail: caller.email,
      createdAt: now,
      updatedAt: now,
    });
  }

  const session = await sessionRef.get();
  const sessionData = session.data() || {};
  let orgId = sessionData.orgId as string | undefined;
  let restaurantId = sessionData.restaurantId as string | undefined;
  let ownerUid = sessionData.ownerUid as string | undefined;
  let passwordResetLink = (sessionData.passwordResetLink as string | undefined) || '';

  if (!orgId || !restaurantId || !ownerUid) {
    const created = await handleCreateTenant({ ...request, data: { ...data, reason: data.reason } } as CallableRequest<CreateTenantRequest>);
    orgId = created.orgId;
    restaurantId = created.restaurantId;
    ownerUid = created.ownerUid;
    passwordResetLink = created.passwordResetLink || '';
    await sessionRef.update({
      orgId,
      restaurantId,
      ownerUid,
      passwordResetLink,
      currentStep: 10,
      updatedAt: new Date().toISOString(),
    });
  }

  const codeDeliveredAt = sessionData.codeDeliveredAt as string | undefined;
  if (codeDeliveredAt) {
    return {
      success: true,
      orgId,
      restaurantId,
      ownerUid,
      passwordResetLink,
      codeAlreadyDelivered: true,
    };
  }

  const restaurantCode = generateRestaurantCode();
  const codeHash = hashRestaurantCode(restaurantCode);
  const now = new Date().toISOString();
  const batch = db.batch();

  batch.create(db.collection('tenant_access_codes').doc(codeHash), {
    orgId,
    codeHash,
    codeSuffix: restaurantCode.slice(-4),
    status: 'active',
    version: 1,
    createdAt: now,
    createdBy: caller.uid,
  });
  batch.set(db.collection('tenant_setup_snapshots').doc(`${orgId}_initial`), {
    id: `${orgId}_initial`,
    orgId,
    type: 'initial_setup',
    source: data,
    createdAt: now,
    createdBy: caller.uid,
  });
  batch.update(db.collection('tenants').doc(orgId), {
    setupStatus: 'ready_for_handover',
    setupCompletedAt: now,
    setupCompletedBy: caller.uid,
    restaurantCodeVersion: 1,
    updatedAt: now,
  });
  batch.update(sessionRef, {
    status: 'completed',
    currentStep: 12,
    codeDeliveredAt: now,
    updatedAt: now,
  });
  await batch.commit();

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'COMPLETE_INITIAL_RESTAURANT_SETUP',
    detail: `Configuration initiale terminée pour ${orgId}. Code restaurant remis au responsable.`,
    reason: data.reason.trim(),
    targetOrgId: orgId,
    after: { orgId, restaurantId, setupSessionId, codeVersion: 1 },
    ticketNumber: data.ticketNumber,
  });

  return {
    success: true,
    orgId,
    restaurantId,
    ownerUid,
    passwordResetLink,
    restaurantCode,
    codeAlreadyDelivered: false,
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
    profileType,
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

  // Résolution unique et standardisée des droits et quotas via shared/catalog
  const mappedPack = mapPlanToPackId(planId);
  const mappedType = mapProfileToRestaurantType(profileType);
  const entitlements = resolveEntitlements({
    orgId: cleanOrgId,
    restaurantType: mappedType,
    packId: mappedPack,
    updatedBy: caller.email,
  });
  const limits = entitlements.effectiveLimits;
  const modules = entitlements.modules;

  // 1. Création ou liaison du compte Propriétaire dans Firebase Auth
  let ownerUid = '';
  let isExistingAuthUser = false;
  try {
    const existing = await auth.getUserByEmail(cleanOwnerEmail);
    ownerUid = existing.uid;
    isExistingAuthUser = true;
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const tempPassword = request.data?.initialPassword?.trim() || crypto.randomBytes(16).toString('base64');
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

  // 2. Attribution des Custom Claims immuables au Propriétaire (direction + setupOwner)
  await auth.setCustomUserClaims(ownerUid, {
    role: 'direction',
    setupOwner: true,
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
      role: 'direction',
      setupOwner: true,
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

  // Fiche Canonique Tenant dans tenants/{cleanOrgId} : état installation sans vente
  const tenantRef = db.collection('tenants').doc(cleanOrgId);

  batch.set(tenantRef, {
    id: cleanOrgId,
    status: 'installation', // Pas d'exploitation de vente avant certification et validation abonnement
    planId: mappedPack,
    restaurantType: mappedType,
    creationSource: 'cree_par_admin',
    channel: channel || 'stable',
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

  // Données internes confidentielles déplacées dans tenants/{cleanOrgId}/admin/private
  const adminPrivateRef = db.collection('tenants').doc(cleanOrgId).collection('admin').doc('private');
  batch.set(adminPrivateRef, {
    labels: ['nouveau_client'],
    healthScore: 100,
    internalNotes: '',
    createdAt: now,
    updatedAt: now,
    updatedBy: caller.email,
  });

  // Droits effectifs dans tenants/{cleanOrgId}/entitlements/current
  const entitlementsRef = db.collection(`tenants/${cleanOrgId}/entitlements`).doc('current');
  batch.set(entitlementsRef, entitlements);

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
      initialPassword: signup.initialPassword,
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
