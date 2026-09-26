import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  PieChart,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, expenses, stockMovements, stockItems, cashMovements, settings } = useRestaurant();

  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  const paidOrders = orders.filter((o) => o.status === 'payee');
  const totalSales = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const averageTicket = paidOrders.length > 0 ? Math.round(totalSales / paidOrders.length) : 0;

  const totalExpenses = expenses
    .filter((e) => e.status === 'payee' || e.status === 'validee')
    .reduce((sum, e) => sum + e.amount, 0);

  // Sales by payment method
  const paymentBreakdown: Record<string, number> = {};
  paidOrders.forEach((o) => {
    o.payments?.forEach((p) => {
      paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
    });
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['OrderNumber', 'Date', 'Table', 'Server', 'Total', 'PaymentStatus'];
    const rows = orders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.tableName || 'A emporter',
      o.serverName,
      o.total,
      o.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rapport_ventes_restomaster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Cette semaine
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Ce mois
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimer Bilan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Chiffre d’Affaires Total</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(totalSales, settings.currency)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{paidOrders.length} tickets réglés</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Panier Moyen</div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {formatCurrency(averageTicket, settings.currency)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Par commande encaissée</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Dépenses</div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {formatCurrency(totalExpenses, settings.currency)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Charges et achats matières</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Résultat Brut Estimé</div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(totalSales - totalExpenses, settings.currency)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Marge opérationnelle</div>
        </div>
      </div>

      {/* Breakdowns Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-600" />
            Répartition des Modes de Règlements
          </h3>

          <div className="space-y-3 text-xs">
            {Object.keys(paymentBreakdown).length === 0 ? (
              <div className="text-slate-400 py-6 text-center">Aucun encaissement sur la période</div>
            ) : (
              Object.entries(paymentBreakdown).map(([method, amount]) => {
                const percent = totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                      <span>{formatCurrency(amount, settings.currency)} ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Server Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Ventes Réalisées par Serveur
          </h3>

          <div className="space-y-3 text-xs">
            {orders.map((ord) => (
              <div key={ord.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-bold text-slate-800">{ord.serverName}</div>
                  <div className="text-[11px] text-slate-500">{ord.orderNumber} ({ord.tableName || 'À emporter'})</div>
                </div>
                <div className="text-right font-black text-slate-900">
                  {formatCurrency(ord.total, settings.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
