import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerPlatformContext, assertPlatformRole } from '../auth.js';
import { appendPlatformAuditLog } from './provisioning.js';
import {
  UpdateTenantEntitlementsRequest,
  ApplyProfileToTenantRequest,
  RecordTenantPaymentRequest,
  StartSupportSessionRequest,
  CloseSupportSessionRequest,
  CreateAnnouncementRequest,
} from '../types.js';

// Matrice des profils de configuration intégrée pour exécution serveur sécurisée
const SERVER_PROFILES: Record<
  string,
  {
    name: string;
    modules: Record<string, boolean>;
    features: Record<string, { status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ' }>;
    lockedConfigKeys: string[];
  }
> = {
  fast_food: {
    name: 'Snack & Fast-Food',
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_bar_pos: false,
      mod_tables: false,
      mod_cuisine: true,
      mod_bar: false,
      mod_menu: true,
      mod_recipes_yield: true,
      mod_caisse: true,
      mod_stock: true,
      mod_purchases: true,
      mod_hygiene: true,
      mod_main_courante: false,
      mod_fiscal: true,
      mod_finance: true,
      mod_clients: true,
      mod_delivery: true,
      mod_events: false,
      mod_staff: true,
      mod_documents: true,
      mod_reports: true,
      mod_audit: true,
      mod_settings: true,
    },
    features: {
      pos_core: { status: 'ACTIVÉ' },
      tables_management: { status: 'DÉSACTIVÉ' },
      bar_pos_exclusive: { status: 'DÉSACTIVÉ' },
      kds_kitchen: { status: 'ACTIVÉ' },
      kds_bar: { status: 'DÉSACTIVÉ' },
      cash_register_z: { status: 'ACTIVÉ' },
      hotelpro_maincourante: { status: 'DÉSACTIVÉ' },
      delivery_orders: { status: 'ACTIVÉ' },
      takeaway_orders: { status: 'ACTIVÉ' },
    },
    lockedConfigKeys: [],
  },
  restaurant_classique: {
    name: 'Restaurant Traditionnel & Grill',
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_bar_pos: true,
      mod_tables: true,
      mod_cuisine: true,
      mod_bar: true,
      mod_menu: true,
      mod_recipes_yield: true,
      mod_caisse: true,
      mod_stock: true,
      mod_purchases: true,
      mod_hygiene: true,
      mod_main_courante: false,
      mod_fiscal: true,
      mod_finance: true,
      mod_clients: true,
      mod_delivery: false,
      mod_events: false,
      mod_staff: true,
      mod_documents: true,
      mod_reports: true,
      mod_audit: true,
      mod_settings: true,
    },
    features: {
      pos_core: { status: 'ACTIVÉ' },
      tables_management: { status: 'ACTIVÉ' },
      table_reservations: { status: 'ACTIVÉ' },
      kds_kitchen: { status: 'ACTIVÉ' },
      kds_bar: { status: 'ACTIVÉ' },
      recipes_bom_yield: { status: 'ACTIVÉ' },
      cash_register_z: { status: 'ACTIVÉ' },
      stock_lots_fefo: { status: 'ACTIVÉ' },
      purchases_suppliers: { status: 'ACTIVÉ' },
      hotelpro_maincourante: { status: 'DÉSACTIVÉ' },
    },
    lockedConfigKeys: [],
  },
  bar_lounge: {
    name: 'Bar, Lounge & Night-Club',
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_bar_pos: true,
      mod_tables: true,
      mod_cuisine: false,
      mod_bar: true,
      mod_menu: true,
      mod_caisse: true,
      mod_stock: true,
      mod_purchases: true,
      mod_clients: true,
      mod_staff: true,
      mod_reports: true,
      mod_audit: true,
      mod_settings: true,
    },
    features: {
      pos_core: { status: 'ACTIVÉ' },
      bar_pos_exclusive: { status: 'ACTIVÉ' },
      kds_bar: { status: 'ACTIVÉ' },
      kds_kitchen: { status: 'DÉSACTIVÉ' },
      cash_register_z: { status: 'ACTIVÉ' },
      stock_lots_fefo: { status: 'ACTIVÉ' },
      hotelpro_maincourante: { status: 'DÉSACTIVÉ' },
      events_banquets: { status: 'DÉSACTIVÉ' },
    },
    lockedConfigKeys: [],
  },
  hotel_complexe: {
    name: 'Hôtel, Resort & Grand Complexe',
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_bar_pos: true,
      mod_tables: true,
      mod_cuisine: true,
      mod_bar: true,
      mod_menu: true,
      mod_recipes_yield: true,
      mod_caisse: true,
      mod_stock: true,
      mod_purchases: true,
      mod_hygiene: true,
      mod_main_courante: true,
      mod_fiscal: true,
      mod_finance: true,
      mod_clients: true,
      mod_delivery: true,
      mod_events: true,
      mod_staff: true,
      mod_documents: true,
      mod_reports: true,
      mod_audit: true,
      mod_settings: true,
    },
    features: {
      pos_core: { status: 'ACTIVÉ' },
      tables_management: { status: 'ACTIVÉ' },
      bar_pos_exclusive: { status: 'ACTIVÉ' },
      kds_kitchen: { status: 'ACTIVÉ' },
      kds_bar: { status: 'ACTIVÉ' },
      recipes_bom_yield: { status: 'ACTIVÉ' },
      cash_register_z: { status: 'ACTIVÉ' },
      stock_lots_fefo: { status: 'ACTIVÉ' },
      purchases_suppliers: { status: 'ACTIVÉ' },
      cameroon_fiscal_framework: { status: 'ACTIVÉ' },
      hotelpro_maincourante: { status: 'ACTIVÉ' },
      events_banquets: { status: 'ACTIVÉ' },
    },
    lockedConfigKeys: ['tax_compliance_mode', 'currency'],
  },
  snack_takeaway: {
    name: 'Snack & Vente à Emporter (Léger)',
    modules: {
      mod_dashboard: true,
      mod_pos: true,
      mod_menu: true,
      mod_caisse: true,
      mod_documents: true,
      mod_reports: true,
      mod_settings: true,
    },
    features: {
      pos_core: { status: 'ACTIVÉ' },
      takeaway_orders: { status: 'ACTIVÉ' },
      cash_register_z: { status: 'ACTIVÉ' },
      tables_management: { status: 'DÉSACTIVÉ' },
      kds_kitchen: { status: 'DÉSACTIVÉ' },
      kds_bar: { status: 'DÉSACTIVÉ' },
    },
    lockedConfigKeys: [],
  },
};

/**
 * 1. Mise à jour chirurgicale des entitlements d'un tenant (matrice de fonctionnalités et modules)
 */
export async function handleUpdateTenantEntitlements(
  request: CallableRequest<UpdateTenantEntitlementsRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, features, modules, operationRules, lockedConfigKeys, reason, ticketNumber } =
    request.data || {};

  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Identifiant tenant et motif explicite (min. 5 caractères) requis.'
    );
  }

  const entRef = db.collection('tenants').doc(orgId).collection('entitlements').doc('current');
  const snap = await entRef.get();

  const beforeData = snap.exists ? snap.data()! : {};
  const now = new Date().toISOString();

  const updatedFeatures = { ...(beforeData.features || {}) };
  if (features) {
    for (const [fKey, fVal] of Object.entries(features)) {
      updatedFeatures[fKey] = {
        status: fVal.status,
        source: 'override',
        activatedBy: caller.email,
        activatedAt: now,
        reason: fVal.reason || reason.trim(),
        ...(fVal.expiresAt ? { expiresAt: fVal.expiresAt } : {}),
      };
    }
  }

  const updatedModules = { ...(beforeData.modules || {}), ...(modules || {}) };
  const updatedRules = { ...(beforeData.operationRules || {}), ...(operationRules || {}) };
  const updatedLockedKeys = Array.from(
    new Set([...(beforeData.lockedConfigKeys || []), ...(lockedConfigKeys || [])])
  );

  const payload = {
    orgId,
    features: updatedFeatures,
    modules: updatedModules,
    operationRules: updatedRules,
    lockedConfigKeys: updatedLockedKeys,
    effectiveLimits: beforeData.effectiveLimits || {
      maxOutlets: 1,
      maxUsers: 5,
      maxTerminals: 2,
      maxOrdersPerMonth: 5000,
    },
    updatedAt: now,
    updatedBy: caller.email,
  };

  await entRef.set(payload, { merge: true });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'UPDATE_ENTITLEMENTS',
    detail: `Mise à jour des entitlements pour le tenant "${orgId}".`,
    reason: reason.trim(),
    ticketNumber,
    targetOrgId: orgId,
    before: beforeData,
    after: payload,
  });

  return { success: true, entitlements: payload };
}

/**
 * 2. Application d'un profil de configuration prédéfini à distance avec diff tracé
 */
export async function handleApplyProfileToTenant(
  request: CallableRequest<ApplyProfileToTenantRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, profileId, reason, ticketNumber } = request.data || {};

  if (!orgId || !profileId || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Identifiant tenant, profil et motif explicite requis.'
    );
  }

  const profile = SERVER_PROFILES[profileId];
  if (!profile) {
    throw new HttpsError('not-found', `Profil "${profileId}" inconnu.`);
  }

  const entRef = db.collection('tenants').doc(orgId).collection('entitlements').doc('current');
  const snap = await entRef.get();
  const beforeData = snap.exists ? snap.data()! : {};

  const now = new Date().toISOString();
  const formattedFeatures: Record<string, any> = {};

  for (const [key, val] of Object.entries(profile.features)) {
    formattedFeatures[key] = {
      status: val.status,
      source: 'profil',
      activatedBy: caller.email,
      activatedAt: now,
      reason: `Application profil "${profile.name}" : ${reason.trim()}`,
    };
  }

  const payload = {
    orgId,
    features: { ...(beforeData.features || {}), ...formattedFeatures },
    modules: { ...(beforeData.modules || {}), ...profile.modules },
    operationRules: { ...(beforeData.operationRules || {}), ...profile.modules },
    lockedConfigKeys: profile.lockedConfigKeys,
    effectiveLimits: beforeData.effectiveLimits || {
      maxOutlets: 1,
      maxUsers: 5,
      maxTerminals: 2,
      maxOrdersPerMonth: 5000,
    },
    updatedAt: now,
    updatedBy: caller.email,
  };

  await entRef.set(payload, { merge: true });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'APPLY_PROFILE',
    detail: `Application du profil "${profile.name}" au tenant "${orgId}".`,
    reason: reason.trim(),
    ticketNumber,
    targetOrgId: orgId,
    before: beforeData,
    after: payload,
  });

  return { success: true, profileId, profileName: profile.name };
}

/**
 * 3. Enregistrement manuel d'un règlement en FCFA pour l'abonnement du restaurant
 */
export async function handleRecordTenantPayment(
  request: CallableRequest<RecordTenantPaymentRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'billing']);

  const { orgId, amountFcfa, periodMonths, paymentMethod, reference, notes } = request.data || {};

  if (!orgId || !amountFcfa || amountFcfa <= 0 || !periodMonths || periodMonths <= 0) {
    throw new HttpsError(
      'invalid-argument',
      'Montant positif et durée d\'abonnement en mois requis.'
    );
  }

  const tenantRef = db.collection('tenants').doc(orgId);
  const snap = await tenantRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', `Tenant "${orgId}" introuvable.`);
  }

  const tenantData = snap.data()!;
  const now = new Date();
  const currentExpiresAt = tenantData.subscriptionEndsAt
    ? new Date(tenantData.subscriptionEndsAt)
    : now;

  // Prolongation à partir de la date courante ou de la date de fin existante si encore valide
  const baseDate = currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const newExpiresDate = new Date(baseDate);
  newExpiresDate.setMonth(newExpiresDate.getMonth() + periodMonths);

  const paymentId = crypto.randomUUID();
  const paymentRecord = {
    id: paymentId,
    orgId,
    amountFcfa: Math.round(amountFcfa),
    currency: 'FCFA',
    periodMonths,
    paymentMethod,
    reference: reference || null,
    notes: notes || null,
    recordedBy: caller.email,
    recordedAt: now.toISOString(),
    validUntil: newExpiresDate.toISOString(),
  };

  await db.collection('tenants').doc(orgId).collection('payments').doc(paymentId).set(paymentRecord);

  // Mise à jour de l'état du tenant (passe à actif s'il était impayé ou en essai)
  const tenantUpdates: Record<string, any> = {
    status: 'actif',
    subscriptionEndsAt: newExpiresDate.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (tenantData.status === 'impaye' || (tenantData.status === 'suspendu' && tenantData.suspensionReason?.includes('impayé'))) {
    tenantUpdates.suspensionMode = FieldValue.delete();
    tenantUpdates.suspensionReason = FieldValue.delete();
  }

  await tenantRef.update(tenantUpdates);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'RECORD_PAYMENT',
    detail: `Paiement de ${amountFcfa.toLocaleString()} FCFA (${periodMonths} mois) enregistré pour "${tenantData.company?.name || orgId}". Validité jusqu'au ${newExpiresDate.toISOString().slice(0, 10)}.`,
    reason: `Règlement d'abonnement via ${paymentMethod} (Réf: ${reference || 'SANS_REF'})`,
    targetOrgId: orgId,
    after: paymentRecord,
  });

  return {
    success: true,
    paymentId,
    newStatus: 'actif',
    subscriptionEndsAt: newExpiresDate.toISOString(),
  };
}

/**
 * 4. Démarrage d'une session de support éphémère
 */
export async function handleStartSupportSession(
  request: CallableRequest<StartSupportSessionRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'support']);

  const { orgId, mode, reason, durationMinutes = 60 } = request.data || {};

  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif requis.');
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.min(240, durationMinutes) * 60 * 1000);

  const session = {
    id: sessionId,
    adminUid: caller.uid,
    adminEmail: caller.email,
    orgId,
    reason: reason.trim(),
    mode: mode || 'read_only',
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    active: true,
    actionsPerformed: [],
  };

  await db.collection('support_sessions').doc(sessionId).set(session);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'START_SUPPORT_SESSION',
    detail: `Ouverture d'une session de support ${mode === 'read_write' ? 'lecture/écriture' : 'consultation'} pour "${orgId}".`,
    reason: reason.trim(),
    targetOrgId: orgId,
    after: session,
  });

  return { success: true, session };
}

/**
 * 5. Clôture d'une session de support
 */
export async function handleCloseSupportSession(
  request: CallableRequest<CloseSupportSessionRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'support']);

  const { sessionId, summary } = request.data || {};
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'Identifiant de session requis.');
  }

  const sessionRef = db.collection('support_sessions').doc(sessionId);
  const snap = await sessionRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Session de support introuvable.');
  }

  const now = new Date().toISOString();
  await sessionRef.update({
    active: false,
    closedAt: now,
    summary: summary || null,
  });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'CLOSE_SUPPORT_SESSION',
    detail: `Clôture de la session de support ${sessionId}.`,
    reason: summary || 'Fin normale de l’intervention support',
    targetOrgId: snap.data()?.orgId,
  });

  return { success: true, sessionId };
}

/**
 * 6. Création d'une annonce plateforme diffusée aux restaurants
 */
export async function handleCreateAnnouncement(
  request: CallableRequest<CreateAnnouncementRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { title, message, type, targetPlanIds, expiresAt } = request.data || {};

  if (!title || !message) {
    throw new HttpsError('invalid-argument', 'Titre et message requis.');
  }

  const id = crypto.randomUUID();
  const announcement = {
    id,
    title,
    message,
    type: type || 'info',
    targetPlanIds: targetPlanIds || ['all'],
    createdBy: caller.email,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    active: true,
  };

  await db.collection('platform_announcements').doc(id).set(announcement);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'CREATE_ANNOUNCEMENT',
    detail: `Diffusion d'une annonce plateforme : "${title}" (${type}).`,
    reason: 'Communication officielle RestoMaster OS',
    after: announcement,
  });

  return { success: true, announcement };
}
