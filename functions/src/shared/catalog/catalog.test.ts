import { describe, it, expect } from 'vitest';
import {
  CATALOG_PACKS,
  CATALOG_ADDONS,
  RESTAURANT_TYPES,
  CAPACITY_PRICING,
  DEFAULT_CATALOG_SETTINGS,
  RestaurantTypeId,
} from './packs';
import { computeQuote, roundPrice } from './pricing';
import {
  resolveEntitlements,
  isModuleEntitled,
  isFeatureEntitled,
  getTenantAccessStatus,
} from './resolver';

describe('Shared Catalog — Valeurs de référence et Intégrité', () => {
  it('contient les 3 packs officiels avec les tarifs mensuels exacts', () => {
    expect(CATALOG_PACKS.minimum.priceMonthly).toBe(25000);
    expect(CATALOG_PACKS.medium.priceMonthly).toBe(35000);
    expect(CATALOG_PACKS.premium.priceMonthly).toBe(50000);
  });

  it('respecte les limites opérationnelles de chaque pack', () => {
    // Minimum
    expect(CATALOG_PACKS.minimum.limits).toEqual({
      maxOutlets: 1,
      maxUsers: 3,
      maxTerminals: 1,
      maxOrdersPerMonth: 1500,
    });

    // Médium
    expect(CATALOG_PACKS.medium.limits).toEqual({
      maxOutlets: 1,
      maxUsers: 8,
      maxTerminals: 3,
      maxOrdersPerMonth: 6000,
    });

    // Premium
    expect(CATALOG_PACKS.premium.limits).toEqual({
      maxOutlets: 1,
      maxUsers: 20,
      maxTerminals: 8,
      maxOrdersPerMonth: 20000,
    });
  });

  it('calcule exactement les cycles annuel (x10) et à vie (x25)', () => {
    const minAnnual = CATALOG_PACKS.minimum.priceMonthly * DEFAULT_CATALOG_SETTINGS.annualMultiplier;
    const medAnnual = CATALOG_PACKS.medium.priceMonthly * DEFAULT_CATALOG_SETTINGS.annualMultiplier;
    const premAnnual = CATALOG_PACKS.premium.priceMonthly * DEFAULT_CATALOG_SETTINGS.annualMultiplier;

    expect(minAnnual).toBe(250000);
    expect(medAnnual).toBe(350000);
    expect(premAnnual).toBe(500000);

    const minLifetime = CATALOG_PACKS.minimum.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMultiplier;
    const medLifetime = CATALOG_PACKS.medium.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMultiplier;
    const premLifetime = CATALOG_PACKS.premium.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMultiplier;

    expect(minLifetime).toBe(625000);
    expect(medLifetime).toBe(875000);
    expect(premLifetime).toBe(1250000);
  });

  it('calcule la maintenance annuelle de la licence à vie (2.4 x mensuel)', () => {
    const minMaint = CATALOG_PACKS.minimum.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMaintenanceMultiplier;
    const medMaint = CATALOG_PACKS.medium.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMaintenanceMultiplier;
    const premMaint = CATALOG_PACKS.premium.priceMonthly * DEFAULT_CATALOG_SETTINGS.lifetimeMaintenanceMultiplier;

    expect(minMaint).toBe(60000);
    expect(medMaint).toBe(84000);
    expect(premMaint).toBe(120000);
  });

  it('contient toutes les options par défaut aux tarifs mensuels exigés', () => {
    const findAddon = (name: string) => CATALOG_ADDONS.find((a) => a.name.toLowerCase() === name.toLowerCase());

    // 1 500 FCFA
    expect(findAddon('Plan de salle')?.priceMonthly).toBe(1500);
    expect(findAddon('Réservations')?.priceMonthly).toBe(1500);
    expect(findAddon('Espace Bar')?.priceMonthly).toBe(1500);
    expect(findAddon('Cuisine KDS')?.priceMonthly).toBe(1500);
    expect(findAddon('Bar KDS')?.priceMonthly).toBe(1500);
    expect(findAddon('Documents')?.priceMonthly).toBe(1500);
    expect(findAddon('Fidélité')?.priceMonthly).toBe(1500);

    // 2 000 FCFA
    expect(findAddon('Livraisons')?.priceMonthly).toBe(2000);

    // 2 500 FCFA
    expect(findAddon('Événements')?.priceMonthly).toBe(2500);
    expect(findAddon('Clients')?.priceMonthly).toBe(2500);
    expect(findAddon('Personnel')?.priceMonthly).toBe(2500);
    expect(findAddon('HACCP')?.priceMonthly).toBe(2500);

    // 3 000 FCFA
    expect(findAddon('Finances')?.priceMonthly).toBe(3000);

    // 3 500 FCFA
    expect(findAddon('Stocks')?.priceMonthly).toBe(3500);
    expect(findAddon('Achats')?.priceMonthly).toBe(3500);
    expect(findAddon('Fiches techniques')?.priceMonthly).toBe(3500);
    expect(findAddon('Main courante')?.priceMonthly).toBe(3500);

    // 5 000 FCFA
    expect(findAddon('Centre fiscal')?.priceMonthly).toBe(5000);
  });

  it('respecte la tarification des capacités supplémentaires', () => {
    expect(CAPACITY_PRICING.extraTerminalMonthly).toBe(3000);
    expect(CAPACITY_PRICING.extraUserMonthly).toBe(1000);
    expect(CAPACITY_PRICING.extraOrdersBlockMonthly).toBe(3000);
    expect(CAPACITY_PRICING.ordersBlockSize).toBe(5000);
    expect(CAPACITY_PRICING.extraOutletPercentOfPack).toBe(0.6);
  });

  it('contient les 8 types de restaurants requis', () => {
    const requiredTypes: RestaurantTypeId[] = [
      'snack_takeaway',
      'fast_food',
      'restaurant_classique',
      'maquis_bar_restaurant',
      'bar_lounge',
      'boulangerie_cafe',
      'traiteur_banquets',
      'hotel_restaurant',
    ];

    expect(Object.keys(RESTAURANT_TYPES)).toHaveLength(8);
    for (const t of requiredTypes) {
      expect(RESTAURANT_TYPES[t]).toBeDefined();
      expect(RESTAURANT_TYPES[t].coreModules.length).toBeGreaterThan(0);
      expect(RESTAURANT_TYPES[t].tierModules.minimum).toBeDefined();
      expect(RESTAURANT_TYPES[t].tierModules.medium).toBeDefined();
      expect(RESTAURANT_TYPES[t].tierModules.premium).toBeDefined();
    }
  });
});

describe('Shared Catalog — Moteur de Calcul de Devis (Pricing Engine)', () => {
  it('calcule le devis exact : Minimum 25 000 + Livraisons 2 000 = 27 000 FCFA', () => {
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_delivery'],
    });

    expect(quote.subtotalHT).toBe(27000);
    expect(quote.finalPayableAmount).toBe(27000);
    expect(quote.monthlyEquivalent).toBe(27000);
  });

  it('calcule un devis annuel avec 2 mois offerts et économie visible', () => {
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'medium',
      billingCycle: 'annuel',
    });

    // 35 000 * 10 = 350 000 FCFA
    expect(quote.subtotalHT).toBe(350000);
    expect(quote.monthlyEquivalent).toBe(Math.round(350000 / 12));
    expect(quote.annualSavings).toBe(35000 * 12 - 350000); // 70 000 FCFA économisés
  });

  it('génère la suggestion de pack supérieur quand les options atteignent >= 80% de l’écart', () => {
    // Écart Minimum (25 000) -> Médium (35 000) = 10 000. 80% = 8 000 FCFA.
    // Ajoutons Stocks (3 500) + Achats (3 500) + Livraisons (2 000) = 9 000 FCFA >= 8 000 FCFA
    const quote = computeQuote({
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_stocks', 'addon_purchases', 'addon_delivery'],
    });

    expect(quote.nextPackSuggestion).toBeDefined();
    expect(quote.nextPackSuggestion?.suggestedPackId).toBe('medium');
    expect(quote.nextPackSuggestion?.currentOptionsTotalMonthly).toBe(9000);
  });

  it('calcule la tarification des capacités supplémentaires (terminaux, utilisateurs, outlets)', () => {
    // Minimum 25 000 + 1 terminal (3 000) + 2 users (2 000) + 1 outlet (60% de 25 000 = 15 000)
    // Total mensuel = 25 000 + 3 000 + 2 000 + 15 000 = 45 000 FCFA
    const quote = computeQuote({
      restaurantType: 'fast_food',
      packId: 'minimum',
      billingCycle: 'mensuel',
      capacities: {
        extraTerminals: 1,
        extraUsers: 2,
        extraOutlets: 1,
      },
    });

    expect(quote.subtotalHT).toBe(45000);
  });
});

describe('Shared Catalog — Résolution des Droits (Resolver)', () => {
  it('inclut d’office le socle commun pour tous les établissements', () => {
    const ent = resolveEntitlements({
      orgId: 'tenant_1',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
    });

    expect(ent.modules.mod_dashboard).toBe(true);
    expect(ent.modules.mod_pos).toBe(true);
    expect(ent.modules.mod_caisse).toBe(true);
    expect(ent.modules.mod_menu).toBe(true);
    expect(ent.modules.mod_reports).toBe(true);
    expect(ent.modules.mod_settings).toBe(true);
    expect(ent.modules.mod_audit).toBe(true);
  });

  it('active les modules selon le type et le pack', () => {
    // snack_takeaway en minimum n'a pas la cuisine KDS
    const snackMin = resolveEntitlements({
      orgId: 'snack_1',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
    });
    expect(snackMin.modules.mod_cuisine).toBe(false);

    // fast_food en minimum a la cuisine KDS d'office
    const fastMin = resolveEntitlements({
      orgId: 'fast_1',
      restaurantType: 'fast_food',
      packId: 'minimum',
    });
    expect(fastMin.modules.mod_cuisine).toBe(true);
  });

  it('l’ajout d’une option à distance débloque le module sans toucher aux autres', () => {
    const entInitial = resolveEntitlements({
      orgId: 'snack_2',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      subscribedAddons: [],
    });
    expect(entInitial.modules.mod_delivery).toBe(false);

    const entAvecLivraison = resolveEntitlements({
      orgId: 'snack_2',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      subscribedAddons: ['addon_delivery'],
    });
    expect(entAvecLivraison.modules.mod_delivery).toBe(true);
  });

  it('les overrides administrateur prévalent sur la configuration par défaut', () => {
    const ent = resolveEntitlements({
      orgId: 'tenant_override',
      restaurantType: 'restaurant_classique',
      packId: 'premium',
      overrides: {
        modules: {
          mod_cuisine: false, // Forcé désactivé par l'admin
        },
      },
    });

    expect(ent.modules.mod_cuisine).toBe(false);
  });

  it('calcule les limites effectives avec capacités supplémentaires', () => {
    const ent = resolveEntitlements({
      orgId: 'tenant_limits',
      restaurantType: 'restaurant_classique',
      packId: 'minimum', // Base : 1 outlet, 3 users, 1 terminal, 1500 orders
      capacities: {
        extraUsers: 5,
        extraTerminals: 2,
        extraOrdersBlocks: 2, // 2 * 5000 = +10 000
        extraOutlets: 1,
      },
    });

    expect(ent.effectiveLimits).toEqual({
      maxOutlets: 2,
      maxUsers: 8,
      maxTerminals: 3,
      maxOrdersPerMonth: 11500,
    });
  });

  it('gère correctement les statuts d’impayé et de suspension', () => {
    expect(getTenantAccessStatus('actif')).toEqual({ isReadOnly: false, isFullyBlocked: false });
    expect(getTenantAccessStatus('impaye')).toEqual({ isReadOnly: true, isFullyBlocked: false });
    expect(getTenantAccessStatus('suspendu', 'read_only')).toEqual({ isReadOnly: true, isFullyBlocked: false });
    expect(getTenantAccessStatus('suspendu', 'full_block')).toEqual({ isReadOnly: false, isFullyBlocked: true });
    expect(getTenantAccessStatus('resilie')).toEqual({ isReadOnly: false, isFullyBlocked: true });
  });

  it('refuse par défaut les accès si entitlements manquants ou module non souscrit', () => {
    expect(isModuleEntitled('mod_cuisine', null)).toBe(false);
    expect(isFeatureEntitled('kds_kitchen', null)).toBe(false);

    const dummyEnt = resolveEntitlements({
      orgId: 'test',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
    });
    expect(isModuleEntitled('mod_pos', dummyEnt)).toBe(true);
    expect(isModuleEntitled('mod_fiscal', dummyEnt)).toBe(false);
  });
});
