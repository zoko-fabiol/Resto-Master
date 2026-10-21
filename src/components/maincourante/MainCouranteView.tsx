import React, { useState } from 'react';
import { PageHeader, Button, TextInput } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const MainCouranteView: React.FC = () => {
  const { orders, settings } = useRestaurant();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Filter orders for the selected day
  const dayOrders = orders.filter((o) => o.createdAt.startsWith(selectedDate));

  // For each order, compute breakdowns into the HotelPro Cameroon standard categories:
  // PDJ, Déjeuner, Dîner, Bar, Cave, Autre
  const rows = dayOrders.map((ord) => {
    let pdj = 0;
    let dej = 0;
    let diner = 0;
    let bar = 0;
    let cave = 0;
    let divers = 0;

    ord.items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lowerName = item.productName.toLowerCase();

      if (lowerName.includes('petit déjeuner') || lowerName.includes('croissant') || lowerName.includes('café')) {
        pdj += lineTotal;
      } else if (lowerName.includes('vin') || lowerName.includes('rhum') || lowerName.includes('chivas') || lowerName.includes('whisky') || lowerName.includes('champagne')) {
        cave += lineTotal;
      } else if (item.destination === 'bar' || lowerName.includes('mojito') || lowerName.includes('cocktail') || lowerName.includes('eau') || lowerName.includes('bière') || lowerName.includes('33 export') || lowerName.includes('guinness')) {
        bar += lineTotal;
      } else {
        // Cuisine / Plats
        const hour = parseInt(ord.createdAt.slice(11, 13)) || 12;
        if (hour < 16) {
          dej += lineTotal;
        } else {
          diner += lineTotal;
        }
      }
    });

    const totalConsommations = ord.total;
    const totalPaye = ord.paidAmount || 0;
    const solde = totalConsommations - totalPaye;

    // Payment methods used
    const paymentMethodsList = ord.payments?.map((p) => p.method).join(', ') || (ord.status === 'payee' ? 'Encaissé' : 'Non réglé');

    return {
      order: ord,
      pdj,
      dej,
      diner,
      bar,
      cave,
      divers,
      totalConsommations,
      totalPaye,
      solde,
      paymentMethodsList,
    };
  });

  // Totals of all columns
  const sumPdj = rows.reduce((s, r) => s + r.pdj, 0);
  const sumDej = rows.reduce((s, r) => s + r.dej, 0);
  const sumDiner = rows.reduce((s, r) => s + r.diner, 0);
  const sumBar = rows.reduce((s, r) => s + r.bar, 0);
  const sumCave = rows.reduce((s, r) => s + r.cave, 0);
  const sumTotalConsommations = rows.reduce((s, r) => s + r.totalConsommations, 0);
  const sumTotalPaye = rows.reduce((s, r) => s + r.totalPaye, 0);
  const sumSoldeDebiteur = rows.reduce((s, r) => s + Math.max(0, r.solde), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      'N° Commande',
      'Table/Emplacement',
      'Heure',
      'Serveur',
      'Client',
      'PDJ',
      'Déjeuner',
      'Dîner',
      'Bar',
      'Cave',
      'Total Consommé TTC',
      'Total Réglé',
      'Solde Débiteur',
      'Moyens Paiement',
    ];

    const csvRows = rows.map((r) => [
      r.order.orderNumber,
      r.order.tableName || 'A emporter',
      r.order.createdAt.slice(11, 16),
      r.order.serverName,
      r.order.customerName || 'Comptant',
      r.pdj,
      r.dej,
      r.diner,
      r.bar,
      r.cave,
      r.totalConsommations,
      r.totalPaye,
      r.solde,
      `"${r.paymentMethodsList}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...csvRows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `main_courante_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<FileSpreadsheet className="w-5 h-5" />}
        title="Main Courante Restauration"
        subtitle="Matrice quotidienne croisant les consommations (PDJ, Déj, Dîner, Bar, Cave) et les encaissements"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200 uppercase">
            Norme HotelPro Cameroun
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-xs">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-900 focus:outline-hidden font-bold"
              />
            </div>

            <Button
              variant="outline"
              size="touch"
              onClick={handleExportCsv}
              icon={Download}
            >
              Excel / CSV
            </Button>

            <Button
              variant="primary"
              size="touch"
              onClick={handlePrint}
              icon={Printer}
            >
              Imprimer
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Total Consommé du Jour</div>
          <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
            {formatCurrency(sumTotalConsommations, settings.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{rows.length} tables & tickets</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-emerald-600">Total Encaissé en Caisse</div>
          <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
            {formatCurrency(sumTotalPaye, settings.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Espèces, Orange Money, MoMo, Cartes</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-rose-600">Solde Débiteur / Non Réglé</div>
          <div className="text-xl font-black text-rose-600 mt-1 tabular-nums">
            {formatCurrency(sumSoldeDebiteur, settings.currency)}
          </div>
          <div className="text-xs text-rose-500 mt-0.5">À recouvrer avant la clôture</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-amber-600">Ventes Bar & Cave</div>
          <div className="text-xl font-black text-amber-700 mt-1 tabular-nums">
            {formatCurrency(sumBar + sumCave, settings.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Bières, vins, spiritueux et cocktails</div>
        </div>
      </div>

      {/* Main Courante Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* Category Super Header */}
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <th colSpan={4} className="py-2.5 px-3 border-r border-slate-800">
                  Identification Client / Table
                </th>
                <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-800 bg-slate-800/80">
                  Ventilation Restauration & Boissons (Norme HotelPro)
                </th>
                <th colSpan={3} className="py-2.5 px-3 text-center bg-slate-800">
                  Situation Financière & Règlements
                </th>
              </tr>
              {/* Detailed Columns */}
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-2 px-3">Table</th>
                <th className="py-2 px-3">N° Commande</th>
                <th className="py-2 px-3">Heure</th>
                <th className="py-2 px-3 border-r border-slate-200">Client / Serveur</th>
                <th className="py-2 px-2 text-right">PDJ</th>
                <th className="py-2 px-2 text-right">Déjeuner</th>
                <th className="py-2 px-2 text-right">Dîner</th>
                <th className="py-2 px-2 text-right">Bar</th>
                <th className="py-2 px-2 text-right border-r border-slate-200">Cave (Vins)</th>
                <th className="py-2 px-3 text-right">Total TTC</th>
                <th className="py-2 px-3 text-right">Encaissé</th>
                <th className="py-2 px-3 text-right">Solde Dû</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    Aucune consommation enregistrée à la date du {selectedDate}.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isFullyPaid = r.solde <= 0;
                  const isPartiallyPaid = r.totalPaye > 0 && r.solde > 0;

                  return (
                    <tr
                      key={r.order.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !isFullyPaid ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {r.order.tableName || 'À emporter'}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                        {r.order.orderNumber}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {r.order.createdAt.slice(11, 16)}
                      </td>

                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-800 truncate max-w-[140px]">
                          {r.order.customerName || 'Client Comptant'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Srv: {r.order.serverName}
                        </div>
                      </td>

                      {/* Rubrics */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {r.pdj > 0 ? formatCurrency(r.pdj, settings.currency) : '—'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {r.dej > 0 ? formatCurrency(r.dej, settings.currency) : '—'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {r.diner > 0 ? formatCurrency(r.diner, settings.currency) : '—'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {r.bar > 0 ? formatCurrency(r.bar, settings.currency) : '—'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700 border-r border-slate-200">
                        {r.cave > 0 ? formatCurrency(r.cave, settings.currency) : '—'}
                      </td>

                      {/* Financials */}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {formatCurrency(r.totalConsommations, settings.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(r.totalPaye, settings.currency)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            isFullyPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartiallyPaid
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.solde > 0 ? formatCurrency(r.solde, settings.currency) : 'Soldé'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Footer Row */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                  <td colSpan={4} className="py-3 px-3 uppercase tracking-wider text-amber-400">
                    TOTAUX JOURNÉE ({rows.length} OPÉRATIONS)
                  </td>
                  <td className="py-3 px-2 text-right font-mono">{formatCurrency(sumPdj, settings.currency)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatCurrency(sumDej, settings.currency)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatCurrency(sumDiner, settings.currency)}</td>
                  <td className="py-3 px-2 text-right font-mono">{formatCurrency(sumBar, settings.currency)}</td>
                  <td className="py-3 px-2 text-right font-mono border-r border-slate-800">{formatCurrency(sumCave, settings.currency)}</td>
                  <td className="py-3 px-3 text-right font-black text-amber-400">
                    {formatCurrency(sumTotalConsommations, settings.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-400">
                    {formatCurrency(sumTotalPaye, settings.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-rose-400">
                    {formatCurrency(sumSoldeDebiteur, settings.currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
