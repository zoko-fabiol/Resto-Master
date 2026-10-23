import { describe, it, expect } from 'vitest';
import {
  resolveAccess,
  TAB_CATALOG,
  MODULE_CATALOG,
  OPERATION_RULES,
  DEFAULT_ROLE_TAB_PERMISSIONS,
  UserAccessDocument,
  TabId,
} from '../../shared/types/accessCatalog';
import { DEFAULT_PLANS } from '../../shared/types/plans';
import { RESTAURANT_TYPES } from '../../shared/catalog/packs';
import { TenantEntitlements } from '../../shared/types/tenant';

describe('Phase 1 — Socle Unique des Droits & Catalogue', () => {
  describe('Contrôles de cohérence du Catalogue', () => {
    it('chaque onglet doit pointer vers un module existant dans MODULE_CATALOG', () => {
      const moduleKeys = new Set(MODULE_CATALOG.map((m) => m.key));
      for (const tab of TAB_CATALOG) {
        expect(
          moduleKeys.has(tab.moduleKey),
          `L'onglet ${tab.id} référence un module inexistant : ${tab.moduleKey}`
        ).toBe(true);
      }
    });

    it('chaque règle d\'opération doit pointer vers un module existant', () => {
      const moduleKeys = new Set(MODULE_CATALOG.map((m) => m.key));
      for (const rule of OPERATION_RULES) {
        expect(
          moduleKeys.has(rule.moduleKey),
          `La règle ${rule.key} référence un module inexistant : ${rule.moduleKey}`
        ).toBe(true);
      }
    });

    it('les plans dans DEFAULT_PLANS ne doivent référencer que des modules et features valides', () => {
      const moduleKeys = new Set(MODULE_CATALOG.map((m) => m.key));
      for (const plan of DEFAULT_PLANS) {
        for (const mod of plan.includedModules) {
          expect(
            moduleKeys.has(mod),
            `Le plan ${plan.id} référence un module inexistant : ${mod}`
          ).toBe(true);
        }
      }
    });

    it('les 8 profils de restaurant ne doivent référencer que des modules valides', () => {
      const moduleKeys = new Set(MODULE_CATALOG.map((m) => m.key));
      for (const [typeId, def] of Object.entries(RESTAURANT_TYPES)) {
        for (const mod of def.coreModules) {
          expect(
            moduleKeys.has(mod),
            `Le type ${typeId} référence un coreModule inexistant : ${mod}`
          ).toBe(true);
        }
        for (const [packId, tierMods] of Object.entries(def.tierModules)) {
          for (const mod of tierMods) {
            expect(
              moduleKeys.has(mod),
              `Le type ${typeId} (pack ${packId}) référence un module inexistant : ${mod}`
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('Fonction pure resolveAccess', () => {
    const activeTenant = { status: 'actif' as const };
    const baseEntitlements: TenantEntitlements = {
      orgId: 'org_test',
      modules: {
        mod_pos: true,
        mod_tables: true,
        mod_cuisine: false, // Cuisine DÉSACTIVÉE par l'admin
        mod_stock: true,
        mod_caisse: true,
      },
      features: {},
      operationRules: {},
      lockedConfigKeys: [],
      effectiveLimits: { maxOutlets: 1, maxUsers: 5, maxTerminals: 2, maxOrdersPerMonth: 2000 },
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    it('refuse immédiatement tout accès si le tenant est résilié ou totalement bloqué', () => {
      const blockedTenant = { status: 'resilie' as const };
      const canView = resolveAccess({
        tenant: blockedTenant,
        entitlements: baseEntitlements,
        role: 'direction',
        tab: 'pos',
        action: 'view',
      });
      expect(canView).toBe(false);
    });

    it('autorise la lecture seule mais bloque toute modification en cas d\'impayé', () => {
      const unpaidTenant = { status: 'impaye' as const };
      const canView = resolveAccess({
        tenant: unpaidTenant,
        entitlements: baseEntitlements,
        role: 'direction',
        tab: 'pos',
        action: 'view',
      });
      const canCreate = resolveAccess({
        tenant: unpaidTenant,
        entitlements: baseEntitlements,
        role: 'direction',
        tab: 'pos',
        action: 'create',
      });
      expect(canView).toBe(true);
      expect(canCreate).toBe(false);
    });

    it('un module désactivé par l\'admin (mod_cuisine) est inaccessible pour TOUT LE MONDE y compris la direction', () => {
      const canDirectionView = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements, // mod_cuisine: false
        role: 'direction',
        tab: 'kitchen_kds',
        action: 'view',
      });
      expect(canDirectionView).toBe(false);

      const canManagerView = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'manager',
        tab: 'kitchen_kds',
        action: 'view',
      });
      expect(canManagerView).toBe(false);
    });

    it('un module activé respecte les permissions par défaut du rôle', () => {
      // Serveur a accès à pos (view, create) mais pas delete
      const canServeurViewPos = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'serveur',
        tab: 'pos',
        action: 'view',
      });
      const canServeurDeletePos = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'serveur',
        tab: 'pos',
        action: 'delete',
      });
      expect(canServeurViewPos).toBe(true);
      expect(canServeurDeletePos).toBe(false);

      // Serveur n'a pas accès à stock par défaut
      const canServeurStock = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'serveur',
        tab: 'stock',
        action: 'view',
      });
      expect(canServeurStock).toBe(false);
    });

    it('les surcharges utilisateur dans userAccess priment sur le rôle par défaut', () => {
      // Accord explicite du stock pour ce serveur spécifique
      const customUserAccess: UserAccessDocument = {
        uid: 'user_serveur_expert',
        orgId: 'org_test',
        tabs: ['pos', 'tables', 'stock'],
        permissions: {
          stock: { view: true, create: true, edit: false, delete: false },
        },
        version: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
      };

      const canStock = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        userAccess: customUserAccess,
        role: 'serveur',
        tab: 'stock',
        action: 'view',
      });
      expect(canStock).toBe(true);

      const canEditStock = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        userAccess: customUserAccess,
        role: 'serveur',
        tab: 'stock',
        action: 'edit',
      });
      expect(canEditStock).toBe(false);
    });

    it('les tablettes ont uniquement accès à l\'onglet kiosk et sans droit de suppression', () => {
      const canTabletteKiosk = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'tablette',
        tab: 'kiosk',
        action: 'view',
      });
      const canTablettePos = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'tablette',
        tab: 'pos',
        action: 'view',
      });
      const canTabletteDeleteKiosk = resolveAccess({
        tenant: activeTenant,
        entitlements: baseEntitlements,
        role: 'tablette',
        tab: 'kiosk',
        action: 'delete',
      });

      expect(canTabletteKiosk).toBe(true);
      expect(canTablettePos).toBe(false);
      expect(canTabletteDeleteKiosk).toBe(false);
    });
  });
});
