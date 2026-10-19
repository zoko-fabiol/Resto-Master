import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { PaymentMethod, OrderItem } from '../../types/restaurant';
import { formatCurrency, formatDateTime, numberToFrenchWords, calculateCameroonTaxes } from '../../lib/utils';
import { MobileMoneyQr } from './MobileMoneyQr';
import { CameroonInvoiceA5 } from './CameroonInvoiceA5';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { printerService } from '../../services/printing/printerService';
import QRCode from 'qrcode';
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
  Users,
  CheckSquare,
  Square,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  orderId: string | null;
  onClose: () => void;
}

type SplitMode = 'global' | 'seats' | 'equal' | 'items' | 'custom';

export const PaymentModal: React.FC<PaymentModalProps> = ({ orderId, onClose }) => {
  const {
    orders,
    recordOrderPayment,
    settings,
    isFeatureEnabled,
    isRuleEnabled,
    peripherals,
    printerSettings,
  } = useRestaurant();
  const { showToast } = useToast();

  const isMomoEnabled = isFeatureEnabled('mobile_money_momo') && isFeatureEnabled('mobile_money_hub');
  const isOrangeEnabled = isFeatureEnabled('mobile_money_orange') && isFeatureEnabled('mobile_money_hub');
  const isCreditEnabled = isFeatureEnabled('client_credit_receivables');
  const isInvoiceA5Enabled = isFeatureEnabled('invoice_laser_a5');

  // Règles Opérationnelles
  const isSplitBillAllowed = isRuleEnabled('pos_split_bill', true);
  const isPartialPaymentAllowed = isRuleEnabled('pos_partial_payment', true);

  const targetOrder = orders.find((o) => o.id === orderId);

  // Split Modes
  const [splitMode, setSplitMode] = useState<SplitMode>('global');

  // Folio filtering
  const [selectedFolio, setSelectedFolio] = useState<'all' | 1 | 2>('all');

  // Couvert / Seat split state
  const [selectedSeatToPay, setSelectedSeatToPay] = useState<number>(1);
  const [includeSharedWithSeat, setIncludeSharedWithSeat] = useState<boolean>(true);

  // Equal split state
  const [guestCount, setGuestCount] = useState<number>(targetOrder?.guestCount || 2);
  const [partsToPay, setPartsToPay] = useState<number>(1);

  // Items split state (selected item IDs)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Distinct seats available in the order
  const seatsInOrder = useMemo(() => {
    if (!targetOrder) return [1];
    const s = new Set<number>();
    targetOrder.items.forEach((item) => {
      if (item.seatNumber && item.seatNumber > 0) s.add(item.seatNumber);
    });
    if (s.size === 0 && targetOrder.guestCount && targetOrder.guestCount > 1) {
      for (let i = 1; i <= targetOrder.guestCount; i++) s.add(i);
    } else if (s.size === 0) {
      s.add(1);
    }
    return Array.from(s).sort((a, b) => a - b);
  }, [targetOrder]);

  // Payment states
  const itemsForFolio = targetOrder
    ? selectedFolio === 'all'
      ? targetOrder.items
      : targetOrder.items.filter((i) => (i.folio || 1) === selectedFolio)
    : [];

  const folioSubtotal = itemsForFolio.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const folioTaxes = calculateCameroonTaxes(folioSubtotal, settings.taxRate);
  const folioTotal = folioTaxes.totalTtc;

  const currentOrderRemaining = targetOrder
    ? Math.max(0, targetOrder.total - (targetOrder.paidAmount || 0))
    : 0;

  // Fallback to order total if remaining balance is 0 or order is already fully paid
  const effectiveRemaining = currentOrderRemaining > 0 
    ? currentOrderRemaining 
    : (targetOrder?.total || 0);

  const remainingBalance = selectedFolio === 'all' ? effectiveRemaining : folioTotal;

  const defaultMethod: PaymentMethod = isOrangeEnabled
    ? 'orange_money'
    : isMomoEnabled
    ? 'mtn_momo'
    : 'especes';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [amountTendered, setAmountTendered] = useState<number>(remainingBalance);
  const [cashGiven, setCashGiven] = useState<number>(remainingBalance);
  const [recordedPaidAmount, setRecordedPaidAmount] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [companyBillingName, setCompanyBillingName] = useState('');
  const [companyBillingNiu, setCompanyBillingNiu] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [a5ModalOpen, setA5ModalOpen] = useState(false);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Synchronize amountTendered based on splitMode
  useEffect(() => {
    // CRITICAL: If payment is already done or modal is in success mode, NEVER overwrite amountTendered with 0!
    if (!targetOrder || isDone) return;

    if (splitMode === 'global') {
      const amt = selectedFolio === 'all' ? effectiveRemaining : folioTotal;
      setAmountTendered(amt);
      setCashGiven(amt);
    } else if (splitMode === 'seats') {
      const sItems = targetOrder.items.filter((i) => (i.seatNumber ?? 1) === selectedSeatToPay);
      const sSub = sItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const sharedItems = targetOrder.items.filter((i) => i.seatNumber === 0);
      const sharedSub = sharedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const sharedPart = includeSharedWithSeat && seatsInOrder.length > 0 ? sharedSub / seatsInOrder.length : 0;
      const combinedSub = sSub + sharedPart;
      const seatTax = Math.round((combinedSub * settings.taxRate) / 100);
      const seatTotal = Math.min(remainingBalance, Math.round(combinedSub + seatTax));
      setAmountTendered(seatTotal);
      setCashGiven(seatTotal);
    } else if (splitMode === 'equal') {
      const partPrice = Math.ceil(remainingBalance / Math.max(1, guestCount));
      const totalForParts = Math.min(remainingBalance, partPrice * partsToPay);
      setAmountTendered(totalForParts);
      setCashGiven(totalForParts);
    } else if (splitMode === 'items') {
      const chosenItems = targetOrder.items.filter((i) => selectedItemIds.includes(i.id));
      const sub = chosenItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const tax = Math.round((sub * settings.taxRate) / 100);
      const total = sub + tax;
      setAmountTendered(total);
      setCashGiven(total);
    }
  }, [
    isDone,
    splitMode,
    selectedFolio,
    selectedSeatToPay,
    includeSharedWithSeat,
    seatsInOrder,
    guestCount,
    partsToPay,
    selectedItemIds,
    remainingBalance,
    effectiveRemaining,
    folioTotal,
    targetOrder,
    settings.taxRate,
  ]);

  // Exact certified amount to display and certify on receipts
  const certifiedAmount = recordedPaidAmount > 0
    ? recordedPaidAmount
    : amountTendered > 0
    ? amountTendered
    : (targetOrder?.paidAmount || targetOrder?.total || 0);

  // Generate Digital Receipt QR Code when payment completes
  useEffect(() => {
    if (isDone && targetOrder) {
      const receiptPayload = JSON.stringify({
        resto: settings.name,
        niu: settings.niu,
        order: targetOrder.orderNumber,
        table: targetOrder.tableName,
        amount: certifiedAmount,
        currency: settings.currency,
        date: new Date().toISOString(),
      });
      QRCode.toDataURL(receiptPayload, { width: 160, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('[PaymentModal] Erreur génération QR code:', err));
    }
  }, [isDone, targetOrder, certifiedAmount, settings]);

  if (!targetOrder) return null;

  const changeDue = paymentMethod === 'especes' ? Math.max(0, cashGiven - amountTendered) : 0;

  const handleToggleItemSelect = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleConfirmPayment = async () => {
    if (amountTendered <= 0) {
      showToast({
        type: 'warning',
        title: 'Montant invalide',
        message: 'Veuillez spécifier un montant positif supérieur à zéro.',
      });
      return;
    }

    if (!isPartialPaymentAllowed && amountTendered < remainingBalance) {
      showToast({
        type: 'error',
        title: 'Paiement partiel non autorisé',
        message: 'La règle opérationnelle de caisse exige le paiement intégral de la note.',
      });
      return;
    }

    const finalAmount = amountTendered;
    setRecordedPaidAmount(finalAmount);

    let splitPrefix = '';
    if (splitMode === 'seats') {
      splitPrefix = `[Règlement Couvert ${selectedSeatToPay}] `;
    } else if (splitMode === 'equal') {
      splitPrefix = `[Partage ${partsToPay}/${guestCount} parts] `;
    } else if (splitMode === 'items') {
      splitPrefix = `[Règlement par articles (${selectedItemIds.length} art.)] `;
    }

    const finalNote = transactionRef
      ? `${splitPrefix}Réf Tx: ${transactionRef} ${paymentNote ? `(${paymentNote})` : ''}`
      : companyBillingName
      ? `${splitPrefix}Facturé à : ${companyBillingName} (NIU: ${companyBillingNiu}) ${paymentNote}`
      : `${splitPrefix}${paymentNote}`;

    await recordOrderPayment(targetOrder.id, finalAmount, paymentMethod, finalNote);

    // Hardware Printing Automation (ESC/POS & Drawer Kick)
    const cashPrinter = peripherals.find(
      (p) => p.active && (p.role === 'caisse' || p.isDefault || p.type === 'imprimante_ticket')
    );

    // 1. Auto Open Cash Drawer if Cash Payment
    if (printerSettings?.autoOpenCashDrawerOnCash && paymentMethod === 'especes') {
      printerService.openCashDrawer(cashPrinter).catch((err) => {
        console.error('[PaymentModal] Échec ouverture tiroir-caisse:', err);
        showToast('Avertissement : Le tiroir-caisse n\'a pas pu s\'ouvrir automatiquement.', 'warning');
      });
    }

    // 2. Auto Print Receipt if enabled in configuration
    if (printerSettings?.autoPrintReceiptOnPayment) {
      printerService
        .printCustomerReceipt(targetOrder, settings, cashPrinter, {
          cashGiven,
          changeDue,
          folio: selectedFolio === 'all' ? undefined : selectedFolio,
        })
        .catch((err) => {
          console.error('[PaymentModal] Échec impression ticket client:', err);
          showToast('Avertissement : L\'impression du ticket de caisse a rencontré un problème.', 'warning');
        });
    }

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
    });

    showToast({
      type: 'success',
      title: 'Paiement certifié',
      message: `${formatCurrency(finalAmount, settings.currency)} encaissés avec succès.`,
    });

    setIsDone(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                {isDone ? 'Encaissement Enregistré' : 'Règlement & Encaissement'}
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
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Split Mode Selector Tabs */}
              {isSplitBillAllowed ? (
                <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSplitMode('global')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      splitMode === 'global' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Tout / Folios
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('seats')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      splitMode === 'seats' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>Par Couvert</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('equal')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      splitMode === 'equal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Parts Égales</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('items')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                      splitMode === 'items' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Par Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      splitMode === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Montant Libre
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100/70 p-2.5 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-between border border-slate-200">
                  <span>Règlement de l'addition globale</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fractionnement désactivé</span>
                </div>
              )}

              {/* Mode: Seats / Par Couvert */}
              {splitMode === 'seats' && (
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sélectionner le Couvert à régler :</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {seatsInOrder.length === 0 ? (
                      <div className="text-xs text-slate-500 italic">Aucun couvert spécifique (commande globale).</div>
                    ) : (
                      seatsInOrder.map((seatNum) => {
                        const sItems = targetOrder.items.filter((i) => (i.seatNumber ?? 1) === seatNum);
                        const sSub = sItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                        return (
                          <button
                            key={seatNum}
                            type="button"
                            onClick={() => setSelectedSeatToPay(seatNum)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left border ${
                              selectedSeatToPay === seatNum
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                            }`}
                          >
                            <div>Couvert {seatNum}</div>
                            <div
                              className={`text-[10px] font-normal ${
                                selectedSeatToPay === seatNum ? 'text-amber-100' : 'text-slate-400'
                              }`}
                            >
                              {sItems.length} art. • {formatCurrency(sSub, settings.currency)}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Option: Include table shared items */}
                  {targetOrder.items.some((i) => i.seatNumber === 0) && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSharedWithSeat}
                        onChange={(e) => setIncludeSharedWithSeat(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span>Inclure une quote-part équitable des articles partagés (Table)</span>
                    </label>
                  )}

                  {/* Seat Pre-Bill Printing Action */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-amber-200/80">
                    <button
                      type="button"
                      onClick={async () => {
                        const printer = peripherals.find(
                          (p) => p.active && (p.role === 'caisse' || p.isDefault || p.type === 'imprimante_ticket')
                        );
                        await printerService.printSeatPreBill(targetOrder, selectedSeatToPay, settings, printer, {
                          includeShared: includeSharedWithSeat,
                        });
                        showToast({
                          type: 'success',
                          title: 'Pré-Addition Couvert Imprimée',
                          message: `Note thermique générée pour le Couvert ${selectedSeatToPay} (${formatCurrency(amountTendered, settings.currency)}).`,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors active:scale-98"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer Note Couvert {selectedSeatToPay}</span>
                    </button>
                    <span className="text-xs font-black text-amber-950">
                      À Régler : {formatCurrency(amountTendered, settings.currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Mode: Global / Folios */}
              {splitMode === 'global' && (
                <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Gestion des Folios (Norme HotelPro) :
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedFolio('all')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                        selectedFolio === 'all'
                          ? 'bg-indigo-700 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      Tout Régler
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFolio(1)}
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
                      onClick={() => setSelectedFolio(2)}
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
              )}

              {/* Mode: Equal Split */}
              {splitMode === 'equal' && (
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950">Nombre de convives à partager :</span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5, 6, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setGuestCount(n)}
                          className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                            guestCount === n
                              ? 'bg-amber-600 text-white'
                              : 'bg-white text-slate-700 border border-amber-200'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Part unitaire par personne :</div>
                      <div className="text-base font-black text-amber-900">
                        {formatCurrency(Math.ceil(remainingBalance / guestCount), settings.currency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <label className="text-[11px] text-slate-500 block mb-0.5">Parts à payer maintenant :</label>
                      <select
                        value={partsToPay}
                        onChange={(e) => setPartsToPay(Number(e.target.value))}
                        className="px-2 py-1 bg-amber-50 text-amber-950 font-bold text-xs rounded border border-amber-300"
                      >
                        {Array.from({ length: guestCount }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num} {num > 1 ? 'parts' : 'part'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode: Item-by-item split */}
              {splitMode === 'items' && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Sélectionnez les articles payés par ce client :</span>
                    <span className="text-slate-500 text-[11px]">
                      {selectedItemIds.length} sélectionné(s)
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                    {targetOrder.items.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItemSelect(item.id)}
                          className={`pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'bg-amber-100/70 border border-amber-300' : 'hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="text-xs font-bold text-slate-800">
                              {item.quantity}x {item.productName}
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-900">
                            {formatCurrency(item.quantity * item.unitPrice, settings.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Summary Box */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold">
                    Montant net à encaisser sur ce règlement
                  </div>
                  <div className="text-2xl font-black text-emerald-950 mt-0.5">
                    {formatCurrency(amountTendered, settings.currency)}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    Solde total restant : {formatCurrency(remainingBalance, settings.currency)}
                  </div>
                </div>

                {isInvoiceA5Enabled && (
                  <button
                    type="button"
                    onClick={() => setA5ModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shadow-xs transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Facture A5</span>
                  </button>
                )}
              </div>

              {/* Payment Methods Grid */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Orange Money */}
                  {isOrangeEnabled && (
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
                      <span>Orange Money</span>
                    </button>
                  )}

                  {/* MTN MoMo */}
                  {isMomoEnabled && (
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
                      <span>MTN MoMo</span>
                    </button>
                  )}

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

                  {/* Crédit Entreprise */}
                  {isCreditEnabled && (
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
                      <span>Crédit Société</span>
                    </button>
                  )}

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
                    <span>Virement</span>
                  </button>
                </div>
              </div>

              {/* Dynamic QR Code for Orange Money */}
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

              {/* Dynamic QR Code for MTN MoMo */}
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

              {/* Cash Tendered Calculator for Espèces */}
              {paymentMethod === 'especes' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Somme remise par le client :</span>
                    <div className="flex items-center gap-1">
                      {[1000, 2000, 5000, 10000, 20000].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setCashGiven(b)}
                          className="px-2 py-1 bg-white hover:bg-amber-50 text-[10px] font-bold text-slate-700 rounded border border-slate-200"
                        >
                          +{b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300 text-slate-900"
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

              {/* Manual Amount Adjustment */}
              {splitMode === 'custom' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Montant personnalisé à encaisser ({settings.currency}) :
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
              )}
            </div>
          ) : (
            /* Success & Printable Ticket Summary with Digital QR Code */
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Encaissement Validé avec Succès !</h4>
                <p className="text-xs text-slate-500">
                  Le règlement de <strong>{formatCurrency(certifiedAmount, settings.currency)}</strong> a été certifié.
                </p>
              </div>

              {/* Digital QR Receipt for Customer Smartphone */}
              {qrDataUrl && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-600" />
                      <span>Reçu Digital Client</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Le client peut scanner ce QR Code avec son smartphone pour consulter son ticket dématérialisé.
                    </p>
                  </div>
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR"
                    className="w-24 h-24 rounded-xl border border-slate-200 bg-white p-1 shrink-0"
                  />
                </div>
              )}

              {/* Legal French Words Formula */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-serif italic text-center">
                « Arrêtée la présente facture à la somme de : {numberToFrenchWords(certifiedAmount).toUpperCase()} FRANCS CFA. »
              </div>

              {/* Print Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setThermalModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <span>Ticket Thermique 80mm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setA5ModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all active:scale-98"
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

      {/* 80mm Thermal Receipt ESC/POS Modal & Print View */}
      {thermalModalOpen && (
        <ThermalReceiptModal
          order={targetOrder}
          settings={settings}
          paidAmount={certifiedAmount}
          paymentMethod={paymentMethod}
          cashGiven={cashGiven}
          changeDue={changeDue}
          folio={selectedFolio === 'all' ? undefined : selectedFolio}
          onClose={() => setThermalModalOpen(false)}
        />
      )}

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
