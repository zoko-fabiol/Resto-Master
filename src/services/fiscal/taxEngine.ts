/**
 * Moteur Fiscal Global RestoMaster OS
 * Intègre le calcul des taxes, des remises, des retenues, de la facturation et du journal fiscal.
 */

import {
  Order,
  RestaurantSettings,
  Invoice,
  FiscalJournalItem,
  TaxRegime,
} from '../../types/restaurant';
import { calculateVatAndCac } from './vatCalculator';
import { calculateWithholding } from './withholdingCalculator';
import { numberToWordsFrench, generateSecureId, formatLegalInvoiceNotice } from '../../lib/utils';
import { DgiFiscalHelper } from './dgiQrCodeHelper';



export interface FiscalOrderSummary {
  subtotalHT: number;
  discountTotal: number;
  taxableBaseHT: number;
  vatAmount: number;
  cacAmount: number;
  totalTax: number;
  totalTTC: number;
  withholdingAmount: number;
  netToPay: number;
  amountInWords: string;
}

export class TaxEngine {
  /**
   * Calcule la synthèse fiscale complète d'une commande
   */
  public static calculateOrderFiscalSummary(
    order: Order,
    settings: RestaurantSettings,
    clientRegime: TaxRegime = 'reel',
    applyWithholding = false
  ): FiscalOrderSummary {
    const rawSubtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountTotal = order.discount || 0;
    const baseHT = Math.max(0, rawSubtotal - discountTotal);

    // Calcul de la TVA et des CAC selon les paramètres de l'établissement
    const vatRate = settings.baseVatRate || 17.5;
    const cacRate = 10; // 10% sur TVA
    const isExempt = !settings.assujettiTVA;

    const vatResult = calculateVatAndCac(
      baseHT,
      vatRate,
      cacRate,
      isExempt,
      !settings.assujettiTVA ? 'Établissement sous régime non assujetti' : undefined
    );

    // Calcul éventuel de la retenue à la source (AIR) si le client est une administration ou grande société
    let withholdingAmount = 0;
    if (applyWithholding) {
      const withholdingResult = calculateWithholding(baseHT, clientRegime, undefined, true);
      withholdingAmount = withholdingResult.withholdingAmount;
    }

    const netToPay = Math.max(0, vatResult.totalTTC - withholdingAmount);

    return {
      subtotalHT: rawSubtotal,
      discountTotal,
      taxableBaseHT: baseHT,
      vatAmount: vatResult.vatAmount,
      cacAmount: vatResult.cacAmount,
      totalTax: vatResult.totalTax,
      totalTTC: vatResult.totalTTC,
      withholdingAmount,
      netToPay,
      amountInWords: formatLegalInvoiceNotice(netToPay, settings.currency === 'FCFA' ? 'Francs CFA' : settings.currency),
    };
  }

  /**
   * Calcule le droit de timbre de quittance (CGI Cameroun 2026)
   * Applicable sur les règlements en espèces dès 5 000 FCFA :
   * 100 FCFA par tranche entamée de 20 000 FCFA.
   */
  public static calculateStampDuty(amountCash: number): number {
    if (amountCash < 5000) return 0;
    const tranches = Math.ceil(amountCash / 20000);
    return Math.min(tranches * 100, 2000);
  }

  /**
   * Génère le numéro de facture chronologique immuable
   * Format: {EXERCICE}-{PREFIX}-{SEQUENCE_6_CHIFFRES} (ex: 2026-RESTO-001-000042)
   */
  public static generateChronologicalInvoiceNumber(
    prefix: string,
    sequence: number,
    fiscalYear = '2026'
  ): string {
    const paddedSequence = sequence.toString().padStart(6, '0');
    const rawPrefix = prefix || 'RESTO-001';
    const cleanPrefix = rawPrefix.startsWith(`${fiscalYear}-`)
      ? rawPrefix.slice(`${fiscalYear}-`.length)
      : rawPrefix;
    return `${fiscalYear}-${cleanPrefix}-${paddedSequence}`;
  }

  /**
   * Crée une facture formalisée conforme au Code Général des Impôts Camerounais
   */
  public static createFiscalInvoice(
    order: Order,
    settings: RestaurantSettings,
    sequenceNumber: number,
    clientInfo?: {
      id?: string;
      name?: string;
      niu?: string;
      rccm?: string;
      address?: string;
      phone?: string;
      regime?: TaxRegime;
      applyWithholding?: boolean;
    }
  ): { invoice: Invoice; journalItem: FiscalJournalItem } {
    const invoiceNumber = this.generateChronologicalInvoiceNumber(
      settings.invoicePrefix || 'RESTO-001',
      sequenceNumber,
      settings.exerciceFiscal || '2026'
    );

    const fiscalSummary = this.calculateOrderFiscalSummary(
      order,
      settings,
      clientInfo?.regime || 'reel',
      clientInfo?.applyWithholding || false
    );

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);
    const dateTimeIso = now.toISOString();

    // Calcul du sceau d'intégrité fiscal DGI
    const securitySignature = DgiFiscalHelper.computeFiscalSeal({
      emitterNiu: settings.niu || '',
      invoiceNumber,
      dateTimeIso,
      subtotalHT: fiscalSummary.taxableBaseHT,
      totalTTC: fiscalSummary.totalTTC,
    });

    const qrCodeData = DgiFiscalHelper.buildDgiRawString(
      {
        emitterNiu: settings.niu || '',
        emitterRccm: settings.rccm || '',
        invoiceNumber,
        dateTimeIso,
        subtotalHT: fiscalSummary.taxableBaseHT,
        vatAmount: fiscalSummary.vatAmount,
        cacAmount: fiscalSummary.cacAmount,
        totalTTC: fiscalSummary.totalTTC,
        clientNiu: clientInfo?.niu || order.companyBillingNiu,
      },
      securitySignature
    );

    const invoice: Invoice = {
      id: generateSecureId('inv'),
      invoiceNumber,
      sequenceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId: settings.restaurantId || settings.id,
      date: dateStr,
      time: timeStr,
      status: order.paymentStatus === 'paye' ? 'PAID' : 'ISSUED',
      
      // Émetteur
      emitterRaisonSociale: settings.raisonSociale || settings.name,
      emitterNiu: settings.niu,
      emitterRccm: settings.rccm,
      emitterTaxCenter: settings.taxCenter,
      emitterAddress: `${settings.address}, ${settings.quartier ? settings.quartier + ', ' : ''}${settings.city}`,
      emitterPhone: settings.phone,
      
      // Client
      customerId: clientInfo?.id || order.customerId,
      customerName: clientInfo?.name || order.customerName || 'Client Comptant',
      customerNiu: clientInfo?.niu || order.companyBillingNiu,
      customerRccm: clientInfo?.rccm,
      customerAddress: clientInfo?.address,
      customerPhone: clientInfo?.phone,

      // Lignes de facture
      items: order.items.map((i) => {
        const itemHT = i.unitPrice * i.quantity;
        const itemTax = calculateVatAndCac(
          itemHT,
          settings.baseVatRate || 17.5,
          10,
          !settings.assujettiTVA
        );
        return {
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPriceHT: i.unitPrice,
          discountAmount: 0,
          totalHT: itemHT,
          vatRate: settings.baseVatRate || 17.5,
          vatAmount: itemTax.vatAmount,
          cacAmount: itemTax.cacAmount,
          totalTTC: itemTax.totalTTC,
        };
      }),

      subtotalHT: fiscalSummary.subtotalHT,
      discountTotal: fiscalSummary.discountTotal,
      taxableBase: fiscalSummary.taxableBaseHT,
      vatAmount: fiscalSummary.vatAmount,
      cacAmount: fiscalSummary.cacAmount,
      totalTaxes: fiscalSummary.totalTax,
      withholdingRate: clientInfo?.applyWithholding ? 2.2 : 0,
      withholdingAmount: fiscalSummary.withholdingAmount,
      totalTTC: fiscalSummary.totalTTC,
      netToPay: fiscalSummary.netToPay,
      amountInWords: fiscalSummary.amountInWords,

      // Sécurité & e-Billing
      currency: settings.currency || 'FCFA',
      securitySignature,
      chainHash: securitySignature,
      qrCodeData,

      paymentMethod: order.payments?.[0]?.method || 'especes',
      paymentReference: order.payments?.[0]?.reference,
      paymentStatus: order.paymentStatus === 'paye' ? 'CONFIRMED' : 'PENDING',
      notes: order.notes,
      validatedAt: dateTimeIso,
      validatedBy: order.serverName,
    };

    const journalItem: FiscalJournalItem = {
      id: generateSecureId('fisc'),
      invoiceId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      date: dateStr,
      time: timeStr,
      type: 'VENTE',
      montantHT: fiscalSummary.taxableBaseHT,
      montantTVA: fiscalSummary.vatAmount,
      montantCAC: fiscalSummary.cacAmount,
      montantRetenue: fiscalSummary.withholdingAmount,
      montantTTC: fiscalSummary.totalTTC,
      utilisateur: order.serverName,
      restaurantId: settings.restaurantId || settings.id,
      status: 'VALIDATED',
      hashIntegrity: securitySignature,
    };

    return { invoice, journalItem };
  }

  /**
   * Calculateur des retenues d'acompte fiscal (AIR) selon le régime
   */
  public static calculateWithholding(
    baseAmount: number,
    regime: TaxRegime = 'reel',
    customRate?: number,
    forceApply = false
  ) {
    return calculateWithholding(baseAmount, regime, customRate, forceApply);
  }
}
