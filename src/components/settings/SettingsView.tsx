import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { RestaurantSettings } from '../../types/restaurant';
import {
  Settings,
  Save,
  RotateCcw,
  Building,
  Coins,
  Percent,
  Layers,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Upload,
  QrCode,
  FileCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useRestaurant();
  const { showToast } = useToast();
  const confirm = useConfirm();

  // General Identity
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);

  // Legal & Cameroon Tax fields
  const [niu, setNiu] = useState(settings.niu || '');
  const [rccm, setRccm] = useState(settings.rccm || '');
  const [bp, setBp] = useState(settings.bp || '');
  const [city, setCity] = useState(settings.city || '');
  const [taxCenter, setTaxCenter] = useState(settings.taxCenter || '');

  // Currency & Tax
  const [currency, setCurrency] = useState(settings.currency);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [enableStockAutoDeduction, setEnableStockAutoDeduction] = useState(settings.enableStockAutoDeduction);

  // Mobile Money settings
  const [orangeMoneyMerchantCode, setOrangeMoneyMerchantCode] = useState(settings.orangeMoneyMerchantCode || '');
  const [orangeMoneyPhone, setOrangeMoneyPhone] = useState(settings.orangeMoneyPhone || '');
  const [orangeMaxItQrUrl, setOrangeMaxItQrUrl] = useState(settings.orangeMaxItQrUrl || '');

  const [mtnMoMoMerchantCode, setMtnMoMoMerchantCode] = useState(settings.mtnMoMoMerchantCode || '');
  const [mtnMoMoPhone, setMtnMoMoPhone] = useState(settings.mtnMoMoPhone || '');
  const [mtnMoMoQrUrl, setMtnMoMoQrUrl] = useState(settings.mtnMoMoQrUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const orangeFileRef = useRef<HTMLInputElement>(null);
  const momoFileRef = useRef<HTMLInputElement>(null);

  const handleOrangeQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOrangeMaxItQrUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMomoQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMtnMoMoQrUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      name,
      slogan,
      address,
      phone,
      email,
      currency,
      taxRate,
      enableStockAutoDeduction,
      niu,
      rccm,
      bp,
      city,
      taxCenter,
      orangeMoneyMerchantCode,
      orangeMoneyPhone,
      orangeMaxItQrUrl,
      mtnMoMoMerchantCode,
      mtnMoMoPhone,
      mtnMoMoQrUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-600" />
            Paramètres Généraux du Restaurant (Normes Camerounaises)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mentions légales CGI/OHADA, Mobile Money Orange (Max it) & MTN MoMo, fiscalité TVA 19,25%
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Paramètres enregistrés avec succès</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Restaurant Identity & Mentions Légales Cameroun */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-amber-500" />
            Identité de l'Établissement & Mentions Fiscales (CGI / OHADA)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nom Commercial du Restaurant *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Slogan ou Sous-titre</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Numéro Contribuable (NIU) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: M012012345678A"
                value={niu}
                onChange={(e) => setNiu(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Registre de Commerce (RCCM) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: RC/YAO/2024/B/1894"
                value={rccm}
                onChange={(e) => setRccm(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Centre des Impôts
              </label>
              <input
                type="text"
                placeholder="Ex: CIME Yaoundé 1"
                value={taxCenter}
                onChange={(e) => setTaxCenter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Adresse physique (Quartier, Boulevard)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Boîte Postale & Ville</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="BP 3626"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-1/2 px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="Yaoundé"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-1/2 px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Paramètres Mobile Money & QR Codes (Orange Money / Max it & MTN MoMo) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Smartphone className="w-4 h-4 text-orange-500" />
            Paramètres Mobile Money Cameroun (Orange Money & MTN MoMo)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orange Money Column */}
            <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  Orange Money Cameroun (#150#)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  Max it Supporté
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Code Marchand Orange Money (Paiement Marchand)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 784123"
                  value={orangeMoneyMerchantCode}
                  onChange={(e) => setOrangeMoneyMerchantCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-orange-300 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Numéro de Téléphone Direct (Dépôt Orange Money)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 699887766"
                  value={orangeMoneyPhone}
                  onChange={(e) => setOrangeMoneyPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-orange-300 bg-white"
                />
              </div>

              {/* Upload or Preview Custom Max it QR Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Importer QR Code Officiel Max it (Optionnel)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => orangeFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-orange-300 hover:bg-orange-100 text-orange-800 text-xs font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir fichier QR</span>
                  </button>
                  {orangeMaxItQrUrl && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> QR Actif
                    </span>
                  )}
                  <input
                    ref={orangeFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleOrangeQrUpload}
                  />
                </div>
              </div>
            </div>

            {/* MTN MoMo Column */}
            <div className="p-4 rounded-xl border border-yellow-300 bg-yellow-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-yellow-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  MTN Mobile Money Cameroun (*126#)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                  MoMo Pay
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Code Marchand MoMo Pay
                </label>
                <input
                  type="text"
                  placeholder="Ex: 456789"
                  value={mtnMoMoMerchantCode}
                  onChange={(e) => setMtnMoMoMerchantCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-yellow-300 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Numéro de Téléphone Direct (Dépôt MTN MoMo)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 677112233"
                  value={mtnMoMoPhone}
                  onChange={(e) => setMtnMoMoPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-yellow-300 bg-white"
                />
              </div>

              {/* Upload or Preview Custom MoMo QR Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Importer QR Code Officiel MoMo (Optionnel)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => momoFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-yellow-300 hover:bg-yellow-100 text-yellow-900 text-xs font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir fichier QR</span>
                  </button>
                  {mtnMoMoQrUrl && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> QR Actif
                    </span>
                  )}
                  <input
                    ref={momoFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMomoQrUpload}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Financial Rules */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Coins className="w-4 h-4 text-emerald-500" />
            Devise & Fiscalité Légale Cameroun
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Devise Principale</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as RestaurantSettings['currency'])}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              >
                <option value="FCFA">FCFA (Franc CFA BEAC - XAF)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="USD">USD ($ Dollar Américain)</option>
                <option value="CAD">CAD ($ Dollar Canadien)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Taux de TVA Cameroun (%) [17,50% TVA + 1,75% CAC]
              </label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard officiel du Code Général des Impôts Camerounais : 19,25%
              </span>
            </div>
          </div>
        </div>

        {/* Stock & Operational Automations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-indigo-500" />
            Automatisations Métier
          </h3>

          <div
            onClick={() => setEnableStockAutoDeduction(!enableStockAutoDeduction)}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 shadow-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Déduction automatique des stocks lors de la commande
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Consomme automatiquement les ingrédients des fiches techniques lors de la vente
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                enableStockAutoDeduction ? 'bg-amber-500 shadow-sm shadow-amber-500/30' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  enableStockAutoDeduction ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer la Configuration Camerounaise</span>
          </button>
        </div>
      </form>

    </div>
  );
};
