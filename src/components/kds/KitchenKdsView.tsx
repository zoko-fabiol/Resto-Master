import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Order, OrderItem } from '../../types/restaurant';
import { getMinutesElapsed, getMinutesBetween, formatCurrency, formatTime } from '../../lib/utils';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Check,
  Volume2,
  VolumeX,
  Undo2,
  Calendar,
  Search,
  User,
  Utensils,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  RefreshCw,
  Sparkles,
  Printer,
  AlertOctagon,
  Ban,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from '../ui/EmptyState';

const CRITICAL_KEYWORDS = ['arachide', 'sel', 'piment', 'allergie', 'saignant', 'bien cuit', 'sans', 'urgent'];

export const KitchenKdsView: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    updateOrderItemStatus,
    isRuleEnabled,
    isFeatureEnabled,
    addNotification,
    products,
    toggleProduct86,
    settings,
  } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  const [modal86Open, setModal86Open] = useState(false);
  const [search86, setSearch86] = useState('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const previousKitchenOrdersCount = React.useRef<number | null>(null);

  // Maintien de l'écran allumé (Screen Wake Lock API) pour tablette de cuisine
  React.useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Fallback silencieux si non supporté ou refusé par le navigateur
      }
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Alerte sonore automatique lors de l'arrivée d'une nouvelle commande en cuisine
  React.useEffect(() => {
    const kitchenOrdersCount = orders.filter(
      (o) =>
        o.items.some((i) => i.destination === 'cuisine') &&
        (o.status === 'envoye' || o.status === 'en_preparation' || o.status === 'nouveau')
    ).length;

    if (previousKitchenOrdersCount.current !== null && kitchenOrdersCount > previousKitchenOrdersCount.current) {
      if (soundEnabled && isFeatureEnabled('kds_audio_chimes')) {
        playAudioChime('kitchen');
      }
    }
    previousKitchenOrdersCount.current = kitchenOrdersCount;
  }, [orders, soundEnabled, playAudioChime, isFeatureEnabled]);

  // Règles Opérationnelles (Section 9 Cuisine & KDS)
  const isPrepTimerAllowed = isRuleEnabled('cuisine_prep_timer', true);
  const isPriorityAllowed = isRuleEnabled('cuisine_priority', true);
  const isNotifyDelayAllowed = isRuleEnabled('cuisine_notify_delay', true);
  const isPrintTicketAllowed = isRuleEnabled('cuisine_print_ticket', true);
  const isPrepCategoriesAllowed = isRuleEnabled('cuisine_prep_categories', true);
  const isNotifyReadyAllowed = isRuleEnabled('cuisine_notify_ready', true);

  const [categoryFilter, setCategoryFilter] = useState<'tous' | 'chaud' | 'froid' | 'grillades'>('tous');

  // Filtrage intelligent par poste de préparation cuisine
  const matchesStation = (item: OrderItem) => {
    if (categoryFilter === 'tous') return true;
    const text = `${item.productName} ${item.notes || ''}`.toLowerCase();
    if (categoryFilter === 'grillades') {
      return text.includes('grill') || text.includes('brais') || text.includes('brochet') || text.includes('steak') || text.includes('choukouya');
    }
    if (categoryFilter === 'froid') {
      return item.courseTiming === 'entree' || item.courseTiming === 'dessert' || text.includes('salade') || text.includes('froid') || text.includes('glace');
    }
    if (categoryFilter === 'chaud') {
      return item.courseTiming === 'plat' || text.includes('chaud') || text.includes('soupe') || text.includes('sauce') || text.includes('riz') || text.includes('frite');
    }
    return true;
  };

  // Mode & Tabs:
  // - 'active': En cours & Servies (toutes les commandes non encore encaissées)
  // - 'in_prep': En attente & En préparation
  // - 'ready': Prêtes à servir au passe
  // - 'servi': Servies à table "Bon appétit" (en attente d'encaissement au POS)
  // - 'history': Historique Journalier (audit et traçabilité heure par heure)
  const [filterState, setFilterState] = useState<'active' | 'in_prep' | 'ready' | 'servi' | 'history'>('active');

  // History date filter (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'payee' | 'servi'>('all');

  // Track recently completed order for Recall (Undo) feature
  const [lastCompletedOrder, setLastCompletedOrder] = useState<{ id: string; number: string; table: string } | null>(null);

  // Available dates with orders for quick-jump pills
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach((o) => {
      if (o.createdAt) {
        dates.add(o.createdAt.slice(0, 10));
      }
    });
    // Always include today
    dates.add(new Date().toISOString().slice(0, 10));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  // Kitchen Active Orders:
  // Visible tant que la commande N'EST PAS ENCAISSÉE (status !== 'payee' et status !== 'annulee')
  const activeKitchenOrders = useMemo(() => {
    return orders.filter((order) => {
      const hasKitchenItems = order.items.some((i) => i.destination === 'cuisine' && matchesStation(i));
      if (!hasKitchenItems) return false;

      // Dès qu'elle est encaissée ou annulée, elle disparaît du KDS actif
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
      // 'active': toutes les commandes en cours ou servies à table
      return true;
    });
  }, [orders, filterState, categoryFilter]);

  // Stats for the active tabs badges
  const counts = useMemo(() => {
    const kitchenOnly = orders.filter((o) => o.items.some((i) => i.destination === 'cuisine' && matchesStation(i)));
    const uncashed = kitchenOnly.filter((o) => o.status !== 'payee' && o.status !== 'annulee');

    return {
      active: uncashed.length,
      in_prep: uncashed.filter((o) => o.status === 'envoye' || o.status === 'en_preparation' || o.status === 'nouveau').length,
      ready: uncashed.filter((o) => o.status === 'pret').length,
      servi: uncashed.filter((o) => o.status === 'servi').length,
      todayCompleted: kitchenOnly.filter(
        (o) =>
          o.createdAt?.startsWith(selectedDate) &&
          (o.status === 'payee' || o.status === 'servi')
      ).length,
    };
  }, [orders, selectedDate, categoryFilter]);

  // Orders for "Historique Journalier"
  const historyOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const hasKitchenItems = order.items.some((i) => i.destination === 'cuisine');
        if (!hasKitchenItems) return false;

        // Date matching
        const orderDate = (order.servedAt || order.paidAt || order.createdAt || '').slice(0, 10);
        if (orderDate !== selectedDate) return false;

        // Status filter
        if (historyStatusFilter === 'payee' && order.status !== 'payee') return false;
        if (historyStatusFilter === 'servi' && order.status !== 'servi') return false;

        // Search query
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

  // Group history orders hour-by-hour ("heure après heure")
  const hourlyGroups = useMemo(() => {
    const groups: { [hour: string]: Order[] } = {};

    historyOrders.forEach((order) => {
      // Use time of service or creation
      const refTime = order.servedAt || order.createdAt;
      const hour = refTime ? refTime.slice(11, 13) : '00';
      const slotLabel = `${hour}h00 - ${hour}h59`;

      if (!groups[slotLabel]) {
        groups[slotLabel] = [];
      }
      groups[slotLabel].push(order);
    });

    // Sort descending by hour (or ascending)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((slot) => ({
      slot,
      orders: groups[slot],
      totalCovers: groups[slot].reduce((acc, o) => acc + (o.guestCount || 1), 0),
      totalAmount: groups[slot].reduce((acc, o) => acc + o.total, 0),
    }));
  }, [historyOrders]);

  // History KPIs for selected date
  const historyKpis = useMemo(() => {
    const totalOrders = historyOrders.length;
    const totalCovers = historyOrders.reduce((acc, o) => acc + (o.guestCount || 1), 0);
    const totalRevenue = historyOrders.reduce((acc, o) => acc + o.total, 0);

    // Calculate average kitchen preparation duration
    const prepTimes: number[] = [];
    historyOrders.forEach((o) => {
      const end = o.preparedAt || o.servedAt || o.updatedAt;
      const diff = getMinutesBetween(o.createdAt, end);
      if (diff !== null && diff >= 0 && diff <= 180) {
        prepTimes.push(diff);
      }
    });

    const avgPrep = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length) : 0;

    return { totalOrders, totalCovers, totalRevenue, avgPrep };
  }, [historyOrders]);

  // Individual item transitions: en_attente -> en_preparation -> pret -> servi
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

  // Launch entire order in preparation
  const handleLaunchOrderPrep = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'cuisine' && i.status === 'en_attente')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'en_preparation');
      });
    updateOrderStatus(order.id, 'en_preparation');
    playAudioChime('kitchen');

    showToast({
      type: 'info',
      title: 'Préparation Lancée',
      message: `Le bon ${order.tableName || order.orderNumber} est en cours de cuisson.`,
    });
  };

  // Mark all kitchen items ready
  const handleMarkAllKitchenReady = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'cuisine' && i.status !== 'pret' && i.status !== 'servi')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'pret');
      });

    updateOrderStatus(order.id, 'pret');

    setLastCompletedOrder({
      id: order.id,
      number: order.orderNumber,
      table: order.tableName || 'À emporter',
    });

    playAudioChime('kitchen');

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });

    if (isNotifyReadyAllowed) {
      addNotification(
        'Commande Cuisine Prête',
        `La commande ${order.orderNumber} (${order.tableName || 'À emporter'}) est prête pour le service en salle.`,
        'success',
        'Cuisine',
        'moyenne'
      );
    }

    showToast({
      type: 'success',
      title: 'Plats Cuisine Prêts !',
      message: `Bon ${order.tableName || order.orderNumber} dressé et prêt à être servi en salle.`,
    });
  };

  // Mark order served to table ("Servi et Bon Appétit")
  const handleMarkOrderServed = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'cuisine')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'servi');
      });

    updateOrderStatus(order.id, 'servi');

    playAudioChime('success');

    showToast({
      type: 'success',
      title: 'Servi & Bon Appétit !',
      message: `La table ${order.tableName || order.orderNumber} a été servie. Elle reste affichée jusqu'au paiement.`,
    });
  };

  // Recall order (undo)
  const handleRecallOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'en_preparation');
    setLastCompletedOrder(null);
    showToast({
      type: 'warning',
      title: 'Bon rappelé en cuisine',
      message: 'Le bon de commande a été réintégré dans les préparations en cours.',
    });
  };

  // Date navigation helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Bannière Mode Sans Compte Cuisinier (Section 6 & 12 du Guide Genesis) */}
      {settings?.kitchenOperationMode === 'sans_compte' && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ChefHat className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300">Mode « Sans compte cuisinier » actif (Guide Section 6 & 12)</div>
              <div className="text-[11px] text-amber-200/80">Cet écran fait office de passe partagé. La caisse et les serveurs transmettent les commandes et peuvent gérer directement les statuts.</div>
            </div>
          </div>
          <span className="font-bold text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 shrink-0 hidden sm:inline">
            Écran Passe Partagé
          </span>
        </div>
      )}

      {/* Top Main Navigation & KDS Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Écran Cuisine KDS (Kitchen Display System)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-400">
              Modes opérationnels : En attente → En préparation → Prêt → Servi & Bon appétit → Historique journalier
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Règle 86 (Out of Stock / Épuisé) Toggle Button */}
          <button
            onClick={() => setModal86Open(true)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
              products.filter((p) => !p.available).length > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
            }`}
            title="Gérer les ruptures instantanées de plats et ingrédients (Règle 86)"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>Règle 86</span>
            {products.filter((p) => !p.available).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black animate-pulse">
                {products.filter((p) => !p.available).length}
              </span>
            )}
          </button>

          {/* Sound toggle & chime button */}
          <button
            onClick={() => {
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) playAudioChime('kitchen');
            }}
            className={`px-3 py-2 rounded-xl border transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Sonnette de cuisine active (Cliquer pour couper)' : 'Sonnette coupée (Cliquer pour réactiver)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="text-[11px] font-bold hidden sm:inline">{soundEnabled ? 'Sonnette Active' : 'Sonnette Muette'}</span>
          </button>

          {/* Prep Categories Filter */}
          {isPrepCategoriesAllowed && (
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs">
              {(['tous', 'chaud', 'froid', 'grillades'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-bold text-[11px] transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Operational Mode Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterState('active')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterState === 'active'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <span>En direct</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterState === 'active' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {counts.active}
              </span>
            </button>

            <button
              onClick={() => setFilterState('in_prep')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterState === 'in_prep'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>En préparation</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterState === 'in_prep' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {counts.in_prep}
              </span>
            </button>

            <button
              onClick={() => setFilterState('ready')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterState === 'ready'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Prêtes</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterState === 'ready' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {counts.ready}
              </span>
            </button>

            <button
              onClick={() => setFilterState('servi')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterState === 'servi'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Commandes servies à table, en attente de règlement au POS"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Servies à table</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterState === 'servi' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {counts.servi}
              </span>
            </button>

            <button
              onClick={() => setFilterState('history')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterState === 'history'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-emerald-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Historique Journalier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Undo / Recall Banner (shown if an action was just completed) */}
      {lastCompletedOrder && filterState !== 'history' && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Le bon <strong>{lastCompletedOrder.table} ({lastCompletedOrder.number})</strong> a été validé.
            </span>
          </div>
          <button
            onClick={() => handleRecallOrder(lastCompletedOrder.id)}
            className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Rappeler le bon (Annuler)</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 1 : HISTORIQUE JOURNALIER (Audit & Traçabilité heure par heure) */}
      {/* ========================================================= */}
      {filterState === 'history' ? (
        <div className="space-y-6">
          {/* History Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date selection & shortcuts */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    onClick={() => handleShiftDate(-1)}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors"
                    title="Jour précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 px-3">
                    <Calendar className="w-4 h-4 text-amber-600" />
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
                    title="Jour suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Date Pills */}
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

                {availableDates
                  .filter((d) => d !== new Date().toISOString().slice(0, 10))
                  .slice(0, 3)
                  .map((dateStr) => (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        selectedDate === dateStr
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {dateStr}
                    </button>
                  ))}
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Table, Bon, Serveur, Plat..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                  <button
                    onClick={() => setHistoryStatusFilter('servi')}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      historyStatusFilter === 'servi' ? 'bg-white text-slate-950 font-bold shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    À table
                  </button>
                </div>
              </div>
            </div>

            {/* Daily KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Commandes Servies</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">{historyKpis.totalOrders}</div>
                <div className="text-[10px] text-slate-500">bons traités sur la journée</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Couverts Totaux</div>
                <div className="text-lg font-black text-indigo-700 mt-0.5">{historyKpis.totalCovers}</div>
                <div className="text-[10px] text-slate-500">personnes servies à table</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Délai Moyen Cuisine</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">{historyKpis.avgPrep} min</div>
                <div className="text-[10px] text-slate-500">temps commande → prêt</div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chiffre d'Affaires</div>
                <div className="text-lg font-black text-amber-700 mt-0.5">{formatCurrency(historyKpis.totalRevenue)}</div>
                <div className="text-[10px] text-slate-500">sur la journée sélectionnée</div>
              </div>
            </div>
          </div>

          {/* Grouped orders hour after hour */}
          {hourlyGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3 shadow-xs">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <div className="text-base font-bold text-slate-700">
                Aucune commande pour le {selectedDate}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Les commandes servies et encaissées sur cette journée apparaîtront ici chronologiquement heure par heure avec tous leurs détails.
              </p>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Revenir à Aujourd'hui
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {hourlyGroups.map(({ slot, orders: slotOrders, totalCovers, totalAmount }) => (
                <div key={slot} className="space-y-3">
                  {/* Hourly Slot Header */}
                  <div className="flex items-center justify-between bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider">{slot}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                        {slotOrders.length} {slotOrders.length > 1 ? 'commandes' : 'commande'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-300 font-semibold">{totalCovers} couverts</span>
                      <span className="font-bold text-amber-400">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  {/* Orders Cards Grid for this hour */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {slotOrders.map((order) => {
                      const kitchenItems = order.items.filter((i) => i.destination === 'cuisine');
                      const prepTime = getMinutesBetween(order.createdAt, order.preparedAt || order.servedAt || order.updatedAt);
                      const tableDuration = order.paidAt
                        ? getMinutesBetween(order.servedAt || order.createdAt, order.paidAt)
                        : null;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden hover:border-slate-300 transition-all"
                        >
                          {/* Order Header */}
                          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900">
                                  {order.tableName || 'À emporter'}
                                </span>
                                {order.guestCount && order.guestCount > 0 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {order.guestCount} cvts
                                  </span>
                                ) : null}
                                <span className="text-xs font-mono font-bold text-slate-500">
                                  {order.orderNumber}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Serveur : <strong>{order.serverName}</strong></span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div>
                              {order.status === 'payee' ? (
                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <CheckCheck className="w-3 h-3" />
                                  <span>Payé & Libéré</span>
                                </span>
                              ) : order.status === 'servi' ? (
                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <Utensils className="w-3 h-3" />
                                  <span>Servi à table</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                                  {order.status}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Audit Timeline Horodatée */}
                          <div className="px-4 py-2.5 bg-slate-50/40 border-b border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                            <div>
                              <span className="text-slate-400">Prise commande :</span>{' '}
                              <strong className="text-slate-800">{formatTime(order.createdAt)}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Prêt cuisine :</span>{' '}
                              <strong className="text-slate-800">
                                {order.preparedAt ? formatTime(order.preparedAt) : formatTime(order.updatedAt)}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Servi à table :</span>{' '}
                              <strong className="text-slate-800">
                                {order.servedAt ? formatTime(order.servedAt) : 'Oui'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Encaissement :</span>{' '}
                              <strong className="text-slate-800">
                                {order.paidAt ? formatTime(order.paidAt) : 'En attente POS'}
                              </strong>
                            </div>
                          </div>

                          {/* Prep & Table Metrics Banner */}
                          <div className="px-4 py-1.5 bg-emerald-50/50 border-b border-emerald-100 text-[10px] font-bold text-emerald-800 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Prépa cuisine : {prepTime !== null ? `${prepTime} min` : '15 min'}</span>
                            </span>
                            {tableDuration !== null && (
                              <span className="flex items-center gap-1">
                                <Utensils className="w-3 h-3" />
                                <span>Séjour à table : {tableDuration} min</span>
                              </span>
                            )}
                          </div>

                          {/* Items List with Couvert badges */}
                          <div className="p-4 space-y-2 flex-1 divide-y divide-slate-100">
                            {kitchenItems.map((item) => (
                              <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900 w-5">
                                    {item.quantity}x
                                  </span>
                                  {item.seatNumber !== undefined && (
                                    <span
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                        item.seatNumber === 0
                                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {item.seatNumber === 0 ? 'Table' : `C${item.seatNumber}`}
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold text-slate-800">
                                    {item.productName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Servi</span>
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
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
        /* ========================================================= */
        /* VUE 2 : BONS ACTIFS EN PRODUCTION ET EN SALLE */
        /* ========================================================= */
        <>
          {activeKitchenOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs">
              <EmptyState
                icon={ChefHat}
                title="Aucun bon de commande en cours"
                description={
                  categoryFilter !== 'tous'
                    ? `Aucune commande active pour le poste « ${categoryFilter} ». Réinitialisez le filtre pour voir toutes les commandes.`
                    : "Toutes les préparations cuisine ont été envoyées, servies et encaissées ! Vous pouvez consulter l'historique journalier à tout moment."
                }
                actionLabel={categoryFilter !== 'tous' ? "Afficher tous les postes" : undefined}
                onAction={categoryFilter !== 'tous' ? () => setCategoryFilter('tous') : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeKitchenOrders.map((order) => {
                const elapsed = getMinutesElapsed(order.createdAt);
                const isLate = elapsed > 25;
                const isMedium = elapsed > 15 && !isLate;
                const kitchenItems = order.items.filter((i) => i.destination === 'cuisine' && matchesStation(i));

                // State checks on items
                const hasPendingItems = kitchenItems.some((i) => i.status === 'en_attente');
                const hasInPrepItems = kitchenItems.some((i) => i.status === 'en_preparation');
                const isOrderServi = order.status === 'servi';

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-3xl border-2 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                      isOrderServi
                        ? 'border-emerald-300 ring-2 ring-emerald-100 bg-white'
                        : isLate
                        ? 'border-red-500 ring-2 ring-red-100'
                        : isMedium
                        ? 'border-amber-400'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div
                      className={`p-4 border-b flex items-start justify-between ${
                        isOrderServi
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : isLate
                          ? 'bg-red-50/80 border-red-200'
                          : isMedium
                          ? 'bg-amber-50/80 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {order.tableName || 'À emporter'}
                          </span>
                          {order.guestCount && order.guestCount > 0 ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                              {order.guestCount} cvts
                            </span>
                          ) : null}
                          <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                            {order.orderNumber}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Serveur : <strong className="text-slate-800">{order.serverName}</strong>
                        </div>
                      </div>

                      {/* Header Badge: Status, Priority or Elapsed Timer */}
                      <div className="flex flex-col items-end gap-1.5">
                        {isPriorityAllowed && (order.notes?.toLowerCase().includes('urgent') || (order.total && order.total >= 40000)) && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-2xs">
                            <Flame className="w-3.5 h-3.5" />
                            <span>VIP / Urgent</span>
                          </span>
                        )}

                        {isOrderServi ? (
                          <div className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Utensils className="w-3.5 h-3.5" />
                            <span>Servi à table</span>
                          </div>
                        ) : isPrepTimerAllowed ? (
                          <div
                            className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full border tabular-nums ${
                              isLate && isNotifyDelayAllowed
                                ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-xs'
                                : isMedium
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                            aria-label={`Temps écoulé : ${elapsed} minutes`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{elapsed} min</span>
                          </div>
                        ) : null}

                        {order.status === 'en_preparation' && !isOrderServi && (
                          <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                            <span>En préparation</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-4 space-y-3 flex-1 divide-y divide-slate-100">
                      {kitchenItems.map((item) => {
                        const isServi = item.status === 'servi';
                        const isReady = item.status === 'pret';
                        const isInPrep = item.status === 'en_preparation';
                        const isPending = item.status === 'en_attente';

                        const hasCriticalNote =
                          item.notes &&
                          CRITICAL_KEYWORDS.some((kw) => item.notes?.toLowerCase().includes(kw));

                        return (
                          <div
                            key={item.id}
                            className={`pt-3 first:pt-0 space-y-2 ${
                              isServi ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base sm:text-lg font-black text-slate-900 w-7 tabular-nums shrink-0">
                                  {item.quantity}x
                                </span>
                                {item.seatNumber !== undefined && (
                                  <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${
                                      item.seatNumber === 0
                                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                                        : 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                                    }`}
                                    title={
                                      item.seatLabel ||
                                      (item.seatNumber === 0 ? 'Table' : `Couvert ${item.seatNumber}`)
                                    }
                                  >
                                    {item.seatNumber === 0 ? 'Table' : `C${item.seatNumber}`}
                                  </span>
                                )}
                                {item.courseTiming && item.courseTiming !== 'direct' && (
                                  <span
                                    className={`text-xs font-black px-2 py-0.5 rounded border uppercase shrink-0 ${
                                      item.courseTiming === 'entree'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : item.courseTiming === 'plat'
                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-purple-100 text-purple-900 border-purple-300'
                                    }`}
                                  >
                                    {item.courseTiming === 'entree' ? 'Entrée' : item.courseTiming === 'plat' ? 'Plat' : 'Dessert'}
                                  </span>
                                )}
                                <span
                                  className={`text-sm sm:text-base font-bold leading-snug ${
                                    isServi
                                      ? 'line-through text-slate-400'
                                      : isReady
                                      ? 'text-slate-700 font-black'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {item.productName}
                                </span>
                              </div>

                              {/* Progressive Item Action Button: en_attente -> en_prep -> pret -> servi */}
                              <div className="shrink-0">
                                {isPending ? (
                                  <button
                                    onClick={() => handleNextItemStatus(order.id, item)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                                  >
                                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Lancer</span>
                                  </button>
                                ) : isInPrep ? (
                                  <button
                                    onClick={() => handleNextItemStatus(order.id, item)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 text-xs font-bold transition-colors cursor-pointer border border-slate-200 hover:border-emerald-300 shadow-2xs active:scale-95"
                                  >
                                    Prêt
                                  </button>
                                ) : isReady ? (
                                  <button
                                    onClick={() => handleNextItemStatus(order.id, item)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-black border border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                                    title="Marquer comme servi à table"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Servir</span>
                                  </button>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>Servi</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Special preparation note / allergies */}
                            {item.notes && (
                              <div
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold ${
                                  hasCriticalNote
                                    ? 'bg-rose-100 text-rose-950 border border-rose-300 font-bold'
                                    : 'bg-amber-50 text-amber-950 border border-amber-200'
                                }`}
                              >
                                {hasCriticalNote && <span className="font-black mr-1 uppercase text-rose-700">Attention :</span>}
                                {item.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* General order note */}
                      {order.notes && (
                        <div className="pt-2 text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          Note client : {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Card Bump Bar Actions */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                      {hasPendingItems ? (
                        <button
                          onClick={() => handleLaunchOrderPrep(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                        >
                          <Flame className="w-4 h-4" />
                          <span>Lancer la préparation</span>
                        </button>
                      ) : hasInPrepItems ? (
                        <button
                          onClick={() => handleMarkAllKitchenReady(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tout Prêt Cuisine</span>
                        </button>
                      ) : !isOrderServi ? (
                        <button
                          onClick={() => handleMarkOrderServed(order)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition-all shadow-md active:scale-98 cursor-pointer"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>Servi et Bon Appétit !</span>
                        </button>
                      ) : (
                        /* Commande servie : elle RESTE ICI jusqu'à encaissement au POS ! */
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-emerald-50 rounded-2xl border border-emerald-200">
                          <div className="flex items-center gap-2 text-left">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <Utensils className="w-3.5 h-3.5 text-emerald-800" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                <span>Servi & Bon Appétit !</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                              </div>
                              <div className="text-[10px] text-emerald-700">
                                Reste visible jusqu'à l'encaissement et libération au POS
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRecallOrder(order.id)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-emerald-300 text-slate-700 hover:bg-emerald-100 transition-colors shadow-2xs shrink-0 cursor-pointer"
                            title="Rappeler la commande en cuisine"
                          >
                            Rappeler
                          </button>
                        </div>
                      )}

                      {isPrintTicketAllowed && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              showToast({
                                type: 'info',
                                title: 'Impression Bon Cuisine',
                                message: `Bon de commande #${order.orderNumber} (${order.tableName || 'Comptoir'}) envoyé à l'imprimante cuisine.`,
                              });
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 py-1 px-2.5 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" />
                            <span>Imprimer Bon Cuisine</span>
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
      {/* Règle 86 Modal (Fast Kitchen Out-of-Stock Engine) */}
      {modal86Open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <span>Règle 86 — Ruptures de Carte en Direct</span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400">
                      Synchronisation POS / Bornes
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Basculez un produit en rupture d'un clic pour bloquer instantanément sa commande en salle.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModal86Open(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-slate-950/50 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Rechercher un plat, boisson ou ingrédient à passer en 86..."
                  value={search86}
                  onChange={(e) => setSearch86(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar max-h-[55vh]">
              {products
                .filter((p) => {
                  if (!search86.trim()) return true;
                  const q = search86.toLowerCase();
                  return p.name.toLowerCase().includes(q) || (p.categoryId || '').toLowerCase().includes(q);
                })
                .map((product) => {
                  const is86 = !product.available;
                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        is86
                          ? 'bg-rose-950/30 border-rose-500/30'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            is86 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {is86 ? <Ban className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              {product.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 uppercase">
                              {product.categoryId || 'Plat'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {formatCurrency(product.price, 'FCFA')}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await toggleProduct86(product.id);
                          playAudioChime('tap');
                          showToast({
                            type: is86 ? 'success' : 'warning',
                            title: is86 ? 'Produit Réactivé' : 'Règle 86 Activée',
                            message: `${product.name} est désormais ${
                              is86 ? 'disponible à la commande' : 'en RUPTURE (86)'
                            }.`,
                          });
                        }}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 shrink-0 active:scale-95 ${
                          is86
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-emerald-500/20 hover:bg-rose-600/80 hover:text-white text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {is86 ? (
                          <>
                            <Ban className="w-4 h-4" />
                            <span>86 • RUPTURE</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>En Vente</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="text-slate-400">
                Plats en rupture active :{' '}
                <strong className="text-rose-400 font-black">
                  {products.filter((p) => !p.available).length}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setModal86Open(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-colors"
              >
                Terminer & Retour au KDS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
