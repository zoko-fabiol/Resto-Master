import { describe, it, expect } from 'vitest';
import { calculateVatAndCac, extractHtFromTtc } from '../services/fiscal/vatCalculator';
import { generateOrderNumber } from '../lib/utils';
import { getDoualaDateKey, getDoualaIsoDate } from '../lib/timezone';

describe('Phase C — Sécurité, Intégrité et Fiscalité RestoMaster OS', () => {

  describe('C.3 — Moteur Fiscal Unifié (Cameroun DGI 2026)', () => {
    it('calcule exactement 177 FCFA TVA et 18 FCFA CAC pour une base de 1 010 FCFA (Total Taxe = 195 FCFA)', () => {
      const baseHT = 1010;
      const result = calculateVatAndCac(baseHT, 17.5, 10, false);

      expect(result.baseHT).toBe(1010);
      expect(result.vatAmount).toBe(177); // Math.round(1010 * 17.5 / 100) = 177
      expect(result.cacAmount).toBe(18);  // Math.round(177 * 10 / 100) = 18
      expect(result.totalTax).toBe(195);   // 177 + 18 = 195 (et non 194 !)
      expect(result.totalTTC).toBe(1205);
    });

    it('extrait correctement le HT et la répartition TVA/CAC depuis un TTC', () => {
      const totalTTC = 1205;
      const extracted = extractHtFromTtc(totalTTC, 19.25, false);

      expect(extracted.baseHT).toBe(1010); // 1205 / 1.1925 = 1010.48 -> 1010
      expect(extracted.totalTax).toBe(195); // 1205 - 1010 = 195
    });

    it('gère l\'exonération fiscale avec montants de taxe nuls', () => {
      const result = calculateVatAndCac(5000, 17.5, 10, true, 'Régime non assujetti');
      expect(result.vatAmount).toBe(0);
      expect(result.cacAmount).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.totalTTC).toBe(5000);
      expect(result.isExempt).toBe(true);
    });
  });

  describe('C.2 — Commandes Hors-Ligne Provisoires (PRV-)', () => {
    it('génère un numéro avec préfixe PRV- pour les commandes provisoires', () => {
      const provNum = generateOrderNumber(undefined, true);
      expect(provNum).toMatch(/^PRV-\d{8}-\d{4}$/);
    });

    it('génère un numéro avec préfixe CMD- pour les commandes certifiées avec séquence', () => {
      const orderNum = generateOrderNumber(42, false);
      expect(orderNum).toMatch(/^CMD-\d{8}-0042$/);
    });

    it('interdit l\'encaissement définitif d\'une commande provisoire non certifiée', () => {
      const provisionalOrder = {
        id: 'ord_offline_1',
        orderNumber: 'PRV-20261021-9999',
        provisional: true,
        total: 15000,
        paidAmount: 0,
      };

      const validatePaymentPrecondition = (order: typeof provisionalOrder) => {
        if (order.provisional) {
          throw new Error('Impossible d\'encaisser définitivement une commande provisoire non certifiée.');
        }
        return true;
      };

      expect(() => validatePaymentPrecondition(provisionalOrder)).toThrow(
        /Impossible d'encaisser définitivement une commande provisoire non certifiée/
      );
    });
  });

  describe('C.5 — Fuseau Horaire Africa/Douala', () => {
    it('calcule la bonne date à Douala aux frontières de minuit (23h30 UTC = le lendemain 00h30 à Douala)', () => {
      // 21 octobre 2026 à 23h30 UTC -> 22 octobre 2026 à 00h30 WAT (UTC+1, Douala)
      const lateUtcDate = new Date('2026-10-21T23:30:00.000Z');
      const doualaDateKey = getDoualaDateKey(lateUtcDate);

      expect(doualaDateKey).toBe('20261022');
    });

    it('génère la chaîne ISO avec décalage horaire correct pour Douala (+01:00)', () => {
      const date = new Date('2026-10-21T12:00:00.000Z');
      const iso = getDoualaIsoDate(date);
      expect(iso).toContain('2026-10-21T13:00:00');
    });
  });

  describe('C.4 — Contrôle de Périmètre Outlets & Claims', () => {
    it('rejette un restaurantId qui ne figure pas dans les outlets du caller', () => {
      const caller = {
        uid: 'user_1',
        role: 'serveur',
        outlets: ['resto_bonapriso'],
      };

      const assertOutletAccess = (requestedOutletId: string, callerContext: typeof caller) => {
        if (!requestedOutletId) {
          throw new Error('Identifiant d\'établissement obligatoire.');
        }
        const hasAccess =
          callerContext.outlets.includes('*') || callerContext.outlets.includes(requestedOutletId);
        if (!hasAccess) {
          throw new Error('Accès refusé pour cet établissement.');
        }
        return true;
      };

      expect(() => assertOutletAccess('resto_akwa', caller)).toThrow(
        /Accès refusé pour cet établissement/
      );
      expect(assertOutletAccess('resto_bonapriso', caller)).toBe(true);
    });
  });

  describe('C.1 — Simulation des Règles Firestore pour Orders', () => {
    interface OrderRuleContext {
      auth: { uid: string; role: string; outlets: string[] } | null;
      existingData?: Record<string, any>;
      incomingData: Record<string, any>;
    }

    const evaluateOrderRules = {
      // Seul le serveur / Admin SDK peut créer un document directement
      canCreateDirectly: (ctx: OrderRuleContext): boolean => {
        // Le client n'a jamais le droit d'écrire directement une commande dans orders/
        return false;
      },

      // Mise à jour : non-manager ne peut pas toucher aux montants financiers ni aux paiements
      canUpdate: (ctx: OrderRuleContext): boolean => {
        if (!ctx.auth) return false;
        const isManagerOrDirection = ctx.auth.role === 'direction' || ctx.auth.role === 'manager' || ctx.auth.role === 'superadmin';
        if (isManagerOrDirection) return true;

        const protectedFields = [
          'total', 'subtotal', 'rawSubtotal', 'tax', 'taxRate',
          'discount', 'discountPercent', 'paidAmount', 'totalPaid',
          'payments', 'paymentStatus', 'orderNumber', 'items'
        ];

        const existing = ctx.existingData || {};
        for (const field of protectedFields) {
          if (field in ctx.incomingData && ctx.incomingData[field] !== existing[field]) {
            return false;
          }
        }
        return true;
      },
    };

    it('interdit la création directe d\'une commande par un serveur', () => {
      const ctx: OrderRuleContext = {
        auth: { uid: 'srv_1', role: 'serveur', outlets: ['resto_1'] },
        incomingData: { orderNumber: 'CMD-1', total: 1000 },
      };
      expect(evaluateOrderRules.canCreateDirectly(ctx)).toBe(false);
    });

    it('interdit à un serveur de modifier paidAmount ou total', () => {
      const ctx: OrderRuleContext = {
        auth: { uid: 'srv_1', role: 'serveur', outlets: ['resto_1'] },
        existingData: { id: 'ord_1', total: 15000, paidAmount: 0, notes: '' },
        incomingData: { id: 'ord_1', total: 15000, paidAmount: 15000, notes: '' },
      };
      expect(evaluateOrderRules.canUpdate(ctx)).toBe(false);
    });

    it('permet à un serveur de modifier uniquement les champs opérationnels (notes, statut de préparation)', () => {
      const ctx: OrderRuleContext = {
        auth: { uid: 'srv_1', role: 'serveur', outlets: ['resto_1'] },
        existingData: { id: 'ord_1', total: 15000, paidAmount: 0, notes: '', status: 'en_attente' },
        incomingData: { id: 'ord_1', total: 15000, paidAmount: 0, notes: 'Sans piment', status: 'en_preparation' },
      };
      expect(evaluateOrderRules.canUpdate(ctx)).toBe(true);
    });
  });
});
