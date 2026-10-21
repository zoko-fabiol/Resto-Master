import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { useRestaurant } from '../../context/RestaurantContext';
import { getOrangeMoneyUssdCode, getMtnMomoUssdCode, formatCurrency } from '../../lib/utils';
import {
  Smartphone,
  Copy,
  QrCode,
  Check,
  Upload,
  AlertCircle,
  Building2,
  PhoneCall,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface MobileMoneyQrProps {
  provider: 'orange_money' | 'mtn_momo';
  amount: number;
  merchantCode: string;
  merchantPhone: string;
  customQrUrl?: string;
  currency: string;
  transactionRef: string;
  setTransactionRef: (ref: string) => void;
}

export const MobileMoneyQr: React.FC<MobileMoneyQrProps> = ({
  provider,
  amount,
  merchantCode: initialMerchantCode,
  merchantPhone: initialMerchantPhone,
  customQrUrl: initialCustomQrUrl,
  currency,
  transactionRef,
  setTransactionRef,
}) => {
  const { updateSettings } = useRestaurant();

  // Mode selection:
  // 'merchant' = Code Marchand (ex: #150*14*CODE*MONTANT# ou *126*14*CODE*MONTANT#)
  // 'direct' = Dépôt / Transfert direct (ex: #150*1*1*TEL*MONTANT# ou *126*1*TEL*MONTANT#)
  // 'custom' = QR Code Officiel Max it / MoMo Pay importé
  const [activeMode, setActiveMode] = useState<'merchant' | 'direct' | 'custom'>('merchant');

  // Local editable values so cashier can change or test on the fly
  const [currentMerchantCode, setCurrentMerchantCode] = useState(initialMerchantCode || '');
  const [currentPhone, setCurrentPhone] = useState(initialMerchantPhone || '');
  const [customQrImage, setCustomQrImage] = useState<string>(initialCustomQrUrl || '');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [savedInSettings, setSavedInSettings] = useState(false);
  const [uriFormat, setUriFormat] = useState<'tel' | 'raw'>('tel');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOrange = provider === 'orange_money';
  const providerName = isOrange ? 'Orange Money Cameroun (Max it)' : 'MTN Mobile Money (MoMo Pay)';
  const brandShort = isOrange ? 'Max it' : 'MoMo Pay';
  const brandOrange = '#ea580c';
  const brandMtn = '#ca8a04';

  // Compute USSD information based on active mode
  const ussdInfo = isOrange
    ? getOrangeMoneyUssdCode(currentMerchantCode, currentPhone, amount, activeMode === 'merchant' ? 'merchant' : 'direct')
    : getMtnMomoUssdCode(currentMerchantCode, currentPhone, amount, activeMode === 'merchant' ? 'merchant' : 'direct');

  // Payload for the QR code:
  // tel: URI will automatically open phone call app on smartphone cameras (iPhone Camera, Android Google Lens, Samsung Camera)
  const qrPayload = uriFormat === 'tel' ? ussdInfo.dialUri : ussdInfo.code;

  // Generate QR Code data URL whenever payload or provider changes
  useEffect(() => {
    if (activeMode !== 'custom') {
      QRCode.toDataURL(qrPayload, {
        width: 250,
        margin: 2,
        color: {
          dark: isOrange ? '#ea580c' : '#854d0e',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [qrPayload, isOrange, activeMode]);

  // Handle uploading custom Max-it or MoMo QR Code
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomQrImage(result);
        setActiveMode('custom');
        // Automatically save to settings
        if (isOrange) {
          updateSettings({ orangeMaxItQrUrl: result });
        } else {
          updateSettings({ mtnMoMoQrUrl: result });
        }
        setSavedInSettings(true);
        setTimeout(() => setSavedInSettings(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Persist current settings (merchant code or phone)
  const handleSaveToSettings = () => {
    if (isOrange) {
      updateSettings({
        orangeMoneyMerchantCode: currentMerchantCode,
        orangeMoneyPhone: currentPhone,
        ...(customQrImage ? { orangeMaxItQrUrl: customQrImage } : {}),
      });
    } else {
      updateSettings({
        mtnMoMoMerchantCode: currentMerchantCode,
        mtnMoMoPhone: currentPhone,
        ...(customQrImage ? { mtnMoMoQrUrl: customQrImage } : {}),
      });
    }
    setSavedInSettings(true);
    setTimeout(() => setSavedInSettings(false), 3000);
  };

  const copyUssdToClipboard = () => {
    navigator.clipboard.writeText(ussdInfo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-3.5 text-xs bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
      {/* Header Operator Banner */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between ${
          isOrange
            ? 'bg-orange-500/10 border-orange-300 text-orange-950'
            : 'bg-yellow-500/10 border-yellow-300 text-yellow-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-white shadow-xs ${
              isOrange ? 'bg-orange-600' : 'bg-yellow-500 text-slate-950'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm">{providerName}</div>
            <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
              <span>{isOrange ? '#150#' : '*126#'}</span>
              <span>•</span>
              <span className="font-semibold text-slate-800">
                {activeMode === 'merchant'
                  ? `Code Marchand : ${currentMerchantCode || 'Non défini'}`
                  : activeMode === 'direct'
                  ? `Dépôt au : ${currentPhone || 'Non défini'}`
                  : `QR Officiel ${brandShort}`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-slate-500">Montant net</div>
          <span
            className={`text-xs font-black px-2.5 py-1 rounded-lg inline-block ${
              isOrange ? 'bg-orange-600 text-white' : 'bg-yellow-400 text-slate-950 font-black'
            }`}
          >
            {formatCurrency(amount, currency)}
          </span>
        </div>
      </div>

      {/* Mode Selector Tabs (User requirement: Code Marchand vs Numéro Dépôt vs Import QR Max-it) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveMode('merchant')}
          className={`py-2 px-2 rounded-lg font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeMode === 'merchant'
              ? isOrange
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-yellow-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Code Marchand</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('direct')}
          className={`py-2 px-2 rounded-lg font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeMode === 'direct'
              ? isOrange
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-yellow-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Dépôt / Numéro</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('custom')}
          className={`py-2 px-2 rounded-lg font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeMode === 'custom'
              ? isOrange
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-yellow-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>QR {brandShort}</span>
        </button>
      </div>

      {/* Editable Fields depending on active mode */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        {activeMode === 'merchant' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                Code Marchand {isOrange ? 'Orange Money' : 'MoMo Pay'} :
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Code marchand"
                  value={currentMerchantCode}
                  onChange={(e) => setCurrentMerchantCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:border-amber-500 bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveToSettings}
              className="sm:mt-4 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
              title="Mémoriser dans les paramètres du restaurant"
            >
              <Save className="w-3 h-3" />
              <span>Mémoriser</span>
            </button>
          </div>
        )}

        {activeMode === 'direct' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                Numéro direct pour le dépôt (9 chiffres) :
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: 6XXXXXXXX"
                  value={currentPhone}
                  onChange={(e) => setCurrentPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:border-amber-500 bg-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveToSettings}
              className="sm:mt-4 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
              title="Mémoriser dans les paramètres du restaurant"
            >
              <Save className="w-3 h-3" />
              <span>Mémoriser</span>
            </button>
          </div>
        )}

        {activeMode === 'custom' && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-800 text-[11px]">
                QR Code Marchand Officiel {isOrange ? 'Orange Max it' : 'MTN MoMo'}
              </div>
              <div className="text-[10px] text-slate-500">
                {customQrImage
                  ? 'QR code personnalisé actuellement chargé et prêt à être scanné.'
                  : `Importez l'image du QR Code délivré par ${isOrange ? 'Orange Cameroun' : 'MTN'}.`}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                  isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{customQrImage ? 'Remplacer' : 'Importer'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {savedInSettings && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-3 h-3" />
            <span>Mémorisé dans les paramètres du restaurant avec succès !</span>
          </div>
        )}
      </div>

      {/* Main QR Code & Dial Display Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        {/* QR Code Container */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className={`relative p-2.5 bg-white rounded-2xl border-2 shadow-md flex items-center justify-center ${
              isOrange ? 'border-orange-200' : 'border-yellow-200'
            }`}
          >
            {activeMode === 'custom' ? (
              customQrImage ? (
                <img
                  src={customQrImage}
                  alt={`QR Code ${brandShort}`}
                  className="w-48 h-48 object-contain rounded-xl"
                />
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center p-3 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                  <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700">Aucun QR importé</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Cliquez sur "Importer" ci-dessus pour charger votre QR Max it / MoMo.
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-[10px] font-bold text-orange-600 underline"
                  >
                    Choisir un fichier
                  </button>
                </div>
              )
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Paiement USSD"
                className="w-48 h-48 object-contain rounded-xl"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          <span className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1">
            <QrCode className="w-3 h-3" />
            {activeMode === 'custom' ? `Scan via ${brandShort}` : "Scan via l'appareil photo"}
          </span>
        </div>

        {/* Instructions & USSD Dial Trigger */}
        <div className="flex-1 space-y-2.5 text-slate-700 w-full">
          {/* Headline */}
          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Comment le client procède au règlement :</span>
          </div>

          {/* Stepper Guide */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong>Scanner avec l'appareil photo</strong> : le smartphone détecte l'action et propose d'ouvrir l'appel.
              </span>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong>L'application Appel s'ouvre</strong> avec le code complet et le montant de{' '}
                <strong className="text-slate-900">{formatCurrency(amount, currency)}</strong> pré-saisi.
              </span>
            </div>

            <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                Le client appuie sur <strong>Appel</strong> et compose son <strong>code PIN secret</strong> pour valider.
              </span>
            </div>
          </div>

          {/* USSD Box Display & Copy */}
          {activeMode !== 'custom' && (
            <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Code USSD généré automatiquement :</span>
                <span className="text-amber-400 font-mono text-[9px]">
                  {activeMode === 'merchant' ? 'Marchand' : 'Dépôt Direct'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs font-black tracking-wider text-amber-300">
                <span className="truncate select-all">{ussdInfo.code}</span>
                <button
                  type="button"
                  onClick={copyUssdToClipboard}
                  className="p-1 text-slate-300 hover:text-white transition-colors ml-1"
                  title="Copier le code USSD"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Direct Click to Call Link for Mobile Phones / Tablets */}
          {activeMode !== 'custom' && (
            <a
              href={ussdInfo.dialUri}
              className={`inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-extrabold text-xs shadow-xs transition-all ${
                isOrange ? 'bg-orange-600 hover:bg-orange-700' : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Lancer l'Appel sur ce téléphone (Composeur direct)</span>
            </a>
          )}
        </div>
      </div>

      {/* Transaction ID Verification Input (Cameroon Fiscal requirement) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Référence SMS / ID de Transaction reçu du client *</span>
        </label>
        <input
          type="text"
          required
          placeholder="Ex: MP260924.1530.C12345 ou OM-987654"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 text-slate-900 uppercase focus:border-amber-500"
        />
        <div className="text-[10px] text-slate-500 leading-tight">
          Norme camerounaise de traçabilité des recettes : la saisie du code SMS de confirmation garantit le rapprochement lors de la clôture de caisse.
        </div>
      </div>
    </div>
  );
};
