import { describe, it, expect } from 'vitest';
import {
  CATALOG_PACKS,
  RESTAURANT_TYPES,
  CATALOG_ADDONS,
} from '../../shared/catalog/packs';
import { computeQuote } from '../../shared/catalog/pricing';
import { resolveEntitlements } from '../../shared/catalog/resolver';

describe('Phase 4 — Assistant d\'Installation Pas-à-Pas (Style OS)', () => {
  it('contient exactement 8 profils métiers de restaurants officiels', () => {
    const typeKeys = Object.keys(RESTAURANT_TYPES);
    expect(typeKeys).toHaveLength(8);

    expect(typeKeys).toEqual(
      expect.arrayContaining([
        'snack_takeaway',
        'fast_food',
        'restaurant_classique',
        'maquis_bar_restaurant',
        'bar_lounge',
        'boulangerie_cafe',
        'traiteur_banquets',
        'hotel_restaurant',
      ])
    );

    // Vérifier les caractéristiques de chaque profil
    typeKeys.forEach((key) => {
      const profile = RESTAURANT_TYPES[key as keyof typeof RESTAURANT_TYPES];
      expect(profile.name).toBeTruthy();
      expect(profile.description).toBeTruthy();
      expect(profile.recommendedPack).toMatch(/^(minimum|medium|premium)$/);
      expect(Array.isArray(profile.coreModules)).toBe(true);
    });
  });

  it('valide le profil Fast-Food avec modules KDS cuisine', () => {
    const fastFood = RESTAURANT_TYPES.fast_food;
    expect(fastFood).toBeDefined();
    expect(fastFood.tierModules.minimum).toContain('mod_cuisine');
    expect(fastFood.tierModules.medium).toContain('mod_delivery');
  });

  it('valide le profil Snack Takeaway orienté emporté et caisse rapide', () => {
    const snack = RESTAURANT_TYPES.snack_takeaway;
    expect(snack).toBeDefined();
    expect(snack.recommendedPack).toBe('minimum');
  });

  it('calcule le devis certifié pour un pack Médium en cycle annuel (2 mois offerts)', () => {
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'medium',
      billingCycle: 'annuel',
      selectedAddonIds: [],
    });

    // 35 000 * 10 = 350 000 FCFA HT
    expect(quote.subtotalHT).toBe(350000);
    expect(quote.annualSavings).toBe(70000); // 2 mois de 35 000
    expect(quote.finalPayableAmount).toBe(350000);
  });

  it('calcule le devis certifié pour un pack Minimum avec option livraisons (2 000 FCFA)', () => {
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_delivery'],
    });

    // 25 000 + 2 000 = 27 000 FCFA
    expect(quote.subtotalHT).toBe(27000);
    expect(quote.finalPayableAmount).toBe(27000);
  });

  it('résout fidèlement les modules pour un pack Médium + option HACCP/Hygiène', () => {
    const entitlements = resolveEntitlements({
      orgId: 'org_test_phase4',
      restaurantType: 'restaurant_classique',
      packId: 'medium',
      subscribedAddons: ['addon_haccp'],
    });

    expect(entitlements.modules.mod_cuisine).toBe(true);
    expect(entitlements.modules.mod_stock).toBe(true);
    expect(entitlements.modules.mod_hygiene).toBe(true);
    // Le module fiscal n'est pas dans médium pour ce profil sans option
    expect(entitlements.modules.mod_fiscal).toBeFalsy();
  });

  it('suggère le surclassement quand les options dépassent la différence de pack', () => {
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: [
        'addon_kds_kitchen',
        'addon_kds_bar',
        'addon_stocks',
        'addon_delivery',
        'addon_events',
      ],
    });

    // La suggestion d'upsell doit être active vers Médium
    expect(quote.nextPackSuggestion).toBeDefined();
    expect(quote.nextPackSuggestion?.suggestedPackId).toBe('medium');
  });
});
