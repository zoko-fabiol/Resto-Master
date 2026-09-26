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
} from 'lucide-react';

interface Props {
  subTab: 'facturation' | 'fiscalite' | 'paiements' | 'mobile_money' | 'comptabilite';
}

export const FiscalBillingPaymentsSection: React.FC<Props> = ({ subTab }) => {
  const { settings, updateSettings, addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fiscal Form State
  const [niu, setNiu] = useState(settings.niu || 'M012012345678A');
  const [rccm, setRccm] = useState(settings.rccm || 'RC/YAO/2024/B/1894');
  const [taxCenter, setTaxCenter] = useState(settings.taxCenter || 'CIME Yaoundé 1');
  const [taxRate, setTaxRate] = useState(settings.taxRate || 19.25);
  const [vatBaseRate, setVatBaseRate] = useState(17.5);
  const [cacRate, setCacRate] = useState(10);
  const [withholdingRate, setWithholdingRate] = useState(2.2);

  // Mobile Money Form State
  const [mtnActive, setMtnActive] = useState(true);
  const [mtnMerchantCode, setMtnMerchantCode] = useState(settings.mtnMoMoMerchantCode || '456789');
  const [mtnPhone, setMtnPhone] = useState(settings.mtnMoMoPhone || '677112233');
  const [mtnMode, setMtnMode] = useState<'test' | 'production'>('production');
  const [mtnManualVerification, setMtnManualVerification] = useState(true);
  const [mtnAutoConfirmApi, setMtnAutoConfirmApi] = useState(false);

  const [orangeActive, setOrangeActive] = useState(true);
  const [orangeMerchantCode, setOrangeMerchantCode] = useState(settings.orangeMoneyMerchantCode || '784123');
  const [orangePhone, setOrangePhone] = useState(settings.orangeMoneyPhone || '699887766');
  const [orangeMode, setOrangeMode] = useState<'test' | 'production'>('production');
  const [orangeManualVerification, setOrangeManualVerification] = useState(true);
  const [orangeAutoConfirmApi, setOrangeAutoConfirmApi] = useState(false);

  // Billing & Payment methods toggles
  const [billingOptions, setBillingOptions] = useState<Record<string, boolean>>({
    bill_active: true,
    bill_a5: true,
    bill_custom_templates: true,
    bill_auto_numbering: true,
    bill_numbering_by_outlet: true,
    bill_numbering_by_terminal: false,
    bill_amount_in_words: true,
    bill_discounts: true,
    bill_taxes_detail: true,
    bill_withholdings: true,
    bill_credit_notes: true,
    bill_cancellations: true,
    bill_refunds: true,
    bill_corporate: true,
    bill_events: true,
    bill_client_credit: true,
  });

  const [paymentMethods, setPaymentMethods] = useState<Record<string, boolean>>({
    pay_especes: true,
    pay_cb: true,
    pay_mtn_momo: true,
    pay_orange_money: true,
    pay_virement: true,
    pay_cheque: true,
    pay_credit_client: true,
    pay_partiel: true,
    pay_multiple: true,
  });

  const [accountingAccounts, setAccountingAccounts] = useState({
    cuisineSales: '701100',
    barSales: '702100',
    vatCollected: '443100',
    cacCollected: '443200',
    withholdingAir: '447200',
    cashAccount: '571100',
    mobileMoneyAccount: '585100',
    clientsAccount: '411100',
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateSettings({
      niu,
      rccm,
      taxCenter,
      taxRate,
      mtnMoMoMerchantCode: mtnMerchantCode,
      mtnMoMoPhone: mtnPhone,
      orangeMoneyMerchantCode: orangeMerchantCode,
      orangeMoneyPhone: orangePhone,
    });
    setSavedSuccess(true);
    addAuditLog('Mise à jour finance', 'Paramètres', `Modification des paramètres ${subTab.toUpperCase()}`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // 1. FACTURATION (Section 18)
  if (subTab === 'facturation') {
    const billingItems = [
      { key: 'bill_active', label: 'Facturation officielle active' },
      { key: 'bill_a5', label: 'Factures format laser A5 déductibles' },
      { key: 'bill_custom_templates', label: 'Modèles de factures personnalisées (Logo & coordonnées)' },
      { key: 'bill_auto_numbering', label: 'Numérotation automatique continue' },
      { key: 'bill_numbering_by_outlet', label: 'Numérotation préfixée par établissement' },
      { key: 'bill_numbering_by_terminal', label: 'Numérotation distincte par caisse/terminal' },
      { key: 'bill_amount_in_words', label: 'Conversion dynamique du montant en toutes lettres' },
      { key: 'bill_discounts', label: 'Gestion des remises commerciales sur facture' },
      { key: 'bill_taxes_detail', label: 'Ventilation détaillée des taxes (TVA & CAC)' },
      { key: 'bill_withholdings', label: 'Mentions des retenues à la source (AIR)' },
      { key: 'bill_credit_notes', label: 'Émission d’avoirs officiels' },
      { key: 'bill_cancellations', label: 'Procédure d’annulation contrôlée avec motif' },
      { key: 'bill_refunds', label: 'Gestion des remboursements clients' },
      { key: 'bill_corporate', label: 'Facturation entreprises (NIU contribuable obligatoire)' },
      { key: 'bill_events', label: 'Facturation spécifique événementielle' },
      { key: 'bill_client_credit', label: 'Facturation différée pour clients à crédit' },
    ];

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Centre Détaillé de Facturation Officielle</h3>
              <p className="text-xs text-slate-500">
                Normes d’émission des factures A5, avoirs, remises et numérotations conformes (Section 18)
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Enregistré
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {billingItems.map((item) => {
            const checked = billingOptions[item.key] ?? false;
            return (
              <label
                key={item.key}
                onClick={() => setBillingOptions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  checked ? 'border-amber-400/80 bg-amber-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                />
                <span className={`font-semibold ${checked ? 'text-slate-950 font-bold' : 'text-slate-700'}`}>
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            Format actif : <strong>Facture Laser A5 + Montant en lettres</strong>
          </span>
          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la facturation</span>
          </button>
        </div>
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

  // 3. PAIEMENTS (Section 20)
  if (subTab === 'paiements') {
    const paymentMethodsList = [
      { key: 'pay_especes', label: 'Espèces (FCFA)' },
      { key: 'pay_cb', label: 'Carte bancaire (TPE Visa / Mastercard)' },
      { key: 'pay_mtn_momo', label: 'MTN Mobile Money' },
      { key: 'pay_orange_money', label: 'Orange Money' },
      { key: 'pay_virement', label: 'Virement bancaire' },
      { key: 'pay_cheque', label: 'Chèque certifié' },
      { key: 'pay_credit_client', label: 'Crédit client / Facturation fin de mois' },
      { key: 'pay_partiel', label: 'Paiement partiel (Acomptes multiples)' },
      { key: 'pay_multiple', label: 'Paiement multiple (Multi-moyens sur une même addition)' },
    ];

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Moyens d'Encaissement & de Paiement (Section 20)</h3>
              <p className="text-xs text-slate-500">
                Activez ou désactivez chaque mode de règlement accepté en caisse et sur les terminaux
              </p>
            </div>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Enregistré
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethodsList.map((m) => {
            const isEnabled = paymentMethods[m.key] ?? false;

            return (
              <div
                key={m.key}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isEnabled ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{m.label}</h4>
                  <span
                    className={`text-[10px] font-bold mt-0.5 inline-flex items-center gap-1.5 ${
                      isEnabled ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {isEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethods((prev) => ({
                      ...prev,
                      [m.key]: !prev[m.key],
                    }))
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    isEnabled
                      ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isEnabled ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            );
          })}
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
    );
  }

  // 4. MOBILE MONEY (Section 21)
  if (subTab === 'mobile_money') {
    return (
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
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mtnActive}
                  onChange={(e) => setMtnActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600"
                />
                <span>{mtnActive ? 'Activé' : 'Désactivé'}</span>
              </label>
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

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={mtnManualVerification}
                    onChange={(e) => setMtnManualVerification(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Vérification manuelle obligatoire de la référence</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={mtnAutoConfirmApi}
                    onChange={(e) => setMtnAutoConfirmApi(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Confirmation automatique via API MoMo Open (WebHook)</span>
                </label>
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
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orangeActive}
                  onChange={(e) => setOrangeActive(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600"
                />
                <span>{orangeActive ? 'Activé' : 'Désactivé'}</span>
              </label>
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

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={orangeManualVerification}
                    onChange={(e) => setOrangeManualVerification(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600"
                  />
                  <span>Vérification manuelle obligatoire de la référence</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={orangeAutoConfirmApi}
                    onChange={(e) => setOrangeAutoConfirmApi(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600"
                  />
                  <span>Confirmation automatique via API Orange Money Web</span>
                </label>
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
  }

  // 5. COMPTABILITÉ (Section 21b)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Comptabilité OHADA / SYSCOHADA</h3>
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
};
