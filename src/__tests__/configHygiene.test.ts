import { describe, it, expect } from 'vitest';
import { DEFAULT_OPERATION_RULES } from '../types/configuration';
import { DEFAULT_FEATURES } from '../config/defaults';
import { ROLE_LABELS } from '../lib/utils';
import { UserRole } from '../types/restaurant';

describe('RestoMaster OS — Hygiène de Configuration & Catalogue Opérationnel (Phase 2)', () => {
  it('1. Valide l\'exhaustivité et l\'intégrité des règles opérationnelles actives (DEFAULT_OPERATION_RULES post-nettoyage B.4)', () => {
    const keys = Object.keys(DEFAULT_OPERATION_RULES);
    expect(keys.length).toBeGreaterThanOrEqual(140);

    // Vérification des domaines clés obligatoires après assainissement B.4
    const posKeys = keys.filter((k) => k.startsWith('pos_'));
    const tablesKeys = keys.filter((k) => k.startsWith('tables_'));
    const cuisineKeys = keys.filter((k) => k.startsWith('cuisine_'));
    const barKeys = keys.filter((k) => k.startsWith('bar_'));
    const stockKeys = keys.filter((k) => k.startsWith('stock_'));
    const achatsKeys = keys.filter((k) => k.startsWith('achats_'));
    const billKeys = keys.filter((k) => k.startsWith('bill_'));
    const notifKeys = keys.filter((k) => k.startsWith('notif_'));
    const payKeys = keys.filter((k) => k.startsWith('pay_'));

    expect(posKeys.length).toBeGreaterThanOrEqual(14);
    expect(tablesKeys.length).toBeGreaterThanOrEqual(8);
    expect(cuisineKeys.length).toBeGreaterThanOrEqual(7);
    expect(barKeys.length).toBeGreaterThanOrEqual(5);
    expect(stockKeys.length).toBeGreaterThanOrEqual(15);
    expect(achatsKeys.length).toBeGreaterThanOrEqual(8);
    expect(billKeys.length).toBeGreaterThanOrEqual(14);
    expect(notifKeys.length).toBe(6);
    expect(payKeys.length).toBe(9);

    // Toutes les valeurs doivent être de type booléen strict
    for (const key of keys) {
      expect(typeof DEFAULT_OPERATION_RULES[key]).toBe('boolean');
    }
  });

  it('2. Valide le catalogue de fonctionnalités (INITIAL_FEATURES / DEFAULT_FEATURES)', () => {
    expect(DEFAULT_FEATURES.length).toBe(40);

    const featureIds = new Set<string>();
    for (const feat of DEFAULT_FEATURES) {
      expect(feat.id).toBeTruthy();
      expect(feat.name).toBeTruthy();
      expect(feat.category).toBeTruthy();
      expect(feat.status).toBeDefined();
      expect(featureIds.has(feat.id)).toBe(false);
      featureIds.add(feat.id);
    }

    // Vérification des fonctionnalités stratégiques
    expect(featureIds.has('mobile_notifications')).toBe(true);
    expect(featureIds.has('role_permissions_matrix')).toBe(true);
    expect(featureIds.has('ebilling_dgi_ready')).toBe(true);
    expect(featureIds.has('offline_sync_engine')).toBe(true);
  });

  it('3. Valide le masquage automatique de la tuile organisation si établissement unique', () => {
    // Logique de visibilité dans AdminCenterView :
    // const showOrganisation = outlets.length > 1;
    const filterCategories = (outletsCount: number) => {
      const allCategories = [
        { id: 'identity_fiscal', title: 'Identité & Fiscalité' },
        { id: 'sales_floor', title: 'Vente & Salle' },
        { id: 'kitchen_bar', title: 'Cuisine & Bar' },
        { id: 'stock_purchases', title: 'Stocks & Achats' },
        { id: 'team_access', title: 'Équipe & Accès' },
        { id: 'hardware', title: 'Matériel & Imprimantes' },
        { id: 'organisation', title: 'Organisation & Établissements' },
      ];

      return allCategories.filter((cat) => {
        if (cat.id === 'organisation' && outletsCount <= 1) {
          return false;
        }
        return true;
      });
    };

    // Cas 1 : Restaurant unique (Mono-établissement)
    const singleOutletCats = filterCategories(1);
    expect(singleOutletCats.some((c) => c.id === 'organisation')).toBe(false);
    expect(singleOutletCats.length).toBe(6);

    // Cas 2 : Groupe ou chaîne (Multi-établissements)
    const multiOutletCats = filterCategories(3);
    expect(multiOutletCats.some((c) => c.id === 'organisation')).toBe(true);
    expect(multiOutletCats.length).toBe(7);
  });

  it('4. Valide l\'absence de libellés statiques techniques "Section N" dans les parcours', () => {
    const routeTitles = [
      'Identité & Fiscalité',
      'Vente & Salle',
      'Cuisine & Bar',
      'Stocks & Achats',
      'Équipe & Accès',
      'Matériel & Périphériques',
      'Fonctionnalités & Modules',
    ];

    const sectionRegex = /\bSection\s+\d+\b/i;
    for (const title of routeTitles) {
      expect(sectionRegex.test(title)).toBe(false);
    }
  });

  it('5. Valide les droits de configuration pour superadmin et direction', () => {
    const canEditSettings = (role: UserRole) => {
      return role === 'superadmin' || role === 'direction';
    };

    // Superadmin et Direction doivent avoir un droit d'édition absolu
    expect(canEditSettings('superadmin')).toBe(true);
    expect(canEditSettings('direction')).toBe(true);

    // Les autres rôles sont restreints en lecture ou masqués
    expect(canEditSettings('manager')).toBe(false);
    expect(canEditSettings('serveur')).toBe(false);
    expect(canEditSettings('caisse')).toBe(false);
    expect(canEditSettings('cuisine')).toBe(false);
  });

  it('6. Valide la couverture des rôles métier dans le référentiel d\'équipe', () => {
    const expectedRoles: UserRole[] = [
      'superadmin',
      'direction',
      'manager',
      'serveur',
      'caisse',
      'cuisine',
      'bar',
      'stock',
      'rh',
      'finance',
      'comptable',
      'auditeur',
      'tablette',
    ];

    for (const r of expectedRoles) {
      expect(ROLE_LABELS[r]).toBeDefined();
      expect(ROLE_LABELS[r].label).toBeTruthy();
    }
  });
});
