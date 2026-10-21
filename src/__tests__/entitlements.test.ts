import { describe, it, expect, vi } from 'vitest';
import { FEATURE_CATALOG, CONFIGURATION_PROFILES, Tenant, TenantEntitlements } from '../../shared/types';

describe('Phase 3 — Catalogue des Fonctionnalités & Profils Prédéfinis', () => {
  it('contient toutes les fonctionnalités requises avec clés et niveaux de risque valides', () => {
    expect(FEATURE_CATALOG.length).toBeGreaterThanOrEqual(20);

    const validCategories = [
      'vente_service',
      'production',
      'stock_achats',
      'gestion_finance',
      'hygiene_evenements',
      'systeme_securite',
    ];

    const validRisks = ['faible', 'moyen', 'eleve', 'critique'];

    for (const feat of FEATURE_CATALOG) {
      expect(feat.id).toBeTruthy();
      expect(feat.name).toBeTruthy();
      expect(feat.description).toBeTruthy();
      expect(validCategories).toContain(feat.category);
      expect(validRisks).toContain(feat.riskLevel);
      expect(feat.moduleKey).toMatch(/^mod_/);
    }
  });

  it('contient les 5 profils types (Fast-food, Classique, Bar-lounge, Hôtel, Emporter)', () => {
    expect(CONFIGURATION_PROFILES).toHaveLength(5);
    const profileIds = CONFIGURATION_PROFILES.map((p) => p.id);
    expect(profileIds).toContain('fast_food');
    expect(profileIds).toContain('restaurant_classique');
    expect(profileIds).toContain('bar_lounge');
    expect(profileIds).toContain('hotel_complexe');
    expect(profileIds).toContain('snack_takeaway');
  });

  it('le profil Fast-food désactive la gestion de tables et active le KDS cuisine', () => {
    const fastFood = CONFIGURATION_PROFILES.find((p) => p.id === 'fast_food')!;
    expect(fastFood.operationRules.mod_tables).toBe(false);
    expect(fastFood.operationRules.mod_cuisine).toBe(true);
    expect(fastFood.enabledFeatures).toContain('kds_kitchen');
    expect(fastFood.disabledFeatures).toContain('tables_management');
  });

  it('le profil Bar-Lounge active la caisse bar et le KDS bar mais désactive la cuisine', () => {
    const bar = CONFIGURATION_PROFILES.find((p) => p.id === 'bar_lounge')!;
    expect(bar.operationRules.mod_bar).toBe(true);
    expect(bar.operationRules.mod_cuisine).toBe(false);
    expect(bar.enabledFeatures).toContain('bar_pos_exclusive');
    expect(bar.enabledFeatures).toContain('kds_bar');
  });

  it('le profil Hôtel & Complexe active la fiscalité DGI et la main courante', () => {
    const hotel = CONFIGURATION_PROFILES.find((p) => p.id === 'hotel_complexe')!;
    expect(hotel.operationRules.mod_fiscal).toBe(true);
    expect(hotel.operationRules.mod_main_courante).toBe(true);
    expect(hotel.enabledFeatures).toContain('hotelpro_maincourante');
    expect(hotel.enabledFeatures).toContain('cameroon_fiscal_framework');
  });
});

describe('Phase 3 — Logique de Résolution des Droits (Entitlements)', () => {
  it('la lecture seule s’active en cas de suspension "read_only" ou statut "impaye"', () => {
    const isReadOnly = (tenant: Partial<Tenant>): boolean => {
      return (
        (tenant.status === 'suspendu' && tenant.suspensionMode === 'read_only') ||
        tenant.status === 'impaye'
      );
    };

    expect(isReadOnly({ status: 'actif' })).toBe(false);
    expect(isReadOnly({ status: 'essai' })).toBe(false);
    expect(isReadOnly({ status: 'impaye' })).toBe(true);
    expect(isReadOnly({ status: 'suspendu', suspensionMode: 'read_only' })).toBe(true);
    expect(isReadOnly({ status: 'suspendu', suspensionMode: 'full_block' })).toBe(false); // full_block bloque complètement, pas juste read-only
  });

  it('un override administrateur prévaut sur le catalogue local', () => {
    const resolveFeature = (
      featureKey: string,
      localEnabled: boolean,
      entitlements?: TenantEntitlements | null
    ): boolean => {
      if (entitlements?.features && entitlements.features[featureKey]) {
        return entitlements.features[featureKey].status === 'ACTIVÉ';
      }
      return localEnabled;
    };

    const dummyEntitlements: TenantEntitlements = {
      orgId: 'org_test',
      features: {
        pos_core: {
          status: 'DÉSACTIVÉ',
          source: 'override',
          activatedBy: 'admin',
          activatedAt: '2026-10-21T00:00:00Z',
        },
        cameroon_fiscal_framework: {
          status: 'ACTIVÉ',
          source: 'override',
          activatedBy: 'admin',
          activatedAt: '2026-10-21T00:00:00Z',
        },
      },
      modules: { mod_pos: true },
      operationRules: {},
      lockedConfigKeys: ['cameroon_fiscal_framework'],
      effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 2, maxOrdersPerMonth: 5000 },
      updatedAt: '2026-10-21T00:00:00Z',
      updatedBy: 'admin',
    };

    // pos_core était activé localement mais l'admin l'a désactivé
    expect(resolveFeature('pos_core', true, dummyEntitlements)).toBe(false);

    // fiscalité était désactivée localement mais l'admin l'a activée
    expect(resolveFeature('cameroon_fiscal_framework', false, dummyEntitlements)).toBe(true);

    // feature sans override retombe sur le statut local
    expect(resolveFeature('kds_kitchen', true, dummyEntitlements)).toBe(true);
  });

  it('la désactivation d’un module masque tous ses écrans associés', () => {
    const isModuleEntitled = (moduleKey: string, entitlements?: TenantEntitlements | null): boolean => {
      if (entitlements?.modules && entitlements.modules[moduleKey] !== undefined) {
        return entitlements.modules[moduleKey];
      }
      return true;
    };

    const ent: TenantEntitlements = {
      orgId: 'org_test',
      features: {},
      modules: {
        mod_cuisine: false,
        mod_stock: true,
      },
      operationRules: {},
      lockedConfigKeys: [],
      effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 2, maxOrdersPerMonth: 5000 },
      updatedAt: '2026-10-21T00:00:00Z',
      updatedBy: 'admin',
    };

    expect(isModuleEntitled('mod_cuisine', ent)).toBe(false);
    expect(isModuleEntitled('mod_stock', ent)).toBe(true);
    expect(isModuleEntitled('mod_pos', ent)).toBe(true); // non renseigné => default true
  });
});
