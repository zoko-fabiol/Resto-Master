/**
 * Service d'Export Comptable — Référentiel SYSCOHADA / OHADA
 * 
 * Génère les écritures comptables conformes au Plan Comptable Général OHADA :
 * - Compte 701 : Ventes de produits finis / cuisine
 * - Compte 706 : Ventes de prestations / services de restauration
 * - Compte 4431 : État, TVA Facturée sur ventes
 * - Compte 4432 : État, Centimes Additionnels Communaux (CAC)
 * - Compte 4111 : Clients ordinaires / Créances
 * - Compte 5711 : Caisse générale (espèces)
 * - Compte 5211 : Banques locales
 * - Compte 5851 : Comptes de virement interne (Orange Money, MTN MoMo)
 * - Compte 6011 : Achats de marchandises / denrées alimentaires
 * - Compte 4011 : Fournisseurs
 * - Compte 4452 : État, TVA déductible sur achats
 * - Compte 4472 : État, Retenues à la source (AIR)
 */

import {
  Order,
  Expense,
  Payment,
  CashRegisterSession,
  FiscalJournalItem,
  Invoice,
  RestaurantSettings,
} from '../../types/restaurant';

export interface OhadaJournalEntry {
  date: string;
  pieceNumber: string;
  journalCode: 'VT' | 'AC' | 'CA' | 'BQ' | 'OD';
  accountNumber: string;
  accountLabel: string;
  debit: number;
  credit: number;
  libelle: string;
}

export class AccountingExportService {
  /**
   * Génère le Journal des Ventes (VT) au format SYSCOHADA
   */
  public static generateSalesJournal(orders: Order[]): OhadaJournalEntry[] {
    const entries: OhadaJournalEntry[] = [];

    orders
      .filter((o) => o.status === 'payee' || o.paymentStatus === 'paye' || o.paymentStatus === 'partiel')
      .forEach((order) => {
        const date = order.createdAt.slice(0, 10);
        const subtotalHT = order.subtotal - (order.discount || 0);
        // TVA 17.5% + CAC 1.75% = 19.25%
        const vatAmount = Math.round(subtotalHT * 0.175);
        const cacAmount = Math.round(subtotalHT * 0.0175);
        const totalTTC = subtotalHT + vatAmount + cacAmount;

        // Débit Client ou Trésorerie
        entries.push({
          date,
          pieceNumber: order.orderNumber,
          journalCode: 'VT',
          accountNumber: '411100',
          accountLabel: 'Clients ordinaires',
          debit: totalTTC,
          credit: 0,
          libelle: `Vente Restauration - Facture ${order.orderNumber} - ${order.customerName || 'Comptant'}`,
        });

        // Crédit Ventes Restauration (Compte 706)
        entries.push({
          date,
          pieceNumber: order.orderNumber,
          journalCode: 'VT',
          accountNumber: '706100',
          accountLabel: 'Prestations de Restauration & Boissons',
          debit: 0,
          credit: subtotalHT,
          libelle: `Prestations HT - ${order.orderNumber}`,
        });

        // Crédit TVA Collectée (Compte 4431)
        if (vatAmount > 0) {
          entries.push({
            date,
            pieceNumber: order.orderNumber,
            journalCode: 'VT',
            accountNumber: '443100',
            accountLabel: 'État, TVA Facturée sur ventes',
            debit: 0,
            credit: vatAmount,
            libelle: `TVA 17.5% s/ ${order.orderNumber}`,
          });
        }

        // Crédit CAC (Compte 4432)
        if (cacAmount > 0) {
          entries.push({
            date,
            pieceNumber: order.orderNumber,
            journalCode: 'VT',
            accountNumber: '443200',
            accountLabel: 'État, Centimes Additionnels Communaux',
            debit: 0,
            credit: cacAmount,
            libelle: `CAC 10% s/ TVA ${order.orderNumber}`,
          });
        }
      });

    return entries;
  }

  /**
   * Génère le Journal de Caisse (CA) et Règlements
   */
  public static generateCashJournal(
    payments: Payment[],
    expenses: Expense[],
    sessions: CashRegisterSession[]
  ): OhadaJournalEntry[] {
    const entries: OhadaJournalEntry[] = [];

    // Encaissements
    payments.forEach((p) => {
      const date = p.date.slice(0, 10);
      let accountNum = '571100';
      let accountName = 'Caisse Centrale Restauration';

      if (p.method === 'orange_money' || p.method === 'mtn_momo') {
        accountNum = '585100';
        accountName = `Compte de virement Mobile Money (${p.method.toUpperCase()})`;
      } else if (p.method === 'carte' || p.method === 'virement') {
        accountNum = '521100';
        accountName = 'Banque commerciale locale';
      }

      // Débit Trésorerie
      entries.push({
        date,
        pieceNumber: p.reference || p.orderNumber,
        journalCode: 'CA',
        accountNumber: accountNum,
        accountLabel: accountName,
        debit: p.amount,
        credit: 0,
        libelle: `Règlement vente ${p.orderNumber} par ${p.method}`,
      });

      // Crédit Client
      entries.push({
        date,
        pieceNumber: p.reference || p.orderNumber,
        journalCode: 'CA',
        accountNumber: '411100',
        accountLabel: 'Clients ordinaires',
        debit: 0,
        credit: p.amount,
        libelle: `Apurement créance ${p.orderNumber}`,
      });
    });

    // Dépenses de Caisse payées
    expenses
      .filter((e) => e.status === 'payee')
      .forEach((e) => {
        const date = e.date.slice(0, 10);

        // Débit Charge (Comptes classe 6)
        entries.push({
          date,
          pieceNumber: `EXP-${e.id.slice(-6)}`,
          journalCode: 'CA',
          accountNumber: '605100',
          accountLabel: 'Achats et charges d’exploitation décaissées',
          debit: e.amount,
          credit: 0,
          libelle: `Dépense caisse : ${e.reason} - ${e.beneficiary}`,
        });

        // Crédit Caisse
        entries.push({
          date,
          pieceNumber: `EXP-${e.id.slice(-6)}`,
          journalCode: 'CA',
          accountNumber: '571100',
          accountLabel: 'Caisse Centrale Restauration',
          debit: 0,
          credit: e.amount,
          libelle: `Décaissement caisse : ${e.beneficiary}`,
        });
      });

    return entries;
  }

  /**
   * Exporte les écritures au format CSV compatible avec les logiciels comptables SYSCOHADA (Sage, Saari, etc.)
   */
  public static exportToCsv(entries: OhadaJournalEntry[], filename = 'journal_syscohada.csv'): void {
    const headers = [
      'Date',
      'Journal',
      'N° Pièce',
      'N° Compte',
      'Intitulé du Compte',
      'Débit FCFA',
      'Crédit FCFA',
      'Libellé de l’Écriture',
    ];

    const rows = entries.map((e) => [
      e.date,
      e.journalCode,
      e.pieceNumber,
      e.accountNumber,
      `"${e.accountLabel}"`,
      e.debit,
      e.credit,
      `"${e.libelle.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Génère le fichier CSV de télé-déclaration mensuelle au format exigé par la DGI (Cameroun)
   * et le référentiel DSF (Déclaration Statistique et Fiscale)
   */
  public static generateDgiTeledeclarationCsv(
    fiscalJournal: FiscalJournalItem[],
    settings: RestaurantSettings,
    invoices: Invoice[] = []
  ): string {
    const headers = [
      'Date Facture',
      'Heure',
      'N° Facture Normalisé DGI',
      'NIU Déclarant',
      'Raison Sociale Déclarant',
      'Centre des Impôts',
      'Nom / Raison Sociale Client',
      'NIU Client',
      'Type Document',
      'Montant Brut HT (FCFA)',
      'Taux TVA (%)',
      'TVA Collectée (FCFA)',
      'Taux CAC (%)',
      'CAC Collecté (FCFA)',
      'Retenue AIR (FCFA)',
      'Montant Total TTC (FCFA)',
      'Statut e-Billing',
      'Sceau Numérique SHA-256',
    ];

    const invoiceMap = new Map<string, Invoice>();
    invoices.forEach((inv) => {
      invoiceMap.set(inv.invoiceNumber, inv);
      invoiceMap.set(inv.id, inv);
    });

    const rows = fiscalJournal.map((item) => {
      const matchedInvoice = invoiceMap.get(item.documentNumber) || invoiceMap.get(item.invoiceId);
      const clientName = matchedInvoice?.customerName || 'CLIENT AU COMPTANT';
      const clientNiu = matchedInvoice?.customerNiu || 'NON_RENSEIGNE';
      const seal = item.hashIntegrity || matchedInvoice?.securitySignature || 'NON_SCELLE';

      return [
        item.date,
        item.time,
        item.documentNumber,
        settings.niu || 'NON_RENSEIGNE',
        `"${(settings.raisonSociale || settings.name).replace(/"/g, '""')}"`,
        `"${(settings.taxCenter || 'CIME / CDI YAOUNDE').replace(/"/g, '""')}"`,
        `"${clientName.replace(/"/g, '""')}"`,
        clientNiu,
        item.type,
        Math.round(item.montantHT),
        17.5,
        Math.round(item.montantTVA),
        1.75,
        Math.round(item.montantCAC),
        Math.round(item.montantRetenue || 0),
        Math.round(item.montantTTC),
        item.status === 'VALIDATED' ? 'CONFORME_DGI' : 'ANNULE',
        seal,
      ];
    });

    return (
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    );
  }

  /**
   * Déclenche le téléchargement du fichier CSV officiel pour la télé-déclaration DGI
   */
  public static exportFiscalJournalDgiCsv(
    fiscalJournal: FiscalJournalItem[],
    settings: RestaurantSettings,
    invoices: Invoice[] = [],
    filename?: string
  ): void {
    const defaultFilename =
      filename ||
      `teledeclaration_dgi_${settings.niu || 'CMR'}_${new Date().toISOString().slice(0, 7)}.csv`;

    const csvContent = this.generateDgiTeledeclarationCsv(fiscalJournal, settings, invoices);
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
