/**
 * Moteur Fiscal Cameroun — Calculateur TVA & Centimes Additionnels Communaux (CAC)
 * Référence : Code Général des Impôts (CGI Cameroun mis à jour 2026)
 * 
 * Norme légale :
 * - Taux principal de TVA : 17,5 % sur la base Hors Taxes (HT)
 * - Centimes Additionnels Communaux (CAC) : 10 % du montant de la TVA (= 1,75 % de la base HT)
 * - Taux combiné effectif général : 19,25 %
 * 
 * Note : Ce calculateur prend en compte les taux configurables de l'établissement
 * pour s'adapter à toute évolution législative ou régime particulier.
 */

export interface VatCalculationResult {
  baseHT: number;
  vatRate: number; // e.g. 17.5%
  vatAmount: number;
  cacRate: number; // e.g. 10% sur TVA (= 1.75% sur HT)
  cacAmount: number;
  totalTax: number;
  totalTTC: number;
  isExempt: boolean;
  exemptReason?: string;
}

export const calculateVatAndCac = (
  amountHT: number,
  vatRate = 17.5,
  cacPercentageOfVat = 10,
  isExempt = false,
  exemptReason?: string
): VatCalculationResult => {
  if (isExempt || vatRate <= 0 || amountHT <= 0) {
    return {
      baseHT: Math.max(0, amountHT),
      vatRate: 0,
      vatAmount: 0,
      cacRate: 0,
      cacAmount: 0,
      totalTax: 0,
      totalTTC: Math.max(0, amountHT),
      isExempt: true,
      exemptReason: exemptReason || 'Exonéré de TVA selon régime ou nature de produit',
    };
  }

  const baseHT = Math.max(0, amountHT);
  const vatAmount = Math.round((baseHT * vatRate) / 100);
  const cacAmount = Math.round((vatAmount * cacPercentageOfVat) / 100);
  const totalTax = vatAmount + cacAmount;
  const totalTTC = baseHT + totalTax;

  return {
    baseHT,
    vatRate,
    vatAmount,
    cacRate: cacPercentageOfVat,
    cacAmount,
    totalTax,
    totalTTC,
    isExempt: false,
  };
};

/**
 * Extrait le montant HT et les taxes à partir d'un total TTC déjà fixé
 * Taux combiné par défaut : 19,25 % => Base HT = TTC / 1.1925
 */
export const extractHtFromTtc = (
  totalTTC: number,
  combinedTaxRate = 19.25,
  isExempt = false
): { baseHT: number; vatAmount: number; cacAmount: number; totalTax: number } => {
  if (isExempt || combinedTaxRate <= 0 || totalTTC <= 0) {
    return {
      baseHT: totalTTC,
      vatAmount: 0,
      cacAmount: 0,
      totalTax: 0,
    };
  }

  const baseHT = Math.round(totalTTC / (1 + combinedTaxRate / 100));
  const totalTax = totalTTC - baseHT;
  // Répartition 17.5 / 19.25 pour la TVA, et 1.75 / 19.25 pour les CAC
  const vatAmount = Math.round(totalTax * (17.5 / 19.25));
  const cacAmount = totalTax - vatAmount;

  return {
    baseHT,
    vatAmount,
    cacAmount,
    totalTax,
  };
};
