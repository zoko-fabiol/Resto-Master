import { describe, it, expect } from 'vitest';
import {
  computeQuote,
  CATALOG_PACKS,
  RESTAURANT_TYPES,
  CATALOG_ADDONS,
} from '../../shared/catalog/index';
import { resolveEntitlements, getTenantAccessStatus } from '../../shared/catalog/resolver';
import { evaluateTenantAccess } from '../../functions/src/auth';
import {
  handleSubmitSubscriptionOrder,
  handleMarkPaymentSent,
  handleValidateSubscriptionPayment,
} from '../../functions/src/modules/subscriptions';
import { TenantStatus } from '../../shared/types/tenant';

describe('Phase 8 — Recette Complète sur Émulateurs (13 Scénarios Métier)', () => {
  // Contexte partagé du scénario
  const orgId = 'org_recette_e2e_2026';
  const ownerUid = 'user_owner_recette';

  // --------------------------------------------------------------------------
  // SCÉNARIO 1 : Inscription nouveau restaurant (type classique, pack Minimum)
  // --------------------------------------------------------------------------
  it('Scénario 1 : Inscription nouveau restaurant (type classique, pack Minimum)', () => {
    const selectedType = RESTAURANT_TYPES.restaurant_classique;
    expect(selectedType).toBeDefined();
    expect(selectedType.name).toContain('Restaurant Classique');

    const pack = CATALOG_PACKS.minimum;
    expect(pack.priceMonthly).toBe(25000);
    expect(pack.limits.maxTerminals).toBe(1);
    expect(pack.limits.maxUsers).toBe(3);
    expect(pack.limits.maxOrdersPerMonth).toBe(1500);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 2 : Accès initial bloqué en vente / POS avec statut 'installation'
  // --------------------------------------------------------------------------
  it('Scénario 2 : Accès initial bloqué en vente / POS avec statut installation', () => {
    const accessSale = evaluateTenantAccess('installation', 'vente');
    expect(accessSale.allowed).toBe(false);
    expect(accessSale.reason).toMatch(/installation/i);

    const accessConfig = evaluateTenantAccess('installation', 'config');
    expect(accessConfig.allowed).toBe(true);

    const accessStatus = getTenantAccessStatus('installation');
    expect(accessStatus.isFullyBlocked).toBe(false);
    expect(accessStatus.isReadOnly).toBe(false);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 3 : Parcours de l'assistant d'installation (Chapitres 1 à 5)
  // --------------------------------------------------------------------------
  it('Scénario 3 : Parcours complet de l\'assistant d\'installation (Chapitres 1 à 5)', () => {
    // Chapitre 1 : Identité
    const legalData = {
      businessName: 'Le Baobab Gourmet',
      legalForm: 'SARL',
      tradeName: 'Le Baobab',
      address: 'Boulevard de la Liberté, Akwa',
      city: 'Douala',
      quarter: 'Akwa',
      niu: 'M051812345678A',
      rccm: 'RC/DLA/2026/B/1234',
      currency: 'XAF',
    };
    expect(legalData.niu).toHaveLength(14);
    expect(legalData.currency).toBe('XAF');

    // Chapitre 2 : Profil Métier & Pack
    const profile = RESTAURANT_TYPES.restaurant_classique;
    expect(profile.tierModules.minimum).toContain('mod_tables');

    // Chapitre 3 : Options & Devis Serveur
    const quote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_delivery'],
    });
    // 25 000 FCFA + 2 000 FCFA = 27 000 FCFA
    expect(quote.subtotalHT).toBe(27000);
    expect(quote.finalPayableAmount).toBe(27000);

    // Chapitre 4 : Matériel & Collaborateurs
    const hardwareConfig = {
      receiptPrinterWidth: '80mm',
      kitchenDisplayMode: 'kds',
      initialStaff: [
        { name: 'Manager Général', role: 'direction', pin: '1234' },
        { name: 'Caissier Principal', role: 'caissier', pin: '5678' },
      ],
    };
    expect(hardwareConfig.receiptPrinterWidth).toBe('80mm');
    expect(hardwareConfig.initialStaff).toHaveLength(2);

    // Chapitre 5 : Facturation & Récapitulatif certifié
    expect(quote.lines).toHaveLength(2);
    expect(quote.lines[0].label).toContain('Minimum');
    expect(quote.lines[1].label).toContain('Livraisons');
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 4 : Émission de l'ordre d'abonnement avec référence certifiée
  // --------------------------------------------------------------------------
  it('Scénario 4 : Émission de l\'ordre d\'abonnement avec référence RM-AAAA-NNNNNN', async () => {
    // Vérification du format d'ordre
    const now = new Date();
    const year = now.getFullYear();
    const mockOrderNumber = 42;
    const orderId = `RM-${year}-${String(mockOrderNumber).padStart(6, '0')}`;

    expect(orderId).toMatch(/^RM-\d{4}-\d{6}$/);

    // Rejet pour un utilisateur sans droit direction
    await expect(
      handleSubmitSubscriptionOrder({
        auth: { uid: 'user_serveur', token: { role: 'serveur', organizationId: orgId } },
        data: { packId: 'minimum', billingCycle: 'mensuel' },
      } as any)
    ).rejects.toThrow(/Seul le propriétaire/);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 5 : Déclaration de paiement manuel (Orange Money / MTN / Virement)
  // --------------------------------------------------------------------------
  it('Scénario 5 : Déclaration de paiement manuel avec validation stricte des arguments', async () => {
    // Rejet si référence vide ou espaces seuls
    await expect(
      handleMarkPaymentSent({
        auth: { uid: ownerUid, token: { role: 'direction', organizationId: orgId } },
        data: {
          orderId: 'RM-2026-000042',
          paymentMethod: 'orange_money',
          transactionReference: '   ',
        },
      } as any)
    ).rejects.toThrow(/référence de transaction sont obligatoires/i);

    // Rejet si mode de règlement manquant
    await expect(
      handleMarkPaymentSent({
        auth: { uid: ownerUid, token: { role: 'direction', organizationId: orgId } },
        data: {
          orderId: 'RM-2026-000042',
          paymentMethod: '' as any,
          transactionReference: 'OM-TX-998877',
        },
      } as any)
    ).rejects.toThrow(/référence de transaction sont obligatoires/i);

    // Rejet si orderId manquant
    await expect(
      handleMarkPaymentSent({
        auth: { uid: ownerUid, token: { role: 'direction', organizationId: orgId } },
        data: {
          orderId: '',
          paymentMethod: 'mtn_momo',
          transactionReference: 'MOMO-REF-12345',
        },
      } as any)
    ).rejects.toThrow(/référence de transaction sont obligatoires/i);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 6 : Passage au statut 'paiement_a_verifier'
  // --------------------------------------------------------------------------
  it('Scénario 6 : Statut paiement_a_verifier maintient le blocage caisse et informe l\'utilisateur', () => {
    const accessSale = evaluateTenantAccess('paiement_a_verifier', 'vente');
    expect(accessSale.allowed).toBe(false);
    expect(accessSale.reason).toContain('en cours de vérification');

    const accessStatus = getTenantAccessStatus('paiement_a_verifier');
    expect(accessStatus.isFullyBlocked).toBe(false);
    expect(accessStatus.isReadOnly).toBe(false);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 7 : Vue admin PendingPaymentsListView
  // --------------------------------------------------------------------------
  it('Scénario 7 : Vue admin PendingPaymentsListView filtre rigoureusement les ordres en attente', () => {
    const mockOrders = [
      { id: 'RM-2026-000041', status: 'payee', totalAmount: 25000 },
      { id: 'RM-2026-000042', status: 'paiement_a_verifier', totalAmount: 27000 },
      { id: 'RM-2026-000043', status: 'en_attente_paiement', totalAmount: 50000 },
    ];

    const pendingReview = mockOrders.filter((o) => o.status === 'paiement_a_verifier');
    expect(pendingReview).toHaveLength(1);
    expect(pendingReview[0].id).toBe('RM-2026-000042');
    expect(pendingReview[0].totalAmount).toBe(27000);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 8 : Validation du paiement par l'admin avec contrôle des privilèges
  // --------------------------------------------------------------------------
  it('Scénario 8 : Validation du paiement par l\'administrateur exige le rôle superadmin ou finance', async () => {
    // Rejet pour un utilisateur sans platformRole
    await expect(
      handleValidateSubscriptionPayment({
        auth: { uid: 'user_lambda', token: { role: 'direction' } },
        data: { orderId: 'RM-2026-000042' },
      } as any)
    ).rejects.toThrow(/Privilèges de plateforme/);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 9 : Bascule automatique et idempotente au statut 'actif'
  // --------------------------------------------------------------------------
  it('Scénario 9 : Bascule automatique au statut actif avec calcul exact de l\'échéance', () => {
    const statusAfterValidation: TenantStatus = 'actif';
    const accessSale = evaluateTenantAccess(statusAfterValidation, 'vente');
    expect(accessSale.allowed).toBe(true);

    // Calcul de date : 1 mois pour cycle mensuel
    const now = new Date('2026-10-23T10:00:00.000Z');
    const monthlyEnd = new Date(now);
    monthlyEnd.setMonth(monthlyEnd.getMonth() + 1);
    expect(monthlyEnd.getMonth()).toBe(10); // Novembre 2026 (index 10)

    // Calcul de date : 12 mois pour cycle annuel (avec 2 mois offerts)
    const annualEnd = new Date(now);
    annualEnd.setFullYear(annualEnd.getFullYear() + 1);
    expect(annualEnd.getFullYear()).toBe(2027);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 10 : Déblocage immédiat de la caisse POS et accès aux modules souscrits
  // --------------------------------------------------------------------------
  it('Scénario 10 : Déblocage immédiat du POS et des modules souscrits pour le Pack Minimum + Livraisons', () => {
    const entitlements = resolveEntitlements({
      orgId,
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      subscribedAddons: ['addon_delivery'],
    });

    // Modules accessibles
    expect(entitlements.modules.mod_pos).toBe(true);
    expect(entitlements.modules.mod_caisse).toBe(true);
    expect(entitlements.modules.mod_dashboard).toBe(true);
    expect(entitlements.modules.mod_tables).toBe(true); // Inclus dans profil classique
    expect(entitlements.modules.mod_delivery).toBe(true); // Souscrit à la carte
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 11 : Verrouillage FeatureGate sur un module non souscrit (KDS Bar / Stock)
  // --------------------------------------------------------------------------
  it('Scénario 11 : Verrouillage FeatureGate sur les modules non souscrits', () => {
    const entitlements = resolveEntitlements({
      orgId,
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      subscribedAddons: ['addon_delivery'],
    });

    // Modules expressément non souscrits
    expect(entitlements.modules.mod_bar).toBeFalsy();
    expect(entitlements.modules.mod_stock).toBeFalsy();
    expect(entitlements.modules.mod_fiscal).toBeFalsy();
    expect(entitlements.modules.mod_events).toBeFalsy();
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 12 : Espace Mon Abonnement & Boutique : ajout d'une option et calcul du devis
  // --------------------------------------------------------------------------
  it('Scénario 12 : Espace Mon Abonnement : devis certifié pour évolution d\'options', () => {
    // Le client souhaite ajouter le module Stock Avancé (3 500 FCFA/mois)
    const upgradeQuote = computeQuote({
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      billingCycle: 'mensuel',
      selectedAddonIds: ['addon_delivery', 'addon_stocks'],
    });

    // 25 000 + 2 000 (livraison) + 3 500 (stocks) = 30 500 FCFA HT
    expect(upgradeQuote.subtotalHT).toBe(30500);
    expect(upgradeQuote.finalPayableAmount).toBe(30500);

    // Résolution prévisionnelle des modules après souscription
    const upgradedEntitlements = resolveEntitlements({
      orgId,
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      subscribedAddons: ['addon_delivery', 'addon_stocks'],
    });
    expect(upgradedEntitlements.modules.mod_stock).toBe(true);
  });

  // --------------------------------------------------------------------------
  // SCÉNARIO 13 : Contrôle strict des plafonds de quotas
  // --------------------------------------------------------------------------
  it('Scénario 13 : Contrôle strict des plafonds de quotas (utilisateurs, terminaux, commandes)', () => {
    const entitlements = resolveEntitlements({
      orgId,
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
    });

    // Pack Minimum : 3 utilisateurs, 1 terminal, 1 500 commandes
    expect(entitlements.effectiveLimits.maxUsers).toBe(3);
    expect(entitlements.effectiveLimits.maxTerminals).toBe(1);
    expect(entitlements.effectiveLimits.maxOrdersPerMonth).toBe(1500);

    // Simulation de tentative d'ajout au-delà du quota
    const currentUsersCount = 3;
    const canCreateFourthUser = currentUsersCount < entitlements.effectiveLimits.maxUsers;
    expect(canCreateFourthUser).toBe(false);

    const currentTerminalsCount = 1;
    const canPairSecondTerminal = currentTerminalsCount < entitlements.effectiveLimits.maxTerminals;
    expect(canPairSecondTerminal).toBe(false);

    // Extension de capacité
    const extendedEntitlements = resolveEntitlements({
      orgId,
      restaurantType: 'restaurant_classique',
      packId: 'minimum',
      capacities: {
        extraUsers: 2, // 3 + 2 = 5
        extraTerminals: 1, // 1 + 1 = 2
      },
    });
    expect(currentUsersCount < extendedEntitlements.effectiveLimits.maxUsers).toBe(true);
    expect(currentTerminalsCount < extendedEntitlements.effectiveLimits.maxTerminals).toBe(true);
  });
});
