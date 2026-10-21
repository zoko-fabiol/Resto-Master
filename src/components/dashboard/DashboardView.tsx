import React, { useState } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Utensils,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Coins,
  PackageCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface DashboardViewProps {
  navigateTo: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigateTo }) => {
  const {
    orders,
    tables,
    reservations,
    stockItems,
    expenses,
    cashSession,
    settings,
    isFeatureEnabled,
  } = useRestaurant();

  const isReservationsEnabled = isFeatureEnabled('table_reservations');
  const isTablesEnabled = isFeatureEnabled('tables_management');
  const isStockEnabled = isFeatureEnabled('stock_lots_fefo');
  const isCashEnabled = isFeatureEnabled('cash_register_z');
  const isKitchenKdsEnabled = isFeatureEnabled('kds_kitchen');

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Calculations
  const paidOrders = orders.filter((o) => o.status === 'payee');
  const activeOrders = orders.filter((o) => o.status !== 'payee' && o.status !== 'annulee');

  const totalSalesCA = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalExpenses = expenses
    .filter((e) => e.status === 'payee' || e.status === 'validee')
    .reduce((sum, e) => sum + e.amount, 0);
  const estimatedResult = totalSalesCA - totalExpenses;

  const occupiedTables = tables.filter((t) => t.status !== 'libre');
  const lowStockItems = stockItems.filter((s) => s.currentQuantity <= s.minThreshold);
  const pendingReservations = reservations.filter((r) => r.status === 'confirmee' || r.status === 'en_attente');

  // Top products sold
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.quantity * item.unitPrice;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<TrendingUp className="w-5 h-5" />}
        title="Tableau de bord"
        subtitle="Mise à jour en temps réel des flux de vente, de caisse et de production"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
            Activité en direct
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold border border-slate-200">
              <button
                type="button"
                onClick={() => setPeriod('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Aujourd’hui
              </button>
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cette semaine
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Ce mois
              </button>
            </div>

            <Button
              variant="primary"
              size="touch"
              onClick={() => navigateTo('pos')}
              icon={Plus}
            >
              Prendre commande
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Card */}
        <div
          onClick={() => navigateTo('reports')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group"
          title="Cliquer pour afficher le rapport détaillé des ventes et du CA"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-amber-700 transition-colors">
              Chiffre d’Affaires
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalSalesCA, settings.currency)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold group-hover:text-emerald-700 transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Voir l'analyse des ventes</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div
          onClick={() => navigateTo('finance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-500 hover:shadow-md transition-all cursor-pointer group"
          title="Cliquer pour consulter et approuver les dépenses"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-rose-700 transition-colors">
              Dépenses & Achats
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalExpenses, settings.currency)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 group-hover:text-rose-600 transition-colors">
              <span>Voir le grand livre des dépenses</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Estimated Result Card */}
        <div
          onClick={() => navigateTo('finance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group"
          title="Cliquer pour afficher la rentabilité et le compte d'exploitation"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Résultat Estimé
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black tracking-tight ${estimatedResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(estimatedResult, settings.currency)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 group-hover:text-emerald-600 transition-colors">
              <span>Marge brute d'exploitation</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>

        {/* Cash Register Card */}
        <div
          onClick={() => navigateTo('caisse')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group"
          title="Cliquer pour ouvrir la caisse et voir les mouvements"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
              Solde de Caisse
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(cashSession.expectedTotal, settings.currency)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 font-semibold group-hover:text-indigo-700 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Session active ({cashSession.openedBy})</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Operational Quick Pulse Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          onClick={() => navigateTo('pos')}
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition-all"
        >
          <div className="text-xs font-semibold text-slate-500">Commandes en cours</div>
          <div className="text-xl font-bold text-amber-600 mt-1">{activeOrders.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">En cuisine ou attente paiement</div>
        </div>

        {isTablesEnabled && (
          <div
            onClick={() => navigateTo('tables')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
          >
            <div className="text-xs font-semibold text-slate-500">Taux d'occupation</div>
            <div className="text-xl font-bold text-indigo-600 mt-1">
              {tables.length > 0 ? Math.round((occupiedTables.length / tables.length) * 100) : 0}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {occupiedTables.length} / {tables.length} tables occupées
            </div>
          </div>
        )}

        {isReservationsEnabled && (
          <div
            onClick={() => navigateTo('reservations')}
            className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all"
          >
            <div className="text-xs font-semibold text-slate-500">Réservations à venir</div>
            <div className="text-xl font-bold text-blue-600 mt-1">{pendingReservations.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pour ce midi et ce soir</div>
          </div>
        )}

        {isStockEnabled && (
          <div
            onClick={() => navigateTo('stock')}
            className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${
              lowStockItems.length > 0
                ? 'bg-rose-50/60 border-rose-200 hover:border-rose-400 text-rose-800'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <div className="text-xs font-semibold">Alertes Stock Bas</div>
            <div className="text-xl font-bold mt-1 text-rose-600">
              {lowStockItems.length} articles
            </div>
            <div className="text-[11px] text-rose-700/80 mt-0.5">Sous le seuil de sécurité</div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Realtime Orders Flow & Top Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Orders Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Flux des Commandes en Direct</h3>
                <p className="text-xs text-slate-500">Commandes actives en salle et en production</p>
              </div>
              <button
                onClick={() => navigateTo('pos')}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
              >
                <span>Voir tout le POS</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Aucune commande active en ce moment. Toutes les tables sont servies ou réglées !
                </div>
              ) : (
                activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {ord.tableName || 'POS'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {ord.createdAt.slice(11, 16)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>Serveur : <strong className="text-slate-700">{ord.serverName}</strong></span>
                          {ord.customerName && (
                            <span>• Client : <strong className="text-slate-700">{ord.customerName}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1.5">
                      <div className="text-sm font-black text-slate-900">
                        {formatCurrency(ord.total, settings.currency)}
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Plats & Boissons les Plus Vendus</h3>
                <p className="text-xs text-slate-500">Volume de vente et rentabilité par produit</p>
              </div>
              <button
                onClick={() => navigateTo('menu')}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
              >
                <span>Gérer le menu</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-bold text-slate-400">#{idx + 1}</span>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-medium">{p.qty} vendus</span>
                    <span className="font-bold text-slate-900 min-w-[80px] text-right">
                      {formatCurrency(p.revenue, settings.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Stock Alerts, Impending Reservations & Shortcuts */}
        <div className="space-y-6">
          {/* Critical Stock Alerts */}
          {isStockEnabled && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Alertes Stocks Critiques
                </div>
                <button
                  onClick={() => navigateTo('stock')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1"
                >
                  <span>Réapprovisionner</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span>Tous les stocks sont au-dessus des seuils de sécurité !</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[11px] text-rose-700">
                          Reste : <strong>{item.currentQuantity} {item.unit}</strong> (Seuil : {item.minThreshold} {item.unit})
                        </div>
                      </div>
                      <button
                        onClick={() => navigateTo('purchases')}
                        className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-300"
                      >
                        Commander
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Today's Reservations */}
          {isReservationsEnabled && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Réservations du Jour
                </div>
                <button
                  onClick={() => navigateTo('reservations')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                >
                  <span>Planning</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5">
                {reservations.slice(0, 3).map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{res.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {res.time} • {res.guestCount} personnes • {res.tableName || 'Table non assignée'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Actions Fréquentes
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {isTablesEnabled && (
                <button
                  onClick={() => navigateTo('tables')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold">Plan de salle</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Assigner les tables</div>
                </button>
              )}
              {isKitchenKdsEnabled && (
                <button
                  onClick={() => navigateTo('kitchen_kds')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold text-amber-300">Cuisine KDS</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Écran des cuisiniers</div>
                </button>
              )}
              {isCashEnabled && (
                <button
                  onClick={() => navigateTo('caisse')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
                >
                  <div className="font-bold">Clôture Caisse</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Comptage journalier</div>
                </button>
              )}
              <button
                onClick={() => navigateTo('documents')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors"
              >
                <div className="font-bold">Scanner Facture</div>
                <div className="text-[10px] text-slate-400 mt-0.5">GED & extraction OCR</div>
              </button>
              <button
                onClick={() => navigateTo('main_courante')}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-left transition-colors col-span-2 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Main Courante Restauration (Cameroun)</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-black">HotelPro</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Matrice journalière conforme aux normes de contrôle</div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
