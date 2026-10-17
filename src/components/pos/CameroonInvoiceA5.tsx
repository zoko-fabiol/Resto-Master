import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, RestaurantSettings } from '../../types/restaurant';
import { formatCurrency, formatDateTime, numberToFrenchWords, calculateCameroonTaxes } from '../../lib/utils';
import { Printer, X, Download } from 'lucide-react';

interface CameroonInvoiceA5Props {
  order: Order;
  settings: RestaurantSettings;
  folio?: number; // 1: Entreprise, 2: Extra, undefined: Tout
  onClose: () => void;
}

export const CameroonInvoiceA5: React.FC<CameroonInvoiceA5Props> = ({
  order,
  settings,
  folio,
  onClose,
}) => {
  const { isRuleEnabled } = useRestaurant();

  // Filter items by folio if requested
  const itemsToPrint = folio
    ? order.items.filter((i) => (i.folio || 1) === folio)
    : order.items;

  const subtotalHt = itemsToPrint.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxes = calculateCameroonTaxes(subtotalHt, settings.taxRate);
  const totalInLetters = numberToFrenchWords(taxes.totalTtc).toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Top Controls (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>Facture Formelle Norme Camerounaise (A5 Laser)</span>
            {folio && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                {folio === 1 ? 'Folio 1 : Prise en charge Société' : 'Folio 2 : Extras Personnels'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer Format A5</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A5 Invoice Sheet */}
        <div className="p-8 overflow-y-auto flex-1 font-serif text-slate-900 bg-white" id="cameroon-invoice-sheet">
          {/* Header Row */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider font-sans text-slate-900">
                {settings.name}
              </h1>
              <div className="text-xs text-slate-700 mt-1 font-sans space-y-0.5">
                <div>{settings.slogan}</div>
                <div>{settings.address} — {settings.bp} {settings.city?.toUpperCase() || 'YAOUNDE'} - CAMEROUN</div>
                <div>Tél : {settings.phone} • Email : {settings.email}</div>
                <div className="font-bold text-[11px] text-slate-900">
                  NIU : {settings.niu || 'M012012345678A'} • RCCM : {settings.rccm || 'RC/YAO/2024/B/1894'}
                </div>
              </div>
            </div>

            <div className="text-right text-xs font-sans">
              <div className="font-black text-sm uppercase text-slate-900">FACTURE CLIENT</div>
              <div className="font-bold font-mono text-slate-800 mt-0.5">N° {order.orderNumber}</div>
              <div className="text-slate-500 mt-1">Date : {order.createdAt.slice(0, 10)}</div>
              <div className="text-slate-500">Heure : {order.createdAt.slice(11, 16)}</div>
            </div>
          </div>

          {/* Client & Table Metadata Box */}
          <div className="my-4 p-3 border border-slate-300 rounded-lg bg-slate-50/60 font-sans grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Doit :</div>
              <div className="font-bold text-sm text-slate-900">
                {order.companyBillingName || order.customerName || 'CLIENT AU COMPTANT'}
              </div>
              {order.companyBillingNiu && (
                <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                  NIU Client : {order.companyBillingNiu}
                </div>
              )}
            </div>

            <div className="text-right">
              <div>
                Table / Emplacement : <strong>{order.tableName || 'À emporter'}</strong>
              </div>
              <div>
                Serveur / Opérateur : <strong>{order.serverName}</strong>
              </div>
              {folio && (
                <div className="font-bold text-indigo-700 mt-0.5">
                  Ventilation : Folio {folio} ({folio === 1 ? 'Entreprise' : 'Extra personnel'})
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse text-xs font-sans mt-4">
            <thead>
              <tr className="border-y-2 border-slate-900 bg-slate-100 text-[11px] uppercase font-bold">
                <th className="py-2 px-2">Désignation des Prestations</th>
                <th className="py-2 px-2 text-center w-16">Qté</th>
                <th className="py-2 px-2 text-right w-28">Prix Unit. HT</th>
                <th className="py-2 px-2 text-right w-32">Montant HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itemsToPrint.map((item) => (
                <tr key={item.id} className="py-1.5">
                  <td className="py-2 px-2 font-medium">
                    {item.productName}
                    {item.notes && <span className="text-[10px] text-slate-500 italic block">({item.notes})</span>}
                  </td>
                  <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                  <td className="py-2 px-2 text-right">
                    {formatCurrency(item.unitPrice, settings.currency)}
                  </td>
                  <td className="py-2 px-2 text-right font-bold">
                    {formatCurrency(item.quantity * item.unitPrice, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals & Cameroon Tax Summary */}
          <div className="mt-4 pt-3 border-t-2 border-slate-900 font-sans text-xs flex justify-end">
            <div className="w-72 space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Total Prestations HT :</span>
                <span className="font-semibold">{formatCurrency(taxes.subtotalHt, settings.currency)}</span>
              </div>
              {isRuleEnabled('bill_taxes_detail', true) ? (
                <>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>TVA (17,50%) :</span>
                    <span>{formatCurrency(taxes.tvaBase, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>CAC (10% de TVA = 1,75%) :</span>
                    <span>{formatCurrency(taxes.cacBase, settings.currency)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Taxes Fiscales (19,25%) :</span>
                  <span>{formatCurrency(taxes.tvaBase + taxes.cacBase, settings.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t-2 border-slate-900 pt-1 text-slate-950">
                <span>TOTAL TTC :</span>
                <span>{formatCurrency(taxes.totalTtc, settings.currency)}</span>
              </div>
            </div>
          </div>

          {/* Legal Formula in Words (OBLIGATOIRE AU CAMEROUN) */}
          {isRuleEnabled('bill_amount_in_words', true) && (
            <div className="mt-6 p-3 border border-slate-300 rounded-lg bg-slate-50 font-sans text-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Arrêté de la facture :</div>
              <div className="font-bold text-slate-900 mt-0.5 italic">
                « ARRETE LA PRESENTE FACTURE A LA SOMME DE : {totalInLetters} FRANCS CFA. »
              </div>
            </div>
          )}

          {/* Signatures & Stamps */}
          <div className="mt-8 grid grid-cols-2 gap-8 font-sans text-xs pt-4">
            <div className="text-center">
              <div className="font-bold text-slate-700">Le Client / Réceptionnaire</div>
              <div className="h-16 border-b border-dashed border-slate-300 mt-2"></div>
              <div className="text-[10px] text-slate-400 mt-1">Date et Signature précédée de la mention "Bon pour Accord"</div>
            </div>

            <div className="text-center">
              <div className="font-bold text-slate-700">La Caisse / Direction de l'Établissement</div>
              <div className="h-16 border-b border-dashed border-slate-300 mt-2 flex items-center justify-center text-[10px] text-slate-300 italic">
                Cachet et Signature
              </div>
              <div className="text-[10px] text-slate-400 mt-1">L'Oasis Gourmande - Caisse Centrale</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
