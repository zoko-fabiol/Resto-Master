import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { PaymentMethod } from '../../types/restaurant';
import { formatCurrency, formatDateTime, numberToFrenchWords, calculateCameroonTaxes } from '../../lib/utils';
import { MobileMoneyQr } from './MobileMoneyQr';
import { CameroonInvoiceA5 } from './CameroonInvoiceA5';
import {
  X,
  CreditCard,
  Coins,
  Smartphone,
  Building,
  CheckCircle2,
  Printer,
  Receipt,
  FileText,
  Sparkles,
  ArrowRight,
  Split,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  orderId: string | null;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, onClose }) => {
  const { orders, recordOrderPayment, settings } = useRestaurant();

  const targetOrder = orders.find((o) => o.id === orderId);

  // Folio filtering
  const [selectedFolio, setSelectedFolio] = useState<'all' | 1 | 2>('all');

  const itemsForFolio = targetOrder
    ? selectedFolio === 'all'
      ? targetOrder.items
      : targetOrder.items.filter((i) => (i.folio || 1) === selectedFolio)
    : [];

  const folioSubtotal = itemsForFolio.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const folioTaxes = calculateCameroonTaxes(folioSubtotal, settings.taxRate);
  const folioTotal = folioTaxes.totalTtc;

  const remainingBalance = targetOrder
    ? selectedFolio === 'all'
      ? Math.max(0, targetOrder.total - (targetOrder.paidAmount || 0))
      : folioTotal
    : 0;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange_money');
  const [amountTendered, setAmountTendered] = useState<number>(remainingBalance);
  const [cashGiven, setCashGiven] = useState<number>(remainingBalance);
  const [transactionRef, setTransactionRef] = useState('');
  const [companyBillingName, setCompanyBillingName] = useState('');
  const [companyBillingNiu, setCompanyBillingNiu] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [a5ModalOpen, setA5ModalOpen] = useState(false);

  if (!targetOrder) return null;

  const changeDue = paymentMethod === 'especes' ? Math.max(0, cashGiven - amountTendered) : 0;

  const handleConfirmPayment = async () => {
    if (amountTendered <= 0) {
      alert('Veuillez spécifier un montant valide.');
      return;
    }

    const finalNote = transactionRef
      ? `Réf Tx: ${transactionRef} ${paymentNote ? `(${paymentNote})` : ''}`
      : companyBillingName
      ? `Facturé à : ${companyBillingName} (NIU: ${companyBillingNiu}) ${paymentNote}`
      : paymentNote;

    await recordOrderPayment(targetOrder.id, amountTendered, paymentMethod, finalNote);

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
    });

    setIsDone(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                {isDone ? 'Encaissement Enregistré' : 'Règlement & Facturation (Norme Cameroun)'}
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                {targetOrder.orderNumber} • {targetOrder.tableName || 'À emporter'} • NIU : {settings.niu}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          {!isDone ? (
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Folio Splitting Selector (Norme HotelPro page 6 & 12) */}
              <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Split className="w-3.5 h-3.5 text-indigo-600" />
                    Gestion des Folios (Facture Société vs Extras) :
                  </span>
                  <span className="text-[10px] text-indigo-700 font-semibold">Norme HotelPro</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolio('all');
                      setAmountTendered(targetOrder.total - (targetOrder.paidAmount || 0));
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      selectedFolio === 'all'
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    Tout Régler ({formatCurrency(targetOrder.total, settings.currency)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolio(1);
                      setAmountTendered(folioTotal);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      selectedFolio === 1
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    Folio 1 : Société
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolio(2);
                      setAmountTendered(folioTotal);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      selectedFolio === 2
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    Folio 2 : Extras
                  </button>
                </div>
              </div>

              {/* Amount Summary Box */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold">
                    Montant net à payer {selectedFolio !== 'all' ? `(Folio ${selectedFolio})` : ''}
                  </div>
                  <div className="text-2xl font-black text-emerald-950 mt-0.5">
                    {formatCurrency(remainingBalance, settings.currency)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    Dont TVA (17,5%) + CAC (1,75%) = 19,25%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setA5ModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shadow-xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Aperçu Facture A5</span>
                </button>
              </div>

              {/* Payment Methods Grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Sélectionnez le mode de règlement :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Orange Money */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('orange_money')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'orange_money'
                        ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-orange-400" />
                    <span>Orange Money (Max it)</span>
                  </button>

                  {/* MTN MoMo */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mtn_momo')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'mtn_momo'
                        ? 'bg-yellow-500 text-slate-950 border-yellow-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-yellow-50/50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-yellow-600" />
                    <span>MTN MoMo (MoMo Pay)</span>
                  </button>

                  {/* Espèces */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('especes')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'especes'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Espèces FCFA</span>
                  </button>

                  {/* Carte Bancaire */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('carte')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'carte'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Carte Bancaire</span>
                  </button>

                  {/* Facturation Société / Crédit Entreprise */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_entreprise')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'credit_entreprise'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-4 h-4 text-indigo-400" />
                    <span>Crédit Entreprise</span>
                  </button>

                  {/* Virement Bancaire */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('virement')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${
                      paymentMethod === 'virement'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span>Virement (Afriland/BICEC)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code & USSD dialer for Orange Money */}
              {paymentMethod === 'orange_money' && (
                <MobileMoneyQr
                  provider="orange_money"
                  amount={amountTendered}
                  merchantCode={settings.orangeMoneyMerchantCode}
                  merchantPhone={settings.orangeMoneyPhone}
                  customQrUrl={settings.orangeMaxItQrUrl}
                  currency={settings.currency}
                  transactionRef={transactionRef}
                  setTransactionRef={setTransactionRef}
                />
              )}

              {/* Dynamic QR Code & USSD dialer for MTN MoMo */}
              {paymentMethod === 'mtn_momo' && (
                <MobileMoneyQr
                  provider="mtn_momo"
                  amount={amountTendered}
                  merchantCode={settings.mtnMoMoMerchantCode}
                  merchantPhone={settings.mtnMoMoPhone}
                  customQrUrl={settings.mtnMoMoQrUrl}
                  currency={settings.currency}
                  transactionRef={transactionRef}
                  setTransactionRef={setTransactionRef}
                />
              )}

              {/* Cash Tendered & Quick Cameroon Bills for Espèces */}
              {paymentMethod === 'especes' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Somme remise par le client :</span>
                    <div className="flex flex-wrap gap-1">
                      {[1000, 2000, 5000, 10000, 25000, 50000].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setCashGiven(quick)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                        >
                          {formatCurrency(quick, settings.currency)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-base font-black rounded-lg border border-slate-300 text-slate-900 bg-white"
                  />

                  {changeDue > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Monnaie à rendre au client :</span>
                      <span className="font-black text-base text-emerald-700">
                        {formatCurrency(changeDue, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Enterprise Billing Fields */}
              {paymentMethod === 'credit_entreprise' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Facturation Société & Convention Entreprise :
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Raison Sociale Entreprise *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: TOTAL ENERGIES CAMEROUN"
                        value={companyBillingName}
                        onChange={(e) => setCompanyBillingName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Numéro Contribuable (NIU) Entreprise
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: M0987654321A"
                        value={companyBillingNiu}
                        onChange={(e) => setCompanyBillingNiu(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount to Settle */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Montant imputé sur ce règlement ({settings.currency}) :
                </label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setAmountTendered(val);
                    if (paymentMethod === 'especes') setCashGiven(val);
                  }}
                  className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300 text-slate-900"
                />
              </div>
            </div>
          ) : (
            /* Success & Printable Ticket Summary */
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Encaissement Validé avec Succès !</h4>
                <p className="text-xs text-slate-500">
                  Le règlement de <strong>{formatCurrency(amountTendered, settings.currency)}</strong> a été enregistré et certifié.
                </p>
              </div>

              {/* Legal French Words Cameroon Formula */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-serif italic text-center">
                « Arrêtée la présente facture à la somme de : {numberToFrenchWords(amountTendered).toUpperCase()} FRANCS CFA. »
              </div>

              {/* Actions: Print Thermal 80mm or A5 Laser */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Ticket Thermique 80mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setA5ModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Facture Officielle A5</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            {!isDone ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <span>Confirmer Encaissement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cameroon A5 Laser Invoice Sheet Modal */}
      {a5ModalOpen && (
        <CameroonInvoiceA5
          order={targetOrder}
          settings={settings}
          folio={selectedFolio === 'all' ? undefined : selectedFolio}
          onClose={() => setA5ModalOpen(false)}
        />
      )}
    </>
  );
};
