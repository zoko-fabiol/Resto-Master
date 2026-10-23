import { describe, it, expect } from 'vitest';
import {
  calculateCameroonVatFromHt,
  extractCameroonVatFromTtc,
  calculateOrderPricing,
  calculateStampDuty,
  roundToFcfa,
  formatFcfa,
  CAMEROON_VAT_RATE,
  CAMEROON_CAC_RATE,
  CAMEROON_COMBINED_TAX_RATE,
} from '../../shared/fiscal/cameroonFiscal';

describe('RestoMaster OS — Moteur Fiscal & Monétaire Cameroun (CGI 2026 / FCFA)', () => {
  it('1. Valide le calcul nominal de TVA (17,5%) et CAC (10% de la TVA = 1,75% HT)', () => {
    const baseHT = 10000;
    const res = calculateCameroonVatFromHt(baseHT);

    expect(res.baseHT).toBe(10000);
    expect(res.vatRate).toBe(CAMEROON_VAT_RATE);
    expect(res.vatAmount).toBe(1750); // 10000 * 0.175
    expect(res.cacRate).toBe(CAMEROON_CAC_RATE);
    expect(res.cacAmount).toBe(175); // 1750 * 0.10
    expect(res.totalTax).toBe(1925); // 1750 + 175 = 19.25% de 10000
    expect(res.totalTTC).toBe(11925);
    expect(res.isExempt).toBe(false);

    // Invariant comptable strict
    expect(res.baseHT + res.vatAmount + res.cacAmount).toBe(res.totalTTC);
  });

  it('2. Valide l’extraction de HT et taxes à partir d’un prix de carte TTC sans décalage de 1 FCFA', () => {
    const testCasesTTC = [1500, 2500, 5000, 12500, 35000, 99999];

    for (const ttc of testCasesTTC) {
      const res = extractCameroonVatFromTtc(ttc);

      // Invariant comptable absolu au FCFA près
      expect(res.baseHT + res.vatAmount + res.cacAmount).toBe(ttc);
      expect(res.vatAmount + res.cacAmount).toBe(res.totalTax);
      expect(res.totalTTC).toBe(ttc);

      // Aucun montant ne doit avoir de partie décimale en FCFA
      expect(Number.isInteger(res.baseHT)).toBe(true);
      expect(Number.isInteger(res.vatAmount)).toBe(true);
      expect(Number.isInteger(res.cacAmount)).toBe(true);
    }
  });

  it('3. Valide le régime non assujetti (exonération totale de TVA)', () => {
    const res = calculateCameroonVatFromHt(25000, CAMEROON_VAT_RATE, CAMEROON_CAC_RATE, true, 'Régime simplifié non assujetti');

    expect(res.baseHT).toBe(25000);
    expect(res.vatAmount).toBe(0);
    expect(res.cacAmount).toBe(0);
    expect(res.totalTax).toBe(0);
    expect(res.totalTTC).toBe(25000);
    expect(res.isExempt).toBe(true);
    expect(res.exemptReason).toBe('Régime simplifié non assujetti');
  });

  it('4. Valide les cas limites (montants nuls, négatifs, virgules flottantes parasites)', () => {
    const resZero = calculateCameroonVatFromHt(0);
    expect(resZero.baseHT).toBe(0);
    expect(resZero.totalTTC).toBe(0);

    const resNegatif = calculateCameroonVatFromHt(-5000);
    expect(resNegatif.baseHT).toBe(0);
    expect(resNegatif.totalTTC).toBe(0);

    const resFloat = calculateCameroonVatFromHt(1000.333333);
    expect(resFloat.baseHT).toBe(1000);
    expect(Number.isInteger(resFloat.totalTTC)).toBe(true);
  });

  it('5. Valide le calcul des remises commerciales (pourcentage et montant fixe)', () => {
    const items = [
      { unitPrice: 5000, quantity: 2 }, // 10 000 FCFA
      { unitPrice: 2500, quantity: 4 }, // 10 000 FCFA
    ]; // Total brut HT = 20 000 FCFA

    // Cas A : Remise 10%
    const pricingPct = calculateOrderPricing({
      items,
      discountPercent: 10,
      isAssujettiTva: true,
    });
    expect(pricingPct.rawSubtotal).toBe(20000);
    expect(pricingPct.discountAmount).toBe(2000);
    expect(pricingPct.subtotalAfterDiscount).toBe(18000);
    expect(pricingPct.vatAmount).toBe(3150); // 18000 * 17.5%
    expect(pricingPct.cacAmount).toBe(315); // 3150 * 10%
    expect(pricingPct.totalTTC).toBe(21465); // 18000 + 3150 + 315

    // Cas B : Remise 100% (offert)
    const pricingFree = calculateOrderPricing({
      items,
      discountPercent: 100,
      isAssujettiTva: true,
    });
    expect(pricingFree.discountAmount).toBe(20000);
    expect(pricingFree.subtotalAfterDiscount).toBe(0);
    expect(pricingFree.totalTTC).toBe(0);

    // Cas C : Remise fixe 5 000 FCFA
    const pricingFixed = calculateOrderPricing({
      items,
      discountFixedAmount: 5000,
      isAssujettiTva: true,
    });
    expect(pricingFixed.discountAmount).toBe(5000);
    expect(pricingFixed.subtotalAfterDiscount).toBe(15000);
  });

  it('6. Valide le calcul légal du droit de timbre de quittance en espèces (CGI Art. 597+)', () => {
    // Moins de 5 000 FCFA : non assujetti au droit de timbre
    expect(calculateStampDuty(0)).toBe(0);
    expect(calculateStampDuty(4999)).toBe(0);

    // De 5 000 à 20 000 FCFA : 1 tranche = 100 FCFA
    expect(calculateStampDuty(5000)).toBe(100);
    expect(calculateStampDuty(12500)).toBe(100);
    expect(calculateStampDuty(20000)).toBe(100);

    // De 20 001 à 40 000 FCFA : 2 tranches = 200 FCFA
    expect(calculateStampDuty(20001)).toBe(200);
    expect(calculateStampDuty(35000)).toBe(200);
    expect(calculateStampDuty(40000)).toBe(200);

    // Plafond légal à 2 000 FCFA
    expect(calculateStampDuty(500000)).toBe(2000);
    expect(calculateStampDuty(2500000)).toBe(2000);
  });

  it('7. Valide le formatage monétaire FCFA standard', () => {
    expect(formatFcfa(1500)).toMatch(/1\s?500\sFCFA/);
    expect(formatFcfa(1250000)).toMatch(/1\s?250\s?000\sFCFA/);
    expect(formatFcfa(0)).toBe('0 FCFA');
  });
});
