import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Product, RestaurantTable, Order, OrderItem, UserProfile } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { SupervisorPinModal } from '../auth/SupervisorPinModal';
import {
  Lock,
  Unlock,
  Bell,
  Receipt,
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Maximize2,
  Minimize2,
  Sparkles,
  Coffee,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ArrowLeft,
  Settings,
  Clock,
  Radio,
  Users,
  LogOut,
} from 'lucide-react';

interface TableKioskViewProps {
  initialTableId?: string;
  onExit?: (shouldUnpair?: boolean, supervisor?: UserProfile) => void;
}

export const TableKioskView: React.FC<TableKioskViewProps> = ({
  initialTableId,
  onExit,
}) => {
  const {
    tables,
    categories,
    products,
    settings,
    orders,
    createOrder,
    addItemsToOrder,
    updateTableGuestsCount,
    callWaiterFromTablet,
    dismissWaiterCall,
    requestBillFromTablet,
    unlockTableTablet,
    lockTableTablet,
    currentDeviceProfile,
    unpairCurrentDevice,
  } = useRestaurant();

  const { showToast, playAudioChime } = useToast();
  const { currentUser } = useAuth();

  // 1. Table assignée à cette tablette (persistance en LocalStorage)
  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    if (initialTableId) return initialTableId;
    try {
      const saved = localStorage.getItem('restomaster_tablet_table_id');
      if (saved && tables.some((t) => t.id === saved)) return saved;
    } catch {
      // ignore
    }
    return tables[0]?.id || 't1';
  });

  useEffect(() => {
    if (selectedTableId) {
      try {
        localStorage.setItem('restomaster_tablet_table_id', selectedTableId);
      } catch {
        // ignore
      }
    }
  }, [selectedTableId]);

  // Table active en temps réel
  const activeTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || tables[0];
  }, [tables, selectedTableId]);

  // Commande en cours sur cette table
  const currentTableOrder = useMemo(() => {
    if (!activeTable) return null;
    if (activeTable.currentOrderId) {
      const ord = orders.find((o) => o.id === activeTable.currentOrderId);
      if (ord && ord.status !== 'payee' && ord.status !== 'annulee') return ord;
    }
    return orders.find(
      (o) =>
        o.tableId === activeTable.id &&
        o.status !== 'payee' &&
        o.status !== 'annulee'
    ) || null;
  }, [orders, activeTable]);

  // 2. Gestion des Couverts / Seats pour la Table
  const [totalSeats, setTotalSeats] = useState<number>(() => {
    return (
      currentTableOrder?.guestCount ||
      activeTable?.guestsCount ||
      activeTable?.capacity ||
      2
    );
  });
  const [activeSeatNumber, setActiveSeatNumber] = useState<number>(1);

  // Synchronisation dynamique si la table ou la commande change
  useEffect(() => {
    const updatedCount =
      currentTableOrder?.guestCount ||
      activeTable?.guestsCount ||
      activeTable?.capacity ||
      2;
    setTotalSeats(Math.max(1, updatedCount));
  }, [currentTableOrder?.guestCount, activeTable?.guestsCount, activeTable?.capacity]);

  const distinctSeats = useMemo(() => {
    const list: { seatNumber: number; label: string }[] = [
      { seatNumber: 0, label: 'Partagé / Table' },
    ];
    for (let i = 1; i <= totalSeats; i++) {
      list.push({ seatNumber: i, label: `Couvert ${i}` });
    }
    return list;
  }, [totalSeats]);

  const handleAddSeat = async () => {
    const next = totalSeats + 1;
    setTotalSeats(next);
    setActiveSeatNumber(next);
    if (activeTable?.id) {
      await updateTableGuestsCount(activeTable.id, next);
    }
    playAudioChime('tap');
    showToast(`Couvert ${next} ajouté pour la Table ${activeTable?.number}`, 'info');
  };

  const handleUpdateTotalSeats = async (delta: number) => {
    const next = Math.max(1, totalSeats + delta);
    setTotalSeats(next);
    if (activeSeatNumber > next) {
      setActiveSeatNumber(next);
    }
    if (activeTable?.id) {
      await updateTableGuestsCount(activeTable.id, next);
    }
    playAudioChime('tap');
  };

  // Catégorie sélectionnée & Recherche
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Panier local des convives sur la tablette
  interface CartItem {
    id: string;
    product: Product;
    quantity: number;
    seatNumber: number;
    seatLabel: string;
    notes?: string;
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);

  // Modals & Plein Écran
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [supervisorAction, setSupervisorAction] = useState<'unlock_tablet' | 'exit_kiosk' | 'switch_table'>('unlock_tablet');
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Bascule Plein Écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Filtrage des articles de la carte
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.available) return false;
      const matchesCategory = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Gestion du Panier Local avec attribution par Couvert
  const handleAddToCart = (product: Product, targetSeat = activeSeatNumber) => {
    playAudioChime('tap');
    const seatLabel = targetSeat === 0 ? 'Partagé / Table' : `Couvert ${targetSeat}`;
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.seatNumber === targetSeat
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `kiosk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          product,
          quantity: 1,
          seatNumber: targetSeat,
          seatLabel,
        },
      ];
    });
    showToast(`${product.name} ajouté pour ${seatLabel}`, 'info');
  };

  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    playAudioChime('tap');
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleReassignItemSeat = (cartItemId: string, newSeat: number) => {
    const seatLabel = newSeat === 0 ? 'Partagé / Table' : `Couvert ${newSeat}`;
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? { ...item, seatNumber: newSeat, seatLabel }
          : item
      )
    );
    playAudioChime('tap');
    showToast(`Plat transféré vers ${seatLabel}`, 'info');
  };

  const handleUpdateItemNotes = (cartItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, notes } : item))
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Envoyer la commande convive vers la cuisine / bar
  const handleSendOrder = async () => {
    if (cart.length === 0 || !activeTable) return;
    setIsOrderSubmitting(true);
    playAudioChime('success');

    try {
      const orderItems: OrderItem[] = cart.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
        destination: item.product.destination,
        notes: item.notes || `Borne Client - ${item.seatLabel}`,
        status: 'en_attente',
        seatNumber: item.seatNumber,
        seatLabel: item.seatLabel,
      }));

      if (currentTableOrder) {
        // Synchronisation directe : ajout à la commande active de la table
        await addItemsToOrder(currentTableOrder.id, orderItems, totalSeats);
        showToast(`Plats envoyés en cuisine & bar pour la Table ${activeTable.number} !`, 'success');
      } else {
        // Première commande de la table
        await createOrder({
          type: 'sur_place',
          tableId: activeTable.id,
          tableName: `Table ${activeTable.number}`,
          serverId: activeTable.assignedServerId || 'srv-kiosk',
          serverName: activeTable.assignedServerName || 'Commande Borne Client',
          items: orderItems,
          guestCount: totalSeats,
          notes: `Commande passée directement depuis la tablette de la Table ${activeTable.number}`,
        });
        showToast('Votre commande a bien été transmise en cuisine et au bar !', 'success');
      }

      setCart([]);
      setIsCartOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast('Erreur lors de la transmission de la commande.', 'error');
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  // Appel Serveur
  const handleCallWaiter = async () => {
    if (!activeTable) return;
    playAudioChime('success');
    await callWaiterFromTablet(activeTable.id);
    showToast(`Un serveur a été averti et arrive à la Table ${activeTable.number} !`, 'info');
  };

  // Demande d'addition
  const handleRequestBill = async () => {
    if (!activeTable) return;
    playAudioChime('tap');
    await requestBillFromTablet(activeTable.id);
    showToast(`Votre demande d'addition a été transmise à la caisse pour la Table ${activeTable.number}.`, 'info');
  };

  // Déverrouillage Local avec PIN Superviseur
  const handleSupervisorSuccess = async (supervisor?: UserProfile) => {
    if (supervisorAction === 'unlock_tablet' && activeTable) {
      await unlockTableTablet(activeTable.id);
      showToast(`Tablette déverrouillée localement par ${supervisor?.name || 'Superviseur'}`, 'success');
    } else if (supervisorAction === 'exit_kiosk') {
      if (currentDeviceProfile?.type === 'tablette_table') {
        await unpairCurrentDevice();
        showToast('Terminal désappairé et mode borne quitté avec succès', 'success');
      } else {
        showToast(`Mode Borne quitté par ${supervisor?.name || 'Superviseur'}`, 'success');
      }
      if (onExit) onExit(true, supervisor);
    } else if (supervisorAction === 'switch_table') {
      setShowTablePicker(true);
    }
  };

  // =========================================================================
  // ÉCRAN 1 : TABLETTE VERROUILLÉE À DISTANCE (EXIGENCES AUDIO DU CLIENT)
  // =========================================================================
  if (activeTable?.tabletLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 text-white flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none">
        {/* Top Bar with Status and Realtime sync */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
            </div>
            <div className="text-xs font-semibold text-rose-300 tracking-wider uppercase">
              Verrouillage Administratif à Distance
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/50">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Synchronisation Firebase en direct</span>
          </div>
        </div>

        {/* Center: Big Lock Indicator & Message */}
        <div className="max-w-xl mx-auto w-full text-center flex flex-col items-center my-auto">
          {/* Animated Lock Badge */}
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-500/20 animate-pulse">
              <Lock className="w-14 h-14" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-rose-600 text-white p-2 rounded-xl shadow-lg border border-rose-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Table {activeTable.number} Verrouillée
          </h1>

          <p className="text-slate-300 text-base sm:text-lg mb-6 leading-relaxed">
            Cette tablette a été verrouillée à distance par la Direction du restaurant via la plateforme centrale.
          </p>

          {/* Reason Box */}
          <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 mb-8 shadow-xl text-left">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>Motif de verrouillage :</span>
            </div>
            <p className="text-white font-medium text-sm sm:text-base">
              « {activeTable.tabletLockedReason || "Service temporairement suspendu ou table en cours d'encaissement"} »
            </p>
            {activeTable.tabletLockedBy && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Verrouillé par : <span className="text-slate-200 font-semibold">{activeTable.tabletLockedBy}</span></span>
                {activeTable.tabletLockedAt && (
                  <span>à {new Date(activeTable.tabletLockedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            )}
          </div>

          {/* Guest Guidance */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs sm:text-sm mb-6 flex items-center space-x-3">
            <Sparkles className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Chers convives, veuillez vous adresser à notre équipe en salle. La tablette se déverrouillera automatiquement dès la validation du service.
            </span>
          </div>

          {/* Local Emergency Unlock Button */}
          <button
            onClick={() => {
              setSupervisorAction('unlock_tablet');
              setShowSupervisorModal(true);
            }}
            className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-5 py-2.5 rounded-xl border border-slate-700 transition-all active:scale-95"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>Déverrouiller avec le compte administrateur / Code PIN</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          <div>
            RestoMaster Tablet OS • {settings.name} • {activeTable.zone}
          </div>
          <div>Terminal Borne #{activeTable.id}</div>
        </div>

        {/* Supervisor PIN Modal */}
        <SupervisorPinModal
          isOpen={showSupervisorModal}
          onClose={() => setShowSupervisorModal(false)}
          onSuccess={handleSupervisorSuccess}
          title="Déverrouillage Administrateur"
          description={`Saisissez le PIN Direction ou Manager pour déverrouiller localement la Table ${activeTable.number}.`}
        />
      </div>
    );
  }

  // =========================================================================
  // ÉCRAN 2 : INTERFACE DE COMMANDE DIGITALE CLIENT DÉVERROUILLÉE
  // =========================================================================
  return (
    <div className="fixed inset-0 z-40 bg-slate-900 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Kiosk Header */}
      <header className="px-3 sm:px-6 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Restaurant & Table identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-sm sm:text-lg flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            {activeTable?.number || '1'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-white text-xs sm:text-sm md:text-base truncate">Table {activeTable?.number}</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 shrink-0 hidden xs:inline">
                {activeTable?.zone || 'Salle'}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 truncate">
              <span className="truncate">{settings.name}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Borne Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="hidden lg:flex items-center relative w-60 xl:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Rechercher un plat, une boisson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 text-xs rounded-xl pl-9 pr-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Right: Quick Table Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Appel Serveur */}
          <button
            onClick={handleCallWaiter}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTable?.tabletCallWaiterPending
                ? 'bg-amber-500 text-slate-950 animate-bounce shadow-lg shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
            }`}
            title="Appeler un serveur"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden xl:inline">
              {activeTable?.tabletCallWaiterPending ? 'Serveur prévenu' : 'Appeler Serveur'}
            </span>
          </button>

          {/* Demander l'addition */}
          <button
            onClick={handleRequestBill}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              activeTable?.tabletBillRequested
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Demander l'addition"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">
              {activeTable?.tabletBillRequested ? 'Addition demandée' : "Demander l'Addition"}
            </span>
          </button>

          {/* Panier bouton */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            title="Consulter ma commande"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span className="hidden xs:inline">Commande</span>
            {cartItemsCount > 0 && (
              <span className="ml-0.5 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-950 text-white text-[10px] font-bold flex items-center justify-center">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Plein écran */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Plein Écran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Staff Settings Dropdown / Exit (PIN Protected) */}
          <button
            onClick={() => {
              setSupervisorAction('exit_kiosk');
              setShowSupervisorModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Quitter le mode tablette (Code PIN Requis)"
          >
            <LogOut className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline text-xs font-semibold">Quitter</span>
          </button>
        </div>
      </header>

      {/* Couvert Selector Bar (Tablette / Convives) */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 overflow-x-auto custom-scrollbar">
        {/* Left: Total covers indicator and stepper */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 shadow-xs">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="font-black text-white">{totalSeats}</span>
            <span className="text-[11px] text-slate-400 font-medium">couvert{totalSeats > 1 ? 's' : ''}</span>
            <div className="flex items-center ml-1.5 border-l border-slate-700 pl-2 space-x-1">
              <button
                type="button"
                onClick={() => handleUpdateTotalSeats(-1)}
                disabled={totalSeats <= 1}
                className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40 transition-colors"
                title="Diminuer le nombre de couverts"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleUpdateTotalSeats(1)}
                className="w-5 h-5 rounded-md flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
                title="Augmenter le nombre de couverts"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Center: Couvert tabs (Partagé + Couvert 1, 2, 3...) */}
        <div className="flex items-center space-x-2 overflow-x-auto py-0.5 custom-scrollbar">
          {distinctSeats.map((s) => {
            const isSelected = activeSeatNumber === s.seatNumber;
            const itemsInCartForSeat = cart.filter((i) => i.seatNumber === s.seatNumber);
            const countForSeat = itemsInCartForSeat.reduce((acc, it) => acc + it.quantity, 0);

            return (
              <button
                key={s.seatNumber}
                type="button"
                onClick={() => setActiveSeatNumber(s.seatNumber)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 hover:text-white'
                }`}
              >
                <span>{s.label}</span>
                {countForSeat > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected
                        ? 'bg-slate-950 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {countForSeat}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Add Seat button */}
          <button
            type="button"
            onClick={handleAddSeat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all whitespace-nowrap active:scale-95"
            title="Ajouter un convive à cette table"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Couvert</span>
          </button>
        </div>

        {/* Right: Active seat indicator pill */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 shrink-0 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <span className="text-[11px]">Saisie en cours pour :</span>
          <span className="font-black text-amber-400">
            {activeSeatNumber === 0 ? 'Partagé (Table)' : `Couvert ${activeSeatNumber}`}
          </span>
        </div>
      </div>

      {/* Mobile Category Chips Bar (Visible on mobile/portrait tablet < md) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0 custom-scrollbar">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
            selectedCategoryId === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tout le Menu</span>
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
              selectedCategoryId === cat.id
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar (Visible on md and above) */}
        <aside className="hidden md:flex md:w-56 lg:w-60 bg-slate-900/50 border-r border-slate-800 flex-col shrink-0">
          <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Notre Carte Gourmande
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                selectedCategoryId === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Tout le Menu</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Switch Table Button for testing / staff */}
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => {
                setSupervisorAction('switch_table');
                setShowSupervisorModal(true);
              }}
              className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center justify-between"
            >
              <span>Changer de table</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </aside>

        {/* Product Catalog Grid */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-950/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const inCartForActive = cart.find(
                (item) => item.product.id === product.id && item.seatNumber === activeSeatNumber
              );
              const allInCart = cart.filter((item) => item.product.id === product.id);
              const totalAllSeats = allInCart.reduce((sum, it) => sum + it.quantity, 0);

              return (
                <div
                  key={product.id}
                  className="bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/50 transition-all flex flex-col group"
                >
                  {/* Image container */}
                  <div className="h-40 bg-slate-800 relative overflow-hidden flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center">
                        <UtensilsCrossed className="w-10 h-10 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium">Délices RestoMaster</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-400 font-black text-xs border border-amber-500/30">
                      {formatCurrency(product.price, settings.currency)}
                    </div>
                    {product.destination === 'bar' && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-blue-500/80 backdrop-blur-md text-white font-bold text-[9px] uppercase tracking-wider">
                        Bar
                      </div>
                    )}
                    {totalAllSeats > 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/90 backdrop-blur-md text-amber-300 font-bold text-[10px] border border-amber-500/20">
                        {totalAllSeats} au total à table
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">
                        {product.name}
                      </h4>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3">
                        {product.description || 'Préparation savoureuse élaborée avec des ingrédients frais locaux.'}
                      </p>
                    </div>

                    {/* Actions Couvert-aware */}
                    <div className="pt-2 border-t border-slate-800/80">
                      {inCartForActive ? (
                        <div className="flex items-center space-x-2 bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-700 w-full justify-between">
                          <button
                            onClick={() => handleUpdateQuantity(inCartForActive.id, -1)}
                            className="p-1 rounded-lg bg-slate-700 text-white hover:bg-slate-600 active:scale-90 transition-transform"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-center">
                            <span className="font-bold text-xs text-amber-400 block">
                              {inCartForActive.quantity} {activeSeatNumber === 0 ? 'Partagé' : `C${activeSeatNumber}`}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUpdateQuantity(inCartForActive.id, 1)}
                            className="p-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-90 transition-transform"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-400 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            Ajouter ({activeSeatNumber === 0 ? 'Partagé' : `Couvert ${activeSeatNumber}`})
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Cart / Order Drawer Grouped by Couvert */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 h-full border-l border-slate-800 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Commande Table {activeTable?.number}</h3>
                  <p className="text-xs text-slate-400">
                    {totalSeats} couvert{totalSeats > 1 ? 's' : ''} • {cartItemsCount} article{cartItemsCount > 1 ? 's' : ''} en attente d'envoi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 1. Existing active order items if any, grouped by Couvert */}
              {currentTableOrder && currentTableOrder.items.length > 0 && (
                <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Déjà commandé & en préparation :</span>
                    </div>
                    <span className="text-xs font-black text-emerald-300">
                      {formatCurrency(currentTableOrder.total, settings.currency)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {distinctSeats.map((seat) => {
                      const orderedForSeat = currentTableOrder.items.filter(
                        (it) => (it.seatNumber ?? 0) === seat.seatNumber
                      );
                      if (orderedForSeat.length === 0) return null;
                      const seatSubtotal = orderedForSeat.reduce(
                        (s, it) => s + it.unitPrice * it.quantity,
                        0
                      );

                      return (
                        <div
                          key={seat.seatNumber}
                          className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800 pb-1">
                            <span className="text-amber-400 flex items-center space-x-1">
                              <span>{seat.label}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({orderedForSeat.reduce((acc, it) => acc + it.quantity, 0)} plats)
                              </span>
                            </span>
                            <span className="text-slate-300">
                              {formatCurrency(seatSubtotal, settings.currency)}
                            </span>
                          </div>

                          <div className="space-y-1 pt-1">
                            {orderedForSeat.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-slate-200"
                              >
                                <div className="flex items-center space-x-2 min-w-0 pr-2">
                                  <span className="font-bold text-white shrink-0">
                                    {item.quantity}x
                                  </span>
                                  <span className="truncate">{item.productName}</span>
                                  <span
                                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold shrink-0 ${
                                      item.status === 'servi'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : item.status === 'pret'
                                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                        : item.status === 'en_preparation'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}
                                  >
                                    {item.status === 'servi'
                                      ? 'Servi'
                                      : item.status === 'pret'
                                      ? 'Prêt'
                                      : item.status === 'en_preparation'
                                      ? 'En Cuisine'
                                      : 'En attente'}
                                  </span>
                                </div>
                                <span className="text-slate-400 text-[11px] font-semibold shrink-0">
                                  {formatCurrency(
                                    item.unitPrice * item.quantity,
                                    settings.currency
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. New items in Cart grouped by Couvert */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Nouveaux articles à envoyer :</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {cart.length} ligne{cart.length > 1 ? 's' : ''}
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-800/30 rounded-2xl border border-dashed border-slate-800 p-4">
                    Aucun nouvel article sélectionné.<br />
                    Choisissez des plats sur la carte pour le Couvert {activeSeatNumber === 0 ? 'Partagé' : activeSeatNumber}.
                  </div>
                ) : (
                  distinctSeats.map((seat) => {
                    const seatItems = cart.filter((i) => i.seatNumber === seat.seatNumber);
                    if (seatItems.length === 0) return null;
                    const seatSubtotal = seatItems.reduce(
                      (s, i) => s + i.product.price * i.quantity,
                      0
                    );

                    return (
                      <div
                        key={seat.seatNumber}
                        className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3 space-y-2.5 shadow-sm"
                      >
                        {/* Seat Header */}
                        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="font-bold text-xs text-white">{seat.label}</span>
                            <span className="text-[10px] text-slate-400">
                              ({seatItems.reduce((acc, it) => acc + it.quantity, 0)} articles)
                            </span>
                          </div>
                          <span className="font-black text-xs text-amber-400">
                            {formatCurrency(seatSubtotal, settings.currency)}
                          </span>
                        </div>

                        {/* Seat Items */}
                        <div className="space-y-2">
                          {seatItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-white truncate">
                                    {item.product.name}
                                  </div>
                                  <div className="text-[11px] text-amber-400 font-semibold">
                                    {formatCurrency(item.product.price, settings.currency)} / unité
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                    className="p-1 rounded-lg bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 active:scale-95"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="font-bold text-xs text-white px-1.5">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, 1)}
                                    className="p-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveFromCart(item.id)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 ml-1 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Seat Reassigner & Notes */}
                              <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                                <label className="text-[10px] text-slate-400 font-bold shrink-0">
                                  Assigner à :
                                </label>
                                <select
                                  value={item.seatNumber}
                                  onChange={(e) =>
                                    handleReassignItemSeat(item.id, Number(e.target.value))
                                  }
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300"
                                >
                                  {distinctSeats.map((s) => (
                                    <option key={s.seatNumber} value={s.seatNumber}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="text"
                                  placeholder="Note (sans oignon, cuisson...)"
                                  value={item.notes || ''}
                                  onChange={(e) => handleUpdateItemNotes(item.id, e.target.value)}
                                  className="flex-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer Summary & Submit */}
            <div className="p-4 border-t border-slate-800 bg-slate-800/90 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Nouvelle sélection :</span>
                  <span className="font-bold text-white">
                    {formatCurrency(cartTotal, settings.currency)}
                  </span>
                </div>
                {currentTableOrder && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Déjà commandé sur la table :</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(currentTableOrder.total, settings.currency)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-700/60 font-black">
                  <span className="text-slate-200">
                    {currentTableOrder ? 'Total cumulé table :' : 'Total à régler :'}
                  </span>
                  <span className="text-lg text-amber-400">
                    {formatCurrency(
                      (currentTableOrder?.total || 0) + cartTotal,
                      settings.currency
                    )}
                  </span>
                </div>
              </div>

              <button
                disabled={cart.length === 0 || isOrderSubmitting}
                onClick={handleSendOrder}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>
                  {isOrderSubmitting
                    ? 'Transmission en cours...'
                    : currentTableOrder
                    ? 'Envoyer les ajouts en Cuisine & Bar'
                    : 'Envoyer la Commande en Cuisine & Bar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Switcher Modal for Testing */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-1">Assigner cette Tablette à une Table</h3>
            <p className="text-xs text-slate-400 mb-4">
              Sélectionnez la table physique où est posée cette tablette tactile.
            </p>
            <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto mb-4">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTableId(t.id);
                    setShowTablePicker(false);
                    showToast(`Tablette configurée sur Table ${t.number}`, 'success');
                  }}
                  className={`p-3 rounded-xl text-center border font-bold text-sm transition-all ${
                    t.id === selectedTableId
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                      : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div>Table {t.number}</div>
                  <div className="text-[10px] font-normal opacity-70">{t.zone}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTablePicker(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Supervisor PIN Modal */}
      <SupervisorPinModal
        isOpen={showSupervisorModal}
        onClose={() => setShowSupervisorModal(false)}
        onSuccess={handleSupervisorSuccess}
        title={
          supervisorAction === 'exit_kiosk'
            ? 'Quitter le Mode Borne Tablette'
            : supervisorAction === 'switch_table'
            ? 'Changer la table assignée'
            : 'Autorisation Superviseur'
        }
        description="Saisissez votre code PIN Superviseur (Direction ou Manager) pour continuer."
      />
    </div>
  );
};
