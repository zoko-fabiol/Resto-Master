import { describe, it, expect } from 'vitest';
import { resolveEntitlements, getTenantAccessStatus } from '../../shared/catalog/resolver';
import { CATALOG_PACKS } from '../../shared/catalog/packs';

describe('Phase 5 — Application Réelle des Droits & Limites (Entitlements Enforcement)', () => {
  it('détermine fidèlement le mode lecture seule pour un tenant impayé ou suspendu', () => {
    // Statut actif -> accès complet
    const active = getTenantAccessStatus('actif');
    expect(active.isReadOnly).toBe(false);
    expect(active.isFullyBlocked).toBe(false);

    // Statut impayé -> lecture seule
    const unpaid = getTenantAccessStatus('impaye');
    expect(unpaid.isReadOnly).toBe(true);
    expect(unpaid.isFullyBlocked).toBe(false);

    // Statut suspendu mode lecture seule
    const suspendedReadOnly = getTenantAccessStatus('suspendu', 'read_only');
    expect(suspendedReadOnly.isReadOnly).toBe(true);
    expect(suspendedReadOnly.isFullyBlocked).toBe(false);

    // Statut résilié ou archivé -> blocage complet
    const canceled = getTenantAccessStatus('resilie');
    expect(canceled.isFullyBlocked).toBe(true);
  });

  it('bloque les modules avancés pour le Pack Minimum sans options', () => {
    const entitlements = resolveEntitlements({
      orgId: 'org_minimum_solo',
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      subscribedAddons: [],
    });

    // Modules socles
    expect(entitlements.modules.mod_dashboard).toBe(true);
    expect(entitlements.modules.mod_pos).toBe(true);
    expect(entitlements.modules.mod_caisse).toBe(true);

    // Modules non souscrits
    expect(entitlements.modules.mod_bar_pos).toBeFalsy();
    expect(entitlements.modules.mod_bar).toBeFalsy();
    expect(entitlements.modules.mod_delivery).toBeFalsy();
    expect(entitlements.modules.mod_events).toBeFalsy();
    expect(entitlements.modules.mod_fiscal).toBeFalsy();

    // Plafonds stricts du pack Minimum
    expect(entitlements.effectiveLimits.maxTerminals).toBe(1);
    expect(entitlements.effectiveLimits.maxUsers).toBe(3);
    expect(entitlements.effectiveLimits.maxOrdersPerMonth).toBe(1500);
  });

  it('applique correctement les extensions de capacité (postes, utilisateurs, commandes)', () => {
    const entitlements = resolveEntitlements({
      orgId: 'org_capacity_test',
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      capacities: {
        extraTerminals: 2, // 1 + 2 = 3 caisses
        extraUsers: 5,     // 3 + 5 = 8 collaborateurs
        extraOrdersBlocks: 2, // 1 500 + 2 * 5 000 = 11 500 commandes
      },
    });

    expect(entitlements.effectiveLimits.maxTerminals).toBe(3);
    expect(entitlements.effectiveLimits.maxUsers).toBe(8);
    expect(entitlements.effectiveLimits.maxOrdersPerMonth).toBe(11500);
  });

  it('débloque unitairement le module demandé via souscription d\'option à la carte', () => {
    const entitlementsWithDelivery = resolveEntitlements({
      orgId: 'org_addon_test',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      subscribedAddons: ['addon_delivery', 'addon_kds_kitchen'],
    });

    expect(entitlementsWithDelivery.modules.mod_delivery).toBe(true);
    expect(entitlementsWithDelivery.modules.mod_cuisine).toBe(true);
    expect(entitlementsWithDelivery.features['delivery_orders']?.status).toBe('ACTIVÉ');
    expect(entitlementsWithDelivery.features['kds_kitchen']?.status).toBe('ACTIVÉ');
  });

  it('accorde tous les modules opérationnels et des quotas élevés dans le pack Premium', () => {
    const premium = resolveEntitlements({
      orgId: 'org_premium_full',
      restaurantType: 'hotel_restaurant',
      packId: 'premium',
    });

    expect(premium.modules.mod_tables).toBe(true);
    expect(premium.modules.mod_cuisine).toBe(true);
    expect(premium.modules.mod_bar).toBe(true);
    expect(premium.modules.mod_stock).toBe(true);
    expect(premium.modules.mod_main_courante).toBe(true);
    expect(premium.modules.mod_fiscal).toBe(true);
    expect(premium.effectiveLimits.maxTerminals).toBe(8);
    expect(premium.effectiveLimits.maxUsers).toBe(20);
    expect(premium.effectiveLimits.maxOrdersPerMonth).toBe(20000);
  });
});
