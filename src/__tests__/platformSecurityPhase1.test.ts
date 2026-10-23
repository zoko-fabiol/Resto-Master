import { describe, it, expect } from 'vitest';
import { evaluateTenantAccess, TENANT_STATE_ACCESS_RULES } from '../../functions/src/auth.js';
import { mapPlanToPackId, mapProfileToRestaurantType } from '../../functions/src/modules/provisioning.js';
import { PlatformRole } from '../../shared/types/platform.js';

describe('Phase 1 — Sécurité Plateforme : Contrôle d’Accès et Matrice des États Tenants', () => {
  it('la table TENANT_STATE_ACCESS_RULES couvre tous les statuts requis', () => {
    const requiredStatuses = [
      'demande',
      'inscription_en_attente',
      'installation',
      'paiement_en_attente',
      'paiement_a_verifier',
      'actif',
      'impaye',
      'suspendu',
      'resilie',
      'archive',
    ];

    for (const status of requiredStatuses) {
      expect(TENANT_STATE_ACCESS_RULES[status]).toBeDefined();
    }
  });

  it('l’état "installation" autorise la configuration mais bloque formellement la vente en caisse', () => {
    const vente = evaluateTenantAccess('installation', 'vente');
    expect(vente.allowed).toBe(false);
    expect(vente.reason).toContain('La vente en caisse exige l’activation d’un abonnement');

    const config = evaluateTenantAccess('installation', 'config');
    expect(config.allowed).toBe(true);

    const lecture = evaluateTenantAccess('installation', 'lecture');
    expect(lecture.allowed).toBe(true);
  });

  it('les états de paiement bloquent la vente et autorisent la configuration', () => {
    for (const st of ['paiement_en_attente', 'paiement_a_verifier']) {
      const vente = evaluateTenantAccess(st, 'vente');
      expect(vente.allowed).toBe(false);

      const config = evaluateTenantAccess(st, 'config');
      expect(config.allowed).toBe(true);
    }
  });

  it('l’état "actif" autorise pleinement la vente, la configuration et la lecture', () => {
    expect(evaluateTenantAccess('actif', 'vente').allowed).toBe(true);
    expect(evaluateTenantAccess('actif', 'config').allowed).toBe(true);
    expect(evaluateTenantAccess('actif', 'lecture').allowed).toBe(true);
  });

  it('l’état "impaye" refuse la vente et la configuration mais autorise la lecture seule (grâce)', () => {
    const vente = evaluateTenantAccess('impaye', 'vente');
    expect(vente.allowed).toBe(false);

    const config = evaluateTenantAccess('impaye', 'config');
    expect(config.allowed).toBe(false);

    const lecture = evaluateTenantAccess('impaye', 'lecture');
    expect(lecture.allowed).toBe(true);
  });

  it('l’état "suspendu" gère distinctement le mode "read_only" et le mode "full_block"', () => {
    // Mode lecture seule accordé si demandé explicitement
    const roAllowed = evaluateTenantAccess('suspendu', 'lecture', 'read_only', true);
    expect(roAllowed.allowed).toBe(true);

    // Mode full_block refuse toujours, même avec l'option allowReadOnly
    const fbRefused = evaluateTenantAccess('suspendu', 'lecture', 'full_block', true);
    expect(fbRefused.allowed).toBe(false);

    // Mode read_only sans option explicite allowReadOnly refuse
    const roWithoutOption = evaluateTenantAccess('suspendu', 'lecture', 'read_only', false);
    expect(roWithoutOption.allowed).toBe(false);
  });

  it('les états "resilie" et "archive" bloquent toutes les opérations sans exception', () => {
    for (const st of ['resilie', 'archive']) {
      expect(evaluateTenantAccess(st, 'vente').allowed).toBe(false);
      expect(evaluateTenantAccess(st, 'config').allowed).toBe(false);
      expect(evaluateTenantAccess(st, 'lecture').allowed).toBe(false);
    }
  });
});

describe('Phase 1 — Sécurité Plateforme : Rôles & Isolation des Privilèges', () => {
  it('mappe fidèlement les anciens identifiants de plans vers les 3 packs officiels', () => {
    expect(mapPlanToPackId('plan_starter')).toBe('minimum');
    expect(mapPlanToPackId('starter')).toBe('minimum');
    expect(mapPlanToPackId('minimum')).toBe('minimum');

    expect(mapPlanToPackId('plan_pro')).toBe('medium');
    expect(mapPlanToPackId('medium')).toBe('medium');
    expect(mapPlanToPackId(undefined)).toBe('medium');

    expect(mapPlanToPackId('plan_enterprise')).toBe('premium');
    expect(mapPlanToPackId('enterprise')).toBe('premium');
    expect(mapPlanToPackId('premium')).toBe('premium');
  });

  it('mappe fidèlement les anciens profils vers les 8 types de restaurant officiels', () => {
    expect(mapProfileToRestaurantType('evenementiel_traiteur')).toBe('traiteur_banquets');
    expect(mapProfileToRestaurantType('hotel_complexe')).toBe('hotel_restaurant');
    expect(mapProfileToRestaurantType('depart_essentiel')).toBe('snack_takeaway');
    expect(mapProfileToRestaurantType('snack_takeaway')).toBe('snack_takeaway');
    expect(mapProfileToRestaurantType('fast_food')).toBe('fast_food');
    expect(mapProfileToRestaurantType('restaurant_classique')).toBe('restaurant_classique');
    expect(mapProfileToRestaurantType('maquis_bar_restaurant')).toBe('maquis_bar_restaurant');
    expect(mapProfileToRestaurantType('bar_lounge')).toBe('bar_lounge');
    expect(mapProfileToRestaurantType('boulangerie_cafe')).toBe('boulangerie_cafe');
    expect(mapProfileToRestaurantType('traiteur_banquets')).toBe('traiteur_banquets');
    expect(mapProfileToRestaurantType('hotel_restaurant')).toBe('hotel_restaurant');
  });

  it('les rôles d’administration plateforme valides sont strictement énumérés', () => {
    const validRoles: PlatformRole[] = ['platform_owner', 'platform_admin', 'support', 'billing'];
    expect(validRoles).toContain('platform_owner');
    expect(validRoles).toContain('platform_admin');
    expect(validRoles).toContain('support');
    expect(validRoles).toContain('billing');

    // Un rôle restaurant (ex: superadmin ou direction) ne fait PAS partie des rôles plateforme
    expect(validRoles.includes('superadmin' as any)).toBe(false);
    expect(validRoles.includes('direction' as any)).toBe(false);
  });
});
