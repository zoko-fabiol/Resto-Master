/**
 * Calcul fiscal unique côté serveur (miroir de src/services/fiscal/vatCalculator.ts).
 * Règle : TVA = round(base × taux TVA), puis CAC = round(TVA × taux CAC sur TVA).
 * Exemple : 1 010 FCFA → TVA 177 + CAC 18 = 195.
 */
export const DEFAULT_VAT_RATE = 17.5;
export const DEFAULT_CAC_PERCENT_OF_VAT = 10;

export interface ServerTaxResult {
  vatAmount: number;
  cacAmount: number;
  totalTax: number;
}

export function computeTax(
  baseHT: number,
  vatRate: number = DEFAULT_VAT_RATE,
  cacPercentOfVat: number = DEFAULT_CAC_PERCENT_OF_VAT
): ServerTaxResult {
  if (baseHT <= 0 || vatRate <= 0) {
    return { vatAmount: 0, cacAmount: 0, totalTax: 0 };
  }
  const vatAmount = Math.round((baseHT * vatRate) / 100);
  const cacAmount = Math.round((vatAmount * cacPercentOfVat) / 100);
  return { vatAmount, cacAmount, totalTax: vatAmount + cacAmount };
}
