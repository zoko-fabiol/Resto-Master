import { describe, it, expect } from 'vitest';
import { CATALOG_PACKS, CATALOG_ADDONS } from '../../shared/catalog/packs';
import { computeQuote } from '../../shared/catalog/pricing';

describe('Phase 6 — Côté Restaurant : Mon Abonnement & Boutique d\'Options', () => {
  it('fournit la liste exhaustive des addons classés par catégorie pour la boutique', () => {
    expect(CATALOG_ADDONS.length).toBeGreaterThanOrEqual(14);

    const categories = Array.from(new Set(CATALOG_ADDONS.map((a) => a.category)));
    expect(categories).toEqual(
      expect.arrayContaining(['production', 'service', 'gestion', 'hygiene', 'finance'])
    );

    // Vérifier les prix mensuels conformes
    CATALOG_ADDONS.forEach((addon) => {
      expect(addon.priceMonthly).toBeGreaterThanOrEqual(1500);
      expect(addon.name).toBeTruthy();
      expect(addon.description).toBeTruthy();
    });
  });

  it('calcule le nouveau montant lors de l\'ajout d\'options à un pack Minimum existant', () => {
    // Initial : Minimum (25 000)
    const initialQuote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: [],
    });
    expect(initialQuote.finalPayableAmount).toBe(25000);

    // Ajout Livraisons (2 000) + Événements (2 500)
    const updatedQuote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_delivery', 'addon_events'],
    });

    // 25 000 + 2 000 + 2 500 = 29 500 FCFA
    expect(updatedQuote.subtotalHT).toBe(29500);
    expect(updatedQuote.finalPayableAmount).toBe(29500);
  });

  it('calcule la remise annuelle (2 mois offerts) sur le total pack + options', () => {
    const annualQuote = computeQuote({
      restaurantType: 'snack_takeaway',
      packId: 'medium',
      billingCycle: 'annuel',
      selectedAddonIds: ['addon_events'], // 2 500 FCFA/mois
    });

    // Mensuel HT = 35 000 + 2 500 = 37 500 FCFA
    // Annuel (x10) = 375 000 FCFA HT
    expect(annualQuote.subtotalHT).toBe(375000);
    expect(annualQuote.annualSavings).toBe(75000); // 2 mois de 37 500
    expect(annualQuote.finalPayableAmount).toBe(375000);
  });

  it('garantit la cohérence des quotas des 3 packs pour l\'affichage des jauges', () => {
    expect(CATALOG_PACKS.minimum.limits.maxTerminals).toBe(1);
    expect(CATALOG_PACKS.medium.limits.maxTerminals).toBe(3);
    expect(CATALOG_PACKS.premium.limits.maxTerminals).toBe(8);

    expect(CATALOG_PACKS.minimum.limits.maxUsers).toBe(3);
    expect(CATALOG_PACKS.medium.limits.maxUsers).toBe(8);
    expect(CATALOG_PACKS.premium.limits.maxUsers).toBe(20);
  });
});
