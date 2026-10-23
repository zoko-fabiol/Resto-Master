import { describe, it, expect, vi } from 'vitest';
import {
  handleSubmitSubscriptionOrder,
  handleMarkPaymentSent,
  handleValidateSubscriptionPayment,
  handleRejectSubscriptionPayment,
} from '../../functions/src/modules/subscriptions.js';
import { evaluateTenantAccess } from '../../functions/src/auth.js';

describe('Phase 3 — Cycle d\'Adhésion, Commande d\'Abonnement et Validation du Paiement', () => {
  it('la matrice de sécurité bloque la vente en caisse tant que le paiement n\'est pas validé', () => {
    // États pré-activation
    for (const status of ['demande', 'installation', 'paiement_en_attente', 'paiement_a_verifier']) {
      const access = evaluateTenantAccess(status, 'vente');
      expect(access.allowed).toBe(false);
      expect(access.reason).toBeDefined();
    }

    // État pleinement activé
    const activeAccess = evaluateTenantAccess('actif', 'vente');
    expect(activeAccess.allowed).toBe(true);
  });

  it('l\'état impayé active la période de grâce en lecture seule sans autoriser la vente', () => {
    const vente = evaluateTenantAccess('impaye', 'vente');
    expect(vente.allowed).toBe(false);

    const lecture = evaluateTenantAccess('impaye', 'lecture');
    expect(lecture.allowed).toBe(true);
  });

  it('handleSubmitSubscriptionOrder rejette une souscription sans rôle propriétaire', async () => {
    await expect(
      handleSubmitSubscriptionOrder({
        auth: { uid: 'user_serveur', token: { role: 'serveur', organizationId: 'org_test' } },
        data: {
          packId: 'minimum',
          billingCycle: 'mensuel',
        },
      } as any)
    ).rejects.toThrow(/Seul le propriétaire de l'établissement/);
  });

  it('handleSubmitSubscriptionOrder rejette un pack ou un cycle inconnu', async () => {
    await expect(
      handleSubmitSubscriptionOrder({
        auth: { uid: 'user_owner', token: { role: 'direction', organizationId: 'org_test' } },
        data: {
          packId: 'pack_inconnu' as any,
          billingCycle: 'mensuel',
        },
      } as any)
    ).rejects.toThrow();

    await expect(
      handleSubmitSubscriptionOrder({
        auth: { uid: 'user_owner', token: { role: 'direction', organizationId: 'org_test' } },
        data: {
          packId: 'minimum',
          billingCycle: 'trimestriel_invalide' as any,
        },
      } as any)
    ).rejects.toThrow();
  });

  it('handleMarkPaymentSent rejette une déclaration avec une référence vide', async () => {
    await expect(
      handleMarkPaymentSent({
        auth: { uid: 'user_owner', token: { role: 'direction', organizationId: 'org_test' } },
        data: {
          orderId: 'ord_123',
          paymentMethod: 'orange_money',
          transactionReference: '  ',
        },
      } as any)
    ).rejects.toThrow();
  });

  it('handleValidateSubscriptionPayment et handleRejectSubscriptionPayment exigent des privilèges plateforme', async () => {
    // Appelant sans claim platformRole
    await expect(
      handleValidateSubscriptionPayment({
        auth: { uid: 'user_normal', token: { email: 'client@test.internal' } },
        data: { orderId: 'ord_123' },
      } as any)
    ).rejects.toThrow(/Privilèges de plateforme/);

    await expect(
      handleRejectSubscriptionPayment({
        auth: { uid: 'user_normal', token: { email: 'client@test.internal' } },
        data: { orderId: 'ord_123', rejectionReason: 'Motif invalide' },
      } as any)
    ).rejects.toThrow(/Privilèges de plateforme/);
  });
});
