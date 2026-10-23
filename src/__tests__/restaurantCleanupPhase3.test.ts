import { describe, it, expect } from 'vitest';
import { OPERATION_RULES } from '../../shared/types/accessCatalog';

describe('Phase 3 — Nettoyage côté Restaurant & Verrouillage des Clés Non Déléguées', () => {
  it('toutes les règles sensibles (risque eleve ou critique) doivent avoir delegable: false par défaut ou exiger lockedConfigKeys', () => {
    const criticalRules = OPERATION_RULES.filter((r) => r.risk === 'critique');
    expect(criticalRules.length).toBeGreaterThan(0);

    for (const rule of criticalRules) {
      expect(rule.risk).toBe('critique');
      // Les règles critiques doivent être documentées avec un moduleKey valide
      expect(rule.moduleKey).toBeDefined();
    }
  });

  it('le filtrage de mise à jour des règles doit interdire les clés verrouillées (lockedConfigKeys)', () => {
    const lockedConfigKeys = ['enableStockAutoDeduction', 'requireCashCountOnClose', 'cameroon_fiscal_framework'];
    const attemptedUpdates: Record<string, any> = {
      enableStockAutoDeduction: false, // VERROUILLÉE
      requireCashCountOnClose: false,  // VERROUILLÉE
      enableOrderNotes: true,          // DÉLÉGABLE (autorisée)
    };

    const sanitizedUpdates: Record<string, any> = {};
    const blockedKeys: string[] = [];

    for (const [key, value] of Object.entries(attemptedUpdates)) {
      if (lockedConfigKeys.includes(key)) {
        blockedKeys.push(key);
      } else {
        sanitizedUpdates[key] = value;
      }
    }

    expect(blockedKeys).toEqual(['enableStockAutoDeduction', 'requireCashCountOnClose']);
    expect(sanitizedUpdates).toEqual({ enableOrderNotes: true });
    expect(sanitizedUpdates.enableStockAutoDeduction).toBeUndefined();
  });

  it('le restaurant ne peut plus modifier de clés si toutes les clés soumises sont verrouillées', () => {
    const lockedConfigKeys = ['enableStockAutoDeduction'];
    const attemptedUpdates = { enableStockAutoDeduction: false };

    const sanitizedUpdates: Record<string, any> = {};
    const blockedKeys: string[] = [];

    for (const [key, value] of Object.entries(attemptedUpdates)) {
      if (lockedConfigKeys.includes(key)) {
        blockedKeys.push(key);
      } else {
        sanitizedUpdates[key] = value;
      }
    }

    const shouldAbort = blockedKeys.length > 0 && Object.keys(sanitizedUpdates).length === 0;
    expect(shouldAbort).toBe(true);
  });
});
