import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Order, OrderItem } from '../../types/restaurant';
import { getMinutesElapsed, getMinutesBetween, formatCurrency, formatTime } from '../../lib/utils';
import {
  Wine,
  Clock,
  CheckCircle2,
  Flame,
  Check,
  GlassWater,
  Calendar,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Undo2,
  Volume2,
  Printer,
  BookOpen,
  AlertTriangle,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const BarKdsView: React.FC = () => {
  const { orders, updateOrderItemStatus, updateOrderStatus, isRuleEnabled } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  // Règles Opérationnelles (Section 10 Bar & Cave)
  const isBarLossesAllowed = isRuleEnabled('bar_losses', true) || isRuleEnabled('bar_breakage', true);
  const isBarCocktailsAllowed = isRuleEnabled('bar_cocktails', true) || isRuleEnabled('bar_cocktail_recipes', true);
  const isBarPrintAllowed = isRuleEnabled('bar_print', true);

  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [lossBottle, setLossBottle] = useState('Whisky Black Label 75cl');
  const [lossReason, setLossReason] = useState('Bouteille brisée accidentellement au comptoir');
  const [lossQuantity, setLossQuantity] = useState(1);

  const [cocktailsModalOpen, setCocktailsModalOpen] = useState(false);

  const [filterState, setFilterState] = useState<'active' | 'in_prep' | 'ready' | 'servi' | 'history'>('active');

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'payee' | 'servi'>('all');

  const [lastCompletedOrder, setLastCompletedOrder] = useState<{ id: string; number: string; table: string } | null>(null);

  // Available dates with bar orders
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach((o) => {
      if (o.items.some((i) => i.destination === 'bar') && o.createdAt) {
        dates.add(o.createdAt.slice(0, 10));
      }
    });
    dates.add(new Date().toISOString().slice(0, 10));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Active bar orders (reste tant que non payé)
  const activeBarOrders = useMemo(() => {
    return orders.filter((order) => {
      const hasBarItems = order.items.some((i) => i.destination === 'bar');
      if (!hasBarItems) return false;

      if (order.status === 'payee' || order.status === 'annulee') return false;

      if (filterState === 'in_prep') {
        return order.status === 'envoye' || order.status === 'en_preparation' || order.status === 'nouveau';
      }
      if (filterState === 'ready') {
        return order.status === 'pret';
      }
      if (filterState === 'servi') {
        return order.status === 'servi';
      }
      return true;
    });
  }, [orders, filterState]);

  // Tab counts
  const counts = useMemo(() => {
    const barOnly = orders.filter((o) => o.items.some((i) => i.destination === 'bar'));
    const uncashed = barOnly.filter((o) => o.status !== 'payee' && o.status !== 'annulee');

    return {
      active: uncashed.length,
      in_prep: uncashed.filter((o) => o.status === 'envoye' || o.status === 'en_preparation' || o.status === 'nouveau').length,
      ready: uncashed.filter((o) => o.status === 'pret').length,
      servi: uncashed.filter((o) => o.status === 'servi').length,
    };
  }, [orders]);

  // Orders for "Historique Journalier" Bar
  const historyOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const hasBarItems = order.items.some((i) => i.destination === 'bar');
        if (!hasBarItems) return false;

        const orderDate = (order.servedAt || order.paidAt || order.createdAt || '').slice(0, 10);
        if (orderDate !== selectedDate) return false;

        if (historyStatusFilter === 'payee' && order.status !== 'payee') return false;
        if (historyStatusFilter === 'servi' && order.status !== 'servi') return false;

        if (historySearch.trim()) {
          const q = historySearch.toLowerCase();
          const matchNumber = order.orderNumber.toLowerCase().includes(q);
          const matchTable = (order.tableName || '').toLowerCase().includes(q);
          const matchServer = (order.serverName || '').toLowerCase().includes(q);
          const matchItem = order.items.some((it) => it.productName.toLowerCase().includes(q));
          if (!matchNumber && !matchTable && !matchServer && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, selectedDate, historyStatusFilter, historySearch]);

  // Group history orders hour by hour
  const hourlyGroups = useMemo(() => {
    const groups: { [hour: string]: Order[] } = {};

    historyOrders.forEach((order) => {
      const refTime = order.servedAt || order.createdAt;
      const hour = refTime ? refTime.slice(11, 13) : '00';
      const slotLabel = `${hour}h00 - ${hour}h59`;

      if (!groups[slotLabel]) {
        groups[slotLabel] = [];
      }
      groups[slotLabel].push(order);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((slot) => ({
      slot,
      orders: groups[slot],
      totalCovers: groups[slot].reduce((acc, o) => acc + (o.guestCount || 1), 0),
      totalAmount: groups[slot].reduce((acc, o) => acc + o.total, 0),
    }));
  }, [historyOrders]);

  // History KPIs
  const historyKpis = useMemo(() => {
    const totalOrders = historyOrders.length;
    const totalCovers = historyOrders.reduce((acc, o) => acc + (o.guestCount || 1), 0);
    const totalRevenue = historyOrders.reduce((acc, o) => acc + o.total, 0);

    const prepTimes: number[] = [];
    historyOrders.forEach((o) => {
      const end = o.preparedAt || o.servedAt || o.updatedAt;
      const diff = getMinutesBetween(o.createdAt, end);
      if (diff !== null && diff >= 0 && diff <= 120) {
        prepTimes.push(diff);
      }
    });

    const avgPrep = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0;
    return { totalOrders, totalCovers, totalRevenue, avgPrep };
  }, [historyOrders]);

  // Item status progressive step
  const handleNextItemStatus = (orderId: string, item: OrderItem) => {
    let nextStatus: 'en_attente' | 'en_preparation' | 'pret' | 'servi' = 'en_preparation';

    if (item.status === 'en_attente') {
      nextStatus = 'en_preparation';
      playAudioChime('kitchen');
    } else if (item.status === 'en_preparation') {
      nextStatus = 'pret';
      playAudioChime('success');
    } else if (item.status === 'pret') {
      nextStatus = 'servi';
      playAudioChime('success');
    } else {
      return;
    }

    updateOrderItemStatus(orderId, item.id, nextStatus);
  };

  // Launch order bar prep
  const handleLaunchBarPrep = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'bar' && i.status === 'en_attente')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'en_preparation');
      });
    updateOrderStatus(order.id, 'en_preparation');
    playAudioChime('kitchen');
  };

  // Mark all bar items ready
  const handleMarkAllBarReady = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'bar' && i.status !== 'pret' && i.status !== 'servi')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'pret');
      });

    updateOrderStatus(order.id, 'pret');

    setLastCompletedOrder({
      id: order.id,
      number: order.orderNumber,
      table: order.tableName || 'Bar Comptoir',
    });

    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.6 },
    });

    playAudioChime('kitchen');

    showToast({
      type: 'success',
      title: 'Boissons Prêtes !',
      message: `Bon bar ${order.tableName || order.orderNumber} prêt à servir.`,
    });
  };

  // Mark order served
  const handleMarkOrderServed = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'bar')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'servi');
      });

    updateOrderStatus(order.id, 'servi');
    playAudioChime('success');

    showToast({
      type: 'success',
      title: 'Servi & Santé !',
      message: `La table ${order.tableName || order.orderNumber} a reçu ses boissons. Visible jusqu'au règlement.`,
    });
  };

  // Recall order
  const handleRecallOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'en_preparation');
    setLastCompletedOrder(null);
    showToast({
      type: 'warning',
      title: 'Bon rappelé au bar',
      message: 'Le bon de boisson a été réintégré en préparation.',
    });
  };

  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
            <Wine className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Écran Bar & Lounge KDS</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-400">
              Cocktails signature, vins & boissons fraîches • Traçabilité heure par heure
            </p>
          </div>
        </div>

        {/* Action buttons and Tab filters */}
        <div className="flex flex-wrap items-center gap-2">
          {isBarLossesAllowed && (
            <button
              onClick={() => setLossModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Déclarer Perte / Casse</span>
            </button>
          )}

          {isBarCocktailsAllowed && (
            <button
              onClick={() => setCocktailsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Fiches Cocktails</span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setFilterState('active')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterState === 'active'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <span>En direct</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterState === 'active' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {counts.active}
            </span>
          </button>

          <button
            onClick={() => setFilterState('in_prep')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterState === 'in_prep'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>En prépa</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterState === 'in_prep' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {counts.in_prep}
            </span>
          </button>

          <button
            onClick={() => setFilterState('ready')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterState === 'ready'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prêtes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterState === 'ready' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {counts.ready}
            </span>
          </button>

          <button
            onClick={() => setFilterState('servi')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterState === 'servi'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Servies à table</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterState === 'servi' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {counts.servi}
            </span>
          </button>

          <button
            onClick={() => setFilterState('history')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterState === 'history'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-emerald-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Historique Journalier</span>
          </button>
        </div>
      </div>
    </div>

      {/* Undo banner */}
      {lastCompletedOrder && filterState !== 'history' && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-950 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Boissons de <strong>{lastCompletedOrder.table} ({lastCompletedOrder.number})</strong> prêtes.
            </span>
          </div>
          <button
            onClick={() => handleRecallOrder(lastCompletedOrder.id)}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-700 text-white rounded-lg font-bold hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Rappeler le bon (Annuler)</span>
          </button>
        </div>
      )}

      {/* HISTORIQUE JOURNALIER BAR */}
      {filterState === 'history' ? (
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    onClick={() => handleShiftDate(-1)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 px-3">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => handleShiftDate(1)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedDate === new Date().toISOString().slice(0, 10)
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Aujourd'hui
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Table, Bon, Serveur, Boisson..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setHistoryStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      historyStatusFilter === 'all' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Toutes
                  </button>
                  <button
                    onClick={() => setHistoryStatusFilter('payee')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      historyStatusFilter === 'payee' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Encaissées
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Bons Boissons Servis</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{historyKpis.totalOrders}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Couverts Bar</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">{historyKpis.totalCovers}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Délai Moyen Bar</div>
                <div className="text-lg font-black text-indigo-700 mt-0.5">{historyKpis.avgPrep} min</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase">CA Bar</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">{formatCurrency(historyKpis.totalRevenue)}</div>
              </div>
            </div>
          </div>

          {/* Hourly groups */}
          {hourlyGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <GlassWater className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-base font-bold text-slate-700">Aucune commande bar pour le {selectedDate}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {hourlyGroups.map(({ slot, orders: slotOrders, totalCovers, totalAmount }) => (
                <div key={slot} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider">{slot}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                        {slotOrders.length} {slotOrders.length > 1 ? 'commandes' : 'commande'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-300 font-semibold">{totalCovers} cvts</span>
                      <span className="font-bold text-emerald-400">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {slotOrders.map((order) => {
                      const barItems = order.items.filter((i) => i.destination === 'bar');
                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
                        >
                          <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900">
                                  {order.tableName || 'Bar Comptoir'}
                                </span>
                                {order.guestCount && order.guestCount > 0 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {order.guestCount} cvts
                                  </span>
                                ) : null}
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  {order.orderNumber}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                Serveur : <strong>{order.serverName}</strong>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              {order.status === 'payee' ? (
                                <>
                                  <CheckCheck className="w-3 h-3" />
                                  <span>Payé</span>
                                </>
                              ) : (
                                <>
                                  <Wine className="w-3 h-3" />
                                  <span>Servi</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Timeline */}
                          <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                            <div>Reçue : <strong>{formatTime(order.createdAt)}</strong></div>
                            <div>Servie : <strong>{formatTime(order.servedAt || order.updatedAt)}</strong></div>
                          </div>

                          {/* Items */}
                          <div className="p-4 space-y-2 flex-1 divide-y divide-slate-100">
                            {barItems.map((item) => (
                              <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900">{item.quantity}x</span>
                                  {item.seatNumber !== undefined && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                      {item.seatNumber === 0 ? 'Table' : `C${item.seatNumber}`}
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800">{item.productName}</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Servi</span>
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Total Commande :</span>
                            <span className="font-black text-slate-900">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* LIVE BAR CARDS */
        <>
          {activeBarOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <GlassWater className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-sm font-bold text-slate-700">Aucune boisson en cours</div>
              <p className="text-xs text-slate-500">Toutes les consommations ont été servies et encaissées !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeBarOrders.map((order) => {
                const elapsed = getMinutesElapsed(order.createdAt);
                const barItems = order.items.filter((i) => i.destination === 'bar');

                const hasPendingItems = barItems.some((i) => i.status === 'en_attente');
                const hasInPrepItems = barItems.some((i) => i.status === 'en_preparation');
                const isOrderServi = order.status === 'servi';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl border-2 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                      isOrderServi
                        ? 'border-emerald-300 ring-2 ring-emerald-100'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">
                            {order.tableName || 'Bar Comptoir'}
                          </span>
                          {order.guestCount && order.guestCount > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {order.guestCount} cvts
                            </span>
                          ) : null}
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Serveur : <strong>{order.serverName}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isOrderServi ? (
                          <div className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Wine className="w-3 h-3" />
                            <span>Servi à table</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Clock className="w-3 h-3" />
                            <span>{elapsed} min</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="p-4 space-y-2 flex-1 divide-y divide-slate-100">
                      {barItems.map((item) => {
                        const isServi = item.status === 'servi';
                        const isReady = item.status === 'pret';
                        const isInPrep = item.status === 'en_preparation';
                        const isPending = item.status === 'en_attente';

                        return (
                          <div
                            key={item.id}
                            className={`pt-2 first:pt-0 flex items-center justify-between gap-3 ${
                              isServi ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 text-sm">{item.quantity}x</span>
                              {item.seatNumber !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    item.seatNumber === 0
                                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                                      : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black'
                                  }`}
                                >
                                  {item.seatNumber === 0 ? 'Table' : `C${item.seatNumber}`}
                                </span>
                              )}
                              <span
                                className={`text-xs font-bold ${
                                  isServi ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                {item.productName}
                              </span>
                            </div>

                            <div>
                              {isPending ? (
                                <button
                                  onClick={() => handleNextItemStatus(order.id, item)}
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                >
                                  Préparer
                                </button>
                              ) : isInPrep ? (
                                <button
                                  onClick={() => handleNextItemStatus(order.id, item)}
                                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 cursor-pointer"
                                >
                                  Prêt
                                </button>
                              ) : isReady ? (
                                <button
                                  onClick={() => handleNextItemStatus(order.id, item)}
                                  className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 cursor-pointer"
                                >
                                  Servir
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Servi</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bump Bar */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                      {hasPendingItems ? (
                        <button
                          onClick={() => handleLaunchBarPrep(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Flame className="w-4 h-4" />
                          <span>Lancer les boissons</span>
                        </button>
                      ) : hasInPrepItems ? (
                        <button
                          onClick={() => handleMarkAllBarReady(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tout Prêt Bar</span>
                        </button>
                      ) : !isOrderServi ? (
                        <button
                          onClick={() => handleMarkOrderServed(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition-all shadow-md cursor-pointer"
                        >
                          <Wine className="w-4 h-4" />
                          <span>Servi & Santé !</span>
                        </button>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <div className="flex items-center gap-2 text-left">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <Wine className="w-3.5 h-3.5 text-emerald-800" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                <span>Servi & Bon Appétit !</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                              </div>
                              <div className="text-[10px] text-emerald-700">
                                Reste visible jusqu'au règlement et libération table au POS
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRecallOrder(order.id)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-slate-700 hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 cursor-pointer"
                          >
                            Rappeler
                          </button>
                        </div>
                      )}

                      {isBarPrintAllowed && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              showToast({
                                type: 'info',
                                title: 'Impression Bon Bar',
                                message: `Bon de boissons #${order.orderNumber} (${order.tableName || 'Comptoir'}) envoyé à l'imprimante bar.`,
                              });
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 py-1 px-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" />
                            <span>Imprimer Bon Bar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Déclaration de Perte / Casse */}
      {lossModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Déclarer Perte, Coulage ou Casse Bar
              </h3>
              <button onClick={() => setLossModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast({
                  type: 'success',
                  title: 'Perte enregistrée avec succès',
                  message: `${lossQuantity}x ${lossBottle} décompté(e) du stock bar pour motif : "${lossReason}".`,
                });
                setLossModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Article / Bouteille concernée *</label>
                <select
                  value={lossBottle}
                  onChange={(e) => setLossBottle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="Whisky Black Label 75cl">Whisky Black Label 75cl</option>
                  <option value="Vodka Absolut 70cl">Vodka Absolut 70cl</option>
                  <option value="Gin Tanqueray 70cl">Gin Tanqueray 70cl</option>
                  <option value="Champagne Moët & Chandon 75cl">Champagne Moët & Chandon 75cl</option>
                  <option value="Fût de Bière Pression 30L">Fût de Bière Pression 30L</option>
                  <option value="Verre Cocktail Highball (Casse)">Verre Cocktail Highball (Casse)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantité dégradée *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lossQuantity}
                    onChange={(e) => setLossQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type de sinistre</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                    <option>Casse au service</option>
                    <option>Coulage / Fuite fût</option>
                    <option>Péremption / Date limite</option>
                    <option>Erreur préparation / Renversé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Explication détaillée *</label>
                <input
                  type="text"
                  required
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  placeholder="Circonstances exactes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLossModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                >
                  Enregistrer la perte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fiches Techniques Cocktails */}
      {cocktailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Fiches Recettes & Doses Cocktails Signature
              </h3>
              <button onClick={() => setCocktailsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  name: 'Mojito Cubano Classique',
                  glass: 'Verre Highball',
                  ingredients: ['5 cl Rhum Blanc', '6 feuilles de menthe', '2 cl jus de citron vert frais', '2 cl sirop de canne', 'Eau gazeuse & glace pilée'],
                },
                {
                  name: 'Piña Colada Caraïbes',
                  glass: 'Verre Hurricane',
                  ingredients: ['5 cl Rhum ambré ou blanc', '5 cl crème de coco', '10 cl jus d’ananas frais', 'Tranche d’ananas & cerise'],
                },
                {
                  name: 'Spritz Apérol',
                  glass: 'Grand verre ballon',
                  ingredients: ['6 cl Prosecco', '4 cl Apérol', 'Trait d’eau pétillante', 'Rondelle d’orange fraîche & glaçons'],
                },
                {
                  name: 'Margarita Signature',
                  glass: 'Verre à margarita givré au sel',
                  ingredients: ['5 cl Tequila 100% agave', '3 cl Triple Sec (Cointreau)', '2 cl jus de citron vert frais pressé'],
                },
              ].map((c) => (
                <div key={c.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">{c.glass}</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                    {c.ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
