/**
 * RestoMaster OS — Moteur de tarification et calcul de devis (Server-side & Shared)
 * Source unique de vérité pour le calcul des prix, remises, taxes et cycles.
 */

import {
  PackId,
  BillingCycle,
  RestaurantTypeId,
  CATALOG_PACKS,
  CATALOG_ADDONS,
  CAPACITY_PRICING,
  DEFAULT_CATALOG_SETTINGS,
  CatalogSettings,
  RESTAURANT_TYPES,
} from './packs';

export interface ExtraCapacities {
  extraUsers?: number;
  extraTerminals?: number;
  extraOrdersBlocks?: number; // Blocs de 5 000 commandes
  extraOutlets?: number;      // Établissements supplémentaires
}

export interface QuoteLineItem {
  id: string;
  label: string;
  category: 'pack' | 'addon' | 'capacity';
  unitPriceMonthly: number;
  quantity: number;
  cycleMultiplier: number;
  subtotalHT: number;
}

export interface NextPackSuggestion {
  suggestedPackId: PackId;
  suggestedPackName: string;
  reason: string;
  currentOptionsTotalMonthly: number;
  priceDifferenceMonthly: number;
  additionalCostMonthly: number; // Coût supplémentaire pour passer au pack supérieur
  savingsOrBenefits: string;
}

export interface QuoteResult {
  restaurantType: RestaurantTypeId;
  packId: PackId;
  packName: string;
  billingCycle: BillingCycle;
  lines: QuoteLineItem[];
  subtotalHT: number;
  taxMode: 'HT' | 'TTC';
  tvaRate: number;
  taxAmount: number;
  totalTTC: number;
  finalPayableAmount: number; // Montant exigé selon taxMode
  monthlyEquivalent: number;  // Équivalent mensuel lissé
  lifetimeMaintenanceAnnual?: number; // Montant annuel de maintenance pour licence à vie
  annualSavings?: number;     // Économie réalisée par rapport à 12 mois
  nextPackSuggestion?: NextPackSuggestion;
  catalogVersion: string;
  computedAt: string;
}

export interface ComputeQuoteInput {
  restaurantType: RestaurantTypeId;
  packId: PackId;
  billingCycle: BillingCycle;
  selectedAddonIds?: string[];
  capacities?: ExtraCapacities;
  settings?: Partial<CatalogSettings>;
  catalogVersion?: string;
}

/**
 * Arrondit un montant selon le pas configuré (ex: 500 FCFA).
 */
export function roundPrice(amount: number, step = 500): number {
  if (step <= 1) return Math.round(amount);
  return Math.round(amount / step) * step;
}

/**
 * Obtient le multiplicateur de facturation pour un cycle donné.
 */
export function getCycleMultiplier(cycle: BillingCycle, settings = DEFAULT_CATALOG_SETTINGS): number {
  switch (cycle) {
    case 'mensuel':
      return 1;
    case 'annuel':
      return settings.annualMultiplier; // 10
    case 'a_vie':
      return settings.lifetimeMultiplier; // 25
    default:
      return 1;
  }
}

/**
 * Calcule le devis complet et certifié pour un panier d'abonnement.
 */
export function computeQuote(input: ComputeQuoteInput): QuoteResult {
  const settings: CatalogSettings = {
    ...DEFAULT_CATALOG_SETTINGS,
    ...(input.settings || {}),
  };

  const pack = CATALOG_PACKS[input.packId];
  if (!pack) {
    throw new Error(`Pack inconnu : ${input.packId}`);
  }

  const typeDef = RESTAURANT_TYPES[input.restaurantType];
  if (!typeDef) {
    throw new Error(`Type de restaurant inconnu : ${input.restaurantType}`);
  }

  const cycleMultiplier = getCycleMultiplier(input.billingCycle, settings);
  const lines: QuoteLineItem[] = [];

  // 1. Ligne du Pack principal
  const packPriceMonthly = pack.priceMonthly;
  const packSubtotalHT = packPriceMonthly * cycleMultiplier;

  lines.push({
    id: `pack_${pack.id}`,
    label: `Abonnement ${pack.name} (${input.billingCycle === 'mensuel' ? 'Mensuel' : input.billingCycle === 'annuel' ? 'Annuel (10 mois facturés)' : 'Licence À vie'})`,
    category: 'pack',
    unitPriceMonthly: packPriceMonthly,
    quantity: 1,
    cycleMultiplier,
    subtotalHT: packSubtotalHT,
  });

  // Modules déjà inclus dans ce pack pour ce type d'établissement
  const includedModulesInTier = new Set<string>([
    ...typeDef.coreModules,
    ...(typeDef.tierModules[input.packId] || []),
  ]);

  // 2. Options à la carte (Addons)
  let totalAddonsMonthly = 0;
  const selectedAddons = input.selectedAddonIds || [];

  for (const addonId of selectedAddons) {
    const addon = CATALOG_ADDONS.find((a) => a.id === addonId || a.key === addonId);
    if (!addon) continue;

    // Si le module lié à cette option est déjà inclus d'office dans ce pack, l'option est offerte / inutile de facturer
    if (addon.moduleKey && includedModulesInTier.has(addon.moduleKey)) {
      continue;
    }

    const addonPriceMonthly = addon.priceMonthly;
    totalAddonsMonthly += addonPriceMonthly;
    const addonSubtotal = addonPriceMonthly * cycleMultiplier;

    lines.push({
      id: addon.id,
      label: `Option : ${addon.name}`,
      category: 'addon',
      unitPriceMonthly: addonPriceMonthly,
      quantity: 1,
      cycleMultiplier,
      subtotalHT: addonSubtotal,
    });
  }

  // 3. Capacités additionnelles
  const caps = input.capacities || {};

  // Extra Terminals
  if (caps.extraTerminals && caps.extraTerminals > 0) {
    const unitPrice = CAPACITY_PRICING.extraTerminalMonthly; // 3 000
    const subtotal = unitPrice * caps.extraTerminals * cycleMultiplier;
    lines.push({
      id: 'cap_terminals',
      label: `Terminaux supplémentaires (+${caps.extraTerminals})`,
      category: 'capacity',
      unitPriceMonthly: unitPrice,
      quantity: caps.extraTerminals,
      cycleMultiplier,
      subtotalHT: subtotal,
    });
  }

  // Extra Users
  if (caps.extraUsers && caps.extraUsers > 0) {
    const unitPrice = CAPACITY_PRICING.extraUserMonthly; // 1 000
    const subtotal = unitPrice * caps.extraUsers * cycleMultiplier;
    lines.push({
      id: 'cap_users',
      label: `Utilisateurs supplémentaires (+${caps.extraUsers})`,
      category: 'capacity',
      unitPriceMonthly: unitPrice,
      quantity: caps.extraUsers,
      cycleMultiplier,
      subtotalHT: subtotal,
    });
  }

  // Extra Orders Blocks (5 000 par bloc)
  if (caps.extraOrdersBlocks && caps.extraOrdersBlocks > 0) {
    const unitPrice = CAPACITY_PRICING.extraOrdersBlockMonthly; // 3 000
    const subtotal = unitPrice * caps.extraOrdersBlocks * cycleMultiplier;
    lines.push({
      id: 'cap_orders',
      label: `Blocs de commandes supplémentaires (+${caps.extraOrdersBlocks * CAPACITY_PRICING.ordersBlockSize} cdes/mois)`,
      category: 'capacity',
      unitPriceMonthly: unitPrice,
      quantity: caps.extraOrdersBlocks,
      cycleMultiplier,
      subtotalHT: subtotal,
    });
  }

  // Extra Outlets (60% du pack mensuel)
  if (caps.extraOutlets && caps.extraOutlets > 0) {
    const unitPrice = roundPrice(packPriceMonthly * CAPACITY_PRICING.extraOutletPercentOfPack, settings.roundStep);
    const subtotal = unitPrice * caps.extraOutlets * cycleMultiplier;
    lines.push({
      id: 'cap_outlets',
      label: `Établissements supplémentaires (+${caps.extraOutlets})`,
      category: 'capacity',
      unitPriceMonthly: unitPrice,
      quantity: caps.extraOutlets,
      cycleMultiplier,
      subtotalHT: subtotal,
    });
  }

  // 4. Calculs des totaux HT, TVA, TTC
  const subtotalHT = lines.reduce((acc, line) => acc + line.subtotalHT, 0);
  const taxAmount = roundPrice(subtotalHT * settings.tvaRate, 1);
  const totalTTC = subtotalHT + taxAmount;
  const finalPayableAmount = settings.taxMode === 'TTC' ? totalTTC : subtotalHT;

  // 5. Calcul de l'équivalent mensuel
  let monthsDivider = 1;
  if (input.billingCycle === 'annuel') monthsDivider = 12;
  else if (input.billingCycle === 'a_vie') monthsDivider = settings.lifetimeMultiplier; // 25
  const monthlyEquivalent = Math.round(finalPayableAmount / monthsDivider);

  // 6. Économie annuelle éventuelle
  let annualSavings: number | undefined;
  if (input.billingCycle === 'annuel') {
    const fullYearWithoutDiscount = lines.reduce(
      (acc, l) => acc + l.unitPriceMonthly * l.quantity * 12,
      0
    );
    annualSavings = fullYearWithoutDiscount - subtotalHT;
  }

  // 7. Maintenance annuelle pour licence à vie (2.4 x pack mensuel)
  let lifetimeMaintenanceAnnual: number | undefined;
  if (input.billingCycle === 'a_vie') {
    lifetimeMaintenanceAnnual = roundPrice(
      packPriceMonthly * settings.lifetimeMaintenanceMultiplier,
      settings.roundStep
    );
  }

  // 8. Suggestion intelligente de surclassement (Next Pack)
  let nextPackSuggestion: NextPackSuggestion | undefined;

  let higherPackId: PackId | null = null;
  if (input.packId === 'minimum') higherPackId = 'medium';
  else if (input.packId === 'medium') higherPackId = 'premium';

  if (higherPackId) {
    const higherPack = CATALOG_PACKS[higherPackId];
    const packDiffMonthly = higherPack.priceMonthly - pack.priceMonthly;

    // Règle d'or : si le montant mensuel des options choisies atteint >= 80% de l'écart de prix
    if (totalAddonsMonthly >= packDiffMonthly * 0.8) {
      const additionalCost = Math.max(0, packDiffMonthly - totalAddonsMonthly);
      nextPackSuggestion = {
        suggestedPackId: higherPackId,
        suggestedPackName: higherPack.name,
        currentOptionsTotalMonthly: totalAddonsMonthly,
        priceDifferenceMonthly: packDiffMonthly,
        additionalCostMonthly: additionalCost,
        reason: `Vos options à la carte s’élèvent à ${totalAddonsMonthly.toLocaleString('fr-FR')} FCFA/mois, ce qui représente l'essentiel de l'écart avec le pack ${higherPack.name} (${packDiffMonthly.toLocaleString('fr-FR')} FCFA/mois).`,
        savingsOrBenefits:
          additionalCost === 0
            ? `Le pack ${higherPack.name} vous reviendrait au même prix ou moins cher, avec des quotas doublés et plus de fonctionnalités !`
            : `Pour seulement ${additionalCost.toLocaleString('fr-FR')} FCFA/mois de plus, accédez à tous les modules du pack ${higherPack.name} et décuplez vos limites.`,
      };
    }
  }

  return {
    restaurantType: input.restaurantType,
    packId: input.packId,
    packName: pack.name,
    billingCycle: input.billingCycle,
    lines,
    subtotalHT,
    taxMode: settings.taxMode,
    tvaRate: settings.tvaRate,
    taxAmount,
    totalTTC,
    finalPayableAmount,
    monthlyEquivalent,
    lifetimeMaintenanceAnnual,
    annualSavings,
    nextPackSuggestion,
    catalogVersion: input.catalogVersion || '2026.1',
    computedAt: new Date().toISOString(),
  };
}
