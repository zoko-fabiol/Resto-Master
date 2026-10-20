import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { CashMovement, Order, PaymentMethod } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { printerService } from '../../services/printing/printerService';
import { ThermalReceiptModal } from '../pos/ThermalReceiptModal';
import {
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  FileText,
  Calculator,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  ShieldAlert,
  Printer,
  Bluetooth,
  CreditCard,
  Utensils,
  Receipt,
  Search,
  Check,
  Send,
  Clock,
  User,
  Users,
  Bell,
  Lightbulb,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CashRegisterViewProps {
  onOpenPayment?: (orderId: string) => void;
}

const DENOMINATIONS = [
  { value: 10000, label: '10 000 FCFA', type: 'billet' },
  { value: 5000, label: '5 000 FCFA', type: 'billet' },
  { value: 2000, label: '2 000 FCFA', type: 'billet' },
  { value: 1000, label: '1 000 FCFA', type: 'billet' },
  { value: 500, label: '500 FCFA (Billet)', type: 'billet' },
  { value: 500, label: '500 FCFA (Pièce)', type: 'piece' },
  { value: 100, label: '100 FCFA', type: 'piece' },
  { value: 50, label: '50 FCFA', type: 'piece' },
  { value: 25, label: '25 FCFA', type: 'piece' },
];

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ onOpenPayment }) => {
  const {
    cashSession,
    cashMovements,
    recordCashMovement,
    closeCashRegister,
    openCashRegister,
    settings,
    updateSettings,
    orders,
    tables,
    updateOrderStatus,
    updateTableStatus,
    peripherals,
    isRuleEnabled,
  } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  // Navigation tab within CashRegister
  const [activeTab, setActiveTab] = useState<'additions' | 'session' | 'historique'>('additions');

  // Modals
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [duplicateOrder, setDuplicateOrder] = useState<Order | null>(null);

  // Movement Form
  const [movType, setMovType] = useState<CashMovement['type']>('entree');
  const [movAmount, setMovAmount] = useState<number>(10000);
  const [movReason, setMovReason] = useState('');

  // Closing Form
  const [countedTotal, setCountedTotal] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [useAssistedCounting, setUseAssistedCounting] = useState(true);
  const [denominationCounts, setDenominationCounts] = useState<Record<string, number>>({});
  const [blindCountRevealed, setBlindCountRevealed] = useState(false);

  // Opening Form
  const [initialFloat, setInitialFloat] = useState<number>(100000);

  // Historique search & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<string>('all');

  // Additions filter
  const [additionsFilter, setAdditionsFilter] = useState<'all' | 'attente' | 'service'>('all');

  // Bluetooth printer connecting state
  const [isConnectingBt, setIsConnectingBt] = useState(false);

  // Operational Rules
  const isBlindCountRequired = isRuleEnabled('caisse_mandatory_count', true);
  const isFloatMandatory = isRuleEnabled('caisse_float', true);
  const isExpensesAllowed = isRuleEnabled('caisse_expenses', true);
  const isWithdrawalsAllowed = isRuleEnabled('caisse_withdrawals', true);
  const isVarianceStrict = isRuleEnabled('caisse_variance_control', true);
  const isZReportEnabled = isRuleEnabled('caisse_z_report', true);

  // Active orders (tables awaiting bill or active meals)
  const activeOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'payee' && o.status !== 'annulee');
  }, [orders]);

  // Orders specifically marked 'attente_paiement', partially paid or table requested bill
  const pendingPaymentOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      const table = tables.find((t) => t.id === o.tableId);
      return (
        o.status === 'attente_paiement' ||
        o.status === 'partiellement_payee' ||
        o.paymentStatus === 'partiel' ||
        table?.status === 'attente_paiement' ||
        table?.tabletBillRequested
      );
    });
  }, [activeOrders, tables]);

  // Filtered active orders for display
  const displayedActiveOrders = useMemo(() => {
    if (additionsFilter === 'attente') {
      return pendingPaymentOrders;
    }
    if (additionsFilter === 'service') {
      return activeOrders.filter((o) => {
        const table = tables.find((t) => t.id === o.tableId);
        return o.status !== 'attente_paiement' && table?.status !== 'attente_paiement';
      });
    }
    return activeOrders;
  }, [activeOrders, pendingPaymentOrders, additionsFilter]);

  // Paid orders for History & Duplicate printing
  const paidOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'payee')
      .filter((o) => {
        if (!historySearch) return true;
        const q = historySearch.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (o.tableName && o.tableName.toLowerCase().includes(q)) ||
          (o.serverName && o.serverName.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q))
        );
      })
      .filter((o) => {
        if (historyMethodFilter === 'all') return true;
        return o.paymentMethod === historyMethodFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, historySearch, historyMethodFilter]);

  const handleOpenClosingModal = () => {
    setBlindCountRevealed(!isBlindCountRequired);
    if (isBlindCountRequired) {
      setCountedTotal(0);
      setDenominationCounts({});
    } else {
      setCountedTotal(cashSession.expectedTotal);
    }
    setClosingNotes('');
    setClosingModalOpen(true);
  };

  const variance = countedTotal - cashSession.expectedTotal;
  const isVarianceSignificant = Math.abs(variance) > settings.minCashVarianceAlert;

  const updateDenominationCount = (key: string, count: number) => {
    const validCount = Math.max(0, count || 0);
    const updated = { ...denominationCounts, [key]: validCount };
    setDenominationCounts(updated);

    // Recompute total
    let total = 0;
    DENOMINATIONS.forEach((d, idx) => {
      const k = `${d.value}_${d.type}_${idx}`;
      const c = updated[k] || 0;
      total += d.value * c;
    });
    setCountedTotal(total);
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movAmount <= 0 || !movReason.trim()) {
      showToast({
        type: 'warning',
        title: 'Champs incomplets',
        message: 'Veuillez renseigner un montant positif et le motif de l’opération.',
      });
      return;
    }

    if (movType === 'sortie' && !isExpensesAllowed && !isWithdrawalsAllowed) {
      showToast({
        type: 'error',
        title: 'Opération interdite',
        message: 'Les sorties et dépenses de caisse sont actuellement désactivées dans les règles opérationnelles.',
      });
      return;
    }

    await recordCashMovement(movType, movAmount, movReason);
    showToast({
      type: 'success',
      title: 'Mouvement de caisse enregistré',
      message: `${movType === 'entree' ? '+' : '-'}${formatCurrency(movAmount, settings.currency)} (${movReason})`,
    });

    setMovementModalOpen(false);
    setMovReason('');
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((isVarianceSignificant || (isVarianceStrict && variance !== 0)) && !closingNotes.trim()) {
      showToast({
        type: 'error',
        title: 'Justification requise',
        message: 'Un écart de caisse a été détecté. Une justification obligatoire est exigée par le protocole d’audit.',
      });
      return;
    }

    await closeCashRegister(countedTotal, closingNotes);

    playAudioChime('success');
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    showToast({
      type: 'success',
      title: 'Session clôturée avec succès',
      message: `Rapport Z généré avec un solde physique de ${formatCurrency(countedTotal, settings.currency)}.`,
    });

    setClosingModalOpen(false);
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFloatMandatory && (!initialFloat || initialFloat <= 0)) {
      showToast({
        type: 'error',
        title: 'Fond de caisse obligatoire',
        message: 'La règle opérationnelle exige la saisie obligatoire d’un fond de caisse positif avant ouverture.',
      });
      return;
    }

    await openCashRegister(initialFloat, 'Ouverture du service');
    playAudioChime('kitchen');
    showToast({
      type: 'success',
      title: 'Caisse ouverte',
      message: `Nouvelle session initialisée avec un fond de caisse de ${formatCurrency(initialFloat, settings.currency)}.`,
    });
    setOpeningModalOpen(false);
  };

  // Connect Bluetooth printer
  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    try {
      const res = await printerService.requestBluetoothPrinter();
      showToast({
        type: 'success',
        title: 'Imprimante Bluetooth Connectée',
        message: `Appairée avec succès : ${res.name}`,
      });
    } catch (err: any) {
      showToast({
        type: 'warning',
        title: 'Connexion Bluetooth',
        message: err.message || 'Impossible de connecter l’imprimante Bluetooth.',
      });
    } finally {
      setIsConnectingBt(false);
    }
  };

  // Print Pre-Bill (Note de table avant encaissement)
  const handlePrintPreBill = async (order: Order) => {
    const activePrinter = peripherals.find(
      (p) => p.active && (p.role === 'caisse' || p.isDefault || p.type === 'imprimante_ticket')
    );
    try {
      await printerService.printPreBill(order, settings, activePrinter);
      showToast({
        type: 'success',
        title: 'Note de table envoyée',
        message: `Ticket pré-addition imprimé pour ${order.tableName || 'la commande'}.`,
      });
    } catch {
      window.print();
    }
  };

  // Transmit order to kitchen (Manual or "Mode sans compte")
  const handleTransmitToKitchen = (order: Order) => {
    updateOrderStatus(order.id, 'en_preparation');
    showToast({
      type: 'success',
      title: 'Transmis en cuisine',
      message: `Bon de commande ${order.orderNumber} imprimé / transmis aux fourneaux.`,
    });
    playAudioChime('kitchen');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Session Status & Controls Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0 ${
              cashSession.status === 'ouverte' ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            {cashSession.status === 'ouverte' ? (
              <Unlock className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Poste de Caisse : {cashSession.status === 'ouverte' ? 'Session Active' : 'Session Clôturée'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  cashSession.status === 'ouverte'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {cashSession.status === 'ouverte' ? 'Ouverte' : 'Fermée'}
              </span>

              {pendingPaymentOrders.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse flex items-center gap-1 shadow-xs">
                  <Receipt className="w-3 h-3" />
                  {pendingPaymentOrders.length} addition(s) demandée(s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Responsable : <strong>{cashSession.openedBy || 'Caissier'}</strong> • Ouverte le {formatDateTime(cashSession.openedAt)}
            </p>
          </div>
        </div>

        {/* Quick Hardware & Session Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Bluetooth Printer Pairing Button */}
          <button
            onClick={handleConnectBluetooth}
            disabled={isConnectingBt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            title="Associer ou tester l'imprimante thermique Bluetooth"
          >
            <Bluetooth className={`w-3.5 h-3.5 text-blue-600 ${isConnectingBt ? 'animate-spin' : ''}`} />
            <span>{isConnectingBt ? 'Connexion...' : 'Imprimante Bluetooth'}</span>
          </button>

          {/* Thermal Paper Width Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Format</span>
            <button
              onClick={() => updateSettings({ defaultReceiptWidth: '58mm' })}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                settings.defaultReceiptWidth === '58mm'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              58mm
            </button>
            <button
              onClick={() => updateSettings({ defaultReceiptWidth: '80mm' })}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                settings.defaultReceiptWidth === '80mm'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              80mm
            </button>
          </div>

          {cashSession.status === 'ouverte' ? (
            <>
              <button
                onClick={() => setMovementModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Entrée / Sortie</span>
              </button>
              {isZReportEnabled && (
                <button
                  onClick={handleOpenClosingModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Clôturer Caisse (Z)</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setOpeningModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Ouvrir la Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('additions')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'additions'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Additions & Commandes Tables</span>
          {activeOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                pendingPaymentOrders.length > 0
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {activeOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('session')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'session'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Session & Mouvements de Caisse</span>
        </button>

        <button
          onClick={() => setActiveTab('historique')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'historique'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Historique des Ventes & Duplicatas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
            {paidOrders.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ADDITIONS & COMMANDES TABLES */}
      {activeTab === 'additions' && (
        <div className="space-y-4">
          {/* Sub-filters for additions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAdditionsFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  additionsFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Toutes les tables ({activeOrders.length})
              </button>
              <button
                onClick={() => setAdditionsFilter('attente')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  additionsFilter === 'attente'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>En attente de règlement</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-700 text-white text-[10px]">
                  {pendingPaymentOrders.length}
                </span>
              </button>
              <button
                onClick={() => setAdditionsFilter('service')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  additionsFilter === 'service'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Repas en cours ({activeOrders.length - pendingPaymentOrders.length})
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <em>Section 5 : Cliquez sur « Encaisser l'addition » pour enregistrer le paiement (Espèces, MoMo, Carte).</em>
            </div>
          </div>

          {/* Orders Grid */}
          {displayedActiveOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <Receipt className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Aucune addition en attente
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Toutes les commandes ouvertes sont réglées ou en cours de préparation. Dès qu'un serveur clique sur « Envoyer à la caisse », l'addition apparaîtra ici avec son numéro de table.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedActiveOrders.map((order) => {
                const table = tables.find((t) => t.id === order.tableId);
                const isAwaitingPayment =
                  order.status === 'attente_paiement' ||
                  order.status === 'partiellement_payee' ||
                  order.paymentStatus === 'partiel' ||
                  table?.status === 'attente_paiement' ||
                  table?.tabletBillRequested;

                const elapsedMin = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                );

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl border p-4.5 flex flex-col justify-between transition-all shadow-xs hover:shadow-md ${
                      isAwaitingPayment
                        ? 'border-amber-400 ring-2 ring-amber-400/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 text-base">
                              {table ? `Table ${table.number}` : order.tableName || 'Comptoir'}
                            </h3>
                            {table?.zone && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {table.zone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {order.serverName || 'Serveur'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {elapsedMin} min
                            </span>
                            {order.guestCount && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  {order.guestCount}p
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status Beacon */}
                        {isAwaitingPayment ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wide flex items-center gap-1 shadow-xs animate-pulse">
                            <Receipt className="w-3 h-3" />
                            <span>À Encaisser</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wide border border-blue-200">
                            {order.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Items Preview */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50 text-xs">
                        {order.items.map((item) => (
                          <div key={item.id} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <span className="font-black text-amber-600">x{item.quantity}</span>
                                <span>{item.name}</span>
                              </div>
                              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                <div className="text-[10px] text-slate-400 italic">
                                  {item.selectedModifiers.join(', ')}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-[10px] text-amber-700 font-medium">
                                  Note: {item.notes}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-700 shrink-0">
                              {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total & Action Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-500 font-bold">Total à régler :</span>
                        <span className="text-lg font-black text-slate-900">
                          {formatCurrency(order.total, settings.currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Option Transmettre en cuisine (mode sans compte) */}
                        {settings.kitchenOperationMode === 'sans_compte' && order.status === 'nouveau' && (
                          <button
                            onClick={() => handleTransmitToKitchen(order)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                            title="Transmettre le bon en cuisine"
                          >
                            <Utensils className="w-4 h-4" />
                          </button>
                        )}

                        {/* Print Pre-Bill */}
                        <button
                          onClick={() => handlePrintPreBill(order)}
                          className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          title="Imprimer l'addition proforma pour le client"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Note</span>
                        </button>

                        {/* Encaisser Button */}
                        <button
                          onClick={() => {
                            if (onOpenPayment) {
                              onOpenPayment(order.id);
                            } else {
                              showToast({
                                type: 'info',
                                title: 'Règlement Commande',
                                message: `Ouverture de l'encaissement pour la commande ${order.orderNumber}.`,
                              });
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-white text-xs font-bold shadow-xs transition-all active:scale-98 ${
                            isAwaitingPayment
                              ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Encaisser l'addition</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESSION & MOUVEMENTS DE CAISSE */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          {/* Numerical KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Expected Total */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Espèces Théorique
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatCurrency(cashSession.expectedTotal, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Montant attendu dans le tiroir-caisse</div>
            </div>

            {/* Initial Float */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Fond de Caisse Initial
              </div>
              <div className="text-2xl font-black text-slate-700 mt-2">
                {formatCurrency(cashSession.initialFloat, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Fourni à l'ouverture du service</div>
            </div>

            {/* Total Encaissements */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Total Entrées & Encaissements
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                +{formatCurrency(cashSession.totalCashIn, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Ventes au comptoir et règlements</div>
            </div>

            {/* Total Décaissements */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Total Sorties & Décaissements
              </div>
              <div className="text-2xl font-black text-rose-700 mt-2">
                -{formatCurrency(cashSession.totalCashOut, settings.currency)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Dépenses urgentes & remboursements</div>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="font-bold text-sm text-slate-900">
                Journal des Flux de Caisse de la Session
              </div>
              <span className="text-xs text-slate-500">
                {cashMovements.length} opérations enregistrées
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Heure</th>
                    <th className="py-3 px-4">Type Opération</th>
                    <th className="py-3 px-4">Motif / Justification</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4">Caissier / Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Aucun mouvement exceptionnel enregistré dans cette session.
                      </td>
                    </tr>
                  ) : (
                    cashMovements.map((cm) => {
                      const isPositive = cm.type === 'entree' || cm.type === 'encaissement_vente';
                      return (
                        <tr key={cm.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {cm.timestamp.slice(11, 16)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                isPositive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {cm.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{cm.reason}</td>
                          <td className="py-3 px-4 font-black">
                            <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                              {isPositive ? '+' : '-'}
                              {formatCurrency(cm.amount, settings.currency)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{cm.user}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIQUE DES VENTES & DUPLICATAS */}
      {activeTab === 'historique' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher par n° commande, table, serveur ou client..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={historyMethodFilter}
                onChange={(e) => setHistoryMethodFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">Tous les modes de règlement</option>
                <option value="especes">Espèces (Cash)</option>
                <option value="orange_money">Orange Money</option>
                <option value="mtn_momo">MTN MoMo</option>
                <option value="carte">Carte Bancaire</option>
                <option value="virement">Virement</option>
                <option value="credit_entreprise">Crédit Client / Entreprise</option>
              </select>
            </div>
          </div>

          {/* Paid Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Commandes Réglées & Tickets Clôturés
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {paidOrders.length} vente(s) enregistrée(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">N° Commande</th>
                    <th className="py-3 px-4">Table / Zone</th>
                    <th className="py-3 px-4">Serveur</th>
                    <th className="py-3 px-4">Mode Règlement</th>
                    <th className="py-3 px-4">Montant TTC</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paidOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Aucune vente payée correspondant à vos critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    paidOrders.map((order) => (
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
                        <td className="py-3 px-4 text-slate-600">
                          {order.serverName || 'Serveur'}
                        </td>
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all shadow-2xs"
                            title="Réimprimer le ticket de caisse thermique (Duplicata)"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                            <span>Imprimer Duplicata</span>
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

      {/* Movement Modal (Entrée / Sortie) */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Mouvement Exceptionnel de Caisse
              </h3>
              <button onClick={() => setMovementModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordMovement} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type de flux</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovType('entree')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      movType === 'entree'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
                    <span>Entrée de fond</span>
                  </button>
                  <button
                    type="button"
                    disabled={!isExpensesAllowed && !isWithdrawalsAllowed}
                    onClick={() => setMovType('sortie')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      !isExpensesAllowed && !isWithdrawalsAllowed
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                        : movType === 'sortie'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <ArrowUpCircle className="w-4 h-4 text-rose-600" />
                    <span>Sortie / Dépense</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Montant (FCFA) *</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={movAmount}
                  onChange={(e) => setMovAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motif ou Justification de l'opération *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Achat glaçons, monnaie d'appoint, courses d'urgence..."
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Valider le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closing Session Modal (Rapport Z) */}
      {closingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-600" />
                Clôture de Caisse & Génération du Rapport Z
              </h3>
              <button onClick={() => setClosingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assistance count toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Mode de comptage de fin de service</span>
              <div className="flex gap-1 bg-slate-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUseAssistedCounting(true)}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    useAssistedCounting ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                  }`}
                >
                  Billetage assisté
                </button>
                <button
                  type="button"
                  onClick={() => setUseAssistedCounting(false)}
                  className={`px-3 py-1 text-xs font-bold rounded-md ${
                    !useAssistedCounting ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
                  }`}
                >
                  Montant Global
                </button>
              </div>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-4">
              {useAssistedCounting ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">
                    Comptage physique des espèces dans le tiroir-caisse
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1 border border-slate-100 rounded-xl">
                    {DENOMINATIONS.map((d, idx) => {
                      const k = `${d.value}_${d.type}_${idx}`;
                      return (
                        <div
                          key={k}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <span className="text-xs font-medium text-slate-700">{d.label}</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={denominationCounts[k] || ''}
                            onChange={(e) => updateDenominationCount(k, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-xs text-right font-bold rounded-lg border border-slate-300"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Total physique compté dans la caisse *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={countedTotal}
                    onChange={(e) => setCountedTotal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300"
                  />
                </div>
              )}

              {/* Total Counted Banner */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Total physique constaté :</span>
                <span className="text-lg font-black text-amber-400">
                  {formatCurrency(countedTotal, settings.currency)}
                </span>
              </div>

              {/* Blind Count Revealed Analysis */}
              {(!isBlindCountRequired || blindCountRevealed) && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    variance === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : isVarianceSignificant
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Solde théorique attendu :</span>
                    <span>{formatCurrency(cashSession.expectedTotal, settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold mt-1">
                    <span>Écart de caisse (Physique - Théorique) :</span>
                    <span className="text-sm font-black">
                      {variance > 0 ? '+' : ''}
                      {formatCurrency(variance, settings.currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Justification note */}
              {(!isBlindCountRequired || blindCountRevealed) && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isVarianceSignificant || (isVarianceStrict && variance !== 0)
                      ? 'Justification obligatoire de l’écart *'
                      : 'Observations de clôture'}
                  </label>
                  <textarea
                    rows={2}
                    required={isVarianceSignificant || (isVarianceStrict && variance !== 0)}
                    placeholder="Justification des erreurs de monnaie, remises ou billets suspects..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>

                {isBlindCountRequired && !blindCountRevealed ? (
                  <button
                    type="button"
                    disabled={countedTotal <= 0}
                    onClick={() => {
                      if (countedTotal <= 0) {
                        showToast({
                          type: 'warning',
                          title: 'Comptage Requis',
                          message: 'Veuillez saisir votre comptage physique (billetage ou montant) avant de valider.',
                        });
                        return;
                      }
                      setBlindCountRevealed(true);
                      playAudioChime('tap');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Valider le Comptage & Analyser les Écarts</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs active:scale-98 transition-all"
                  >
                    Confirmer la Clôture Définitive du Z
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Session Modal */}
      {openingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-600" />
                Ouverture d'une Session de Caisse
              </h3>
              <button onClick={() => setOpeningModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fond de caisse initial (Monnaie physique disponible) *
                </label>
                <input
                  type="number"
                  required
                  value={initialFloat}
                  onChange={(e) => setInitialFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpeningModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Ouvrir la Caisse
                </button>
              </div>
            </form>
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
