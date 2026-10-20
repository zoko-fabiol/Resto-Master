import React, { useState, useEffect, useMemo, useCallback, useReducer, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm, usePrompt } from '../ui/ConfirmDialog';
import {
  RestaurantTable,
  TableStatus,
  Zone,
  DecorElement,
  Order,
} from '../../types/restaurant';
import { TableKioskView } from '../kiosk/TableKioskView';
import { VectorFloorPlan } from './VectorFloorPlan';
import { TablesGridView } from './TablesGridView';
import { ActiveOrdersView } from './ActiveOrdersView';
import { BatchAddTablesModal } from './BatchAddTablesModal';
import { DecorElementModal } from './DecorElementModal';
import { TableDetailModal } from './TableDetailModal';
import { AddEditTableModal } from './AddEditTableModal';
import { AddZoneModal } from './AddZoneModal';
import { floorPlanReducer, cloneSnapshot, LayoutSnapshot } from './floorPlanReducer';
import { computeFloorPlanDiff } from './floorPlanDiff';
import { generateSecureId } from '../../lib/utils';
import {
  Utensils,
  Plus,
  Grid,
  Box,
  Compass,
  LayoutGrid,
  ShoppingBag,
  Pencil,
  Check,
  RotateCcw,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Tablet,
  CheckCircle,
  AlertCircle,
  CreditCard,
  CalendarDays,
  Brush,
  Layers,
  Magnet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TablesViewProps {
  onOpenOrder: (tableId: string) => void;
  onPayOrder: (orderId: string) => void;
  onOpenKiosk?: (tableId: string) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({ onOpenOrder, onPayOrder, onOpenKiosk }) => {
  const { currentUser } = useAuth();
  const {
    tables,
    orders,
    settings,
    zones,
    activeRestaurant,
    decorElements,
    updateTableStatus,
    addTable,
    updateTable,
    deleteTable,
    batchSaveTables,
    batchSaveDecorElements,
    saveFloorPlanDiff,
    addTablesBatch,
    saveDecorElement,
    deleteDecorElement,
    mergeTables,
    splitTables,
    addZone,
    employees,
    isFeatureEnabled,
    isRuleEnabled,
    lockTableTablet,
    unlockTableTablet,
    lockAllTableTablets,
    unlockAllTableTablets,
    dismissWaiterCall,
    sendOrderToCashier,
    updateOrderStatus,
  } = useRestaurant();

  const { showToast } = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();

  // Role permissions: Only managers / direction / superadmin can enter layout edit mode
  const canEditLayout = useMemo(() => {
    const role = currentUser?.role;
    return role === 'superadmin' || role === 'direction' || role === 'manager';
  }, [currentUser]);

  // Operational Rules
  const isFloorPlanAllowed = isRuleEnabled('tables_floor_plan', true);
  const isZonesAllowed = isRuleEnabled('tables_zones', true) && isFeatureEnabled('zones_management');
  const isCapacityAllowed = isRuleEnabled('tables_capacity', true);
  const isReservationsAllowed = isRuleEnabled('tables_reservations', true) && isFeatureEnabled('table_reservations');
  const isMergeAllowed = isRuleEnabled('tables_merge', true);
  const isDivisionAllowed = isRuleEnabled('tables_division', true);
  const isCleaningAllowed = isRuleEnabled('tables_cleaning', true);

  // View Mode: 'plan' (2D Vectoriel), 'grille' (Tactile Grid), 'commandes' (Active multi-orders)
  const [viewMode, setViewMode] = useState<'plan' | 'grille' | 'commandes'>('plan');
  const [selectedZoneId, setSelectedZoneId] = useState<string | 'all'>(() => {
    return zones[0]?.id || 'all';
  });

  // Mode Édition du plan vs Mode Service (G1)
  const [isEditMode, setIsEditMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToMagnet, setSnapToMagnet] = useState(true);

  // Synchroniser sur la 1ère salle disponible si initialisé avant chargement des zones (P-07)
  useEffect(() => {
    if (selectedZoneId === 'all' && zones.length > 0) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  // Unified history and draft reducer (D-04, D-05)
  const [historyState, dispatchFloorPlan] = useReducer(floorPlanReducer, {
    past: [],
    present: {
      tables,
      decor: decorElements,
      removedTableIds: [],
      removedDecorIds: [],
    },
    future: [],
  });

  const draftTables = historyState.present.tables;
  const draftDecor = historyState.present.decor;
  const isDirty = historyState.past.length > 0;
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  // Snapshot capturé avant une interaction continue (drag/resize/rotate)
  const dragStartSnapshotRef = useRef<LayoutSnapshot | null>(null);

  // Sync draft states when real tables or decor update from Firestore (if not editing)
  useEffect(() => {
    if (!isEditMode) {
      dispatchFloorPlan({
        type: 'INIT',
        payload: { tables, decor: decorElements },
      });
    }
  }, [tables, decorElements, isEditMode]);

  // Selection states
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);

  // Modals
  const [serviceModalTable, setServiceModalTable] = useState<RestaurantTable | null>(null);
  const [editTableModal, setEditTableModal] = useState<RestaurantTable | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showBatchAddModal, setShowBatchAddModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showDecorModal, setShowDecorModal] = useState(false);
  const [editingDecorElement, setEditingDecorElement] = useState<DecorElement | null>(null);
  const [activeKioskTableId, setActiveKioskTableId] = useState<string | null>(null);

  // Active Zone Object
  const activeZoneObj = useMemo(() => {
    if (selectedZoneId === 'all') return zones[0];
    return zones.find((z) => z.id === selectedZoneId);
  }, [zones, selectedZoneId]);

  // Filter tables and decor for active zone (G6)
  const currentTables = isEditMode ? draftTables : tables;
  const currentDecor = isEditMode ? draftDecor : decorElements;

  const filteredTables = useMemo(() => {
    if (selectedZoneId === 'all') return currentTables;
    return currentTables.filter(
      (t) => t.zoneId === selectedZoneId || t.zone === activeZoneObj?.name
    );
  }, [currentTables, selectedZoneId, activeZoneObj]);

  const filteredDecor = useMemo(() => {
    if (selectedZoneId === 'all') return currentDecor;
    return currentDecor.filter((d) => d.zoneId === selectedZoneId);
  }, [currentDecor, selectedZoneId]);

  // Quick map of orders for O(1) lookup
  const ordersMap = useMemo(() => {
    const map = new Map<string, Order>();
    for (const ord of orders) {
      map.set(ord.id, ord);
    }
    return map;
  }, [orders]);

  // Undo (Ctrl+Z) - Réducteur unifié sans cran mort (D-04)
  const handleUndo = useCallback(() => {
    dispatchFloorPlan({ type: 'UNDO' });
  }, []);

  // Redo (Ctrl+Y)
  const handleRedo = useCallback(() => {
    dispatchFloorPlan({ type: 'REDO' });
  }, []);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo]);

  // Enter Edit Mode
  const handleEnterEditMode = () => {
    if (!canEditLayout) {
      showToast({
        type: 'warning',
        title: 'Accès restreint',
        message: 'Seuls les superviseurs et managers peuvent modifier l\'agencement du plan de salle.',
      });
      return;
    }
    dispatchFloorPlan({
      type: 'INIT',
      payload: { tables, decor: decorElements },
    });
    dragStartSnapshotRef.current = null;
    setIsEditMode(true);
  };

  // Exit / Save Edit Mode (Diff-based Batch Save D-01, D-02)
  const handleSaveEditMode = async () => {
    try {
      const diff = computeFloorPlanDiff(
        tables,
        draftTables,
        historyState.present.removedTableIds,
        decorElements,
        draftDecor,
        historyState.present.removedDecorIds
      );

      if (diff.hasChanges) {
        await saveFloorPlanDiff(diff);
      }

      setIsEditMode(false);
      setSelectedTableId(null);
      setSelectedDecorId(null);
      showToast({
        type: 'success',
        title: 'Plan de salle enregistré',
        message: 'L\'ensemble des modifications d\'agencement a été synchronisé avec succès.',
      });
    } catch (err: unknown) {
      console.error('Erreur lors de la sauvegarde du plan de table:', err);
      showToast({
        type: 'error',
        title: 'Erreur d\'enregistrement',
        message: 'Une erreur est survenue lors de la sauvegarde du plan.',
      });
    }
  };

  // Cancel Edit Mode - Abandon complet sans fuite Firestore (D-05)
  const handleCancelEditMode = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Annuler les modifications ?',
        message: 'Toutes les modifications non enregistrées sur le plan de salle seront perdues.',
        confirmLabel: 'Abandonner les modifications',
        cancelLabel: 'Continuer l\'édition',
        variant: 'danger',
      });
      if (!ok) return;
    }
    dispatchFloorPlan({
      type: 'DISCARD_CHANGES',
      payload: { tables, decor: decorElements },
    });
    dragStartSnapshotRef.current = null;
    setIsEditMode(false);
    setSelectedTableId(null);
    setSelectedDecorId(null);
  };

  // Batch Add Tables (G8) - En mode édition, stocke en local sans fuite Firestore (D-05)
  const handleBatchAddTables = async (newTablesData: Omit<RestaurantTable, 'id'>[]) => {
    if (isEditMode) {
      const created: RestaurantTable[] = newTablesData.map((data) => ({
        ...data,
        id: generateSecureId('tbl'),
        status: data.status || 'libre',
        coordVersion: 2,
      })) as RestaurantTable[];
      dispatchFloorPlan({ type: 'ADD_TABLES_BATCH', payload: created });
      showToast({
        type: 'success',
        title: 'Tables générées (Brouillon)',
        message: `${created.length} tables ont été ajoutées en brouillon sur le plan de salle.`,
      });
    } else {
      const created = await addTablesBatch(newTablesData);
      showToast({
        type: 'success',
        title: 'Tables générées',
        message: `${created.length} tables ont été ajoutées sur le plan de salle.`,
      });
    }
  };

  // Tablet Kiosk Remote stats
  const lockedTabletsCount = useMemo(() => tables.filter((t) => t.tabletLocked).length, [tables]);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* TOP NAVIGATION & MODE BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: View Switcher (Plan 2D, Grille, Commandes) & Zone Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {isFloorPlanAllowed && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('plan')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'plan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4 text-amber-600" />
                <span>Plan 2D Vectoriel</span>
              </button>
              <button
                onClick={() => setViewMode('grille')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grille' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-slate-600" />
                <span>Vue Grille</span>
              </button>
              <button
                onClick={() => setViewMode('commandes')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'commandes' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="tabular-nums">
                  Commandes Actives ({tables.filter((t) => t.currentOrderId).length})
                </span>
              </button>
            </div>
          )}

          {/* Zones Tabs (G6) */}
          {isZonesAllowed && (
            <>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
                <button
                  onClick={() => setSelectedZoneId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedZoneId === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toutes les zones ({tables.length})
                </button>
                {zones.map((zone) => {
                  const count = tables.filter(
                    (t) => t.zoneId === zone.id || t.zone === zone.name
                  ).length;
                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedZoneId === zone.id
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: zone.color || '#f59e0b' }}
                      />
                      <span>{zone.name}</span>
                      <span className="text-[11px] opacity-80 tabular-nums">({count})</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Actions, Remote Tablets, Edit Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tablettes Kiosk Remote Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {lockedTabletsCount > 0 ? (
              <button
                onClick={async () => {
                  await unlockAllTableTablets();
                  showToast({
                    type: 'success',
                    title: 'Tablettes déverrouillées',
                    message: 'Toutes les tablettes de salle ont été déverrouillées à distance.',
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-all shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="tabular-nums">Déverrouiller Tout ({lockedTabletsCount})</span>
              </button>
            ) : (
              <button
                onClick={async () => {
                  const reason = await prompt({
                    title: 'Verrouillage global des tablettes',
                    message: 'Indiquez le motif du verrouillage à distance de toutes les tablettes :',
                    defaultValue: 'Fin de service / Clôture',
                    placeholder: 'Ex: Fin de service...',
                    confirmLabel: 'Verrouiller tout',
                  });
                  if (reason !== null) {
                    await lockAllTableTablets(reason || 'Verrouillage global Direction');
                    showToast({
                      type: 'warning',
                      title: 'Tablettes verrouillées',
                      message: 'Toutes les tablettes de salle ont été verrouillées à distance.',
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Verrouiller Tablettes</span>
              </button>
            )}

            <button
              onClick={() => {
                const targetId = filteredTables[0]?.id || tables[0]?.id;
                if (onOpenKiosk && targetId) {
                  onOpenKiosk(targetId);
                } else if (targetId) {
                  setActiveKioskTableId(targetId);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-amber-400 hover:bg-slate-800 transition-all shadow-xs"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Borne Client</span>
            </button>
          </div>

          {/* Edit Mode Toggle (Managers / Direction / Superadmin only) */}
          {viewMode === 'plan' && canEditLayout && (
            <button
              onClick={() => {
                if (isEditMode) {
                  handleCancelEditMode();
                } else {
                  handleEnterEditMode();
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isEditMode
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                  : 'bg-slate-900 text-amber-400 hover:bg-slate-800'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Quitter l\'Édition' : 'Éditer le Plan'}</span>
            </button>
          )}

          {/* Add Zone / Room */}
          {isZonesAllowed && !isEditMode && (
            <button
              onClick={() => setShowAddZoneModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Nouvelle Salle</span>
            </button>
          )}
        </div>
      </div>

      {/* EDIT MODE TOOLBAR & DIRTY BANNER (G1, G2, G11) */}
      {isEditMode && (
        <div className="bg-amber-500/10 border-2 border-amber-400 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-xs">
              <Pencil className="w-3.5 h-3.5" />
              <span>MODE ÉDITION ACTIF</span>
            </div>

            {/* Magnetic Grid Snapping Toggle (G7) */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                snapToGrid
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
              title="Activer l'alignement magnétique sur la grille (10 unités)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grille 10px : {snapToGrid ? 'ON' : 'OFF'}</span>
            </button>

            {/* Magnetic Neighbor Snapping Toggle (P-04) */}
            <button
              onClick={() => setSnapToMagnet(!snapToMagnet)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                snapToMagnet
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
              title="Activer l'aimant d'alignement automatique entre tables proches"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span>Aimant : {snapToMagnet ? 'ON' : 'OFF'}</span>
            </button>

            {/* Undo / Redo buttons (G11) */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
              <button
                disabled={!canUndo}
                onClick={handleUndo}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Annuler (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={!canRedo}
                onClick={handleRedo}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                title="Rétablir (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Creation Actions: Single Table, Batch Tables, Decor */}
            <button
              onClick={() => setShowAddTableModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Table</span>
            </button>

            <button
              onClick={() => setShowBatchAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Grid className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Lot de tables</span>
            </button>

            <button
              onClick={() => {
                setEditingDecorElement(null);
                setShowDecorModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Box className="w-3.5 h-3.5 text-amber-600" />
              <span>+ Décor Architectural</span>
            </button>
          </div>

          {/* Batch Save / Discard Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEditMode}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>

            <button
              onClick={handleSaveEditMode}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer le Plan</span>
            </button>
          </div>
        </div>
      )}

      {/* STATS & LEGEND BANNER */}
      <div className="bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-700 font-semibold">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Libre</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-amber-600" />
            <span>Occupée / En service</span>
          </span>
          {isReservationsAllowed && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              <span>Réservée</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
            <span>Attente paiement</span>
          </span>
          {isCleaningAllowed && (
            <span className="flex items-center gap-1.5">
              <Brush className="w-3.5 h-3.5 text-slate-500" />
              <span>À nettoyer</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Hors service</span>
          </span>
        </div>

        <div className="text-slate-500 text-xs font-medium flex items-center gap-2">
          <span>{activeRestaurant?.name || 'Restaurant'}</span>
          <span>•</span>
          <span className="font-bold text-slate-700 tabular-nums">
            {tables.filter((t) => t.status === 'occupee' || t.status === 'en_service').length} / {tables.length} tables
            actives
          </span>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      {viewMode === 'plan' && (
        <VectorFloorPlan
          tables={filteredTables}
          decorElements={filteredDecor}
          ordersMap={ordersMap}
          settings={settings}
          activeZone={activeZoneObj}
          isEditMode={isEditMode}
          snapToGrid={snapToGrid}
          snapToMagnet={snapToMagnet}
          selectedTableId={selectedTableId}
          selectedDecorId={selectedDecorId}
          onSelectTable={(table) => {
            setSelectedTableId(table.id);
            if (isEditMode) {
              setEditTableModal(table);
            }
          }}
          onTableAction={(table) => {
            setServiceModalTable(table);
          }}
          onSelectDecor={(decor) => {
            setSelectedDecorId(decor.id);
            if (isEditMode) {
              setEditingDecorElement(decor);
              setShowDecorModal(true);
            }
          }}
          onUpdateDraftTables={(updated) => {
            if (!dragStartSnapshotRef.current) {
              dragStartSnapshotRef.current = cloneSnapshot(historyState.present);
            }
            dispatchFloorPlan({ type: 'SET_TABLES_TRANSIENT', payload: updated });
          }}
          onUpdateDraftDecor={(updated) => {
            if (!dragStartSnapshotRef.current) {
              dragStartSnapshotRef.current = cloneSnapshot(historyState.present);
            }
            dispatchFloorPlan({ type: 'SET_DECOR_TRANSIENT', payload: updated });
          }}
          onPushHistory={() => {
            if (dragStartSnapshotRef.current) {
              dispatchFloorPlan({
                type: 'COMMIT_TRANSACTION',
                payload: { startSnapshot: dragStartSnapshotRef.current },
              });
              dragStartSnapshotRef.current = null;
            }
          }}
          onAddTableClick={() => setShowAddTableModal(true)}
          onBatchAddClick={() => setShowBatchAddModal(true)}
        />
      )}

      {viewMode === 'grille' && (
        <TablesGridView
          tables={filteredTables}
          ordersMap={ordersMap}
          settings={settings}
          isCapacityAllowed={isCapacityAllowed}
          onSelectTable={(table) => setServiceModalTable(table)}
        />
      )}

      {viewMode === 'commandes' && (
        <ActiveOrdersView
          tables={tables}
          orders={orders}
          settings={settings}
          currentUserRole={currentUser?.role}
          onOpenOrder={onOpenOrder}
          onPayOrder={onPayOrder}
          onSendOrderToCashier={(orderId, tableId) => {
            sendOrderToCashier(orderId, tableId);
            showToast({
              type: 'info',
              title: 'Addition transmise',
              message: 'La table a été transmise au poste de caisse pour édition et encaissement.',
            });
          }}
          onMarkOrderServed={async (orderId, tableId) => {
            await updateOrderStatus(orderId, 'servi');
            await updateTableStatus(tableId, 'en_service');
            showToast({
              type: 'success',
              title: 'Commande Servie',
              message: 'Les plats ont été marqués servis aux convives.',
            });
          }}
          onBackToPlan={() => setViewMode('plan')}
        />
      )}

      {/* SERVICE DETAIL MODAL (G12) */}
      {serviceModalTable && (
        <TableDetailModal
          table={serviceModalTable}
          allTables={tables}
          order={serviceModalTable.currentOrderId ? ordersMap.get(serviceModalTable.currentOrderId) || null : null}
          settings={settings}
          employees={employees}
          currentUserRole={currentUser?.role}
          isReservationsAllowed={isReservationsAllowed}
          isCleaningAllowed={isCleaningAllowed}
          isMergeAllowed={isMergeAllowed}
          isDivisionAllowed={isDivisionAllowed}
          onClose={() => setServiceModalTable(null)}
          onOpenOrder={(tableId) => {
            setServiceModalTable(null);
            onOpenOrder(tableId);
          }}
          onPayOrder={(orderId) => {
            setServiceModalTable(null);
            onPayOrder(orderId);
          }}
          onUpdateStatus={async (tableId, status) => {
            await updateTableStatus(tableId, status);
            setServiceModalTable((prev) => (prev ? { ...prev, status } : null));
          }}
          onAssignServer={async (tableId, serverId, serverName) => {
            await updateTable(tableId, {
              assignedServerId: serverId,
              assignedServerName: serverName,
            });
            setServiceModalTable((prev) =>
              prev ? { ...prev, assignedServerId: serverId, assignedServerName: serverName } : null
            );
          }}
          onMergeTables={async (targetId, sourceId) => {
            await mergeTables(targetId, sourceId);
            setServiceModalTable(null);
            showToast({
              type: 'success',
              title: 'Tables fusionnées',
              message: 'Les tables ont été associées et regroupées en temps réel.',
            });
          }}
          onSplitTables={async (tableId) => {
            await splitTables(tableId);
            setServiceModalTable(null);
            showToast({
              type: 'info',
              title: 'Tables séparées',
              message: 'Les tables ont été dissociées avec succès.',
            });
          }}
          onLockTablet={async (tableId, reason) => {
            await lockTableTablet(tableId, reason);
            setServiceModalTable((prev) =>
              prev ? { ...prev, tabletLocked: true, tabletLockedReason: reason } : null
            );
            showToast({
              type: 'warning',
              title: 'Tablette verrouillée',
              message: 'La borne tablette client a été verrouillée à distance.',
            });
          }}
          onUnlockTablet={async (tableId) => {
            await unlockTableTablet(tableId);
            setServiceModalTable((prev) =>
              prev ? { ...prev, tabletLocked: false, tabletLockedReason: undefined } : null
            );
            showToast({
              type: 'success',
              title: 'Tablette déverrouillée',
              message: 'La borne tablette client est de nouveau opérationnelle.',
            });
          }}
          onDismissWaiterCall={async (tableId) => {
            await dismissWaiterCall(tableId);
            setServiceModalTable((prev) => (prev ? { ...prev, tabletCallWaiterPending: false } : null));
            showToast({
              type: 'info',
              title: 'Appel acquitté',
              message: 'L\'appel serveur a été acquitté.',
            });
          }}
          onSendOrderToCashier={(orderId, tableId) => {
            sendOrderToCashier(orderId, tableId);
            setServiceModalTable((prev) => (prev ? { ...prev, status: 'attente_paiement' } : null));
            showToast({
              type: 'info',
              title: 'Addition transmise',
              message: 'Demande d\'addition transmise à la caisse.',
            });
          }}
          onMarkOrderServed={async (orderId) => {
            await updateOrderStatus(orderId, 'servi');
            showToast({
              type: 'success',
              title: 'Commande Servie',
              message: 'Tous les plats ont été apportés et servis.',
            });
          }}
          onOpenKiosk={onOpenKiosk}
        />
      )}

      {/* EDIT SINGLE TABLE MODAL */}
      {editTableModal && (
        <AddEditTableModal
          initialTable={editTableModal}
          zones={zones}
          activeZoneId={selectedZoneId}
          restaurantId={activeRestaurant?.id || ''}
          onClose={() => setEditTableModal(null)}
          onSave={(updates) => {
            if (isEditMode) {
              dispatchFloorPlan({
                type: 'UPDATE_SINGLE_TABLE',
                payload: { id: editTableModal.id, updates },
              });
            } else {
              updateTable(editTableModal.id, updates);
            }
            setEditTableModal(null);
          }}
          onDelete={(id) => {
            if (isEditMode) {
              const isPersisted = tables.some((t) => t.id === id);
              dispatchFloorPlan({
                type: 'REMOVE_TABLE',
                payload: { id, isPersisted },
              });
            } else {
              deleteTable(id);
            }
            setEditTableModal(null);
          }}
        />
      )}

      {/* ADD TABLE MODAL */}
      {showAddTableModal && (
        <AddEditTableModal
          zones={zones}
          activeZoneId={selectedZoneId}
          restaurantId={activeRestaurant?.id || ''}
          onClose={() => setShowAddTableModal(false)}
          onSave={async (newTableData) => {
            if (isEditMode) {
              const newTable: RestaurantTable = {
                ...newTableData,
                id: generateSecureId('tbl'),
                status: newTableData.status || 'libre',
                coordVersion: 2,
              } as RestaurantTable;
              dispatchFloorPlan({ type: 'ADD_TABLE', payload: newTable });
            } else {
              await addTable(newTableData as Omit<RestaurantTable, 'id'>);
            }
            setShowAddTableModal(false);
          }}
        />
      )}

      {/* BATCH ADD TABLES MODAL (G8) */}
      {showBatchAddModal && (
        <BatchAddTablesModal
          zones={zones}
          activeZoneId={selectedZoneId}
          existingTables={tables}
          onClose={() => setShowBatchAddModal(false)}
          onAddBatch={handleBatchAddTables}
        />
      )}

      {/* ARCHITECTURAL DECOR MODAL (G9) */}
      {showDecorModal && (
        <DecorElementModal
          initialElement={editingDecorElement}
          zoneId={selectedZoneId !== 'all' ? selectedZoneId : zones[0]?.id || 'salle-1'}
          zones={zones}
          restaurantId={activeRestaurant?.id || ''}
          onClose={() => {
            setShowDecorModal(false);
            setEditingDecorElement(null);
          }}
          onSave={async (decor) => {
            if (isEditMode) {
              const decorToSave: DecorElement = decor.id
                ? { ...decor, coordVersion: 2 }
                : { ...decor, id: generateSecureId('decor'), coordVersion: 2 };
              dispatchFloorPlan({
                type: 'SAVE_DECOR_ELEMENT',
                payload: decorToSave,
              });
            } else {
              await saveDecorElement(decor);
            }
            setShowDecorModal(false);
            setEditingDecorElement(null);
          }}
          onDelete={async (id) => {
            if (isEditMode) {
              const isPersisted = decorElements.some((d) => d.id === id);
              dispatchFloorPlan({
                type: 'REMOVE_DECOR',
                payload: { id, isPersisted },
              });
            } else {
              await deleteDecorElement(id);
            }
            setShowDecorModal(false);
            setEditingDecorElement(null);
          }}
        />
      )}

      {/* ADD ZONE MODAL */}
      {showAddZoneModal && (
        <AddZoneModal
          restaurantId={activeRestaurant?.id || ''}
          existingZonesCount={zones.length}
          onClose={() => setShowAddZoneModal(false)}
          onSave={async (newZone) => {
            await addZone(newZone);
            setShowAddZoneModal(false);
            showToast({
              type: 'success',
              title: 'Salle créée',
              message: `La zone « ${newZone.name} » a été ajoutée.`,
            });
          }}
        />
      )}

      {/* KIOSK FULLSCREEN OVERLAY */}
      {activeKioskTableId && (
        <TableKioskView
          initialTableId={activeKioskTableId}
          onExit={() => setActiveKioskTableId(null)}
        />
      )}
    </div>
  );
};
