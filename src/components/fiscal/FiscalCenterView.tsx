import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency, numberToFrenchWords } from '../../lib/utils';
import { AccountingExportService } from '../../services/fiscal/accountingExportService';
import { FiscalInvoicePdfService } from '../../services/fiscal/fiscalInvoicePdfService';
import { TaxEngine } from '../../services/fiscal/taxEngine';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Receipt,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Clock,
  Coins,
  Send,
  HelpCircle,
  FileCheck2,
  Percent,
  Plus,
  FileText,
} from 'lucide-react';
import { TaxRegime, Invoice, Order, FiscalJournalItem } from '../../types/restaurant';

export const FiscalCenterView: React.FC = () => {
  const {
    settings,
    updateSettings,
    orders,
    expenses,
    cashSession,
    fiscalJournal,
    invoices,
    withholdings,
    fiscalObligations,
    updateFiscalObligationStatus,
    recordWithholding,
    isRuleEnabled,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<
    'profil' | 'journal' | 'withholding' | 'ebilling' | 'obligations' | 'syscohada'
  >('profil');

  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Modal new withholding
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [whPartyName, setWhPartyName] = useState('');
  const [whPartyType, setWhPartyType] = useState<'client' | 'fournisseur'>('client');
  const [whRegime, setWhRegime] = useState<TaxRegime>('reel');
  const [whRate, setWhRate] = useState<number>(2.2);
  const [whBase, setWhBase] = useState<number>(100000);
  const [whCertNum, setWhCertNum] = useState('');

  // Form edit settings
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editRaisonSociale, setEditRaisonSociale] = useState(settings.raisonSociale || settings.name);
  const [editNiu, setEditNiu] = useState(settings.niu || '');
  const [editRccm, setEditRccm] = useState(settings.rccm || '');
  const [editTaxCenter, setEditTaxCenter] = useState(settings.taxCenter || '');
  const [editBaseVat, setEditBaseVat] = useState(settings.baseVatRate || 17.5);
  const [editRegime, setEditRegime] = useState<TaxRegime>(settings.regimeFiscal || 'reel');
  const [editAssujetti, setEditAssujetti] = useState(settings.assujettiTVA ?? true);

  const handleSaveFiscalProfile = () => {
    updateSettings({
      raisonSociale: editRaisonSociale,
      niu: editNiu,
      rccm: editRccm,
      taxCenter: editTaxCenter,
      baseVatRate: editBaseVat,
      taxRate: editBaseVat * 1.1, // TVA + 10% CAC
      regimeFiscal: editRegime,
      assujettiTVA: editAssujetti,
      lastFiscalCheckDate: new Date().toISOString().slice(0, 10),
    });
    setIsEditingSettings(false);
  };

  const handleCreateWithholding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whPartyName || whBase <= 0) return;
    const amount = Math.round((whBase * whRate) / 100);
    await recordWithholding({
      partyId: `wh-p-${Date.now()}`,
      partyName: whPartyName,
      partyType: whPartyType,
      regime: whRegime,
      withholdingType: 'AIR',
      rate: whRate,
      base: whBase,
      amount,
      certificateNumber: whCertNum || undefined,
      certificateDate: new Date().toISOString().slice(0, 10),
      status: whCertNum ? 'attestation_recue' : 'declaree',
      date: new Date().toISOString().slice(0, 10),
    });
    setWithholdingModalOpen(false);
    setWhPartyName('');
    setWhCertNum('');
  };

  const handleExportSyscohadaSales = () => {
    const entries = AccountingExportService.generateSalesJournal(orders);
    AccountingExportService.exportToCsv(entries, `journal_ventes_syscohada_${settings.exerciceFiscal || '2026'}.csv`);
  };

  const handleExportSyscohadaCash = () => {
    const entries = AccountingExportService.generateCashJournal(
      orders.flatMap((o: Order) => o.payments || []),
      expenses,
      [cashSession]
    );
    AccountingExportService.exportToCsv(entries, `journal_caisse_syscohada_${settings.exerciceFiscal || '2026'}.csv`);
  };

  const handleExportDgiTeledeclaration = () => {
    AccountingExportService.exportFiscalJournalDgiCsv(fiscalJournal, settings, invoices);
  };

  const handleDownloadJournalInvoicePdf = async (item: FiscalJournalItem) => {
    setDownloadingInvoiceId(item.id);
    try {
      // 1. Chercher dans les factures existantes
      let targetInvoice = (invoices || []).find(
        (inv: Invoice) => inv.id === item.invoiceId || inv.invoiceNumber === item.documentNumber
      );
      // 2. Chercher dans les commandes correspondantes
      const targetOrder = (orders || []).find(
        (o: Order) => o.orderNumber === item.documentNumber || o.id === item.invoiceId
      );

      if (!targetInvoice && targetOrder) {
        const created = TaxEngine.createFiscalInvoice(
          targetOrder,
          settings,
          parseInt(item.documentNumber.replace(/[^0-9]/g, '').slice(-6) || '1', 10),
          {
            name: targetOrder.companyBillingName || targetOrder.customerName,
            niu: targetOrder.companyBillingNiu,
          }
        );
        targetInvoice = created.invoice;
      }

      if (!targetInvoice) {
        // Reconstitution d'une facture légale conforme à partir de la ligne du journal
        targetInvoice = {
          id: item.invoiceId || item.id,
          invoiceNumber: item.documentNumber,
          sequenceNumber: parseInt(item.documentNumber.replace(/[^0-9]/g, '').slice(-6) || '1', 10),
          orderId: item.invoiceId || item.id,
          orderNumber: item.documentNumber,
          restaurantId: settings.name,
          date: item.date,
          time: item.time,
          status: item.status === 'VALIDATED' ? 'ISSUED' : 'CANCELLED',
          emitterRaisonSociale: settings.raisonSociale || settings.name,
          emitterNiu: settings.niu || 'M012012345678A',
          emitterRccm: settings.rccm || 'RC/YAO/2024/B/1894',
          emitterTaxCenter: settings.taxCenter || 'CDI YAOUNDE I',
          emitterAddress: settings.address || 'Yaoundé',
          emitterPhone: settings.phone || '',
          customerName: 'CLIENT AU COMPTANT',
          items: [
            {
              productId: 'p-journal',
              productName: `Prestation Restauration & Boissons (${item.type})`,
              quantity: 1,
              unitPriceHT: item.montantHT,
              discountAmount: 0,
              totalHT: item.montantHT,
              vatRate: 17.5,
              vatAmount: item.montantTVA,
              cacAmount: item.montantCAC,
              totalTTC: item.montantTTC,
            },
          ],
          subtotalHT: item.montantHT,
          discountTotal: 0,
          taxableBase: item.montantHT,
          vatAmount: item.montantTVA,
          cacAmount: item.montantCAC,
          totalTaxes: item.montantTVA + item.montantCAC,
          withholdingAmount: item.montantRetenue || 0,
          totalTTC: item.montantTTC,
          netToPay: item.montantTTC - (item.montantRetenue || 0),
          amountInWords: numberToFrenchWords(item.montantTTC),
          paymentStatus: 'PAID',
          securitySignature: item.hashIntegrity,
          currency: settings.currency || 'XAF',
        };
      }

      await FiscalInvoicePdfService.downloadFiscalInvoicePdf(targetInvoice, settings, targetOrder);
    } catch (err) {
      console.error('[FiscalCenterView] Erreur téléchargement facture PDF:', err);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">Centre Fiscal & Comptable (Cameroun CGI 2026)</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                CONFIGURÉ POUR LE CADRE CAMEROUNAIS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestion de la TVA 19,25%, retenues AIR, numérotation légale, journal fiscal et export SYSCOHADA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-400">Dernière vérif. :</span>
          <span className="font-bold text-white">{settings.lastFiscalCheckDate || '2026-03-01'}</span>
        </div>
      </div>

      {/* Notice de non-certification juridique */}
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">Avertissement réglementaire :</span> RestoMaster OS intègre les règles du Code Général des Impôts (CGI) camerounais mis à jour au 1er janvier 2026 (TVA 17,5% + 10% CAC = 19,25%, acomptes AIR 2,2% / 5,5%, mentions obligatoires NIU/RCCM). Cette configuration logicielle doit être validée périodiquement avec votre expert-comptable ou conseil fiscal agréé CEMAC/ONECCA.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('profil')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'profil'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil Établissement & Taux</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'journal'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Journal Fiscal Immuable ({fiscalJournal.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('withholding')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'withholding'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Retenues Fiscales (AIR) ({withholdings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ebilling')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'ebilling'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Architecture E-Billing DGI</span>
        </button>

        <button
          onClick={() => setActiveTab('obligations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'obligations'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendrier Fiscal DGI</span>
        </button>

        <button
          onClick={() => setActiveTab('syscohada')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'syscohada'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Comptable OHADA</span>
        </button>
      </div>

      {/* TAB 1: PROFIL & TAUX */}
      {activeTab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Identité Juridique & Fiscale du Contribuable</h3>
                <p className="text-xs text-slate-500">Mentions obligatoires sur toutes les factures et tickets</p>
              </div>
              {!isEditingSettings ? (
                <button
                  onClick={() => setIsEditingSettings(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                >
                  Modifier
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingSettings(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveFiscalProfile}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Raison Sociale Officielle :</label>
                {isEditingSettings ? (
                  <input
                    type="text"
                    value={editRaisonSociale}
                    onChange={(e) => setEditRaisonSociale(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg font-bold text-slate-800">
                    {settings.raisonSociale || settings.name}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Forme Juridique :</label>
                <div className="p-2.5 bg-slate-50 rounded-lg font-bold text-slate-800">
                  {settings.formeJuridique || 'SARL'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">NIU (Numéro d'Identifiant Unique) :</label>
                {isEditingSettings ? (
                  <input
                    type="text"
                    value={editNiu}
                    onChange={(e) => setEditNiu(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg font-mono font-bold text-slate-800">
                    {settings.niu || 'Non configuré'}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">RCCM (Registre du Commerce) :</label>
                {isEditingSettings ? (
                  <input
                    type="text"
                    value={editRccm}
                    onChange={(e) => setEditRccm(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg font-mono font-bold text-slate-800">
                    {settings.rccm || 'Non configuré'}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Centre des Impôts (CIME / CDI) :</label>
                {isEditingSettings ? (
                  <input
                    type="text"
                    value={editTaxCenter}
                    onChange={(e) => setEditTaxCenter(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg font-bold text-slate-800">
                    {settings.taxCenter || 'CIME Yaoundé 1'}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Régime Fiscal :</label>
                {isEditingSettings ? (
                  <select
                    value={editRegime}
                    onChange={(e) => setEditRegime(e.target.value as TaxRegime)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="reel">Régime du Réel (Assujetti TVA)</option>
                    <option value="simplifie">Régime Simplifié</option>
                    <option value="igp">Impôt Global / Non assujetti</option>
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg font-bold text-slate-800 capitalize">
                    {settings.regimeFiscal === 'reel' ? 'Régime du Réel (TVA active)' : settings.regimeFiscal}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonne Droite: Décomposition des Taux */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              Moteur de Calcul de la TVA (CGI 2026)
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Taux principal de TVA :</span>
                <span className="font-black text-slate-900">{settings.baseVatRate || 17.5}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Centimes Additionnels (CAC) :</span>
                <span className="font-black text-slate-900">10% sur TVA (1,75% HT)</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Taux combiné effectif TTC :</span>
                <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-sm">
                  {settings.taxRate || 19.25}%
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1.5 leading-relaxed">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Tous les plats et boissons sont soumis au taux combiné légal de 19,25% lorsqu'ils sont servis sur place ou emportés.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Numérotation des factures : <strong>{settings.invoicePrefix || '2026-RESTO-001'}-XXXXXX</strong> (chronologique et non réutilisable).</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOURNAL FISCAL IMMUABLE */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Journal des Opérations Fiscales (Immuable)</h3>
              <p className="text-xs text-slate-500">Traçabilité complète des factures émises, TVA collectée, CAC et retenues</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportDgiTeledeclaration}
                disabled={fiscalJournal.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                title="Télécharger le fichier CSV officiel de télé-déclaration pour la DGI (Cameroun)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Télé-déclaration DGI (CSV)</span>
              </button>
              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                Total TTC : <span className="font-black text-slate-900">{formatCurrency(fiscalJournal.reduce((s: number, j: any) => s + j.montantTTC, 0), settings.currency)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">N° Facture Unique</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Base HT</th>
                  <th className="py-2.5 px-3 text-right">TVA (17,5%)</th>
                  <th className="py-2.5 px-3 text-right">CAC (10%)</th>
                  <th className="py-2.5 px-3 text-right">Retenue</th>
                  <th className="py-2.5 px-3 text-right">Total TTC</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {fiscalJournal.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      Aucune écriture fiscale générée pour le moment. Les factures validées apparaissent ici automatiquement.
                    </td>
                  </tr>
                ) : (
                  fiscalJournal.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {item.date} {item.time}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {item.documentNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                        {formatCurrency(item.montantHT, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                        {formatCurrency(item.montantTVA, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                        {formatCurrency(item.montantCAC, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-mono">
                        {item.montantRetenue > 0 ? `-${formatCurrency(item.montantRetenue, settings.currency)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                        {formatCurrency(item.montantTTC, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadJournalInvoicePdf(item)}
                          disabled={downloadingInvoiceId === item.id}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-[11px] font-bold"
                          title="Télécharger la Facture Officielle Normée DGI A4 (PDF)"
                        >
                          <FileText className="w-3 h-3 text-amber-600" />
                          <span>{downloadingInvoiceId === item.id ? '...' : 'Facture A4'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RETENUES FISCALES (AIR) */}
      {activeTab === 'withholding' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registre des Retenues Fiscales à la Source (AIR)</h3>
              <p className="text-xs text-slate-500">
                Suivi des retenues opérées par les clients entreprises/administrations et subies sur fournisseurs
              </p>
            </div>
            <button
              onClick={() => setWithholdingModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Enregistrer une Retenue</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Tiers (Client / Fournisseur)</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Régime</th>
                  <th className="py-2.5 px-3 text-right">Base HT</th>
                  <th className="py-2.5 px-3 text-right">Taux</th>
                  <th className="py-2.5 px-3 text-right">Montant Retenue</th>
                  <th className="py-2.5 px-3">N° Attestation</th>
                  <th className="py-2.5 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withholdings.map((wh: any) => (
                  <tr key={wh.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500">{wh.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{wh.partyName}</td>
                    <td className="py-2.5 px-3 capitalize text-slate-600">{wh.partyType}</td>
                    <td className="py-2.5 px-3 uppercase text-slate-600 font-mono text-[11px]">{wh.regime}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(wh.base, settings.currency)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">{wh.rate}%</td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600 font-mono">
                      {formatCurrency(wh.amount, settings.currency)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {wh.certificateNumber || 'En attente'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        wh.status === 'attestation_recue'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {wh.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ARCHITECTURE E-BILLING & DGI */}
      {activeTab === 'ebilling' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Passerelle E-Billing DGI (Facturation Électronique)</h3>
              <p className="text-xs text-slate-500">
                Architecture d'interopérabilité avec la plateforme de télédéclaration fiscale
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
              Connecteur : Mode Interne / Non Connecté
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs leading-relaxed text-slate-700">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Information de Conformité Déontologique :
            </div>
            <p>
              Le système RestoMaster OS implémente l'architecture d'abstraction <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-amber-800">FiscalProvider</code>. Cette couche logicielle permet d'ajouter ultérieurement le connecteur officiel de la Direction Générale des Impôts (DGI Cameroun) sans restructurer l'application.
            </p>
            <p>
              Tant qu'une clé d'API officielle délivrée par la DGI n'est pas configurée dans les paramètres de production, les factures sont enregistrées dans le journal fiscal local avec empreinte de contrôle interne.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="text-[11px] font-bold uppercase text-slate-400">Statut du Connecteur</div>
              <div className="text-sm font-black text-amber-700 mt-1">NON CONNECTÉ</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Mode autonome local actif</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="text-[11px] font-bold uppercase text-slate-400">Format d'Échange Prévu</div>
              <div className="text-sm font-black text-slate-900 mt-1">JSON / REST DGI</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Spécification DGI e-billing</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="text-[11px] font-bold uppercase text-slate-400">Sécurisation Numérotation</div>
              <div className="text-sm font-black text-emerald-700 mt-1">Séquentielle & Immuable</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Aucun trou de facturation</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CALENDRIER FISCAL DGI */}
      {activeTab === 'obligations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Calendrier des Échéances Fiscales & Sociales (Cameroun)</h3>
              <p className="text-xs text-slate-500">Suivi des dates limites légales au Centre des Impôts et à la CNPS</p>
            </div>
            {isRuleEnabled('notif_rappel_fiscal', true) && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                Rappels Automatiques Actifs
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {fiscalObligations.map((ob: any) => (
              <div key={ob.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>{ob.obligation}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      ob.status === 'valide'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ob.status === 'en_retard'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ob.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Période : {ob.period} • Échéance : <strong>{ob.dueDate}</strong> • Responsable : {ob.responsible}
                    {ob.documentReference && ` • Réf : ${ob.documentReference}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ob.amountEstimated && (
                    <div className="text-right font-black text-slate-900 mr-2">
                      {formatCurrency(ob.amountEstimated, settings.currency)}
                    </div>
                  )}
                  {ob.status !== 'valide' && (
                    <button
                      onClick={() => updateFiscalObligationStatus(ob.id, 'valide')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200"
                    >
                      Marquer Validé
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: EXPORT COMPTABLE OHADA / SYSCOHADA */}
      {activeTab === 'syscohada' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Exportation Comptable SYSCOHADA / OHADA</h3>
              <p className="text-xs text-slate-500">
                Génération des écritures comptables prêtes à intégrer dans Sage, Saari ou logiciels certifiés OHADA
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Journal des Ventes (VT)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Comptes 706 / 4431 / 411</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Génère les écritures de chiffre d'affaires, de TVA collectée (17,5%) et de Centimes Additionnels (1,75%).
              </p>
              <button
                onClick={handleExportSyscohadaSales}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Journal des Ventes CSV</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">Journal de Caisse & Règlements (CA)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Comptes 571 / 585 / 521</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Génère les mouvements de trésorerie espèces, virements Mobile Money et décaissements de charges.
              </p>
              <button
                onClick={handleExportSyscohadaCash}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger Journal de Caisse CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau Enregistrement Retenue */}
      {withholdingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Enregistrer une Retenue Fiscale (AIR)</h3>
            <form onSubmit={handleCreateWithholding} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du Tiers (Client ou Fournisseur) :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Société Brasseries SA"
                  value={whPartyName}
                  onChange={(e) => setWhPartyName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type de Tiers :</label>
                  <select
                    value={whPartyType}
                    onChange={(e) => setWhPartyType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="client">Client (Retenue subie)</option>
                    <option value="fournisseur">Fournisseur (Retenue opérée)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Régime Fiscal :</label>
                  <select
                    value={whRegime}
                    onChange={(e) => {
                      const r = e.target.value as TaxRegime;
                      setWhRegime(r);
                      setWhRate(r === 'reel' ? 2.2 : r === 'simplifie' ? 5.5 : 15);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="reel">Régime Réel (2,2%)</option>
                    <option value="simplifie">Simplifié (5,5%)</option>
                    <option value="igp">Informel / Non immat. (15%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Montant Base HT :</label>
                  <input
                    type="number"
                    min={1000}
                    value={whBase}
                    onChange={(e) => setWhBase(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Taux Retenue (%) :</label>
                  <input
                    type="number"
                    step={0.1}
                    value={whRate}
                    onChange={(e) => setWhRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-600">Montant de la retenue :</span>
                <span className="font-black text-rose-600 font-mono text-sm">
                  {formatCurrency(Math.round((whBase * whRate) / 100), settings.currency)}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">N° Attestation de Retenue (Optionnel) :</label>
                <input
                  type="text"
                  placeholder="Ex: ATT-AIR-2026-XXXX"
                  value={whCertNum}
                  onChange={(e) => setWhCertNum(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWithholdingModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
