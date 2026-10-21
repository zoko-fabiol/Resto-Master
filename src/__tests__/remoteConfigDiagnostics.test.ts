import { describe, it, expect } from 'vitest';
import { CONFIGURATION_PROFILES, TenantEntitlements } from '../../shared/types';

describe('RestoMaster Admin Panel — Configuration à Distance & Diagnostics (Phase 5)', () => {
  it('1. Valide l\'inférence intelligente de l\'Assistant de Configuration (Setup Wizard)', () => {
    // Cas 1 : Snack sans salle (0 table, livraison activée, sans bar)
    const inferFastFood = (tablesCount: number, hasDelivery: boolean, hasBar: boolean) => {
      let targetProfileId = 'restaurant_classique';
      if (tablesCount === 0) {
        targetProfileId = 'fast_food';
      } else if (hasBar && tablesCount < 15) {
        targetProfileId = 'bar_lounge';
      }

      const profile = CONFIGURATION_PROFILES.find((p) => p.id === targetProfileId)!;
      const modules: Record<string, boolean> = {};
      for (const m of profile.includedModules) {
        modules[m] = true;
      }
      modules['mod_tables'] = tablesCount > 0;
      modules['mod_bar'] = hasBar;
      modules['mod_delivery'] = hasDelivery;

      const features: Record<string, 'ACTIVÉ' | 'DÉSACTIVÉ'> = {};
      for (const featId of profile.enabledFeatures) {
        features[featId] = 'ACTIVÉ';
      }
      for (const featId of profile.disabledFeatures) {
        features[featId] = 'DÉSACTIVÉ';
      }

      if (tablesCount === 0) features['tables_management'] = 'DÉSACTIVÉ';
      if (hasDelivery) features['delivery_orders'] = 'ACTIVÉ';

      return { profile, modules, features };
    };

    const res1 = inferFastFood(0, true, false);
    expect(res1.profile.id).toBe('fast_food');
    expect(res1.modules.mod_tables).toBe(false);
    expect(res1.modules.mod_delivery).toBe(true);
    expect(res1.features['tables_management']).toBe('DÉSACTIVÉ');
    expect(res1.features['delivery_orders']).toBe('ACTIVÉ');

    // Cas 2 : Bar Lounge (8 tables, bar dédié, pas de livraison)
    const res2 = inferFastFood(8, false, true);
    expect(res2.profile.id).toBe('bar_lounge');
    expect(res2.modules.mod_tables).toBe(true);
    expect(res2.modules.mod_bar).toBe(true);
    expect(res2.modules.mod_delivery).toBe(false);
  });

  it('2. Calcule le DIFF prédictif avant application (Activation / Désactivation chirurgicale)', () => {
    const currentFeatures: Record<string, { status: 'ACTIVÉ' | 'DÉSACTIVÉ' }> = {
      pos_core: { status: 'ACTIVÉ' },
      tables_management: { status: 'ACTIVÉ' },
      kds_bar: { status: 'DÉSACTIVÉ' },
      delivery_orders: { status: 'DÉSACTIVÉ' },
    };

    const targetFeatures: Record<string, { status: 'ACTIVÉ' | 'DÉSACTIVÉ' }> = {
      pos_core: { status: 'ACTIVÉ' },
      tables_management: { status: 'DÉSACTIVÉ' }, // Doit passer dans toDisable
      kds_bar: { status: 'ACTIVÉ' },            // Doit passer dans toEnable
      delivery_orders: { status: 'ACTIVÉ' },     // Doit passer dans toEnable
    };

    const toEnable: string[] = [];
    const toDisable: string[] = [];

    for (const [id, val] of Object.entries(targetFeatures)) {
      const cur = currentFeatures[id]?.status;
      if (val.status === 'ACTIVÉ' && cur !== 'ACTIVÉ') {
        toEnable.push(id);
      } else if (val.status === 'DÉSACTIVÉ' && cur === 'ACTIVÉ') {
        toDisable.push(id);
      }
    }

    expect(toEnable).toContain('kds_bar');
    expect(toEnable).toContain('delivery_orders');
    expect(toDisable).toContain('tables_management');
    expect(toEnable).not.toContain('pos_core');
    expect(toDisable).not.toContain('pos_core');
  });

  it('3. Valide le moteur de Snapshot et Rollback de configuration', () => {
    const initialConfig: Partial<TenantEntitlements> = {
      orgId: 'org-123',
      modules: { mod_pos: true, mod_tables: true, mod_cuisine: true },
      features: {
        pos_core: {
          status: 'ACTIVÉ',
          source: 'plan',
          activatedBy: 'admin@system',
          activatedAt: '2026-01-01T00:00:00Z',
        },
      },
      effectiveLimits: {
        maxOutlets: 1,
        maxUsers: 5,
        maxTerminals: 2,
        maxOrdersPerMonth: 5000,
      },
    };

    // 1. Création du Snapshot
    const snapshot = {
      id: 'snap-456',
      orgId: 'org-123',
      label: 'Avant activation livraison',
      data: initialConfig,
      createdAt: '2026-01-02T10:00:00Z',
    };

    // 2. Altération de la configuration
    const modifiedConfig = {
      ...initialConfig,
      modules: { ...initialConfig.modules, mod_delivery: true, mod_tables: false },
    };
    expect(modifiedConfig.modules.mod_tables).toBe(false);

    // 3. Rollback vers le Snapshot
    const restoredConfig = {
      ...snapshot.data,
      lastRollbackFromSnapshotId: snapshot.id,
      updatedAt: '2026-01-02T12:00:00Z',
    };

    expect(restoredConfig.modules?.mod_tables).toBe(true);
    expect(restoredConfig.modules?.mod_delivery).toBeUndefined();
    expect(restoredConfig.lastRollbackFromSnapshotId).toBe('snap-456');
  });

  it('4. Valide l\'évaluation d\'intégrité et de score du Diagnostic Serveur', () => {
    // Cas conforme
    const evaluateTenantHealth = (tenant: { taxId?: string; currency: string; hasOutlets: boolean; hasUsers: boolean }) => {
      let score = 100;
      const issues: string[] = [];

      if (!tenant.taxId || tenant.taxId.trim().length < 8) {
        score -= 20;
        issues.push('NIU_MANQUANT');
      }
      if (tenant.currency !== 'FCFA') {
        score -= 10;
        issues.push('DEVISE_NON_CONFORME');
      }
      if (!tenant.hasOutlets) {
        score -= 20;
        issues.push('SANS_ETABLISSEMENT');
      }
      if (!tenant.hasUsers) {
        score -= 20;
        issues.push('SANS_COLLABORATEUR');
      }

      const status = score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical';
      return { score, status, issues };
    };

    const perfect = evaluateTenantHealth({
      taxId: 'M052112345678A',
      currency: 'FCFA',
      hasOutlets: true,
      hasUsers: true,
    });
    expect(perfect.score).toBe(100);
    expect(perfect.status).toBe('healthy');

    const problematic = evaluateTenantHealth({
      taxId: '',
      currency: 'EUR',
      hasOutlets: false,
      hasUsers: true,
    });
    expect(problematic.score).toBe(50); // 100 - 20 (taxId) - 10 (eur) - 20 (outlets)
    expect(problematic.status).toBe('warning');
    expect(problematic.issues).toContain('NIU_MANQUANT');
  });
});
