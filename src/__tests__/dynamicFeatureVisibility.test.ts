import { describe, it, expect } from 'vitest';
import { resolveEntitlements } from '../../shared/catalog/resolver';
import { ITEM_RULE_MAP } from '../components/layout/Sidebar';

describe('Visibilité Dynamique selon Abonnement et Configuration Système', () => {
  it('masque les modules avancés pour le Pack Minimum (Mono-caisse à 25 000 FCFA sans options)', () => {
    const entitlements = resolveEntitlements({
      orgId: 'tenant_minimum_solo',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      subscribedAddons: [], // Aucune option souscrite
    });

    // Modules socles indispensables toujours autorisés
    expect(entitlements.modules.mod_dashboard).toBe(true);
    expect(entitlements.modules.mod_pos).toBe(true);
    expect(entitlements.modules.mod_caisse).toBe(true);

    // Modules optionnels qui DOIVENT disparaître de l'interface
    expect(entitlements.modules.mod_tables).toBeFalsy();
    expect(entitlements.modules.mod_cuisine).toBeFalsy();
    expect(entitlements.modules.mod_bar).toBeFalsy();
    expect(entitlements.modules.mod_bar_pos).toBeFalsy();
    expect(entitlements.modules.mod_events).toBeFalsy();
    expect(entitlements.modules.mod_delivery).toBeFalsy();

    // Vérification du mapping de la Sidebar
    expect(ITEM_RULE_MAP['tables']).toBe('mod_tables');
    expect(ITEM_RULE_MAP['kitchen_kds']).toBe('mod_cuisine');
    expect(ITEM_RULE_MAP['bar_kds']).toBe('mod_bar');
    expect(ITEM_RULE_MAP['bar_pos']).toBe('mod_bar_pos');
  });

  it('active les modules choisis à la carte avec le Pack Minimum', () => {
    const entitlements = resolveEntitlements({
      orgId: 'tenant_minimum_with_addons',
      restaurantType: 'snack_takeaway',
      packId: 'minimum',
      subscribedAddons: ['addon_tables', 'addon_kds_kitchen'], // Options choisies : Plan de table + KDS Cuisine
    });

    // Socles
    expect(entitlements.modules.mod_pos).toBe(true);
    expect(entitlements.modules.mod_caisse).toBe(true);

    // Options activées
    expect(entitlements.modules.mod_tables).toBe(true);
    expect(entitlements.modules.mod_cuisine).toBe(true);

    // Options non souscrites restent fermées
    expect(entitlements.modules.mod_bar).toBeFalsy();
    expect(entitlements.modules.mod_events).toBeFalsy();
  });

  it('inclut automatiquement le multi-postes, le KDS et les tables avec le Pack Médium / Premium', () => {
    const entitlements = resolveEntitlements({
      orgId: 'tenant_medium',
      restaurantType: 'restaurant_classique',
      packId: 'medium',
      subscribedAddons: [],
    });

    expect(entitlements.modules.mod_tables).toBe(true);
    expect(entitlements.modules.mod_cuisine).toBe(true);
    expect(entitlements.modules.mod_stock).toBe(true);
    expect(entitlements.effectiveLimits.maxTerminals).toBeGreaterThanOrEqual(3);
  });
});
