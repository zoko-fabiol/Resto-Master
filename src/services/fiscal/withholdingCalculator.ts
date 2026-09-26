/**
 * Moteur Fiscal Cameroun — Calculateur des Retenues Fiscales à la Source (AIR)
 * Référence : Code Général des Impôts (CGI Cameroun Art. 21 et suivants)
 * 
 * Au Cameroun :
 * - Régime Réel : Taux standard AIR d'acompte 2,2 % (2% + 10% CAC)
 * - Régime Simplifié : 5,5 % (5% + 10% CAC)
 * - Entités non immatriculées ou informelles (sans NIU actif) : 15 %
 * - Prélèvement spécial État / Entreprises publiques : selon convention ou ordonnance
 */

import { TaxRegime } from '../../types/restaurant';

export interface WithholdingCalculationResult {
  baseAmount: number;
  rate: number; // en % (ex: 2.2, 5.5, 15)
  withholdingAmount: number;
  netToPay: number;
  regime: TaxRegime;
  withholdingType: 'AIR' | 'TSR' | 'TVA_RETENUE';
  applies: boolean;
  legalNotice: string;
}

export const calculateWithholding = (
  baseAmount: number,
  regime: TaxRegime = 'reel',
  customRate?: number,
  forceApply = false
): WithholdingCalculationResult => {
  if (baseAmount <= 0) {
    return {
      baseAmount: 0,
      rate: 0,
      withholdingAmount: 0,
      netToPay: 0,
      regime,
      withholdingType: 'AIR',
      applies: false,
      legalNotice: 'Aucune retenue (montant nul)',
    };
  }

  // Taux officiel Cameroun selon le régime fiscal
  let rate = 0;
  let notice = '';

  if (customRate !== undefined) {
    rate = customRate;
    notice = `Taux conventionnel de retenue appliqué : ${rate}%`;
  } else {
    switch (regime) {
      case 'reel':
        rate = 2.2; // 2% + 10% CAC
        notice = 'AIR Régime du Réel : 2,2% (CGI Art. 21)';
        break;
      case 'simplifie':
        rate = 5.5; // 5% + 10% CAC
        notice = 'AIR Régime Simplifié : 5,5% (CGI Art. 21)';
        break;
      case 'igp':
      case 'non_assujetti':
        rate = 15.0;
        notice = 'Retenue libératoire / Prestataire non immatriculé : 15% (CGI)';
        break;
      default:
        rate = 0;
        notice = 'Régime non assujetti à la retenue à la source';
    }
  }

  const applies = forceApply || rate > 0;
  const withholdingAmount = applies ? Math.round((baseAmount * rate) / 100) : 0;
  const netToPay = Math.max(0, baseAmount - withholdingAmount);

  return {
    baseAmount,
    rate: applies ? rate : 0,
    withholdingAmount,
    netToPay,
    regime,
    withholdingType: 'AIR',
    applies,
    legalNotice: notice,
  };
};
