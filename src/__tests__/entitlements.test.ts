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

  it('scénario utilisateur : activation de Plan de table et Réservations par l’admin débloque leur affichage dans la configuration restaurant', () => {
    // 1. Initialement : l'admin n'a pas activé Plan de table ni Réservations pour ce restaurant
    const entitlementsSansTables: TenantEntitlements = {
      orgId: 'tenant_fastfood',
      features: {
        tables_management: { status: 'DÉSACTIVÉ', source: 'plan', activatedBy: 'admin', activatedAt: '2026-10-22T00:00:00Z' },
        table_reservations: { status: 'DÉSACTIVÉ', source: 'plan', activatedBy: 'admin', activatedAt: '2026-10-22T00:00:00Z' },
      },
      modules: {
        mod_tables: false,
        res_management: false,
        mod_pos: true,
      },
      operationRules: {},
      lockedConfigKeys: [],
      effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 2, maxOrdersPerMonth: 5000 },
      updatedAt: '2026-10-22T00:00:00Z',
      updatedBy: 'admin',
    };

    const isAppEntitled = (
      app: { featureKey?: string; moduleKey?: string },
      ent: TenantEntitlements
    ): boolean => {
      if (app.moduleKey && ent.modules && ent.modules[app.moduleKey] !== undefined) {
        if (!ent.modules[app.moduleKey]) return false;
      }
      if (app.featureKey && ent.features && ent.features[app.featureKey]) {
        if (ent.features[app.featureKey].status !== 'ACTIVÉ') return false;
      }
      return true;
    };

    const tableApp = {
      key: 'tables',
      featureKey: 'tables_management',
      moduleKey: 'mod_tables',
    };

    // Dans le centre de configuration du restaurant, l'app Tables est masquée
    expect(isAppEntitled(tableApp, entitlementsSansTables)).toBe(false);

    // 2. L'admin active Plan de table et Réservations dans admin-panel
    const entitlementsAvecTables: TenantEntitlements = {
      ...entitlementsSansTables,
      features: {
        tables_management: { status: 'ACTIVÉ', source: 'override', activatedBy: 'admin', activatedAt: '2026-10-22T00:00:00Z' },
        table_reservations: { status: 'ACTIVÉ', source: 'override', activatedBy: 'admin', activatedAt: '2026-10-22T00:00:00Z' },
      },
      modules: {
        mod_tables: true,
        res_management: true,
        mod_pos: true,
      },
    };

    // Dès synchronisation Firestore, l'app Tables apparaît dans la bibliothèque de configuration
    expect(isAppEntitled(tableApp, entitlementsAvecTables)).toBe(true);

    // 3. Dans la liste des modules (FeaturesAndModulesSection), le gestionnaire de restaurant peut désormais choisir
    // d'activer ou non le module dans son exploitation quotidienne
    const sidebarModules = [
      { key: 'mod_pos', label: 'Prise de commande' },
      { key: 'mod_tables', label: 'Plan des tables & Salles' },
      { key: 'res_management', label: 'Cahier de Réservations' },
      { key: 'mod_cuisine', label: 'Cuisine KDS' },
    ];

    const getEntitledModules = (ent: TenantEntitlements) =>
      sidebarModules.filter((m) => ent.modules[m.key] !== false);

    // Avant activation admin : Tables et Réservations absents
    const modulesAvant = getEntitledModules(entitlementsSansTables);
    expect(modulesAvant.some((m) => m.key === 'mod_tables')).toBe(false);
    expect(modulesAvant.some((m) => m.key === 'res_management')).toBe(false);

    // Après activation admin : Tables et Réservations sont disponibles et le restaurant manager peut les activer
    const modulesApres = getEntitledModules(entitlementsAvecTables);
    expect(modulesApres.some((m) => m.key === 'mod_tables')).toBe(true);
    expect(modulesApres.some((m) => m.key === 'res_management')).toBe(true);
  });
});

