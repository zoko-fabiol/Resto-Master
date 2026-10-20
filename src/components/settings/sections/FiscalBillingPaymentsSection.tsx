import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import {
  Receipt,
  ShieldCheck,
  CreditCard,
  Smartphone,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Building,
  Landmark,
  FileCheck,
  Printer,
  Sparkles,
  ListOrdered,
  FileSignature,
  Percent,
  RotateCcw,
  ShieldAlert,
  Wallet,
  Briefcase,
  Calendar,
  Monitor,
  Banknote,
  Coins,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';

interface Props {
  subTab: 'facturation' | 'fiscalite' | 'paiements' | 'mobile_money' | 'comptabilite';
}

export const FiscalBillingPaymentsSection: React.FC<Props> = ({ subTab }) => {
  const { settings, updateSettings, addAuditLog, operationRules, updateOperationRules } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeBillingTab, setActiveBillingTab] = useState<'billing' | 'accounting'>(
    subTab === 'comptabilite' ? 'accounting' : 'billing'
  );
  const [activePaymentTab, setActivePaymentTab] = useState<'methods' | 'momo'>(
    subTab === 'mobile_money' ? 'momo' : 'methods'
  );

  // Fiscal Form State
  const [niu, setNiu] = useState(settings.niu || 'M012012345678A');
  const [rccm, setRccm] = useState(settings.rccm || 'RC/YAO/2024/B/1894');
  const [taxCenter, setTaxCenter] = useState(settings.taxCenter || 'CIME Yaoundé 1');
  const [taxRate, setTaxRate] = useState(settings.taxRate ?? 19.25);
  const [vatBaseRate, setVatBaseRate] = useState(settings.baseVatRate ?? 17.5);
  const [cacRate, setCacRate] = useState(settings.cacRate ?? 10);
  const [withholdingRate, setWithholdingRate] = useState(settings.withholdingRate ?? 2.2);

  // Mobile Money Form State
  const [mtnActive, setMtnActive] = useState(settings.mtnActive ?? true);
  const [mtnMerchantCode, setMtnMerchantCode] = useState(settings.mtnMoMoMerchantCode || '456789');
  const [mtnPhone, setMtnPhone] = useState(settings.mtnMoMoPhone || '677112233');
  const [mtnMode, setMtnMode] = useState<'test' | 'production'>(settings.mtnMode || 'production');
  const [mtnManualVerification, setMtnManualVerification] = useState(settings.mtnManualVerification ?? true);
  const [mtnAutoConfirmApi, setMtnAutoConfirmApi] = useState(settings.mtnAutoConfirmApi ?? false);

  const [orangeActive, setOrangeActive] = useState(settings.orangeActive ?? true);
  const [orangeMerchantCode, setOrangeMerchantCode] = useState(settings.orangeMoneyMerchantCode || '784123');
  const [orangePhone, setOrangePhone] = useState(settings.orangeMoneyPhone || '699887766');
  const [orangeMode, setOrangeMode] = useState<'test' | 'production'>(settings.orangeMode || 'production');
  const [orangeManualVerification, setOrangeManualVerification] = useState(settings.orangeManualVerification ?? true);
  const [orangeAutoConfirmApi, setOrangeAutoConfirmApi] = useState(settings.orangeAutoConfirmApi ?? false);

  // Billing & Payment methods toggles
  const [billingOptions, setBillingOptions] = useState<Record<string, boolean>>({
    bill_active: operationRules?.bill_active ?? true,
    bill_a5: operationRules?.bill_a5 ?? true,
    bill_custom_templates: operationRules?.bill_custom_templates ?? true,
    bill_auto_numbering: operationRules?.bill_auto_numbering ?? true,
    bill_numbering_by_outlet: operationRules?.bill_numbering_by_outlet ?? true,
    bill_numbering_by_terminal: operationRules?.bill_numbering_by_terminal ?? false,
    bill_amount_in_words: operationRules?.bill_amount_in_words ?? true,
    bill_discounts: operationRules?.bill_discounts ?? true,
    bill_taxes_detail: operationRules?.bill_taxes_detail ?? true,
    bill_withholdings: operationRules?.bill_withholdings ?? true,
    bill_credit_notes: operationRules?.bill_credit_notes ?? true,
    bill_cancellations: operationRules?.bill_cancellations ?? true,
    bill_refunds: operationRules?.bill_refunds ?? true,
    bill_corporate: operationRules?.bill_corporate ?? true,
    bill_events: operationRules?.bill_events ?? true,
    bill_client_credit: operationRules?.bill_client_credit ?? true,
  });

  const [paymentMethods, setPaymentMethods] = useState<Record<string, boolean>>({
    pay_especes: operationRules?.pay_especes ?? settings.paymentMethods?.pay_especes ?? true,
    pay_cb: operationRules?.pay_cb ?? settings.paymentMethods?.pay_cb ?? true,
    pay_mtn_momo: operationRules?.pay_mtn_momo ?? settings.paymentMethods?.pay_mtn_momo ?? true,
    pay_orange_money: operationRules?.pay_orange_money ?? settings.paymentMethods?.pay_orange_money ?? true,
    pay_virement: operationRules?.pay_virement ?? settings.paymentMethods?.pay_virement ?? true,
    pay_cheque: operationRules?.pay_cheque ?? settings.paymentMethods?.pay_cheque ?? true,
    pay_credit_client: operationRules?.pay_credit_client ?? settings.paymentMethods?.pay_credit_client ?? true,
    pay_partiel: operationRules?.pay_partiel ?? settings.paymentMethods?.pay_partiel ?? true,
    pay_multiple: operationRules?.pay_multiple ?? settings.paymentMethods?.pay_multiple ?? true,
    ...(settings.paymentMethods || {}),
  });

  const [accountingAccounts, setAccountingAccounts] = useState({
    cuisineSales: settings.accountingAccounts?.cuisineSales || '701100',
    barSales: settings.accountingAccounts?.barSales || '702100',
    vatCollected: settings.accountingAccounts?.vatCollected || '443100',
    cacCollected: settings.accountingAccounts?.cacCollected || '443200',
    withholdingAir: settings.accountingAccounts?.withholdingAir || '447200',
    cashAccount: settings.accountingAccounts?.cashAccount || '571100',
    mobileMoneyAccount: settings.accountingAccounts?.mobileMoneyAccount || '585100',
    clientsAccount: settings.accountingAccounts?.clientsAccount || '411100',
  });

  React.useEffect(() => {
    if (operationRules) {
      setBillingOptions((prev) => ({ ...prev, ...operationRules }));
      setPaymentMethods((prev) => ({
        ...prev,
        pay_especes: operationRules.pay_especes ?? prev.pay_especes,
        pay_cb: operationRules.pay_cb ?? prev.pay_cb,
        pay_mtn_momo: operationRules.pay_mtn_momo ?? prev.pay_mtn_momo,
        pay_orange_money: operationRules.pay_orange_money ?? prev.pay_orange_money,
        pay_virement: operationRules.pay_virement ?? prev.pay_virement,
        pay_cheque: operationRules.pay_cheque ?? prev.pay_cheque,
        pay_credit_client: operationRules.pay_credit_client ?? prev.pay_credit_client,
        pay_partiel: operationRules.pay_partiel ?? prev.pay_partiel,
        pay_multiple: operationRules.pay_multiple ?? prev.pay_multiple,
      }));
    }
  }, [operationRules]);

  React.useEffect(() => {
    if (settings) {
      if (settings.niu) setNiu(settings.niu);
      if (settings.rccm) setRccm(settings.rccm);
      if (settings.taxCenter) setTaxCenter(settings.taxCenter);
      if (settings.taxRate !== undefined) setTaxRate(settings.taxRate);
      if (settings.baseVatRate !== undefined) setVatBaseRate(settings.baseVatRate);
      if (settings.cacRate !== undefined) setCacRate(settings.cacRate);
      if (settings.withholdingRate !== undefined) setWithholdingRate(settings.withholdingRate);

      if (settings.mtnActive !== undefined) setMtnActive(settings.mtnActive);
      if (settings.mtnMoMoMerchantCode) setMtnMerchantCode(settings.mtnMoMoMerchantCode);
      if (settings.mtnMoMoPhone) setMtnPhone(settings.mtnMoMoPhone);
      if (settings.mtnMode) setMtnMode(settings.mtnMode);
      if (settings.mtnManualVerification !== undefined) setMtnManualVerification(settings.mtnManualVerification);
      if (settings.mtnAutoConfirmApi !== undefined) setMtnAutoConfirmApi(settings.mtnAutoConfirmApi);

      if (settings.orangeActive !== undefined) setOrangeActive(settings.orangeActive);
      if (settings.orangeMoneyMerchantCode) setOrangeMerchantCode(settings.orangeMoneyMerchantCode);
      if (settings.orangeMoneyPhone) setOrangePhone(settings.orangeMoneyPhone);
      if (settings.orangeMode) setOrangeMode(settings.orangeMode);
      if (settings.orangeManualVerification !== undefined) setOrangeManualVerification(settings.orangeManualVerification);
      if (settings.orangeAutoConfirmApi !== undefined) setOrangeAutoConfirmApi(settings.orangeAutoConfirmApi);

      if (settings.paymentMethods) {
        setPaymentMethods((prev) => ({ ...prev, ...settings.paymentMethods }));
      }
      if (settings.accountingAccounts) {
        setAccountingAccounts((prev) => ({ ...prev, ...settings.accountingAccounts }));
      }
    }
  }, [settings]);

  const handleSaveBilling = async () => {
    await updateOperationRules(billingOptions);
    setSavedSuccess(true);
    addAuditLog('Mise à jour facturation', 'Paramètres', 'Paramètres FACTURATION enregistrés');
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (subTab === 'fiscalite') {
      if (!niu.trim()) {
        setErrorMessage('Le NIU (Numéro d\'Identifiant Unique) est obligatoire pour la conformité fiscale.');
        return;
      }
      if (!rccm.trim()) {
        setErrorMessage('Le numéro RCCM est obligatoire pour la facturation officielle.');
        return;
      }
      if (vatBaseRate < 0 || vatBaseRate > 100) {
        setErrorMessage('Le taux de TVA standard doit être compris entre 0% et 100%.');
        return;
      }
      if (cacRate < 0 || cacRate > 100) {
        setErrorMessage('Le taux des CAC doit être compris entre 0% et 100%.');
        return;
      }
      if (withholdingRate < 0 || withholdingRate > 100) {
        setErrorMessage('Le taux de retenue AIR doit être compris entre 0% et 100%.');
        return;
      }
    }

    try {
      await updateSettings({
        niu: niu.trim().toUpperCase(),
        rccm: rccm.trim(),
        taxCenter: taxCenter.trim(),
        taxRate,
        baseVatRate: vatBaseRate,
        cacRate,
        withholdingRate,
        mtnActive,
        mtnMoMoMerchantCode: mtnMerchantCode.trim(),
        mtnMoMoPhone: mtnPhone.trim(),
        mtnMode,
        mtnManualVerification,
        mtnAutoConfirmApi,
        orangeActive,
        orangeMoneyMerchantCode: orangeMerchantCode.trim(),
        orangeMoneyPhone: orangePhone.trim(),
        orangeMode,
        orangeManualVerification,
        orangeAutoConfirmApi,
        paymentMethods,
        accountingAccounts,
      });

      if (subTab === 'paiements') {
        await updateOperationRules(paymentMethods);
      }

      setSavedSuccess(true);
      addAuditLog('Mise à jour finance', 'Paramètres', `Modification des paramètres ${subTab.toUpperCase()}`);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des paramètres:', err);
      setErrorMessage('Une erreur est survenue lors de l\'enregistrement des paramètres.');
    }
  };

  const renderComptabiliteContent = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Comptabilité OHADA / SYSCOHADA Révisé</h3>
            <p className="text-xs text-slate-500">
              Paramétrage des comptes généraux pour les exports vers Sage Saari et logiciels comptables
            </p>
          </div>
        </div>
        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" /> Enregistré
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte Ventes Cuisine (Compte 701) :</label>
          <input
            type="text"
            value={accountingAccounts.cuisineSales}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, cuisineSales: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte Ventes Bar & Boissons (Compte 702) :</label>
          <input
            type="text"
            value={accountingAccounts.barSales}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, barSales: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte TVA Collectée (Compte 4431) :</label>
          <input
            type="text"
            value={accountingAccounts.vatCollected}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, vatCollected: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte CAC Collectés (Compte 4432) :</label>
          <input
            type="text"
            value={accountingAccounts.cacCollected}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, cacCollected: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte Caisse Espèces (Compte 571) :</label>
          <input
            type="text"
            value={accountingAccounts.cashAccount}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, cashAccount: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-1">Compte Mobile Money (Compte 585) :</label>
          <input
            type="text"
            value={accountingAccounts.mobileMoneyAccount}
            onChange={(e) => setAccountingAccounts((prev) => ({ ...prev, mobileMoneyAccount: e.target.value }))}
            className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={() => handleSave()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer le plan comptable</span>
        </button>
      </div>
    </div>
  );

  // 1. FACTURATION & SYSCOHADA (Sections 18 & 21b)
  if (subTab === 'facturation' || subTab === 'comptabilite') {
    const billingItems = [
      {
        key: 'bill_active',
        label: 'Facturation officielle active',
        description: 'Émission autorisée de factures formelles restaurant conformes DGI',
        icon: FileCheck,
      },
      {
        key: 'bill_a5',
        label: 'Factures format laser A5 déductibles',
        description: 'Mise en page format A5 pour sociétés avec TVA et décharges',
        icon: Printer,
      },
      {
        key: 'bill_custom_templates',
        label: 'Modèles de factures personnalisées',
        description: 'En-tête officiel avec Logo, NIU, RCCM, Ville et Slogan',
        icon: Sparkles,
      },
      {
        key: 'bill_auto_numbering',
        label: 'Numérotation automatique continue',
        description: 'Séquence chronologique immuable sans saut de numéro',
        icon: ListOrdered,
      },
      {
        key: 'bill_numbering_by_outlet',
        label: 'Numérotation préfixée par établissement',
        description: 'Identifiant du site intégré au numéro (ex: 2026-RESTO-001)',
        icon: Building,
      },
      {
        key: 'bill_numbering_by_terminal',
        label: 'Numérotation distincte par caisse/terminal',
        description: 'Compteur séparé pour chaque caisse physique ou tablette',
        icon: Monitor,
      },
      {
        key: 'bill_amount_in_words',
        label: 'Conversion du montant en toutes lettres',
        description: 'Formule d’arrêté légale obligatoire en Francs CFA',
        icon: FileSignature,
      },
      {
        key: 'bill_discounts',
        label: 'Gestion des remises commerciales sur facture',
        description: 'Ligne explicite des pourcentages et remises accordées',
        icon: Percent,
      },
      {
        key: 'bill_taxes_detail',
        label: 'Ventilation détaillée des taxes (TVA & CAC)',
        description: 'Décomposition légale : TVA 17,50% + CAC 1,75% (Total 19,25%)',
        icon: Receipt,
      },
      {
        key: 'bill_withholdings',
        label: 'Mentions des retenues à la source (AIR)',
        description: 'Mentions des acomptes libératoires AIR 2,2% ou 5,5%',
        icon: ShieldCheck,
      },
      {
        key: 'bill_credit_notes',
        label: 'Émission d’avoirs officiels',
        description: 'Factures d’avoir certifiées avec numéro d’annulation',
        icon: RotateCcw,
      },
      {
        key: 'bill_cancellations',
        label: 'Procédure d’annulation contrôlée avec motif',
        description: 'Justificatif obligatoire en cas d’annulation d’une facture',
        icon: ShieldAlert,
      },
      {
        key: 'bill_refunds',
        label: 'Gestion des remboursements clients',
        description: 'Enregistrement des sorties pour remboursement client',
        icon: Wallet,
      },
      {
        key: 'bill_corporate',
        label: 'Facturation entreprises (NIU obligatoire)',
        description: 'Contrôle du NIU contribuable valide pour déductibilité',
        icon: Briefcase,
      },
      {
        key: 'bill_events',
        label: 'Facturation spécifique événementielle',
        description: 'Gestion des devis, acomptes et solde de banquets',
        icon: Calendar,
      },
      {
        key: 'bill_client_credit',
        label: 'Facturation différée pour clients à crédit',
        description: 'Regroupement mensuel des consommations en compte',
        icon: CreditCard,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Switcher Facturation / SYSCOHADA */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveBillingTab('billing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeBillingTab === 'billing'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Facturation Laser A5 & Mentions Légales</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveBillingTab('accounting')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeBillingTab === 'accounting'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-500" />
            <span>Plan Comptable & SYSCOHADA Révisé</span>
          </button>
        </div>

        {activeBillingTab === 'billing' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Centre Détaillé de Facturation Officielle
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Section 18
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Normes d’émission des factures A5, avoirs, remises et numérotations conformes CGI Cameroun 2026
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paramètres enregistrés
            </span>
          )}
        </div>

        {/* Modern Rule Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {billingItems.map((item) => (
            <ModernRuleToggle
              key={item.key}
              id={item.key}
              label={item.label}
              description={item.description}
              icon={item.icon}
              checked={billingOptions[item.key] ?? false}
              onChange={() =>
                setBillingOptions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
              }
            />
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Format actif : <strong>Facture Laser A5 + Montant en lettres</strong>
          </span>
          <button
            type="button"
            onClick={() => handleSaveBilling()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la facturation</span>
          </button>
        </div>
      </div>
        ) : (
          renderComptabiliteContent()
        )}
      </div>
    );
  }

  // 2. FISCALITÉ CAMEROUN (Section 19)
  if (subTab === 'fiscalite') {
    return (
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-blue-300 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fiscalité Cameroun (CGI 2026)</h3>
              <p className="text-xs text-slate-500">
                Profil fiscal, taux paramétrables (jamais en dur), journal inaltérable et préparation e-billing DGI
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Enregistré
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Warning banner: no hardcoded rates */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Conformité logicielle CGI :</strong> Tous les taux (TVA, CAC, Retenues AIR) sont configurables dynamiquement et calculés selon les barèmes en vigueur.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Numéro d’Identifiant Unique (NIU) :</label>
            <input
              type="text"
              value={niu}
              onChange={(e) => setNiu(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold uppercase focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Registre du Commerce (RCCM) :</label>
            <input
              type="text"
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Centre des Impôts de rattachement :</label>
            <input
              type="text"
              value={taxCenter}
              onChange={(e) => setTaxCenter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Taux de TVA standard Hors CAC (%) :</label>
            <input
              type="number"
              step="0.1"
              value={vatBaseRate}
              onChange={(e) => {
                const base = Number(e.target.value);
                setVatBaseRate(base);
                setTaxRate(base * (1 + cacRate / 100));
              }}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:bg-white focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Norme CGI : 17,5 % sur la base HT</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Centimes Additionnels Communaux (CAC) sur TVA (%) :</label>
            <input
              type="number"
              step="0.5"
              value={cacRate}
              onChange={(e) => {
                const cac = Number(e.target.value);
                setCacRate(cac);
                setTaxRate(vatBaseRate * (1 + cac / 100));
              }}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:bg-white focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Norme CGI : 10 % sur le montant de TVA</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Taux combiné TVA + CAC appliqué (%) :</label>
            <input
              type="number"
              disabled
              value={taxRate.toFixed(2)}
              className="w-full p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-mono font-bold text-emerald-900"
            />
            <span className="text-[10px] text-emerald-700 mt-0.5 block">Combiné automatique : 19,25 %</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Retenue à la Source AIR (Régime Réel) (%) :</label>
            <input
              type="number"
              step="0.1"
              value={withholdingRate}
              onChange={(e) => setWithholdingRate(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:bg-white focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Acompte standard 2,2 %</span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Préparation E-Billing DGI :</label>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-slate-800">Module prêt pour télé-déclaration</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                Actif (DGI API Ready)
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Échéance de déclaration légale : <strong>Chaque 15 du mois</strong>
          </span>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer le profil fiscal</span>
          </button>
        </div>
      </form>
    );
  }

  const renderMobileMoneyContent = () => (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configuration Mobile Money (MTN MoMo & Orange Money)</h3>
              <p className="text-xs text-slate-500">
                Paramétrage des comptes marchands, vérification manuelle et règles de confirmation (Section 21)
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Enregistré
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Security Rule Warning */}
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>Règle de sécurité impérative :</strong> Une référence de transaction saisie manuellement par l'opérateur ne doit jamais être automatiquement confirmée sans validation visuelle du SMS officiel ou interrogation de l'API.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MTN Mobile Money */}
          <div className="p-5 rounded-2xl border border-amber-300 bg-amber-50/10 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center">
                  MTN
                </div>
                <h4 className="font-bold text-sm text-slate-900">MTN Mobile Money (MoMo)</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black uppercase ${mtnActive ? 'text-amber-700' : 'text-slate-400'}`}>
                  {mtnActive ? 'Actif' : 'Inactif'}
                </span>
                <button
                  type="button"
                  onClick={() => setMtnActive(!mtnActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    mtnActive ? 'bg-amber-500 shadow-sm shadow-amber-500/30' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      mtnActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro Marchand (Merchant Code) :</label>
                <input
                  type="text"
                  value={mtnMerchantCode}
                  onChange={(e) => setMtnMerchantCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro de téléphone récepteur :</label>
                <input
                  type="text"
                  value={mtnPhone}
                  onChange={(e) => setMtnPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Environnement :</label>
                <select
                  value={mtnMode}
                  onChange={(e) => setMtnMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-bold"
                >
                  <option value="production">Mode Production (Réseau MTN Cameroun)</option>
                  <option value="test">Mode Test / Sandbox</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <div
                  onClick={() => setMtnManualVerification(!mtnManualVerification)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Vérification manuelle obligatoire</span>
                      <span className="text-[10px] text-slate-500">Contrôle visuel du SMS officiel de confirmation</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      mtnManualVerification ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        mtnManualVerification ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div
                  onClick={() => setMtnAutoConfirmApi(!mtnAutoConfirmApi)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Confirmation automatique API</span>
                      <span className="text-[10px] text-slate-500">Validation via MoMo Open Webhook en direct</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      mtnAutoConfirmApi ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        mtnAutoConfirmApi ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Orange Money */}
          <div className="p-5 rounded-2xl border border-orange-300 bg-orange-50/10 space-y-4">
            <div className="flex items-center justify-between border-b border-orange-200/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                  OM
                </div>
                <h4 className="font-bold text-sm text-slate-900">Orange Money (Max it / #150#)</h4>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black uppercase ${orangeActive ? 'text-orange-700' : 'text-slate-400'}`}>
                  {orangeActive ? 'Actif' : 'Inactif'}
                </span>
                <button
                  type="button"
                  onClick={() => setOrangeActive(!orangeActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    orangeActive ? 'bg-orange-500 shadow-sm shadow-orange-500/30' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      orangeActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro Marchand :</label>
                <input
                  type="text"
                  value={orangeMerchantCode}
                  onChange={(e) => setOrangeMerchantCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Numéro de téléphone récepteur :</label>
                <input
                  type="text"
                  value={orangePhone}
                  onChange={(e) => setOrangePhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Environnement :</label>
                <select
                  value={orangeMode}
                  onChange={(e) => setOrangeMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-bold"
                >
                  <option value="production">Mode Production (Réseau Orange Cameroun)</option>
                  <option value="test">Mode Test / Sandbox</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <div
                  onClick={() => setOrangeManualVerification(!orangeManualVerification)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Vérification manuelle obligatoire</span>
                      <span className="text-[10px] text-slate-500">Contrôle visuel du SMS Orange Money</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      orangeManualVerification ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        orangeManualVerification ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div
                  onClick={() => setOrangeAutoConfirmApi(!orangeAutoConfirmApi)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Confirmation automatique API</span>
                      <span className="text-[10px] text-slate-500">Validation temps réel Orange Money Web</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      orangeAutoConfirmApi ? 'bg-orange-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        orangeAutoConfirmApi ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la configuration Mobile Money</span>
          </button>
        </div>
      </div>
  );

  // 3. PAIEMENTS & MOBILE MONEY (Sections 20 & 21)
  if (subTab === 'paiements' || subTab === 'mobile_money') {

    const paymentMethodsList = [
      {
        key: 'pay_especes',
        label: 'Espèces (FCFA)',
        description: 'Paiements au comptant avec rendu de monnaie automatique',
        icon: Banknote,
      },
      {
        key: 'pay_cb',
        label: 'Carte Bancaire / TPE',
        description: 'Terminaux bancaires physiques Visa, Mastercard et GIMAC',
        icon: CreditCard,
      },
      {
        key: 'pay_mtn_momo',
        label: 'MTN Mobile Money',
        description: 'Paiements push USSD *126# et QR codes commerçant',
        icon: Smartphone,
      },
      {
        key: 'pay_orange_money',
        label: 'Orange Money',
        description: 'Règlements sécurisés via pass #150# et Max it Cameroun',
        icon: Smartphone,
      },
      {
        key: 'pay_virement',
        label: 'Virement Bancaire',
        description: 'Paiement direct sur le compte bancaire de l’entreprise',
        icon: Landmark,
      },
      {
        key: 'pay_cheque',
        label: 'Chèque Certifié',
        description: 'Encaissement de chèques d’entreprises avec n° de série',
        icon: FileSignature,
      },
      {
        key: 'pay_credit_client',
        label: 'Crédit Client / Compte',
        description: 'Mise en ardoise et facturation différée fin de mois',
        icon: Wallet,
      },
      {
        key: 'pay_partiel',
        label: 'Paiement Partiel (Acomptes)',
        description: 'Multiples versements successifs sur une même commande',
        icon: Percent,
      },
      {
        key: 'pay_multiple',
        label: 'Paiement Mixte / Fractionné',
        description: 'Règlement d’une même table avec plusieurs moyens',
        icon: Coins,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Switcher Moyens d'encaissement / Mobile Money */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePaymentTab('methods')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePaymentTab === 'methods'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span>Moyens d'Encaissement Actifs</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePaymentTab('momo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePaymentTab === 'momo'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-orange-500" />
            <span>Comptes Marchands Mobile Money (MTN & Orange)</span>
          </button>
        </div>

        {activePaymentTab === 'methods' ? (
    
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400 flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Moyens d'Encaissement & de Paiement
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Section 20
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Activez ou désactivez chaque mode de règlement accepté en caisse et sur les terminaux mobiles
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Enregistré
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paymentMethodsList.map((m) => (
            <ModernRuleToggle
              key={m.key}
              id={m.key}
              label={m.label}
              description={m.description}
              icon={m.icon}
              checked={paymentMethods[m.key] ?? false}
              onChange={() =>
                setPaymentMethods((prev) => ({
                  ...prev,
                  [m.key]: !prev[m.key],
                }))
              }
            />
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les moyens de paiement</span>
          </button>
        </div>
      </div>
        ) : (
          renderMobileMoneyContent()
        )}
      </div>
    );
  }

  return null;
};
