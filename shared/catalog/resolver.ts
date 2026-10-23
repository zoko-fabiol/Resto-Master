/**
 * RestoMaster OS — Moteur de Résolution des Droits & Limites (Entitlements Resolver)
 * Source unique de vérité pour déduire les modules, fonctionnalités et quotas effectifs
 * d'un établissement à partir de son type, son pack, ses options et ses overrides.
 */

import {
  TenantEntitlements,
  TenantLimits,
  TenantFeatureEntitlement,
  TenantStatus,
  TenantSuspensionMode,
} from '../types/tenant';
import {
  PackId,
  RestaurantTypeId,
  CATALOG_PACKS,
  CATALOG_ADDONS,
  RESTAURANT_TYPES,
  CORE_MODULES,
  CAPACITY_PRICING,
} from './packs';
import { ExtraCapacities } from './pricing';
import { FEATURE_CATALOG } from '../types/features';

export interface ResolveEntitlementsInput {
  orgId: string;
  restaurantType: RestaurantTypeId;
  packId: PackId;
  subscribedAddons?: string[];
  capacities?: ExtraCapacities;
  overrides?: {
    modules?: Record<string, boolean>;
    features?: Record<string, TenantFeatureEntitlement>;
    limits?: Partial<TenantLimits>;
    lockedConfigKeys?: string[];
  };
  tenantStatus?: TenantStatus;
  suspensionMode?: TenantSuspensionMode;
  updatedBy?: string;
}

export interface EntitlementsCheckResult {
  isReadOnly: boolean;
  isFullyBlocked: boolean;
  allowedModules: string[];
  blockedModules: string[];
  effectiveLimits: TenantLimits;
}

/**
 * Détermine si le tenant est en lecture seule ou complètement bloqué selon son statut.
 */
export function getTenantAccessStatus(
  status?: TenantStatus,
  suspensionMode?: TenantSuspensionMode
): { isReadOnly: boolean; isFullyBlocked: boolean } {
  if (!status) return { isReadOnly: false, isFullyBlocked: false };

  if (status === 'suspendu') {
    if (suspensionMode === 'full_block') {
      return { isReadOnly: false, isFullyBlocked: true };
    }
    return { isReadOnly: true, isFullyBlocked: false };
  }

  if (status === 'impaye') {
    return { isReadOnly: true, isFullyBlocked: false };
  }

  if (status === 'resilie' || status === 'archive') {
    return { isReadOnly: false, isFullyBlocked: true };
  }

  return { isReadOnly: false, isFullyBlocked: false };
}

/**
 * Résout l'ensemble complet des droits (modules, features, limites, règles opérationnelles)
 * pour un restaurant donné. Idempotent et sans effet de bord.
 */
export function resolveEntitlements(input: ResolveEntitlementsInput): TenantEntitlements {
  const {
    orgId,
    restaurantType,
    packId,
    subscribedAddons = [],
    capacities = {},
    overrides = {},
    updatedBy = 'system:catalog_resolver',
  } = input;

  const pack = CATALOG_PACKS[packId] || CATALOG_PACKS.minimum;
  const typeDef = RESTAURANT_TYPES[restaurantType] || RESTAURANT_TYPES.restaurant_classique;

  // -------------------------------------------------------------------------
  // 1. Détermination des modules activés
  // -------------------------------------------------------------------------
  const modules: Record<string, boolean> = {};

  // Tous les modules connus initialisés à false par défaut
  const allKnownModuleKeys = new Set<string>([
    ...CORE_MODULES,
    'mod_tables',
    'mod_bar_pos',
    'mod_cuisine',
    'mod_bar',
    'mod_recipes_yield',
    'mod_stock',
    'mod_purchases',
    'mod_delivery',
    'mod_events',
    'mod_clients',
    'mod_staff',
    'mod_documents',
    'mod_hygiene',
    'mod_finance',
    'mod_main_courante',
    'mod_fiscal',
  ]);

  for (const mKey of allKnownModuleKeys) {
    modules[mKey] = false;
  }

  // A. Activer le socle commun obligatoire
  for (const coreMod of typeDef.coreModules) {
    modules[coreMod] = true;
  }

  // B. Activer les modules inclus par le palier de pack pour ce type
  const tierMods = typeDef.tierModules[packId] || [];
  for (const tierMod of tierMods) {
    modules[tierMod] = true;
  }

  // C. Activer les modules liés aux options souscrites à la carte
  for (const addonId of subscribedAddons) {
    const addon = CATALOG_ADDONS.find((a) => a.id === addonId || a.key === addonId);
    if (addon?.moduleKey) {
      modules[addon.moduleKey] = true;
    }
  }

  // D. Appliquer les overrides administrateur sur les modules (priorité absolue)
  if (overrides.modules) {
    for (const [modKey, isEnabled] of Object.entries(overrides.modules)) {
      modules[modKey] = isEnabled;
    }
  }

  // -------------------------------------------------------------------------
  // 2. Détermination des fonctionnalités (Features)
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const features: Record<string, TenantFeatureEntitlement> = {};

  // Résoudre l'état de chaque fonctionnalité du catalogue de base
  for (const feat of FEATURE_CATALOG) {
    const isModuleActive = Boolean(modules[feat.moduleKey]);

    // Une feature est active par défaut si son module parent est actif
    // ET qu'elle est marquée defaultEnabled dans le catalogue
    let isFeatActive = isModuleActive && feat.defaultEnabled;

    // Si une option spécifique active directement cette feature
    const matchingAddon = CATALOG_ADDONS.find(
      (a) => a.featureKey === feat.key && subscribedAddons.includes(a.id)
    );
    if (matchingAddon && isModuleActive) {
      isFeatActive = true;
    }

    // Gestion des dépendances entre features
    if (feat.dependencies && feat.dependencies.length > 0) {
      for (const depKey of feat.dependencies) {
        // Si une dépendance n'est pas remplie, la feature ne peut être active
        const depFeat = FEATURE_CATALOG.find((f) => f.key === depKey);
        if (depFeat && !modules[depFeat.moduleKey]) {
          isFeatActive = false;
        }
      }
    }

    features[feat.key] = {
      status: isFeatActive ? 'ACTIVÉ' : 'DÉSACTIVÉ',
      source: 'plan',
      activatedBy: updatedBy,
      activatedAt: now,
    };
  }

  // Appliquer les overrides administrateur sur les features (priorité absolue)
  if (overrides.features) {
    for (const [featKey, overrideEntitlement] of Object.entries(overrides.features)) {
      features[featKey] = overrideEntitlement;
    }
  }

  // -------------------------------------------------------------------------
  // 3. Calcul des limites effectives (Pack + Capacités + Overrides)
  // -------------------------------------------------------------------------
  const baseLimits = pack.limits;
  const extraUsers = capacities.extraUsers || 0;
  const extraTerminals = capacities.extraTerminals || 0;
  const extraOrdersBlocks = capacities.extraOrdersBlocks || 0;
  const extraOutlets = capacities.extraOutlets || 0;

  const effectiveLimits: TenantLimits = {
    maxOutlets: baseLimits.maxOutlets + extraOutlets,
    maxUsers: baseLimits.maxUsers + extraUsers,
    maxTerminals: baseLimits.maxTerminals + extraTerminals,
    maxOrdersPerMonth:
      baseLimits.maxOrdersPerMonth + extraOrdersBlocks * CAPACITY_PRICING.ordersBlockSize,
    ...(overrides.limits || {}),
  };

  // -------------------------------------------------------------------------
  // 4. Règles d'exploitation (operationRules)
  // -------------------------------------------------------------------------
  const operationRules: Record<string, boolean> = {
    ...modules,
    res_management: Boolean(modules.mod_tables && features.table_reservations?.status === 'ACTIVÉ'),
  };

  // -------------------------------------------------------------------------
  // 5. Clés de configuration verrouillées
  // -------------------------------------------------------------------------
  const lockedConfigKeys = Array.from(
    new Set([
      ...(overrides.lockedConfigKeys || []),
      ...(modules.mod_fiscal ? ['tax_compliance_mode'] : []),
    ])
  );

  return {
    orgId,
    modules,
    features,
    operationRules,
    lockedConfigKeys,
    effectiveLimits,
    updatedAt: now,
    updatedBy,
  };
}

/**
 * Vérifie si un module spécifique est autorisé pour un tenant.
 */
export function isModuleEntitled(
  moduleKey: string,
  entitlements?: TenantEntitlements | null
): boolean {
  if (!entitlements || !entitlements.modules) {
    // Par défaut, refus strict si pas d'entitlements définis
    return false;
  }
  return Boolean(entitlements.modules[moduleKey]);
}

/**
 * Vérifie si une fonctionnalité spécifique est autorisée pour un tenant.
 */
export function isFeatureEntitled(
  featureKey: string,
  entitlements?: TenantEntitlements | null
): boolean {
  if (!entitlements || !entitlements.features) {
    return false;
  }
  const feat = entitlements.features[featureKey];
  return feat?.status === 'ACTIVÉ';
}
