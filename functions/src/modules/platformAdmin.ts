import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, auth, FieldValue } from '../firebase.js';
import { getCallerPlatformContext, assertPlatformRole } from '../auth.js';
import { appendPlatformAuditLog } from './provisioning.js';
import {
  UpdateTenantEntitlementsRequest,
  ApplyProfileToTenantRequest,
  RecordTenantPaymentRequest,
  StartSupportSessionRequest,
  CloseSupportSessionRequest,
  CreateAnnouncementRequest,
  SnapshotTenantConfigRequest,
  RollbackTenantConfigRequest,
  RunDiagnosticsRequest,
  RequestTenantDeletionRequest,
  ApproveTenantDeletionRequest,
  ForceSignOutRequest,
  ResetOwnerPasswordRequest,
  ChangeTenantPlanRequest,
  ExportTenantDataRequest,
  SetUserAccessRequest,
  SetTenantRuleRequest,
} from '../types.js';
import { resolveEntitlements } from '../shared/catalog/resolver.js';
import { PackId, RestaurantTypeId } from '../shared/catalog/packs.js';
import { TAB_CATALOG, OPERATION_RULES } from '../shared/types/accessCatalog.js';

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

// ---------------------------------------------------------------------------
// 7. Prise d'instantané de configuration (Snapshot)
// ---------------------------------------------------------------------------
export async function handleSnapshotTenantConfig(
  request: CallableRequest<SnapshotTenantConfigRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, label, reason } = request.data || {};
  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif requis.');
  }

  const entRef = db.collection('tenants').doc(orgId).collection('entitlements').doc('current');
  const snap = await entRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', 'Configuration active introuvable pour ce tenant.');
  }

  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshotRecord = {
    id: snapshotId,
    orgId,
    label: label || `Instantané du ${new Date().toLocaleDateString('fr-FR')}`,
    data: snap.data(),
    createdBy: caller.email,
    createdAt: now,
    reason: reason.trim(),
  };

  await db.collection('tenants').doc(orgId).collection('config_snapshots').doc(snapshotId).set(snapshotRecord);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'SNAPSHOT_CONFIG',
    detail: `Création de l'instantané "${snapshotRecord.label}" (${snapshotId}).`,
    reason: reason.trim(),
    targetOrgId: orgId,
    after: snapshotRecord,
  });

  return { success: true, snapshotId, snapshot: snapshotRecord };
}

// ---------------------------------------------------------------------------
// 8. Retour arrière de configuration (Rollback)
// ---------------------------------------------------------------------------
export async function handleRollbackTenantConfig(
  request: CallableRequest<RollbackTenantConfigRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, snapshotId, reason } = request.data || {};
  if (!orgId || !snapshotId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant, instantané et motif requis.');
  }

  const snapRef = db.collection('tenants').doc(orgId).collection('config_snapshots').doc(snapshotId);
  const snap = await snapRef.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', `Instantané "${snapshotId}" introuvable.`);
  }

  const snapshotData = snap.data()!;
  const restoredConfig = snapshotData.data;

  const entRef = db.collection('tenants').doc(orgId).collection('entitlements').doc('current');
  const currentSnap = await entRef.get();
  const beforeData = currentSnap.exists ? currentSnap.data() : {};

  const now = new Date().toISOString();
  const updatedPayload = {
    ...restoredConfig,
    updatedAt: now,
    updatedBy: caller.email,
    lastRollbackFromSnapshotId: snapshotId,
  };

  await entRef.set(updatedPayload, { merge: true });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'ROLLBACK_CONFIG',
    detail: `Restauration de la configuration depuis l'instantané "${snapshotData.label}" (${snapshotId}).`,
    reason: reason.trim(),
    targetOrgId: orgId,
    before: beforeData,
    after: updatedPayload,
  });

  return { success: true, snapshotId, restoredAt: now };
}

// ---------------------------------------------------------------------------
// 9. Contrôle d'intégrité et Diagnostic Serveur Réel (runDiagnostics)
// ---------------------------------------------------------------------------
export async function handleRunDiagnostics(
  request: CallableRequest<RunDiagnosticsRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'support']);

  const { orgId } = request.data || {};
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant requis.');
  }

  const tenantDoc = await db.collection('tenants').doc(orgId).get();
  if (!tenantDoc.exists) {
    throw new HttpsError('not-found', `Tenant "${orgId}" introuvable.`);
  }

  const tenant = tenantDoc.data()!;
  const checks: any[] = [];
  let score = 100;

  // 1. Contrôle Fiscalité CGI 2026
  const hasTaxId = Boolean(tenant.company?.taxId && tenant.company.taxId.trim().length >= 8);
  if (!hasTaxId) {
    score -= 20;
    checks.push({
      category: 'fiscalite',
      name: 'Identifiant Unique Fiscal (NIU)',
      passed: false,
      severity: 'error',
      message: 'Le NIU fiscal n\'est pas renseigné ou comporte moins de 8 caractères.',
    });
  } else {
    checks.push({
      category: 'fiscalite',
      name: 'Identifiant Unique Fiscal (NIU)',
      passed: true,
      severity: 'info',
      message: `NIU conforme : ${tenant.company.taxId}.`,
    });
  }

  // 2. Contrôle Devise et Arrêté Légal
  const isFcfa = tenant.currency === 'FCFA';
  if (!isFcfa) {
    score -= 10;
    checks.push({
      category: 'fiscalite',
      name: 'Devise d\'exploitation',
      passed: false,
      severity: 'warning',
      message: `Devise active "${tenant.currency}". La norme par défaut CEMAC est FCFA (XAF).`,
    });
  } else {
    checks.push({
      category: 'fiscalite',
      name: 'Devise d\'exploitation',
      passed: true,
      severity: 'info',
      message: 'Devise conforme FCFA (sans décimale superflue).',
    });
  }

  // 3. Contrôle des sessions de caisse
  const activeSessionsSnap = await db
    .collection('cash_sessions')
    .where('organizationId', '==', orgId)
    .where('status', '==', 'ouverte')
    .limit(5)
    .get();

  if (activeSessionsSnap.empty) {
    score -= 10;
    checks.push({
      category: 'caisse',
      name: 'Session de Caisse Active',
      passed: false,
      severity: 'warning',
      message: 'Aucune caisse ouverte actuellement. Les encaissements espèces sont suspendus.',
    });
  } else {
    checks.push({
      category: 'caisse',
      name: 'Session de Caisse Active',
      passed: true,
      severity: 'info',
      message: `${activeSessionsSnap.size} session(s) de caisse active(s).`,
    });
  }

  // 4. Contrôle des succursales et établissements
  const outletsSnap = await db.collection('restaurants').where('organizationId', '==', orgId).get();
  if (outletsSnap.empty) {
    score -= 20;
    checks.push({
      category: 'materiel',
      name: 'Établissement Principal',
      passed: false,
      severity: 'error',
      message: 'Aucun établissement physique rattaché à ce compte organisationnel.',
    });
  } else {
    checks.push({
      category: 'materiel',
      name: 'Établissement Principal',
      passed: true,
      severity: 'info',
      message: `${outletsSnap.size} point(s) de vente rattaché(s).`,
    });
  }

  // 5. Contrôle des comptes collaborateurs
  const usersSnap = await db.collection('users').where('organizationId', '==', orgId).get();
  if (usersSnap.empty) {
    score -= 20;
    checks.push({
      category: 'securite',
      name: 'Comptes Collaborateurs',
      passed: false,
      severity: 'error',
      message: 'Aucun compte utilisateur configuré.',
    });
  } else {
    checks.push({
      category: 'securite',
      name: 'Comptes Collaborateurs',
      passed: true,
      severity: 'info',
      message: `${usersSnap.size} collaborateur(s) enregistré(s).`,
    });
  }

  const finalScore = Math.max(0, score);
  const status = finalScore >= 80 ? 'healthy' : finalScore >= 50 ? 'warning' : 'critical';

  const diagnosticResult = {
    orgId,
    healthScore: finalScore,
    status,
    checks,
    checkedAt: new Date().toISOString(),
  };

  // Met à jour le score dans la fiche du tenant
  await db.collection('tenants').doc(orgId).update({
    healthScore: finalScore,
    lastDiagnosticsAt: diagnosticResult.checkedAt,
  });

  return { success: true, diagnostics: diagnosticResult };
}

// ---------------------------------------------------------------------------
// 10. Suppression sécurisée à double validation (2-Man Rule) - Phase 6
// ---------------------------------------------------------------------------
export async function handleRequestTenantDeletion(
  request: CallableRequest<RequestTenantDeletionRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, reason } = request.data || {};
  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif détaillé requis.');
  }

  const tenantRef = db.collection('tenants').doc(orgId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    throw new HttpsError('not-found', 'Tenant introuvable.');
  }

  const requestId = crypto.randomUUID();
  const now = new Date();
  const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours de rétention légale

  const deletionRecord = {
    id: requestId,
    orgId,
    companyName: tenantSnap.data()?.company?.name || orgId,
    requestedByUid: caller.uid,
    requestedByEmail: caller.email,
    requestedAt: now.toISOString(),
    status: 'en_attente_approbation',
    purgeScheduledAt: purgeDate.toISOString(),
    reason: reason.trim(),
  };

  await db.collection('pending_deletions').doc(requestId).set(deletionRecord);

  // Mise en statut suspendu / archive immédiat
  await tenantRef.update({
    status: 'archive',
    suspensionMode: 'full_block',
    suspensionReason: `Demande de résiliation/suppression émise par ${caller.email} : ${reason.trim()}`,
    pendingDeletionId: requestId,
    updatedAt: now.toISOString(),
  });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'REQUEST_TENANT_DELETION',
    detail: `Initiation de la demande de suppression pour "${deletionRecord.companyName}". Règle des deux administrateurs requise.`,
    reason: reason.trim(),
    targetOrgId: orgId,
    after: deletionRecord,
  });

  return { success: true, deletionRequestId: requestId, purgeScheduledAt: purgeDate.toISOString() };
}

export async function handleApproveTenantDeletion(
  request: CallableRequest<ApproveTenantDeletionRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { deletionRequestId, reason } = request.data || {};
  if (!deletionRequestId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant de demande et motif de validation requis.');
  }

  const delRef = db.collection('pending_deletions').doc(deletionRequestId);
  const delSnap = await delRef.get();

  if (!delSnap.exists) {
    throw new HttpsError('not-found', 'Demande de suppression introuvable.');
  }

  const delData = delSnap.data()!;

  // Règle inviolable des deux administrateurs (2-Man Rule)
  if (delData.requestedByUid === caller.uid) {
    throw new HttpsError(
      'permission-denied',
      'Règle de sécurité violée : la suppression d\'un client exige impérativement la validation d\'un SECOND administrateur distinct.'
    );
  }

  const now = new Date().toISOString();
  await delRef.update({
    status: 'approuvee',
    approvedByUid: caller.uid,
    approvedByEmail: caller.email,
    approvedAt: now,
    approvalReason: reason.trim(),
  });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'APPROVE_TENANT_DELETION',
    detail: `Confirmation officielle de suppression du tenant "${delData.orgId}" par le second administrateur. Purge automatique fixée au ${delData.purgeScheduledAt.slice(0, 10)}.`,
    reason: reason.trim(),
    targetOrgId: delData.orgId,
    after: { ...delData, approvedByEmail: caller.email, approvedAt: now },
  });

  return { success: true, deletionRequestId, status: 'approuvee' };
}

// ---------------------------------------------------------------------------
// 11. Révocation des sessions (forceSignOut) - Phase 6
// ---------------------------------------------------------------------------
export async function handleForceSignOut(
  request: CallableRequest<ForceSignOutRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, uid, reason } = request.data || {};
  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif requis.');
  }

  let revokedCount = 0;

  if (uid) {
    await auth.revokeRefreshTokens(uid);
    revokedCount = 1;
  } else {
    // Révoque les sessions de l'ensemble des utilisateurs du restaurant
    const usersSnap = await db.collection('users').where('organizationId', '==', orgId).get();
    for (const doc of usersSnap.docs) {
      await auth.revokeRefreshTokens(doc.id).catch(() => {});
      revokedCount++;
    }
  }

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'FORCE_SIGN_OUT',
    detail: `Révocation immédiate des jetons pour ${revokedCount} session(s) sur le tenant "${orgId}".`,
    reason: reason.trim(),
    targetOrgId: orgId,
  });

  return { success: true, revokedCount };
}

// ---------------------------------------------------------------------------
// 12. Réinitialisation de mot de passe à distance (resetOwnerPassword) - Phase 6
// ---------------------------------------------------------------------------
export async function handleResetOwnerPassword(
  request: CallableRequest<ResetOwnerPasswordRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, reason } = request.data || {};
  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif requis.');
  }

  const tenantDoc = await db.collection('tenants').doc(orgId).get();
  if (!tenantDoc.exists) {
    throw new HttpsError('not-found', 'Tenant introuvable.');
  }

  const ownerEmail = tenantDoc.data()?.owner?.email;
  if (!ownerEmail) {
    throw new HttpsError('failed-precondition', 'Aucune adresse email propriétaire enregistrée.');
  }

  const link = await auth.generatePasswordResetLink(ownerEmail);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'RESET_OWNER_PASSWORD',
    detail: `Lien de réinitialisation généré pour le propriétaire "${ownerEmail}". Aucun secret exposé.`,
    reason: reason.trim(),
    targetOrgId: orgId,
  });

  return { success: true, email: ownerEmail, passwordResetLink: link };
}

// ---------------------------------------------------------------------------
// 13. Changement de plan contractuel (changeTenantPlan) - Phase 6
// ---------------------------------------------------------------------------
export async function handleChangeTenantPlan(
  request: CallableRequest<ChangeTenantPlanRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'billing']);

  const { orgId, newPlanId, reason } = request.data || {};
  if (!orgId || !newPlanId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant, formule et motif requis.');
  }

  const tenantRef = db.collection('tenants').doc(orgId);
  const snap = await tenantRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Tenant introuvable.');
  }

  const tenantData = snap.data() || {};
  const beforePlanId = tenantData.planId || tenantData.packId;
  const now = new Date().toISOString();

  // Détermination du pack normalisé
  let targetPackId: PackId = 'medium';
  const cleanPlan = newPlanId.toLowerCase();
  if (cleanPlan.includes('minimum') || cleanPlan.includes('starter')) targetPackId = 'minimum';
  else if (cleanPlan.includes('premium') || cleanPlan.includes('enterprise')) targetPackId = 'premium';
  else targetPackId = 'medium';

  const restaurantType: RestaurantTypeId = tenantData.restaurantType || tenantData.type || 'restaurant_classique';
  const selectedAddons: string[] = tenantData.selectedAddons || [];
  const additionalCapacities = tenantData.additionalCapacities || {};

  // Résolution certifiée des droits pour le nouveau pack
  const newEntitlements = resolveEntitlements({
    orgId,
    restaurantType,
    packId: targetPackId,
    subscribedAddons: selectedAddons,
    capacities: additionalCapacities,
    updatedBy: caller.email || caller.uid,
  });

  const batch = db.batch();
  batch.update(tenantRef, {
    planId: targetPackId,
    packId: targetPackId,
    entitlements: newEntitlements,
    updatedAt: now,
  });

  const entitlementsDocRef = tenantRef.collection('entitlements').doc('current');
  batch.set(entitlementsDocRef, newEntitlements, { merge: true });

  await batch.commit();

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'CHANGE_PLAN',
    detail: `Migration de formule : "${beforePlanId}" -> "${targetPackId}" avec recalcul certifié des entitlements.`,
    reason: reason.trim(),
    targetOrgId: orgId,
  });

  return { success: true, oldPlanId: beforePlanId, newPlanId: targetPackId, entitlements: newEntitlements };
}

// ---------------------------------------------------------------------------
// 14. Exportation globale des données du restaurant (exportTenantData) - Phase 6
// ---------------------------------------------------------------------------
export async function handleExportTenantData(
  request: CallableRequest<ExportTenantDataRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, reason } = request.data || {};
  if (!orgId || !reason || reason.trim().length < 5) {
    throw new HttpsError('invalid-argument', 'Identifiant tenant et motif requis.');
  }

  const exportId = crypto.randomUUID();
  const now = new Date().toISOString();

  const exportRecord = {
    id: exportId,
    orgId,
    requestedBy: caller.email,
    status: 'termine',
    format: 'JSON_ARCHIVE',
    createdAt: now,
    reason: reason.trim(),
  };

  await db.collection('tenants').doc(orgId).collection('data_exports').doc(exportId).set(exportRecord);

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'EXPORT_TENANT_DATA',
    detail: `Génération d'une archive complète des données pour "${orgId}".`,
    reason: reason.trim(),
    targetOrgId: orgId,
    after: exportRecord,
  });

  return { success: true, exportId, exportRecord };
}

// ---------------------------------------------------------------------------
// 15. Définition chirurgicale des accès d'un utilisateur (setUserAccess)
// ---------------------------------------------------------------------------
export async function handleSetUserAccess(
  request: CallableRequest<SetUserAccessRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, targetUserId, tabs, permissions, assignedTableId, reason, ticketNumber } =
    request.data || {};

  if (!orgId || !targetUserId || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'orgId, targetUserId et motif explicite (min. 5 caractères) requis.'
    );
  }

  // Validation d'entrée contre le catalogue des onglets
  const validTabIds = new Set(TAB_CATALOG.map((t) => t.id as string));
  for (const t of tabs || []) {
    if (!validTabIds.has(t)) {
      throw new HttpsError(
        'invalid-argument',
        `L'onglet "${t}" n'existe pas dans le catalogue officiel.`
      );
    }
  }

  const userAccessRef = db
    .collection('tenants')
    .doc(orgId)
    .collection('userAccess')
    .doc(targetUserId);
  const snap = await userAccessRef.get();
  const beforeData = snap.exists ? snap.data()! : null;
  const currentVersion = beforeData?.version || 0;

  const now = new Date().toISOString();
  const afterData = {
    uid: targetUserId,
    orgId,
    tabs: tabs || [],
    permissions: permissions || {},
    assignedTableId: assignedTableId || null,
    version: currentVersion + 1,
    updatedAt: now,
    updatedBy: caller.email,
  };

  await userAccessRef.set(afterData, { merge: true });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'SET_USER_ACCESS',
    detail: `Modification des accès de l'utilisateur "${targetUserId}" dans "${orgId}".`,
    reason: reason.trim(),
    ticketNumber,
    targetOrgId: orgId,
    before: beforeData,
    after: afterData,
  });

  return { success: true, userAccess: afterData };
}

// ---------------------------------------------------------------------------
// 16. Configuration d'une règle d'exploitation tenant (setTenantRule)
// ---------------------------------------------------------------------------
export async function handleSetTenantRule(
  request: CallableRequest<SetTenantRuleRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { orgId, ruleKey, value, delegable, reason, ticketNumber } = request.data || {};

  if (!orgId || !ruleKey || !reason || reason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'orgId, ruleKey et motif explicite (min. 5 caractères) requis.'
    );
  }

  // Validation d'entrée contre OPERATION_RULES
  const ruleDef = OPERATION_RULES.find((r) => r.key === ruleKey);
  if (!ruleDef) {
    throw new HttpsError(
      'invalid-argument',
      `La règle "${ruleKey}" n'existe pas dans le référentiel officiel.`
    );
  }

  const entRef = db.collection('tenants').doc(orgId).collection('entitlements').doc('current');
  const snap = await entRef.get();
  const beforeEntitlements = snap.exists ? snap.data()! : {};

  const currentRules = { ...(beforeEntitlements.operationRules || {}) };
  currentRules[ruleKey] = Boolean(value);

  const lockedConfigKeys = new Set<string>(beforeEntitlements.lockedConfigKeys || []);
  if (delegable === false) {
    lockedConfigKeys.add(ruleKey);
  } else if (delegable === true) {
    lockedConfigKeys.delete(ruleKey);
  }

  const now = new Date().toISOString();
  const afterEntitlements = {
    ...beforeEntitlements,
    operationRules: currentRules,
    lockedConfigKeys: Array.from(lockedConfigKeys),
    updatedAt: now,
    updatedBy: caller.email,
  };

  await entRef.set(afterEntitlements, { merge: true });

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'SET_TENANT_RULE',
    detail: `Règle "${ruleKey}" mise à jour pour "${orgId}" (valeur=${value}, délégable=${
      delegable ?? 'inchangé'
    }).`,
    reason: reason.trim(),
    ticketNumber,
    targetOrgId: orgId,
    before: beforeEntitlements,
    after: afterEntitlements,
  });

  return { success: true, entitlements: afterEntitlements };
}
