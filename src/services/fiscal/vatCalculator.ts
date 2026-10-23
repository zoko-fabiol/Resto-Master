/**
 * Moteur Fiscal Cameroun — Calculateur TVA & Centimes Additionnels Communaux (CAC)
 * Référence : Code Général des Impôts (CGI Cameroun mis à jour 2026)
 *
 * Source unique de vérité connectée au module partagé shared/fiscal/cameroonFiscal.ts
 */

import {
  calculateCameroonVatFromHt,
  extractCameroonVatFromTtc,
  FiscalCalculationResult,
  CAMEROON_VAT_RATE,
  CAMEROON_CAC_RATE,
  CAMEROON_COMBINED_TAX_RATE,
} from '../../../shared/fiscal/cameroonFiscal';

export type VatCalculationResult = FiscalCalculationResult;

export const calculateVatAndCac = (
  amountHT: number,
  vatRate = CAMEROON_VAT_RATE,
  cacPercentageOfVat = CAMEROON_CAC_RATE,
  isExempt = false,
  exemptReason?: string
): VatCalculationResult => {
  return calculateCameroonVatFromHt(amountHT, vatRate, cacPercentageOfVat, isExempt, exemptReason);
};

export const extractHtFromTtc = (
  totalTTC: number,
  combinedTaxRate = CAMEROON_COMBINED_TAX_RATE,
  isExempt = false
): { baseHT: number; vatAmount: number; cacAmount: number; totalTax: number } => {
  const res = extractCameroonVatFromTtc(totalTTC, combinedTaxRate, CAMEROON_VAT_RATE, isExempt);
  return {
    baseHT: res.baseHT,
    vatAmount: res.vatAmount,
    cacAmount: res.cacAmount,
    totalTax: res.totalTax,
  };
};

export { CAMEROON_VAT_RATE, CAMEROON_CAC_RATE, CAMEROON_COMBINED_TAX_RATE };
