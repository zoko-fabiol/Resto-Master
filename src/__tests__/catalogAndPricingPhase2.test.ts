import { describe, it, expect } from 'vitest';
import { handleComputeQuote } from '../../functions/src/modules/catalog.js';
import { computeQuote } from '../../shared/catalog/pricing.js';
import { resolveEntitlements } from '../../shared/catalog/resolver.js';
import { CATALOG_PACKS, RESTAURANT_TYPES, CATALOG_ADDONS } from '../../shared/catalog/packs.js';

describe('Phase 2 — Catalogue, Devis Serveur et Résolution des Droits', () => {
  it('le catalogue officiel définit exactement 3 packs aux tarifs stipulés', () => {
    expect(CATALOG_PACKS.minimum.priceMonthly).toBe(25000);
    expect(CATALOG_PACKS.medium.priceMonthly).toBe(35000);
    expect(CATALOG_PACKS.premium.priceMonthly).toBe(50000);
  });

  it('le catalogue officiel définit 8 types de restaurants avec pack recommandé', () => {
    const typeKeys = Object.keys(RESTAURANT_TYPES);
    expect(typeKeys.length).toBe(8);
    for (const key of typeKeys) {
      expect(RESTAURANT_TYPES[key as keyof typeof RESTAURANT_TYPES].recommendedPack).toBeDefined();
    }
  });

  it('handleComputeQuote calcule le montant exact pour un pack Minimum mensuel', async () => {
    const result = await handleComputeQuote({
      data: {
        packId: 'minimum',
        restaurantType: 'snack_takeaway',
        billingCycle: 'mensuel',
      },
    } as any);

    expect(result.quote.packId).toBe('minimum');
    expect(result.quote.subtotalHT).toBe(25000);
    expect(result.quote.finalPayableAmount).toBe(25000);
    expect(result.entitlements.effectiveLimits.maxUsers).toBe(3);
    expect(result.entitlements.effectiveLimits.maxTerminals).toBe(1);
    expect(result.entitlements.effectiveLimits.maxOrdersPerMonth).toBe(1500);
  });

  it('handleComputeQuote applique la règle des 10 mois pour le cycle annuel (2 mois offerts)', async () => {
    const result = await handleComputeQuote({
      data: {
        packId: 'medium',
        restaurantType: 'restaurant_classique',
        billingCycle: 'annuel',
      },
    } as any);

    // Médium 35 000 x 10 = 350 000 FCFA
    expect(result.quote.subtotalHT).toBe(350000);
    expect(result.quote.annualSavings).toBe(70000); // 2 mois offerts = 2 x 35 000
  });

  it('handleComputeQuote applique le multiplicateur x25 et calcule la maintenance 2.4x pour la licence à vie', async () => {
    const result = await handleComputeQuote({
      data: {
        packId: 'premium',
        restaurantType: 'hotel_restaurant',
        billingCycle: 'a_vie',
      },
    } as any);

    // Premium 50 000 x 25 = 1 250 000 FCFA
    expect(result.quote.subtotalHT).toBe(1250000);
    // Maintenance annuelle : 50 000 x 2.4 = 120 000 FCFA
    expect(result.quote.lifetimeMaintenanceAnnual).toBe(120000);
  });

  it('handleComputeQuote suggère le pack supérieur quand les options dépassent 80% du gap de prix', async () => {
    // Minimum = 25k, Médium = 35k. Gap = 10k. 80% de 10k = 8k.
    // Ajout d'options totalisant > 8k FCFA :
    // addon_stocks (3 500) + addon_finances (3 000) + addon_delivery (2 000) = 8 500 FCFA
    const result = await handleComputeQuote({
      data: {
        packId: 'minimum',
        restaurantType: 'restaurant_classique',
        billingCycle: 'mensuel',
        selectedAddons: ['addon_stocks', 'addon_finances', 'addon_delivery'],
      },
    } as any);

    expect(result.quote.nextPackSuggestion).toBeDefined();
    expect(result.quote.nextPackSuggestion?.suggestedPackId).toBe('medium');
  });

  it('handleComputeQuote rejette les requêtes avec des données invalides', async () => {
    await expect(
      handleComputeQuote({
        data: {
          packId: 'invalid_pack' as any,
          restaurantType: 'restaurant_classique',
          billingCycle: 'mensuel',
        },
      } as any)
    ).rejects.toThrow();

    await expect(
      handleComputeQuote({
        data: {
          packId: 'minimum',
          restaurantType: 'invalid_type' as any,
          billingCycle: 'mensuel',
        },
      } as any)
    ).rejects.toThrow();
  });
});
