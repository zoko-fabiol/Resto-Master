/**
 * RestoMaster OS — Module Cloud Functions v2 : Gestion du Catalogue et Calcul de Devis
 */

import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebase.js';
import {
  PackId,
  RestaurantTypeId,
  BillingCycle,
  CATALOG_PACKS,
  RESTAURANT_TYPES,
  CATALOG_ADDONS,
} from '../shared/catalog/packs.js';
import { computeQuote, QuoteResult } from '../shared/catalog/pricing.js';
import { resolveEntitlements } from '../shared/catalog/resolver.js';
import { TenantEntitlements } from '../shared/types/tenant.js';
import { getCallerPlatformContext, assertPlatformRole } from '../auth.js';

export interface ComputeQuoteRequestData {
  packId: PackId;
  restaurantType: RestaurantTypeId;
  billingCycle: BillingCycle;
  selectedAddons?: string[];
  additionalCapacities?: {
    extraTerminals?: number;
    extraUsers?: number;
    extraOrdersBlocks?: number;
    extraOutlets?: number;
  };
}

export interface ComputeQuoteResponseData {
  quote: QuoteResult;
  entitlements: TenantEntitlements;
}

/**
 * Calcul infalsifiable de devis d'abonnement côté serveur
 */
export async function handleComputeQuote(
  request: CallableRequest<ComputeQuoteRequestData>
): Promise<ComputeQuoteResponseData> {
  const { packId, restaurantType, billingCycle, selectedAddons = [], additionalCapacities = {} } = request.data || {};

  if (!packId || !CATALOG_PACKS[packId]) {
    throw new HttpsError(
      'invalid-argument',
      `Pack invalide : ${packId}. Valeurs acceptées : 'minimum', 'medium', 'premium'.`
    );
  }

  if (!restaurantType || !RESTAURANT_TYPES[restaurantType]) {
    throw new HttpsError(
      'invalid-argument',
      `Type d'établissement invalide : ${restaurantType}.`
    );
  }

  if (!billingCycle || !['mensuel', 'annuel', 'a_vie'].includes(billingCycle)) {
    throw new HttpsError(
      'invalid-argument',
      `Cycle de facturation invalide : ${billingCycle}. Valeurs acceptées : 'mensuel', 'annuel', 'a_vie'.`
    );
  }

  // Vérification de validité des addons demandés
  const validAddonIds = new Set(CATALOG_ADDONS.map((a) => a.id));
  const cleanAddons = selectedAddons.filter((id) => validAddonIds.has(id));

  // Assainissement des capacités supplémentaires
  const cleanCapacities = {
    extraTerminals: Math.max(0, Math.floor(additionalCapacities.extraTerminals || 0)),
    extraUsers: Math.max(0, Math.floor(additionalCapacities.extraUsers || 0)),
    extraOrdersBlocks: Math.max(0, Math.floor(additionalCapacities.extraOrdersBlocks || 0)),
    extraOutlets: Math.max(0, Math.floor(additionalCapacities.extraOutlets || 0)),
  };

  // Calcul certifié du devis
  const quote = computeQuote({
    restaurantType,
    packId,
    billingCycle,
    selectedAddonIds: cleanAddons,
    capacities: cleanCapacities,
  });

  // Calcul des droits et plafonds résultants
  const entitlements = resolveEntitlements({
    orgId: 'quote_preview',
    restaurantType,
    packId,
    subscribedAddons: cleanAddons,
    capacities: cleanCapacities,
  });

  return {
    quote,
    entitlements,
  };
}

export interface UpdateCatalogRequestData {
  collectionType: 'packs' | 'addons' | 'types' | 'settings';
  itemId?: string;
  data: Record<string, unknown>;
}

/**
 * Mise à jour administrative du catalogue dans Firestore (réservé aux admins plateforme)
 */
export async function handleUpdateCatalog(
  request: CallableRequest<UpdateCatalogRequestData>
): Promise<{ success: boolean; message: string }> {
  const caller = getCallerPlatformContext(request);
  assertPlatformRole(caller, ['platform_owner', 'platform_admin']);

  const { collectionType, itemId, data } = request.data || {};

  if (!collectionType || !['packs', 'addons', 'types', 'settings'].includes(collectionType)) {
    throw new HttpsError('invalid-argument', 'Type de collection de catalogue invalide.');
  }

  if (collectionType !== 'settings' && !itemId) {
    throw new HttpsError('invalid-argument', `itemId requis pour la collection ${collectionType}.`);
  }

  let docRef;
  if (collectionType === 'settings') {
    docRef = db.doc('catalog/settings/global/billing');
  } else {
    docRef = db.doc(`catalog/${collectionType}/items/${itemId}`);
  }

  const now = new Date().toISOString();
  await docRef.set(
    {
      ...data,
      updatedAt: now,
      updatedBy: caller.email || caller.uid,
    },
    { merge: true }
  );

  // Journal d'audit plateforme
  await db.collection('platform_audit_logs').add({
    action: 'update_catalog_item',
    target: `${collectionType}/${itemId || 'billing'}`,
    adminEmail: caller.email,
    adminUid: caller.uid,
    timestamp: now,
    details: { collectionType, itemId, fieldsUpdated: Object.keys(data || {}) },
  });

  return {
    success: true,
    message: `Élément de catalogue ${collectionType}/${itemId || 'billing'} mis à jour avec succès.`,
  };
}
