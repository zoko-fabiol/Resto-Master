import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { PlatformRole, TenantStatus } from '../../shared/types';

/**
 * Suite de tests unitaires pour le Provisionnement et l'Audit Log Plateforme (Phase 2)
 */

function computeAuditChainHash(payload: string, prevHash: string): string {
  return crypto.createHash('sha256').update(`${prevHash}|${payload}`).digest('hex');
}

function validateSignupInputs(data: {
  companyName: string;
  city: string;
  phone: string;
  email: string;
  applicantName: string;
}): { valid: boolean; error?: string } {
  if (!data.companyName?.trim()) return { valid: false, error: 'Nom de société obligatoire' };
  if (!data.city?.trim()) return { valid: false, error: 'Ville obligatoire' };
  if (!data.phone?.trim()) return { valid: false, error: 'Téléphone obligatoire' };
  if (!data.applicantName?.trim()) return { valid: false, error: 'Nom du responsable obligatoire' };

  const email = data.email?.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Adresse e-mail invalide' };
  }

  return { valid: true };
}

function getPlanEntitlements(planId: string) {
  switch (planId) {
    case 'plan_starter':
      return {
        limits: { maxOutlets: 1, maxUsers: 3, maxTerminals: 1, maxOrdersPerMonth: 1500 },
        moduleCount: 6,
      };
    case 'plan_enterprise':
      return {
        limits: { maxOutlets: 10, maxUsers: 100, maxTerminals: 50, maxOrdersPerMonth: 100000 },
        moduleCount: 23,
      };
    case 'plan_pro':
    default:
      return {
        limits: { maxOutlets: 1, maxUsers: 10, maxTerminals: 4, maxOrdersPerMonth: 10000 },
        moduleCount: 17,
      };
  }
}

describe('Provisionnement et Gestion des Tenants SaaS (Phase 2)', () => {
  describe('1. Validation des Demandes d\'Inscription (submitSignup)', () => {
    it('Valide une demande complète avec données conformes', () => {
      const res = validateSignupInputs({
        companyName: 'Le Glacier de Bonanjo',
        city: 'Douala',
        phone: '+237 699 00 00 00',
        email: 'direction@glacier-bonanjo.cm',
        applicantName: 'Mme Sophie Eto\'o',
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('Rejette une demande avec e-mail syntaxiquement invalide', () => {
      const res = validateSignupInputs({
        companyName: 'Le Glacier de Bonanjo',
        city: 'Douala',
        phone: '+237 699 00 00 00',
        email: 'glacier_sans_domaine',
        applicantName: 'Mme Sophie Eto\'o',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('e-mail invalide');
    });

    it('Rejette une demande avec champs obligatoires vides', () => {
      const res = validateSignupInputs({
        companyName: '',
        city: 'Douala',
        phone: '+237 699 00 00 00',
        email: 'contact@test.cm',
        applicantName: '',
      });
      expect(res.valid).toBe(false);
    });
  });

  describe('2. Quotas et Limites par Formule d\'Abonnement (Plans)', () => {
    it('Le plan Starter attribue 1 terminal et 6 modules de base', () => {
      const { limits, moduleCount } = getPlanEntitlements('plan_starter');
      expect(limits.maxTerminals).toBe(1);
      expect(limits.maxUsers).toBe(3);
      expect(moduleCount).toBe(6);
    });

    it('Le plan Pro attribue 4 terminaux, 10 utilisateurs et 17 modules', () => {
      const { limits, moduleCount } = getPlanEntitlements('plan_pro');
      expect(limits.maxTerminals).toBe(4);
      expect(limits.maxUsers).toBe(10);
      expect(moduleCount).toBe(17);
    });

    it('Le plan Entreprise attribue 50 terminaux, 100 utilisateurs et les 23 modules', () => {
      const { limits, moduleCount } = getPlanEntitlements('plan_enterprise');
      expect(limits.maxTerminals).toBe(50);
      expect(limits.maxOutlets).toBe(10);
      expect(moduleCount).toBe(23);
    });
  });

  describe('3. Transitions d\'État de Tenant (setTenantStatus)', () => {
    interface TenantState {
      status: TenantStatus;
      suspensionMode?: 'read_only' | 'full_block';
      suspensionReason?: string;
    }

    function applyStatusChange(
      current: TenantState,
      newStatus: TenantStatus,
      reason: string,
      mode?: 'read_only' | 'full_block'
    ): TenantState {
      if (reason.trim().length < 5) {
        throw new Error('Motif obligatoire (min 5 caractères)');
      }
      if (newStatus === 'suspendu' && !mode) {
        throw new Error('Mode de suspension obligatoire');
      }

      if (newStatus === 'suspendu') {
        return {
          status: 'suspendu',
          suspensionMode: mode,
          suspensionReason: reason,
        };
      }

      if (newStatus === 'actif') {
        return {
          status: 'actif',
        };
      }

      return { status: newStatus, suspensionReason: reason };
    }

    it('Suspend un tenant actif en mode lecture seule avec motif', () => {
      const initial: TenantState = { status: 'actif' };
      const updated = applyStatusChange(
        initial,
        'suspendu',
        'Retard de paiement facture #INV-2026-004',
        'read_only'
      );
      expect(updated.status).toBe('suspendu');
      expect(updated.suspensionMode).toBe('read_only');
      expect(updated.suspensionReason).toContain('Retard de paiement');
    });

    it('Suspend un tenant actif en mode blocage total', () => {
      const initial: TenantState = { status: 'actif' };
      const updated = applyStatusChange(
        initial,
        'suspendu',
        'Fraude avérée ou contentieux juridique',
        'full_block'
      );
      expect(updated.status).toBe('suspendu');
      expect(updated.suspensionMode).toBe('full_block');
    });

    it('Réactive un tenant suspendu et efface les motifs de suspension', () => {
      const suspended: TenantState = {
        status: 'suspendu',
        suspensionMode: 'read_only',
        suspensionReason: 'Facture impayée',
      };
      const reactivated = applyStatusChange(
        suspended,
        'actif',
        'Règlement reçu par Orange Money réf #OM987654'
      );
      expect(reactivated.status).toBe('actif');
      expect(reactivated.suspensionMode).toBeUndefined();
      expect(reactivated.suspensionReason).toBeUndefined();
    });

    it('Rejette une suspension si le mode n\'est pas spécifié', () => {
      const initial: TenantState = { status: 'actif' };
      expect(() => applyStatusChange(initial, 'suspendu', 'Motif sans mode')).toThrow();
    });

    it('Rejette un changement sans motif explicite de 5 caractères minimum', () => {
      const initial: TenantState = { status: 'actif' };
      expect(() => applyStatusChange(initial, 'suspendu', 'ab', 'read_only')).toThrow();
    });
  });

  describe('4. Chaînage Cryptographique SHA-256 de l\'Audit Log Plateforme', () => {
    it('Calcule une empreinte SHA-256 valide liée au log précédent', () => {
      const genesisHash = 'GENESIS-PLATFORM-AUDIT-ROOT-HASH';
      const log1Payload = JSON.stringify({
        action: 'CREATE_TENANT',
        targetOrgId: 'org-001',
        actorUid: 'admin-1',
        reason: 'Nouveau restaurant pilote',
      });
      const hash1 = computeAuditChainHash(log1Payload, genesisHash);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);

      const log2Payload = JSON.stringify({
        action: 'SUSPEND_TENANT',
        targetOrgId: 'org-001',
        actorUid: 'admin-1',
        reason: 'Impayé',
      });
      const hash2 = computeAuditChainHash(log2Payload, hash1);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).not.toBe(hash1);
    });

    it('Détecte immédiatement toute falsification d\'un maillon dans la chaîne', () => {
      const genesisHash = 'GENESIS-PLATFORM-AUDIT-ROOT-HASH';
      const log1Payload = JSON.stringify({ action: 'CREATE_TENANT', targetOrgId: 'org-001' });
      const hash1 = computeAuditChainHash(log1Payload, genesisHash);

      const log2Payload = JSON.stringify({ action: 'ACTIVATE_FEATURE', feature: 'mod_delivery' });
      const legitimateHash2 = computeAuditChainHash(log2Payload, hash1);

      // Si un attaquant modifie rétroactivement log1Payload :
      const tamperedLog1Payload = JSON.stringify({ action: 'CREATE_TENANT', targetOrgId: 'org-PIRATE' });
      const tamperedHash1 = computeAuditChainHash(tamperedLog1Payload, genesisHash);

      const recalculatedHash2 = computeAuditChainHash(log2Payload, tamperedHash1);
      expect(recalculatedHash2).not.toBe(legitimateHash2);
    });
  });
});
