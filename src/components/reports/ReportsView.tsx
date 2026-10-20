import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, PaymentMethod } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  PieChart,
  DollarSign,
  Utensils,
  Award,
  Users,
  FileSpreadsheet,
  Search,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Star,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, products, employees, settings } = useRestaurant();

  // Selected Report Tab (Section 10 du Guide : 4 rapports officiels)
  const [activeReportTab, setActiveReportTab] = useState<'ca' | 'top_plats' | 'serveurs' | 'transactions'>('ca');

  // Time Range Filter
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('day');

  // Search & Filter in Transactions
  const [txSearch, setTxSearch] = useState('');
  const [txMethodFilter, setTxMethodFilter] = useState<string>('all');

  // Duplicate Thermal Receipt Modal
  const [duplicateOrder, setDuplicateOrder] = useState<Order | null>(null);

  // Time-filtered paid orders & previous period orders for evolution %
  const { currentPaidOrders, previousPaidOrders, evolutionPercent } = useMemo(() => {
    const now = new Date();
    const paid = orders.filter((o) => o.status === 'payee');

    let current: Order[] = [];
    let prev: Order[] = [];

    if (timeRange === 'day') {
      const todayStr = now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      current = paid.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
      prev = paid.filter((o) => new Date(o.createdAt).toDateString() === yesterdayStr);
    } else if (timeRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      current = paid.filter((o) => new Date(o.createdAt) >= sevenDaysAgo);
      prev = paid.filter(
        (o) => new Date(o.createdAt) >= fourteenDaysAgo && new Date(o.createdAt) < sevenDaysAgo
      );
    } else if (timeRange === 'month') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      current = paid.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
      prev = paid.filter(
        (o) => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo
      );
    } else {
      current = paid;
      prev = [];
    }

    const currentTotal = current.reduce((sum, o) => sum + o.total, 0);
    const prevTotal = prev.reduce((sum, o) => sum + o.total, 0);

    let evo = 0;
    if (prevTotal > 0) {
      evo = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
    } else if (currentTotal > 0 && prev.length === 0) {
      evo = 100;
    }

    return {
      currentPaidOrders: current,
      previousPaidOrders: prev,
      evolutionPercent: evo,
    };
  }, [orders, timeRange]);

  // Total Sales & KPIs
  const totalSales = useMemo(() => {
    return currentPaidOrders.reduce((sum, o) => sum + o.total, 0);
  }, [currentPaidOrders]);

  const totalGuests = useMemo(() => {
    return currentPaidOrders.reduce((sum, o) => sum + (o.guestCount || 1), 0);
  }, [currentPaidOrders]);

  const averageTicket = useMemo(() => {
    return currentPaidOrders.length > 0 ? Math.round(totalSales / currentPaidOrders.length) : 0;
  }, [currentPaidOrders, totalSales]);

  // Breakdown by payment method
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    currentPaidOrders.forEach((o) => {
      const method = o.paymentMethod || 'especes';
      map[method] = (map[method] || 0) + o.total;
    });
    return map;
  }, [currentPaidOrders]);

  // Top Selling Dishes Aggregation (Section 10)
  const topDishes = useMemo(() => {
    const dishMap: Record<
      string,
      { id: string; name: string; category: string; quantity: number; revenue: number }
    > = {};

    currentPaidOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!dishMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          dishMap[item.productId] = {
            id: item.productId,
            name: item.name || item.productName,
            category: prod?.categoryName || 'Cuisine',
            quantity: 0,
            revenue: 0,
          };
        }
        dishMap[item.productId].quantity += item.quantity;
        dishMap[item.productId].revenue += item.unitPrice * item.quantity;
      });
    });

    return Object.values(dishMap).sort((a, b) => b.quantity - a.quantity);
  }, [currentPaidOrders, products]);

  // Staff Performance Aggregation (Section 10)
  const staffPerformance = useMemo(() => {
    const staffMap: Record<
      string,
      { name: string; role: string; ordersCount: number; totalRevenue: number; totalTips: number }
    > = {};

    currentPaidOrders.forEach((o) => {
      const sName = o.serverName || 'Serveur';
      if (!staffMap[sName]) {
        const emp = employees.find((e) => e.fullName.toLowerCase() === sName.toLowerCase());
        staffMap[sName] = {
          name: sName,
          role: emp?.role || 'serveur',
          ordersCount: 0,
          totalRevenue: 0,
          totalTips: 0,
        };
      }
      staffMap[sName].ordersCount += 1;
      staffMap[sName].totalRevenue += o.total;
      staffMap[sName].totalTips += o.tip || 0;
    });

    return Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [currentPaidOrders, employees]);

  // Transactions History Filtered
  const filteredTransactions = useMemo(() => {
    return currentPaidOrders
      .filter((o) => {
        if (!txSearch) return true;
        const q = txSearch.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (o.tableName && o.tableName.toLowerCase().includes(q)) ||
          (o.serverName && o.serverName.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q))
        );
      })
      .filter((o) => {
        if (txMethodFilter === 'all') return true;
        return o.paymentMethod === txMethodFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentPaidOrders, txSearch, txMethodFilter]);

  // Export CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `rapport_${activeReportTab}_${timeRange}_${Date.now()}.csv`;

    if (activeReportTab === 'ca' || activeReportTab === 'transactions') {
      headers = ['Numero', 'Date', 'Table', 'Serveur', 'ModePaiement', 'TotalTTC', 'Couverts'];
      rows = currentPaidOrders.map((o) => [
        o.orderNumber,
        o.createdAt,
        o.tableName || 'Comptoir',
        o.serverName || 'Serveur',
        o.paymentMethod || 'especes',
        o.total,
        o.guestCount || 1,
      ]);
    } else if (activeReportTab === 'top_plats') {
      headers = ['Plat', 'Categorie', 'QuantiteVendue', 'ChiffreAffaires', 'PartCA'];
      rows = topDishes.map((d) => [
        `"${d.name}"`,
        d.category,
        d.quantity,
        d.revenue,
        totalSales > 0 ? `${Math.round((d.revenue / totalSales) * 100)}%` : '0%',
      ]);
    } else if (activeReportTab === 'serveurs') {
      headers = ['Serveur', 'Role', 'CommandesServies', 'ChiffreAffaires', 'PanierMoyen', 'Pourboires'];
      rows = staffPerformance.map((s) => [
        `"${s.name}"`,
        s.role,
        s.ordersCount,
        s.totalRevenue,
        s.ordersCount > 0 ? Math.round(s.totalRevenue / s.ordersCount) : 0,
        s.totalTips,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 w-full lg:w-auto">
          <button
            onClick={() => setTimeRange('day')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cette semaine
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              timeRange === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tout l'historique
          </button>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors"
            title="Télécharger les données en tableau Excel CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimer Bilan (PDF)</span>
          </button>
        </div>
      </div>

      {/* 4 Official Report Tabs (Section 10 du Guide) */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('ca')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeReportTab === 'ca'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Chiffre d'Affaires & Ventes</span>
        </button>

        <button
          onClick={() => setActiveReportTab('top_plats')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeReportTab === 'top_plats'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. Plats les Plus Vendus ({topDishes.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('serveurs')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeReportTab === 'serveurs'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Performance du Personnel</span>
        </button>

        <button
          onClick={() => setActiveReportTab('transactions')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeReportTab === 'transactions'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>4. Historique des Transactions ({filteredTransactions.length})</span>
        </button>
      </div>

      {/* RAPPORT 1 : CHIFFRE D'AFFAIRES & VENTES */}
      {activeReportTab === 'ca' && (
        <div className="space-y-6">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Chiffre d’Affaires Total</span>
                {evolutionPercent !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-[11px] font-black px-2 py-0.5 rounded-full ${
                      evolutionPercent > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {evolutionPercent > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {evolutionPercent > 0 ? `+${evolutionPercent}%` : `${evolutionPercent}%`}
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatCurrency(totalSales, settings.currency)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {currentPaidOrders.length} tickets de caisse validés
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Panier Moyen par Commande
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {formatCurrency(averageTicket, settings.currency)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Dépense moyenne constatée</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nombre de Couverts Servis
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                {totalGuests} convives
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {totalGuests > 0
                  ? `${formatCurrency(Math.round(totalSales / totalGuests), settings.currency)} / convive`
                  : '—'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Période Précédente
              </div>
              <div className="text-2xl font-black text-slate-700 mt-2">
                {formatCurrency(
                  previousPaidOrders.reduce((s, o) => s + o.total, 0),
                  settings.currency
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {previousPaidOrders.length} tickets comparatifs
              </div>
            </div>
          </div>

          {/* Payment Breakdown Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              <span>Répartition par Mode de Règlement (Espèces, MoMo, Carte)</span>
            </h3>

            <div className="space-y-3 text-xs">
              {Object.keys(paymentBreakdown).length === 0 ? (
                <div className="text-slate-400 py-6 text-center">Aucun encaissement sur la période</div>
              ) : (
                Object.entries(paymentBreakdown).map(([method, amount]) => {
                  const percent = totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span className="capitalize">{method.replace('_', ' ')}</span>
                        <span>
                          {formatCurrency(amount, settings.currency)} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAPPORT 2 : PLATS LES PLUS VENDUS (TOP VENTES) */}
      {activeReportTab === 'top_plats' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Palmarès des Ventes : Plats & Boissons Populaires</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Identifiez vos meilleures ventes (« Stars du restaurant ») et les plats à optimiser.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">{topDishes.length} références vendues</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Rang</th>
                  <th className="py-3 px-4">Plat ou Boisson</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4 text-center">Quantité Vendue</th>
                  <th className="py-3 px-4">Chiffre d'Affaires Généré</th>
                  <th className="py-3 px-4 text-right">Part du CA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDishes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Aucune vente enregistrée sur cette période.
                    </td>
                  </tr>
                ) : (
                  topDishes.map((dish, idx) => {
                    const share = totalSales > 0 ? Math.round((dish.revenue / totalSales) * 100) : 0;
                    return (
                      <tr key={dish.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center">
                              3
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400 px-2">#{idx + 1}</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{dish.name}</span>
                            {idx < 3 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                                Star
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 capitalize text-slate-600">{dish.category}</td>

                        <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                          {dish.quantity}
                        </td>

                        <td className="py-3 px-4 font-black text-amber-700">
                          {formatCurrency(dish.revenue, settings.currency)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-slate-700">{share}%</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RAPPORT 3 : PERFORMANCE DU PERSONNEL */}
      {activeReportTab === 'serveurs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Performance Commerciale du Personnel en Salle & Bar</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi du chiffre d'affaires, panier moyen et tables traitées par chaque membre de l'équipe.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Serveur / Membre</th>
                  <th className="py-3 px-4">Poste</th>
                  <th className="py-3 px-4 text-center">Tables / Commandes</th>
                  <th className="py-3 px-4">Chiffre d'Affaires Encaissé</th>
                  <th className="py-3 px-4">Panier Moyen Serveur</th>
                  <th className="py-3 px-4 text-right">Pourboires Encaissés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Aucune commande traitée par le personnel sur cette période.
                    </td>
                  </tr>
                ) : (
                  staffPerformance.map((staff) => {
                    const avg = staff.ordersCount > 0 ? Math.round(staff.totalRevenue / staff.ordersCount) : 0;
                    return (
                      <tr key={staff.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{staff.name}</td>
                        <td className="py-3 px-4 capitalize text-slate-600">{staff.role}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {staff.ordersCount}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {formatCurrency(staff.totalRevenue, settings.currency)}
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-700">
                          {formatCurrency(avg, settings.currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          {formatCurrency(staff.totalTips, settings.currency)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RAPPORT 4 : HISTORIQUE DES TRANSACTIONS */}
      {activeReportTab === 'transactions' && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Rechercher par date, n° ticket, table ou serveur..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={txMethodFilter}
                onChange={(e) => setTxMethodFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">Tous les modes de règlement</option>
                <option value="especes">Espèces</option>
                <option value="orange_money">Orange Money</option>
                <option value="mtn_momo">MTN MoMo</option>
                <option value="carte">Carte bancaire</option>
                <option value="virement">Virement</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Journal Détaillé des Encaissements
              </h3>
              <span className="text-xs text-slate-500">
                {filteredTransactions.length} transaction(s) trouvée(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">N° Ticket</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Serveur</th>
                    <th className="py-3 px-4">Règlement</th>
                    <th className="py-3 px-4">Montant TTC</th>
                    <th className="py-3 px-4 text-right">Duplicata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Aucune transaction ne correspond à vos filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {formatDateTime(order.updatedAt || order.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {order.tableName || 'Comptoir'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{order.serverName || 'Serveur'}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase">
                            {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'Espèces'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {formatCurrency(order.total, settings.currency)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDuplicateOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 transition-colors"
                            title="Réimprimer le ticket de caisse thermique (Duplicata)"
                          >
                            <Printer className="w-3 h-3 text-amber-600" />
                            <span>Imprimer</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE THERMAL RECEIPT MODAL */}
      {duplicateOrder && (
        <ThermalReceiptModal
          order={duplicateOrder}
          settings={settings}
          paidAmount={duplicateOrder.total}
          paymentMethod={duplicateOrder.paymentMethod || 'especes'}
          onClose={() => setDuplicateOrder(null)}
        />
      )}
    </div>
  );
};
