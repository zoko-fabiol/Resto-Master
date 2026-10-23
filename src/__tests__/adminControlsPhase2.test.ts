import { describe, it, expect } from 'vitest';
import {
  TAB_CATALOG,
  OPERATION_RULES,
  resolveAccess,
  UserAccessDocument,
} from '../../shared/types/accessCatalog';
import { TenantEntitlements } from '../../shared/types/tenant';

describe('Phase 2 — Contrôles Admin, Sécurité et Répercussion Temps Réel', () => {
  const mockTenant = { id: 'org_bistrot_douala', status: 'actif' as const };

  const initialEntitlements: TenantEntitlements = {
    orgId: 'org_bistrot_douala',
    modules: {
      mod_pos: true,
      mod_tables: true,
      mod_cuisine: true,
      mod_stock: true,
      mod_caisse: true,
    },
    features: {},
    operationRules: {
      enableStockAutoDeduction: true,
      requirePinOnCashDiscounts: true,
    },
    lockedConfigKeys: ['enableStockAutoDeduction'],
    effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 2, maxOrdersPerMonth: 2000 },
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  };

  describe('Validation des règles opérationnelles et clés de délégation', () => {
    it('les règles déclarées dans OPERATION_RULES ont toutes un niveau de risque et une clé valide', () => {
      for (const rule of OPERATION_RULES) {
        expect(rule.key).toBeTruthy();
        expect(['faible', 'moyen', 'eleve', 'critique']).toContain(rule.risk);
        expect(typeof rule.delegable).toBe('boolean');
      }
    });

    it('une clé verrouillée dans lockedConfigKeys ne doit pas être délégable au restaurant', () => {
      const isLocked = initialEntitlements.lockedConfigKeys.includes('enableStockAutoDeduction');
      expect(isLocked).toBe(true);
    });
  });

  describe('Modification des accès collaborateur (userAccess) et répercussion', () => {
    it('un utilisateur à qui l\'admin retire un onglet voit cet onglet immédiatement bloqué par resolveAccess', () => {
      // 1. État initial : le manager a accès à stock
      const initialAccess = resolveAccess({
        tenant: mockTenant,
        entitlements: initialEntitlements,
        role: 'manager',
        tab: 'stock',
        action: 'view',
      });
      expect(initialAccess).toBe(true);

      // 2. L'admin met à jour userAccess en retirant 'stock' de ses onglets
      const updatedUserAccess: UserAccessDocument = {
        uid: 'user_manager_1',
        orgId: 'org_bistrot_douala',
        tabs: ['pos', 'tables', 'caisse'], // 'stock' retiré
        permissions: {},
        version: 2,
        updatedAt: new Date().toISOString(),
        updatedBy: 'platform_admin@test.internal',
      };

      const accessAfterAdminRevoke = resolveAccess({
        tenant: mockTenant,
        entitlements: initialEntitlements,
        userAccess: updatedUserAccess,
        role: 'manager',
        tab: 'stock',
        action: 'view',
      });

      // L'accès direct est immédiatement refusé
      expect(accessAfterAdminRevoke).toBe(false);
    });

    it('si l\'admin désactive le module mod_cuisine pour l\'établissement, tous les collaborateurs perdent l\'accès à kitchen_kds', () => {
      const revokedCuisineEntitlements: TenantEntitlements = {
        ...initialEntitlements,
        modules: {
          ...initialEntitlements.modules,
          mod_cuisine: false, // Module retiré
        },
      };

      const canChefView = resolveAccess({
        tenant: mockTenant,
        entitlements: revokedCuisineEntitlements,
        role: 'cuisine',
        tab: 'kitchen_kds',
        action: 'view',
      });
      expect(canChefView).toBe(false);

      const canDirectionView = resolveAccess({
        tenant: mockTenant,
        entitlements: revokedCuisineEntitlements,
        role: 'direction',
        tab: 'kitchen_kds',
        action: 'view',
      });
      expect(canDirectionView).toBe(false);
    });
  });
});
