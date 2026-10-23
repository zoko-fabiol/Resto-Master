/**
 * RestoMaster OS — Module Cloud Functions v2 : Gestion du Cycle de Vie des Abonnements
 * Traite les commandes d'abonnement, déclarations de paiement manuel, validations admin,
 * facturation certifiée et activations transactionnelles idempotentes.
 */

import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import crypto from 'node:crypto';
import { db, FieldValue } from '../firebase.js';
import { getCallerContext, getCallerPlatformContext, assertPlatformRole } from '../auth.js';
import {
  PackId,
  RestaurantTypeId,
  BillingCycle,
  CATALOG_PACKS,
  RESTAURANT_TYPES,
} from '../shared/catalog/packs.js';
import { computeQuote, QuoteResult } from '../shared/catalog/pricing.js';
import { resolveEntitlements } from '../shared/catalog/resolver.js';
import { appendPlatformAuditLog } from './provisioning.js';

// -----------------------------------------------------------------------------
// Helpers de numérotation séquentielle et sécurisée
// -----------------------------------------------------------------------------

function generatePaymentReference(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `RM-${year}-${randomNum}`;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `RM-FACT-${year}-${randomNum}`;
}

// -----------------------------------------------------------------------------
// 1. Soumission d'une Commande d'Abonnement (submitSubscriptionOrder)
// -----------------------------------------------------------------------------

export interface SubmitSubscriptionOrderRequest {
  packId: PackId;
  billingCycle: BillingCycle;
  selectedAddons?: string[];
  additionalCapacities?: {
    extraTerminals?: number;
    extraUsers?: number;
    extraOrdersBlocks?: number;
    extraOutlets?: number;
  };
}

export async function handleSubmitSubscriptionOrder(
  request: CallableRequest<SubmitSubscriptionOrderRequest>
) {
  const caller = getCallerContext(request);
  const isOwner = caller.role === 'direction' || caller.role === 'superadmin';
  if (!isOwner || !caller.organizationId) {
    throw new HttpsError(
      'permission-denied',
      'Seul le propriétaire de l\'établissement peut souscrire à une formule d\'abonnement.'
    );
  }

  const {
    packId,
    billingCycle,
    selectedAddons = [],
    additionalCapacities = {},
  } = request.data || {};

  if (!packId || !CATALOG_PACKS[packId]) {
    throw new HttpsError('invalid-argument', `Pack invalide : ${packId}.`);
  }

  if (!billingCycle || !['mensuel', 'annuel', 'a_vie'].includes(billingCycle)) {
    throw new HttpsError('invalid-argument', `Cycle invalide : ${billingCycle}.`);
  }

  const orgId = caller.organizationId;
  const tenantRef = db.collection('tenants').doc(orgId);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    throw new HttpsError('not-found', 'Établissement introuvable.');
  }

  const tenantData = tenantSnap.data() || {};
  const restaurantType: RestaurantTypeId =
    tenantData.restaurantType || tenantData.type || 'restaurant_classique';

  // Calcul certifié du devis côté serveur
  const quote = computeQuote({
    restaurantType,
    packId,
    billingCycle,
    selectedAddonIds: selectedAddons,
    capacities: additionalCapacities,
  });

  const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;
  const paymentReference = generatePaymentReference();
  const now = new Date().toISOString();

  const orderRecord = {
    id: orderId,
    orgId,
    paymentReference,
    restaurantType,
    packId,
    billingCycle,
    selectedAddons,
    additionalCapacities,
    quote,
    payableAmountFcfa: quote.finalPayableAmount,
    status: 'paiement_en_attente',
    createdAt: now,
    createdByUid: caller.uid,
    createdByEmail: caller.email,
  };

  const batch = db.batch();

  // Enregistrement de la commande sous le restaurant et dans l'index global
  const orgOrderRef = tenantRef.collection('subscription_orders').doc(orderId);
  const rootOrderRef = db.collection('subscription_orders').doc(orderId);
  batch.set(orgOrderRef, orderRecord);
  batch.set(rootOrderRef, orderRecord);

  // Mise à jour de l'état commercial du restaurant
  batch.update(tenantRef, {
    status: 'paiement_en_attente',
    currentSubscriptionOrderId: orderId,
    pendingPaymentReference: paymentReference,
    updatedAt: now,
  });

  await batch.commit();

  return {
    success: true,
    orderId,
    paymentReference,
    payableAmountFcfa: quote.finalPayableAmount,
    quote,
  };
}

// -----------------------------------------------------------------------------
// 2. Déclaration de Paiement Manuel Effectué (markPaymentSent)
// -----------------------------------------------------------------------------

export interface MarkPaymentSentRequest {
  orderId: string;
  paymentMethod: 'virement_bancaire' | 'orange_money' | 'mtn_momo' | 'cheque' | 'especes';
  transactionReference: string;
  payerNotes?: string;
  proofUrl?: string;
}

export async function handleMarkPaymentSent(
  request: CallableRequest<MarkPaymentSentRequest>
) {
  const caller = getCallerContext(request);
  const { orderId, paymentMethod, transactionReference, payerNotes, proofUrl } = request.data || {};

  if (!orderId || !paymentMethod || !transactionReference || transactionReference.trim().length < 3) {
    throw new HttpsError(
      'invalid-argument',
      'La commande, le mode de règlement et la référence de transaction sont obligatoires.'
    );
  }

  const orderRef = db.collection('subscription_orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Commande d\'abonnement introuvable.');
  }

  const orderData = orderSnap.data()!;
  if (orderData.orgId !== caller.organizationId && caller.role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Cette commande appartient à un autre établissement.');
  }

  const now = new Date().toISOString();
  const paymentProof = {
    paymentMethod,
    transactionReference: transactionReference.trim(),
    payerNotes: payerNotes ? payerNotes.trim() : null,
    proofUrl: proofUrl ? proofUrl.trim() : null,
    declaredAt: now,
    declaredByUid: caller.uid,
    declaredByEmail: caller.email,
  };

  const batch = db.batch();

  // Mise à jour de la commande
  batch.update(orderRef, {
    status: 'paiement_a_verifier',
    paymentProof,
    updatedAt: now,
  });

  // Mise à jour miroir dans la sous-collection du tenant
  const tenantOrderRef = db.collection('tenants').doc(orderData.orgId).collection('subscription_orders').doc(orderId);
  batch.update(tenantOrderRef, {
    status: 'paiement_a_verifier',
    paymentProof,
    updatedAt: now,
  });

  // Mise à jour de l'état du restaurant
  const tenantRef = db.collection('tenants').doc(orderData.orgId);
  batch.update(tenantRef, {
    status: 'paiement_a_verifier',
    updatedAt: now,
  });

  await batch.commit();

  return {
    success: true,
    message: 'Votre justificatif a été transmis avec succès. Notre service comptable valide votre accès dès vérification.',
  };
}

// -----------------------------------------------------------------------------
// 3. Validation Administrative et Activation (validateSubscriptionPayment)
// -----------------------------------------------------------------------------

export interface ValidateSubscriptionPaymentRequest {
  orderId: string;
  cashierNotes?: string;
  actualAmountReceivedFcfa?: number;
}

export async function handleValidateSubscriptionPayment(
  request: CallableRequest<ValidateSubscriptionPaymentRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'billing']);

  const { orderId, cashierNotes, actualAmountReceivedFcfa } = request.data || {};
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'Identifiant de commande requis.');
  }

  const orderRef = db.collection('subscription_orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Commande introuvable.');
  }

  const orderData = orderSnap.data()!;
  const orgId = orderData.orgId;

  if (orderData.status === 'actif' || orderData.status === 'valide') {
    return { success: true, message: 'Cette commande a déjà été validée et activée.' };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Calcul de la date d'échéance selon le cycle contractuel
  let endsAtDate = new Date(now);
  if (orderData.billingCycle === 'annuel') {
    endsAtDate.setFullYear(endsAtDate.getFullYear() + 1);
  } else if (orderData.billingCycle === 'a_vie') {
    endsAtDate.setFullYear(endsAtDate.getFullYear() + 99); // Licence perpétuelle
  } else {
    // Mensuel
    endsAtDate.setMonth(endsAtDate.getMonth() + 1);
  }
  const endsAtIso = endsAtDate.toISOString();

  // Génération de la facture scellée
  const invoiceNumber = generateInvoiceNumber();
  const quote: QuoteResult = orderData.quote;

  const invoiceRecord = {
    id: invoiceNumber,
    invoiceNumber,
    orgId,
    orderId,
    paymentReference: orderData.paymentReference,
    amountHT: quote.subtotalHT,
    taxRate: quote.tvaRate,
    taxAmount: quote.taxAmount,
    totalTTC: quote.totalTTC,
    payableAmount: quote.finalPayableAmount,
    billingCycle: orderData.billingCycle,
    packId: orderData.packId,
    lines: quote.lines,
    validatedByAdminEmail: caller.email,
    validatedByAdminUid: caller.uid,
    issuedAt: nowIso,
    cashierNotes: cashierNotes ? cashierNotes.trim() : null,
  };

  // Résolution certifiée des droits applicables
  const resolvedEntitlements = resolveEntitlements({
    orgId,
    restaurantType: orderData.restaurantType || 'restaurant_classique',
    packId: orderData.packId,
    subscribedAddons: orderData.selectedAddons || [],
    capacities: orderData.additionalCapacities || {},
    updatedBy: `platform_admin:${caller.email}`,
  });

  const tenantRef = db.collection('tenants').doc(orgId);

  // Enregistrement atomique
  const batch = db.batch();

  // 1. Commande d'abonnement mise à jour
  const updateOrderPayload = {
    status: 'valide',
    validatedAt: nowIso,
    validatedByEmail: caller.email,
    invoiceNumber,
    actualAmountReceivedFcfa: actualAmountReceivedFcfa || quote.finalPayableAmount,
    updatedAt: nowIso,
  };
  batch.update(orderRef, updateOrderPayload);
  batch.update(tenantRef.collection('subscription_orders').doc(orderId), updateOrderPayload);

  // 2. Facture enregistrée
  batch.set(tenantRef.collection('invoices').doc(invoiceNumber), invoiceRecord);
  batch.set(db.collection('platform_invoices').doc(invoiceNumber), invoiceRecord);

  // 3. Fiche d'abonnement actif dans tenants/{orgId}/subscription/current
  const subscriptionCurrentRecord = {
    packId: orderData.packId,
    billingCycle: orderData.billingCycle,
    selectedAddons: orderData.selectedAddons || [],
    additionalCapacities: orderData.additionalCapacities || {},
    startsAt: nowIso,
    endsAt: endsAtIso,
    active: true,
    invoiceNumber,
    orderId,
    paymentReference: orderData.paymentReference,
    lifetimeMaintenanceNextDue:
      orderData.billingCycle === 'a_vie'
        ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    updatedAt: nowIso,
  };
  batch.set(tenantRef.collection('subscription').doc('current'), subscriptionCurrentRecord);

  // 4. Droits et statut mis à jour sur le restaurant : passage à "actif"
  batch.update(tenantRef, {
    status: 'actif',
    packId: orderData.packId,
    planId: orderData.packId,
    subscriptionEndsAt: endsAtIso,
    currentInvoiceNumber: invoiceNumber,
    entitlements: resolvedEntitlements,
    updatedAt: nowIso,
  });

  batch.set(tenantRef.collection('entitlements').doc('current'), resolvedEntitlements, { merge: true });

  await batch.commit();

  // Journal d'audit plateforme
  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'ACTIVATE_SUBSCRIPTION',
    detail: `Validation du règlement et activation du pack ${orderData.packId} (${orderData.billingCycle}) pour le restaurant ${orgId}. Facture ${invoiceNumber} émise.`,
    reason: cashierNotes ? cashierNotes.trim() : 'Paiement vérifié et conforme.',
    targetOrgId: orgId,
    after: {
      orderId,
      invoiceNumber,
      packId: orderData.packId,
      billingCycle: orderData.billingCycle,
      endsAt: endsAtIso,
    },
  });

  return {
    success: true,
    invoiceNumber,
    endsAt: endsAtIso,
    message: 'Paiement validé avec succès. L\'abonnement du restaurant est désormais pleinement actif.',
  };
}

// -----------------------------------------------------------------------------
// 4. Rejet Administratif d'un Paiement (rejectSubscriptionPayment)
// -----------------------------------------------------------------------------

export interface RejectSubscriptionPaymentRequest {
  orderId: string;
  rejectionReason: string;
}

export async function handleRejectSubscriptionPayment(
  request: CallableRequest<RejectSubscriptionPaymentRequest>
) {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin', 'billing']);

  const { orderId, rejectionReason } = request.data || {};
  if (!orderId || !rejectionReason || rejectionReason.trim().length < 5) {
    throw new HttpsError(
      'invalid-argument',
      'Un identifiant de commande et un motif de rejet explicite (au moins 5 caractères) sont obligatoires.'
    );
  }

  const orderRef = db.collection('subscription_orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Commande introuvable.');
  }

  const orderData = orderSnap.data()!;
  const orgId = orderData.orgId;
  const now = new Date().toISOString();

  const batch = db.batch();

  const rejectPayload = {
    status: 'paiement_en_attente',
    lastRejectionReason: rejectionReason.trim(),
    rejectedAt: now,
    rejectedByEmail: caller.email,
    updatedAt: now,
  };

  batch.update(orderRef, rejectPayload);
  batch.update(db.collection('tenants').doc(orgId).collection('subscription_orders').doc(orderId), rejectPayload);

  // Le restaurant repasse en état de paiement en attente
  batch.update(db.collection('tenants').doc(orgId), {
    status: 'paiement_en_attente',
    lastPaymentRejectionReason: rejectionReason.trim(),
    updatedAt: now,
  });

  await batch.commit();

  await appendPlatformAuditLog({
    actorUid: caller.uid,
    actorEmail: caller.email,
    actorRole: caller.platformRole,
    action: 'REJECT_SUBSCRIPTION_PAYMENT',
    detail: `Rejet du justificatif de paiement pour la commande ${orderId} (${orgId}). Motif : ${rejectionReason.trim()}`,
    reason: rejectionReason.trim(),
    targetOrgId: orgId,
  });

  return {
    success: true,
    message: 'Justificatif rejeté. Le restaurant a été notifié et invité à fournir un nouveau justificatif.',
  };
}

// -----------------------------------------------------------------------------
// 5. Surveillance Quotidienne & Dégradation Programmée (dailySubscriptionCheck)
// -----------------------------------------------------------------------------

export async function handleDailySubscriptionCheck() {
  const now = new Date();
  const nowIso = now.toISOString();

  // Recherche de tous les restaurants actifs
  const activeTenantsSnap = await db.collection('tenants').where('status', 'in', ['actif', 'impaye']).get();

  let graceCount = 0;
  let suspendedCount = 0;

  for (const docSnap of activeTenantsSnap.docs) {
    const tenant = docSnap.data();
    const endsAtStr = tenant.subscriptionEndsAt;
    if (!endsAtStr) continue;

    const endsAt = new Date(endsAtStr);
    const diffMs = now.getTime() - endsAt.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    // Si échéance dépassée depuis plus de 7 jours (fin de période de grâce) -> suspension
    if (diffDays > 7 && tenant.status !== 'suspendu') {
      await docSnap.ref.update({
        status: 'suspendu',
        suspensionMode: 'read_only',
        suspensionReason: `Abonnement échu depuis ${diffDays} jours (délai de grâce de 7 jours expiré).`,
        updatedAt: nowIso,
      });
      suspendedCount++;
    }
    // Si échéance dépassée mais <= 7 jours -> passage en impayé (grâce active, vente bloquée, lecture seule)
    else if (diffDays > 0 && diffDays <= 7 && tenant.status === 'actif') {
      await docSnap.ref.update({
        status: 'impaye',
        gracePeriodEndsAt: new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: nowIso,
      });
      graceCount++;
    }
  }

  return {
    success: true,
    evaluatedTenants: activeTenantsSnap.size,
    transitionedToGrace: graceCount,
    transitionedToSuspended: suspendedCount,
  };
}
