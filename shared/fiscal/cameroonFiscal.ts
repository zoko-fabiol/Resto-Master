/**
 * RestoMaster OS — Référentiel Fiscal & Monétaire Cameroun (CGI 2026)
 *
 * Règles fiscales officielles :
 * - Taux principal de TVA : 17,5 % sur la base Hors Taxes (HT).
 * - Centimes Additionnels Communaux (CAC) : 10 % du montant de la TVA (= 1,75 % de la base HT).
 * - Taux fiscal combiné général : 19,25 %.
 * - Devise : Franc CFA (XAF / FCFA) — monnaie sans sous-division fractionnaire (pas de centimes physiques).
 *
 * Invariant comptable absolu :
 *   Total TTC === Base HT + Montant TVA + Montant CAC (au FCFA entier près).
 */

export const CAMEROON_VAT_RATE = 17.5;
export const CAMEROON_CAC_RATE = 10; // 10% appliqué sur le montant de TVA
export const CAMEROON_COMBINED_TAX_RATE = 19.25; // 17.5 + 1.75
export const DEFAULT_CURRENCY = 'FCFA';

export interface FiscalCalculationResult {
  baseHT: number;
  vatRate: number;
  vatAmount: number;
  cacRate: number;
  cacAmount: number;
  totalTax: number;
  totalTTC: number;
  isExempt: boolean;
  exemptReason?: string;
}

export interface OrderPricingItem {
  unitPrice: number;
  quantity: number;
  taxRate?: number;
  isExempt?: boolean;
}

export interface OrderPricingResult {
  rawSubtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  baseHT: number;
  vatAmount: number;
  cacAmount: number;
  totalTax: number;
  totalTTC: number;
  stampDuty: number;
  finalNetToPay: number;
}

/**
 * Arrondit un montant au FCFA entier le plus proche, en évitant les erreurs
 * de virgule flottante IEEE 754.
 */
export function roundToFcfa(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(Number((amount).toFixed(4)));
}

/**
 * Formate un montant en FCFA avec séparateur de milliers et suffixe standard.
 */
export function formatFcfa(amount: number): string {
  const rounded = roundToFcfa(amount);
  return `${new Intl.NumberFormat('fr-FR').format(rounded)} FCFA`;
}

/**
 * Calcule la TVA et les CAC à partir d'une base Hors Taxes (HT).
 * Garantit l'égalité comptable exacte : baseHT + vatAmount + cacAmount === totalTTC.
 */
export function calculateCameroonVatFromHt(
  amountHT: number,
  vatRate: number = CAMEROON_VAT_RATE,
  cacPercentageOfVat: number = CAMEROON_CAC_RATE,
  isExempt: boolean = false,
  exemptReason?: string
): FiscalCalculationResult {
  const safeHT = Math.max(0, roundToFcfa(amountHT));

  if (isExempt || vatRate <= 0 || safeHT <= 0) {
    return {
      baseHT: safeHT,
      vatRate: 0,
      vatAmount: 0,
      cacRate: 0,
      cacAmount: 0,
      totalTax: 0,
      totalTTC: safeHT,
      isExempt: true,
      exemptReason: exemptReason || 'Régime non assujetti ou produit exonéré de TVA',
    };
  }

  const vatAmount = roundToFcfa((safeHT * vatRate) / 100);
  const cacAmount = roundToFcfa((vatAmount * cacPercentageOfVat) / 100);
  const totalTax = vatAmount + cacAmount;
  const totalTTC = safeHT + totalTax;

  return {
    baseHT: safeHT,
    vatRate,
    vatAmount,
    cacRate: cacPercentageOfVat,
    cacAmount,
    totalTax,
    totalTTC,
    isExempt: false,
  };
}

/**
 * Extrait la base HT, la TVA et les CAC à partir d'un prix affiché Toutes Taxes Comprises (TTC).
 * Règle d'équilibrage : baseHT + vatAmount + cacAmount === totalTTC sans décalage de 1 FCFA.
 */
export function extractCameroonVatFromTtc(
  amountTTC: number,
  combinedTaxRate: number = CAMEROON_COMBINED_TAX_RATE,
  vatRate: number = CAMEROON_VAT_RATE,
  isExempt: boolean = false
): FiscalCalculationResult {
  const safeTTC = Math.max(0, roundToFcfa(amountTTC));

  if (isExempt || combinedTaxRate <= 0 || safeTTC <= 0) {
    return {
      baseHT: safeTTC,
      vatRate: 0,
      vatAmount: 0,
      cacRate: 0,
      cacAmount: 0,
      totalTax: 0,
      totalTTC: safeTTC,
      isExempt: true,
    };
  }

  // Base HT = TTC / (1 + tauxCombiné)
  const baseHT = roundToFcfa(safeTTC / (1 + combinedTaxRate / 100));
  const totalTax = safeTTC - baseHT;

  // Répartition au prorata exact des taux légaux (17.5 / 19.25)
  const vatAmount = roundToFcfa(totalTax * (vatRate / combinedTaxRate));
  const cacAmount = totalTax - vatAmount; // Ajustement sur les CAC pour garantir totalTax === vatAmount + cacAmount

  return {
    baseHT,
    vatRate,
    vatAmount,
    cacRate: CAMEROON_CAC_RATE,
    cacAmount,
    totalTax,
    totalTTC: safeTTC,
    isExempt: false,
  };
}

/**
 * Calcule le droit de timbre de quittance (CGI Cameroun Art. 597+).
 * Obligatoire sur les règlements en espèces d'au moins 5 000 FCFA :
 * 100 FCFA par tranche entamée de 20 000 FCFA, plafonné à 2 000 FCFA.
 */
export function calculateStampDuty(amountCash: number): number {
  const cleanAmount = roundToFcfa(amountCash);
  if (cleanAmount < 5000) return 0;
  const tranches = Math.ceil(cleanAmount / 20000);
  return Math.min(tranches * 100, 2000);
}

/**
 * Calcul complet de la tarification d'une commande (sous-total, remises, taxes, total à payer).
 * Supporte le mode prix TTC (carte de restaurant standard) ou prix HT.
 */
export function calculateOrderPricing(options: {
  items: OrderPricingItem[];
  discountPercent?: number;
  discountFixedAmount?: number;
  isAssujettiTva?: boolean;
  taxRate?: number;
  pricesIncludeTax?: boolean;
  paymentMethod?: string;
}): OrderPricingResult {
  const {
    items,
    discountPercent = 0,
    discountFixedAmount = 0,
    isAssujettiTva = true,
    taxRate = CAMEROON_COMBINED_TAX_RATE,
    pricesIncludeTax = false,
    paymentMethod = 'especes',
  } = options;

  // 1. Sous-total brut
  const rawSubtotal = roundToFcfa(
    items.reduce((sum, item) => sum + Math.max(0, item.unitPrice) * Math.max(0, item.quantity), 0)
  );

  // 2. Calcul de la remise commerciale
  let discountAmount = 0;
  if (discountFixedAmount > 0) {
    discountAmount = Math.min(rawSubtotal, roundToFcfa(discountFixedAmount));
  } else if (discountPercent > 0) {
    const safePercent = Math.min(100, Math.max(0, discountPercent));
    discountAmount = roundToFcfa((rawSubtotal * safePercent) / 100);
  }

  const subtotalAfterDiscount = Math.max(0, rawSubtotal - discountAmount);

  // 3. Calcul fiscal selon que les prix soient déjà TTC ou HT
  let baseHT = 0;
  let vatAmount = 0;
  let cacAmount = 0;
  let totalTax = 0;
  let totalTTC = 0;

  if (!isAssujettiTva) {
    baseHT = subtotalAfterDiscount;
    vatAmount = 0;
    cacAmount = 0;
    totalTax = 0;
    totalTTC = subtotalAfterDiscount;
  } else if (pricesIncludeTax) {
    // Les prix de la carte sont TTC : on extrait les taxes
    const extracted = extractCameroonVatFromTtc(subtotalAfterDiscount, taxRate, CAMEROON_VAT_RATE, false);
    baseHT = extracted.baseHT;
    vatAmount = extracted.vatAmount;
    cacAmount = extracted.cacAmount;
    totalTax = extracted.totalTax;
    totalTTC = subtotalAfterDiscount;
  } else {
    // Les prix de la carte sont HT : on applique les taxes par-dessus
    const calculated = calculateCameroonVatFromHt(subtotalAfterDiscount, CAMEROON_VAT_RATE, CAMEROON_CAC_RATE, false);
    baseHT = calculated.baseHT;
    vatAmount = calculated.vatAmount;
    cacAmount = calculated.cacAmount;
    totalTax = calculated.totalTax;
    totalTTC = calculated.totalTTC;
  }

  // 4. Droit de timbre si règlement en espèces
  const stampDuty = paymentMethod === 'especes' ? calculateStampDuty(totalTTC) : 0;
  const finalNetToPay = totalTTC + stampDuty;

  return {
    rawSubtotal,
    discountAmount,
    subtotalAfterDiscount,
    baseHT,
    vatAmount,
    cacAmount,
    totalTax,
    totalTTC,
    stampDuty,
    finalNetToPay,
  };
}
