import React, { useEffect, useState } from 'react';
import { Order, RestaurantSettings, PaymentMethod } from '../../types/restaurant';
import { formatCurrency, formatDateTime, numberToFrenchWords, calculateCameroonTaxes } from '../../lib/utils';
import { Printer, X, QrCode, Usb, DollarSign } from 'lucide-react';
import QRCode from 'qrcode';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { printerService } from '../../services/printing/printerService';

interface ThermalReceiptModalProps {
  order: Order;
  settings: RestaurantSettings;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  cashGiven?: number;
  changeDue?: number;
  folio?: number;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  settings,
  paidAmount,
  paymentMethod,
  cashGiven = 0,
  changeDue = 0,
  folio,
  onClose,
}) => {
  const { peripherals, isFeatureEnabled, isRuleEnabled } = useRestaurant();
  const { showToast, playAudioChime } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSendingToHardware, setIsSendingToHardware] = useState(false);

  // Règles Opérationnelles d'impression
  const showTicketNumber = isRuleEnabled('pos_show_ticket_number', true);
  const showServer = isRuleEnabled('pos_show_server', true);
  const showOrderTime = isRuleEnabled('pos_show_order_time', true);

  const activeCashPrinter = peripherals.find(
    (p) => p.active && (p.role === 'caisse' || p.isDefault || p.type === 'imprimante_ticket')
  );

  // Items to print
  const itemsToPrint = folio
    ? order.items.filter((i) => (i.folio || 1) === folio)
    : order.items;

  // Subtotals and taxes
  const subtotalHt = itemsToPrint.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxes = calculateCameroonTaxes(subtotalHt, settings.taxRate);

  // Exact amount paid / total
  const finalTotal = paidAmount > 0 ? paidAmount : taxes.totalTtc;
  const totalInLetters = numberToFrenchWords(finalTotal).toUpperCase();

  // Payment method human-readable label
  const methodLabels: Record<PaymentMethod, string> = {
    especes: 'ESPÈCES (CASH)',
    orange_money: 'ORANGE MONEY CAMEROUN',
    mtn_momo: 'MTN MOMO CAMEROUN',
    carte: 'CARTE BANCAIRE',
    virement: 'VIREMENT BANCAIRE',
    credit_entreprise: 'CRÉDIT SOCIÉTÉ / COMPTE ENTREPRISE',
    mobile_money: 'MOBILE MONEY',
    autre: 'AUTRE MODE DE RÈGLEMENT',
  };

  useEffect(() => {
    const payload = JSON.stringify({
      resto: settings.name,
      niu: settings.niu,
      order: order.orderNumber,
      table: order.tableName,
      total: finalTotal,
      currency: settings.currency,
      date: new Date().toISOString(),
    });
    QRCode.toDataURL(payload, { width: 130, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [order, settings, finalTotal]);

  const handlePrintSystem = () => {
    window.print();
  };

  const handlePrintHardware = async () => {
    setIsSendingToHardware(true);
    playAudioChime();

    try {
      const res = await printerService.printCustomerReceipt(
        order,
        settings,
        activeCashPrinter,
        { cashGiven, changeDue, folio }
      );

      playAudioChime('kitchen');
      showToast({
        type: 'success',
        title: 'Impression Matérielle POS',
        message: res.message,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Erreur Imprimante Matérielle',
        message: err.message || 'Impossible d\'envoyer le flux à l\'imprimante.',
      });
    } finally {
      setIsSendingToHardware(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Controls (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aperçu Ticket Thermique (80mm)</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {order.orderNumber} • {activeCashPrinter ? activeCashPrinter.name : 'Imprimante Système'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeCashPrinter && (
              <button
                onClick={handlePrintHardware}
                disabled={isSendingToHardware}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                title="Envoi direct binaire ESC/POS vers l'imprimante thermique"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>{isSendingToHardware ? 'Envoi...' : 'ESC/POS'}</span>
              </button>
            )}
            <button
              onClick={handlePrintSystem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview (Printable Area) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center custom-scrollbar">
          <div
            id="thermal-receipt-80mm"
            className="w-[300px] bg-white p-5 shadow-md border border-slate-300 font-mono text-[11px] leading-tight text-slate-900"
          >
            {/* Header / Restaurant Info */}
            <div className="text-center space-y-1">
              <div className="font-black text-sm uppercase tracking-wider">{settings.name}</div>
              {settings.slogan && <div className="text-[10px] italic">{settings.slogan}</div>}
              <div className="text-[10px]">{settings.address} - {settings.city?.toUpperCase() || 'YAOUNDE'}</div>
              <div className="text-[10px]">Tél : {settings.phone}</div>
              <div className="text-[10px] font-bold border-y border-dashed border-slate-400 py-1 my-1">
                NIU : {settings.niu || 'M012012345678A'} • RCCM : {settings.rccm || 'RC/YAO/2024/B/1894'}
              </div>
            </div>

            {/* Ticket Metadata */}
            <div className="my-2 space-y-0.5 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>TICKET DE CAISSE</span>
                {showTicketNumber && <span>N° {order.orderNumber}</span>}
              </div>
              {showOrderTime && (
                <div className="flex justify-between text-slate-600">
                  <span>Date : {formatDateTime(order.createdAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Table : <strong>{order.tableName || 'Comptoir'}</strong></span>
                {order.guestCount ? <span>{order.guestCount} couverts</span> : null}
              </div>
              <div className="flex justify-between">
                {showServer ? <span>Serveur : {order.serverName}</span> : <span>Caisse : POS-01</span>}
                {showServer && <span>Caisse : POS-01</span>}
              </div>
              {order.customerName && (
                <div className="flex justify-between text-[10px] font-semibold text-slate-700">
                  <span>Client : {order.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-900 my-2"></div>

            {/* Items Table */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-[10px] uppercase border-b border-slate-200 pb-0.5">
                <span>Désignation</span>
                <span>Total</span>
              </div>

              {itemsToPrint.map((item) => {
                const itemTotal = item.unitPrice * item.quantity;
                return (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <span className="font-bold">{item.quantity}x </span>
                        {item.seatNumber !== undefined && item.seatNumber > 0 && (
                          <span className="font-bold text-[9px]">[C{item.seatNumber}] </span>
                        )}
                        <span>{item.productName}</span>
                      </div>
                      <div className="font-bold shrink-0">{formatCurrency(itemTotal)}</div>
                    </div>
                    {item.notes && (
                      <div className="text-[9px] italic text-slate-500 pl-4">
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-900 my-2"></div>

            {/* Subtotal, TVA, Net */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-700">
                <span>Sous-Total HT :</span>
                <span>{formatCurrency(taxes.subtotalHt)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>TVA (19.25%) :</span>
                <span>{formatCurrency(taxes.combinedTax)}</span>
              </div>

              <div className="flex justify-between font-black text-sm border-t-2 border-b-2 border-slate-900 py-1.5 my-1">
                <span>TOTAL TTC :</span>
                <span>{formatCurrency(finalTotal, settings.currency)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="my-2 p-2 bg-slate-50 rounded border border-slate-200 space-y-1 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>RÈGLEMENT :</span>
                <span>{methodLabels[paymentMethod] || paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant Réglé :</span>
                <span className="font-black">{formatCurrency(finalTotal, settings.currency)}</span>
              </div>
              {paymentMethod === 'especes' && cashGiven > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Espèces Reçues :</span>
                    <span>{formatCurrency(cashGiven, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Monnaie Rendue :</span>
                    <span>{formatCurrency(changeDue, settings.currency)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Words formula */}
            <div className="text-[9px] italic text-center text-slate-700 my-2 px-1">
              « Arrêté le présent reçu à la somme de : {totalInLetters} FRANCS CFA. »
            </div>

            {/* Digital QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center my-3 text-center">
                <img src={qrDataUrl} alt="QR Reçu" className="w-24 h-24 border border-slate-300 p-1 bg-white" />
                <span className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">
                  Scannez pour Reçu Numérique Sécurisé
                </span>
              </div>
            )}

            {/* Footer message */}
            <div className="text-center text-[10px] space-y-0.5 border-t border-dashed border-slate-400 pt-2 text-slate-600">
              <div className="font-bold">*** MERCI DE VOTRE VISITE ! ***</div>
              <div>BON APPÉTIT & À TRÈS BIENTÔT</div>
              <div className="text-[8px] text-slate-400 mt-1">Logiciel certifié RestoMaster OS Cameroun</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
          >
            Fermer
          </button>
          {activeCashPrinter && (
            <button
              onClick={handlePrintHardware}
              disabled={isSendingToHardware}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
            >
              <Usb className="w-4 h-4 text-emerald-200" />
              <span>{isSendingToHardware ? 'Envoi...' : `Imprimer sur ${activeCashPrinter.name}`}</span>
            </button>
          )}
          <button
            onClick={handlePrintSystem}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimer (Système Windows)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
