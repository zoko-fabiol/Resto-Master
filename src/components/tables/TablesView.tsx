import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { RestaurantTable, TableStatus, TableShape, Zone, ZoneType, OrderItem } from '../../types/restaurant';
import { TABLE_STATUS_MAP, formatCurrency, getMinutesElapsed } from '../../lib/utils';
import { TableKioskView } from '../kiosk/TableKioskView';
import {
  Utensils,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  ShoppingBag,
  Sparkles,
  LayoutGrid,
  MapPin,
  Move,
  RotateCw,
  GitMerge,
  Split,
  Settings,
  Pencil,
  Trash2,
  UserCheck,
  Check,
  Maximize2,
  Compass,
  Layers,
  ChevronRight,
  ShieldAlert,
  Lock,
  Unlock,
  Tablet,
  Bell,
  Receipt,
  Radio,
  Send,
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
    updateTableStatus,
    settings,
    zones,
    activeRestaurant,
    addTable,
    updateTable,
    deleteTable,
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
  const [activeKioskTableId, setActiveKioskTableId] = useState<string | null>(null);

  const lockedTabletsCount = useMemo(() => {
    return tables.filter((t) => t.tabletLocked).length;
  }, [tables]);

  const waiterCallsCount = useMemo(() => {
    return tables.filter((t) => t.tabletCallWaiterPending).length;
  }, [tables]);

  const isReservationsEnabled = isFeatureEnabled('table_reservations');
  const isZonesEnabled = isFeatureEnabled('zones_management');

  // Règles Opérationnelles (Section 8 Tables & Salle)
  const isFloorPlanAllowed = isRuleEnabled('tables_floor_plan', true);
  const isZonesAllowed = isRuleEnabled('tables_zones', true) && isZonesEnabled;
  const isCapacityAllowed = isRuleEnabled('tables_capacity', true);
  const isTablesReservationsAllowed = isRuleEnabled('tables_reservations', true) && isReservationsEnabled;
  const isMergeAllowed = isRuleEnabled('tables_merge', true);
  const isDivisionAllowed = isRuleEnabled('tables_division', true);
  const isCleaningAllowed = isRuleEnabled('tables_cleaning', true);

  // Mode d'affichage : Plan 2D, Grille ou Commandes Actives (Section 4 du Guide : Gérer plusieurs tables en même temps)
  const [viewMode, setViewMode] = useState<'plan' | 'grille' | 'commandes'>('plan');

  useEffect(() => {
    if (!isFloorPlanAllowed && viewMode === 'plan') {
      setViewMode('grille');
    }
  }, [isFloorPlanAllowed, viewMode]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | 'all'>('all');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Modals & Panels
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [editingTableDetails, setEditingTableDetails] = useState<RestaurantTable | null>(null);
  const [tableToMergeWith, setTableToMergeWith] = useState<string>('');

  // Drag & drop state on 2D canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Form states for new table
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableShape, setNewTableShape] = useState<TableShape>('carree');
  const [newTableZoneId, setNewTableZoneId] = useState('');

  // Form states for new zone
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<ZoneType>('salle_principale');
  const [newZoneCapacity, setNewZoneCapacity] = useState(40);
  const [newZoneColor, setNewZoneColor] = useState('#f59e0b');

  // Filtrage des tables par zone
  const filteredTables = useMemo(() => {
    if (selectedZoneId === 'all') return tables;
    return tables.filter(
      (t) => t.zoneId === selectedZoneId || t.zone === selectedZoneId
    );
  }, [tables, selectedZoneId]);

  // Index O(1) des commandes pour éliminer les latences de recherche
  const ordersMap = useMemo(() => {
    const map = new Map<string, typeof orders[0]>();
    for (let i = 0; i < orders.length; i++) {
      map.set(orders[i].id, orders[i]);
    }
    return map;
  }, [orders]);

  const getTableOrder = useCallback(
    (table: RestaurantTable) => {
      if (!table.currentOrderId) return null;
      return ordersMap.get(table.currentOrderId) || null;
    },
    [ordersMap]
  );

  const currentOrder = selectedTable ? getTableOrder(selectedTable) : null;

  // Serveurs disponibles
  const availableServers = useMemo(() => {
    return employees.filter((e) => e.role === 'serveur' || e.role === 'caisse' || e.role === 'manager');
  }, [employees]);

  // Handlers pour le Drag & Drop sur le Canvas 2D (Compatible Souris + Écrans Tactiles iPad/POS)
  const handlePointerDownTable = (e: React.PointerEvent, table: RestaurantTable) => {
    if (!isEditMode || !canvasRef.current) return;
    e.stopPropagation();

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((table.x ?? 20) / 100) * rect.width;
    const currentY = ((table.y ?? 20) / 100) * rect.height;

    setDraggingTableId(table.id);
    setDragOffset({
      x: e.clientX - rect.left - currentX,
      y: e.clientY - rect.top - currentY,
    });
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent) => {
    if (!isEditMode || !draggingTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - dragOffset.x;
    const rawY = e.clientY - rect.top - dragOffset.y;

    // Convert to percentage with bounds (3% to 92%)
    let pctX = Math.round((rawX / rect.width) * 100);
    let pctY = Math.round((rawY / rect.height) * 100);

    pctX = Math.max(3, Math.min(92, pctX));
    pctY = Math.max(3, Math.min(90, pctY));

    updateTable(draggingTableId, { x: pctX, y: pctY });
  };

  const handlePointerUpCanvas = () => {
    setDraggingTableId(null);
  };

  // Création d'une nouvelle table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    const targetZoneId = newTableZoneId || (zones.length > 0 ? zones[0].id : 'zone-1');
    const targetZone = zones.find((z) => z.id === targetZoneId);

    // Calculer position initiale intelligente
    const countInZone = tables.length;
    const initialX = 15 + ((countInZone * 18) % 70);
    const initialY = 20 + ((Math.floor(countInZone / 4) * 22) % 60);

    await addTable({
      restaurantId: activeRestaurant.id,
      number: newTableNumber.trim(),
      capacity: Number(newTableCapacity) || 4,
      zoneId: targetZoneId,
      zone: targetZone?.name || 'Salle Principale',
      shape: newTableShape,
      status: 'libre',
      x: initialX,
      y: initialY,
      width: newTableShape === 'rectangulaire' ? 120 : 90,
      height: 90,
      rotation: 0,
      active: true,
    });

    setShowAddTableModal(false);
    setNewTableNumber('');
    setNewTableCapacity(4);
  };

  // Création d'une nouvelle zone
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    await addZone({
      restaurantId: activeRestaurant.id,
      name: newZoneName.trim(),
      type: newZoneType,
      capacity: Number(newZoneCapacity) || 30,
      color: newZoneColor,
      active: true,
      displayOrder: zones.length + 1,
    });

    setShowAddZoneModal(false);
    setNewZoneName('');
  };

  // Rotation d'une table
  const handleRotateTable = (table: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRot = ((table.rotation || 0) + 45) % 360;
    updateTable(table.id, { rotation: nextRot });
  };

  // Shape helper style
  const getShapeStyle = (shape?: TableShape) => {
    switch (shape) {
      case 'ronde':
        return 'rounded-full aspect-square';
      case 'ovale':
        return 'rounded-[40px]';
      case 'rectangulaire':
        return 'rounded-2xl min-w-[130px]';
      case 'carree':
      default:
        return 'rounded-2xl aspect-square min-w-[90px]';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Controls & Navigation Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: View Mode Switcher + Establishment Context */}
        <div className="flex flex-wrap items-center gap-3">
          {isFloorPlanAllowed ? (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('plan')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'plan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4 text-amber-600" />
                <span>Plan de Salle 2D</span>
              </button>
              <button
                onClick={() => setViewMode('grille')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grille'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-slate-600" />
                <span>Vue Grille</span>
              </button>
              <button
                onClick={() => setViewMode('commandes')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'commandes'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gérer plusieurs tables en même temps (Section 4 du Guide du Serveur)"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Commandes Actives ({tables.filter((t) => t.currentOrderId).length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grille')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grille'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-amber-600" />
                <span>Affichage Grille</span>
              </button>
              <button
                onClick={() => setViewMode('commandes')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'commandes'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Commandes ({tables.filter((t) => t.currentOrderId).length})</span>
              </button>
            </div>
          )}

          {isZonesAllowed && (
            <>
              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              {/* Zones Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full custom-scrollbar py-0.5">
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
                      ></span>
                      <span>{zone.name}</span>
                      <span className="text-[10px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Actions, Edit Mode Toggle, Add Table / Zone */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tablettes Kiosk Remote Control Group */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {lockedTabletsCount > 0 ? (
              <button
                onClick={async () => {
                  await unlockAllTableTablets();
                  showToast('Toutes les tablettes ont été déverrouillées avec succès', 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-all shadow-xs"
                title="Déverrouiller à distance toutes les tablettes des tables"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Déverrouiller Tout ({lockedTabletsCount})</span>
              </button>
            ) : (
              <button
                onClick={async () => {
                  const reason =
                    window.prompt('Motif du verrouillage global des tablettes :', 'Fin de service / Clôture') ||
                    'Verrouillage global Direction';
                  await lockAllTableTablets(reason);
                  showToast('Toutes les tablettes ont été verrouillées à distance', 'warning');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 transition-all"
                title="Verrouiller à distance toutes les tablettes des tables"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Verrouiller Tablettes</span>
              </button>
            )}

            <button
              onClick={() => {
                const targetId = selectedZoneId !== 'all' ? filteredTables[0]?.id || tables[0]?.id : tables[0]?.id;
                if (onOpenKiosk && targetId) {
                  onOpenKiosk(targetId);
                } else if (targetId) {
                  setActiveKioskTableId(targetId);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-amber-400 hover:bg-slate-800 transition-all shadow-xs"
              title="Tester la borne / tablette client en mode plein écran"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Borne Client</span>
            </button>
          </div>

          {viewMode === 'plan' && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                isEditMode
                  ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Terminer l\'Édition' : 'Éditer le Plan 2D'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddTableModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter Table</span>
          </button>

          {isZonesEnabled && (
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

      {/* Legend & Stats Banner */}
      <div className="bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>Libre</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
            <span>Occupée / En service</span>
          </span>
          {isReservationsEnabled && (
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200"></span>
              <span>Réservée</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
            <span>Attente paiement</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 ring-2 ring-gray-200"></span>
            <span>À nettoyer</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-200"></span>
            <span>Hors service</span>
          </span>
        </div>

        <div className="text-slate-500 text-[11px] font-medium flex items-center gap-2">
          <span>{activeRestaurant.name}</span>
          <span>•</span>
          <span>
            {tables.filter((t) => t.status === 'occupee').length} / {tables.length} tables actives
          </span>
        </div>
      </div>

      {/* MAIN VIEW: 2D FLOOR PLAN CANVAS */}
      {viewMode === 'plan' ? (
        <div className="relative">
          {/* Edit mode hint */}
          {isEditMode && (
            <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-amber-600" />
                <span>
                  Mode Édition Actif : Glissez-déposez les tables pour les déplacer, cliquez sur les icônes de rotation ou les boutons d'options.
                </span>
              </div>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
              >
                Valider
              </button>
            </div>
          )}

          {/* 2D Plan Canvas Container */}
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMoveCanvas}
            onPointerUp={handlePointerUpCanvas}
            className={`relative w-full h-[640px] sm:h-[720px] bg-slate-900 rounded-3xl border-4 overflow-hidden shadow-2xl transition-all ${
              isEditMode ? 'border-amber-400 cursor-crosshair' : 'border-slate-800'
            }`}
            style={{
              touchAction: isEditMode ? 'none' : 'auto',
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1.5px, transparent 0),
                linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px, 120px 120px, 120px 120px',
            }}
          >
            {/* Architectural compass watermark */}
            <div className="absolute bottom-4 right-4 pointer-events-none opacity-20 text-white flex items-center gap-2 font-mono text-xs">
              <Compass className="w-10 h-10" />
              <div>
                <div>PLAN ARCHITECTURAL</div>
                <div>{activeRestaurant.name.toUpperCase()}</div>
              </div>
            </div>

            {/* Zone Label Watermark */}
            <div className="absolute top-4 left-6 pointer-events-none text-slate-500 font-black tracking-widest text-lg sm:text-2xl uppercase opacity-40">
              {selectedZoneId === 'all'
                ? activeRestaurant.name
                : zones.find((z) => z.id === selectedZoneId)?.name || 'SALLE'}
            </div>

            {/* Tables positioned in 2D Space */}
            {filteredTables.map((table) => {
              const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;
              const order = getTableOrder(table);
              const elapsed = table.timeOccupied ? getMinutesElapsed(table.timeOccupied) : 0;
              const posX = table.x ?? 20;
              const posY = table.y ?? 20;
              const shapeClass = getShapeStyle(table.shape);
              const rotation = table.rotation ?? 0;
              const isDragging = draggingTableId === table.id;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => handlePointerDownTable(e, table)}
                  onClick={() => {
                    if (!isEditMode) setSelectedTable(table);
                    else setEditingTableDetails(table);
                  }}
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.2s, box-shadow 0.2s',
                  }}
                  className={`absolute p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-shadow shadow-lg select-none group border-2 ${shapeClass} ${
                    isDragging
                      ? 'ring-4 ring-amber-400 z-40 shadow-2xl scale-105'
                      : 'hover:scale-105 hover:z-30'
                  } ${
                    table.status === 'libre'
                      ? 'bg-slate-800/90 border-emerald-500 text-emerald-300 hover:border-emerald-400'
                      : table.status === 'occupee' || table.status === 'attente_commande' || table.status === 'en_service'
                      ? 'bg-amber-950/80 border-amber-500 text-amber-200 hover:border-amber-400'
                      : table.status === 'reservee'
                      ? 'bg-blue-950/80 border-blue-500 text-blue-200 hover:border-blue-400'
                      : table.status === 'attente_paiement'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                      : table.status === 'hors_service'
                      ? 'bg-red-950/80 border-red-500 text-red-300 opacity-60'
                      : 'bg-slate-800 border-gray-500 text-gray-300'
                  }`}
                >
                  {/* Table Number & Status Pill */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white">
                      {table.number}
                    </span>
                    {table.mergedWithTableId && (
                      <span className="p-0.5 rounded bg-amber-500 text-slate-900" title="Table fusionnée">
                        <GitMerge className="w-3 h-3" />
                      </span>
                    )}
                    {table.tabletLocked && (
                      <span className="p-0.5 rounded bg-rose-600 text-white shadow-xs animate-pulse" title="Tablette Verrouillée à distance">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                    {table.tabletCallWaiterPending && (
                      <span className="p-0.5 rounded bg-amber-500 text-slate-950 font-bold shadow-xs animate-bounce" title="Appel Serveur !">
                        <Bell className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Capacity & Zone */}
                  {isCapacityAllowed && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-300 font-semibold mt-0.5">
                      <Users className="w-2.5 h-2.5 text-slate-400" />
                      <span>{table.capacity}p</span>
                      {table.assignedServerName && (
                        <span className="text-amber-400 truncate max-w-[50px]">
                          • {table.assignedServerName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Order Summary */}
                  {order ? (
                    <div className="mt-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-black text-amber-300">
                      {formatCurrency(order.total, settings.currency)}
                    </div>
                  ) : (
                    <div className="text-[9px] uppercase tracking-wider font-bold opacity-70 mt-0.5">
                      {statusConfig.label}
                    </div>
                  )}

                  {/* In Edit Mode: Quick Rotate Button */}
                  {isEditMode && (
                    <button
                      onClick={(e) => handleRotateTable(table, e)}
                      className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md hover:bg-amber-600 transition-colors"
                      title="Pivoter de 45°"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredTables.map((table) => {
            const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;
            const order = getTableOrder(table);
            const elapsed = table.timeOccupied ? getMinutesElapsed(table.timeOccupied) : 0;

            return (
              <div
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between min-h-[160px] ${statusConfig.borderClass} ${statusConfig.bgClass}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900">{table.number}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                    {isCapacityAllowed && (
                      <>
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          {table.capacity} places
                        </span>
                        <span className="text-slate-300">•</span>
                      </>
                    )}
                    <span className="truncate">{table.zone}</span>
                  </div>
                  {table.assignedServerName && (
                    <div className="text-[10px] font-semibold text-amber-700 mt-1">
                      Serveur : {table.assignedServerName}
                    </div>
                  )}

                  {/* Tablet Kiosk Status Pills */}
                  {table.tabletLocked && (
                    <div className="mt-2 py-0.5 px-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                      <span className="truncate">Tablette Verrouillée</span>
                    </div>
                  )}
                  {table.tabletCallWaiterPending && (
                    <div className="mt-2 py-0.5 px-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold flex items-center gap-1 animate-bounce">
                      <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">Appel Serveur !</span>
                    </div>
                  )}
                </div>

                {order ? (
                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <div className="text-xs font-black text-slate-900">
                      {formatCurrency(order.total, settings.currency)}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5 flex items-center justify-between">
                      <span>{order.items.length} art.</span>
                      {elapsed > 0 && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {elapsed} min
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-2 border-t border-slate-200/40 text-[11px] text-slate-400 italic">
                    {table.status === 'libre' ? 'Prête pour accueil' : table.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VUE 3: COMMANDES ACTIVES MULTI-TABLES (Guide du Serveur - Section 4) */}
      {viewMode === 'commandes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Gestion des Commandes Actives Multi-Tables</h3>
                <p className="text-xs text-slate-600">
                  Passez d'une table à l'autre librement. Suivez la préparation en direct et envoyez l'addition à la caisse en fin de repas.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-600 text-white rounded-xl shadow-xs">
              {tables.filter((t) => t.currentOrderId).length} tables actives
            </span>
          </div>

          {tables.filter((t) => t.currentOrderId).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-sm">Aucune commande active en cours</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Toutes les tables sont actuellement libres ou en attente d'accueil.
              </p>
              <button
                onClick={() => setViewMode('plan')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Retour au Plan de Salle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tables
                .filter((t) => t.currentOrderId)
                .map((table) => {
                  const ord = orders.find((o) => o.id === table.currentOrderId);
                  if (!ord) return null;
                  const elapsed = getMinutesElapsed(ord.createdAt);
                  const isReady = ord.status === 'pret' || ord.items.some((i) => i.status === 'pret');
                  const isAllServi = ord.items.every((i) => i.status === 'servi');
                  const isAwaitingPayment = table.status === 'attente_paiement' || ord.status === 'attente_paiement';

                  return (
                    <div
                      key={table.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Table card header */}
                        <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center">
                              {table.number}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">Table {table.number} ({table.zone})</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                <span>{table.guestsCount || table.capacity} convives</span>
                                <span>•</span>
                                <span>{ord.serverName || 'Serveur'}</span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isAwaitingPayment
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isReady
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                                : isAllServi
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isAwaitingPayment
                              ? 'Attente Caisse'
                              : isReady
                              ? 'Plat Prêt !'
                              : isAllServi
                              ? 'Servi'
                              : 'En préparation'}
                          </span>
                        </div>

                        {/* Order info */}
                        <div className="flex items-center justify-between text-xs mb-3 bg-slate-50 p-2 rounded-xl">
                          <span className="font-mono text-slate-600 text-[11px]">{ord.orderNumber}</span>
                          <span className="font-black text-slate-900">{formatCurrency(ord.total, settings.currency)}</span>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1 mb-3 max-h-36 overflow-y-auto custom-scrollbar">
                          {ord.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-slate-800">
                                <strong className="text-slate-900">{item.quantity}x</strong> {item.productName}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  item.status === 'pret'
                                    ? 'bg-emerald-500 text-white animate-pulse'
                                    : item.status === 'servi'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.status === 'pret' ? 'Prêt' : item.status === 'servi' ? 'Servi' : 'Cuisine'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Card actions */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => onOpenOrder(table.id)}
                          className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          title="Ajouter des plats ou modifier la commande"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Ajouter plats</span>
                        </button>

                        {!isAllServi && (
                          <button
                            onClick={async () => {
                              await updateOrderStatus(ord.id, 'servi');
                              updateTableStatus(table.id, 'en_service');
                              showToast({
                                type: 'success',
                                title: 'Commande Servie',
                                message: `La table ${table.number} a été servie. Bon appétit !`,
                              });
                            }}
                            className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Marquer la commande comme servie à table"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Servie</span>
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            await sendOrderToCashier(ord.id, table.id);
                            showToast({
                              type: 'success',
                              title: 'Addition transmise',
                              message: `Addition Table ${table.number} transmise au poste de caisse !`,
                            });
                          }}
                          className="py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Transmettre à la caisse pour impression et encaissement"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>À la Caisse</span>
                        </button>

                        {(currentUser.role === 'direction' || currentUser.role === 'manager' || currentUser.role === 'caisse') && (
                          <button
                            onClick={() => onPayOrder(ord.id)}
                            className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Encaisser directement"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Encaisser</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: TABLE ACTIONS & DETAILS */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                  {selectedTable.number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Table {selectedTable.number}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">{selectedTable.zone}</span>
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Capacité : {selectedTable.capacity} convives</span>
                    <span>•</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        TABLE_STATUS_MAP[selectedTable.status]?.badgeClass || ''
                      }`}
                    >
                      {TABLE_STATUS_MAP[selectedTable.status]?.label || selectedTable.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Order Info */}
              {currentOrder ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        Commande : {currentOrder.orderNumber}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        Serveur : {currentOrder.serverName || 'Non assigné'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-900">
                        {formatCurrency(currentOrder.total, settings.currency)}
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold">TTC inclus</div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">Articles en cours :</div>
                    <div className="space-y-1.5 divide-y divide-slate-100 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      {currentOrder.items.map((item: OrderItem) => (
                        <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.quantity}x</span>
                            <span className="text-slate-800">{item.productName}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                              {item.destination}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900">
                            {formatCurrency(item.quantity * item.unitPrice, settings.currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200">
                  {selectedTable.status === 'libre' ? (
                    <p>Cette table est actuellement libre et prête pour accueillir des convives.</p>
                  ) : selectedTable.status === 'a_nettoyer' ? (
                    <p>La table a été libérée et attend d'être nettoyée et redressée.</p>
                  ) : (
                    <p>Statut actuel : {selectedTable.status}</p>
                  )}
                </div>
              )}

              {/* Server Assignment */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Assigner un serveur :</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTable.assignedServerId || ''}
                    onChange={(e) => {
                      const sId = e.target.value;
                      const sEmp = employees.find((emp) => emp.id === sId);
                      updateTable(selectedTable.id, {
                        assignedServerId: sId || undefined,
                        assignedServerName: sEmp ? sEmp.fullName : undefined,
                      });
                      setSelectedTable({
                        ...selectedTable,
                        assignedServerId: sId || undefined,
                        assignedServerName: sEmp ? sEmp.fullName : undefined,
                      });
                    }}
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                  >
                    <option value="">Aucun serveur assigné</option>
                    {availableServers.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.fullName} ({srv.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Merge / Split Options */}
              {(isMergeAllowed || isDivisionAllowed) && (
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <GitMerge className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fusion / Séparation de Tables :</span>
                    </span>
                    {isDivisionAllowed && selectedTable.mergedWithTableId && (
                      <button
                        onClick={() => {
                          splitTables(selectedTable.id);
                          setSelectedTable({ ...selectedTable, mergedWithTableId: undefined });
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Split className="w-3 h-3" /> Séparer
                      </button>
                    )}
                  </div>

                  {isMergeAllowed && !selectedTable.mergedWithTableId && (
                    <div className="flex items-center gap-2">
                      <select
                        value={tableToMergeWith}
                        onChange={(e) => setTableToMergeWith(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                      >
                        <option value="">Sélectionner une table voisine...</option>
                        {tables
                          .filter((t) => t.id !== selectedTable.id && !t.mergedWithTableId)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              Table {t.number} ({t.zone} - {t.capacity}p)
                            </option>
                          ))}
                      </select>
                      <button
                        disabled={!tableToMergeWith}
                        onClick={() => {
                          if (tableToMergeWith) {
                            mergeTables(selectedTable.id, tableToMergeWith);
                            setTableToMergeWith('');
                            setSelectedTable(null);
                          }
                        }}
                        className="px-3 py-2 bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:bg-amber-700"
                      >
                        Fusionner
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status Change Buttons */}
              <div className="pt-3 border-t border-slate-100">
                {selectedTable.status === 'reservee' && !isTablesReservationsAllowed && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>Le module Réservations est désactivé dans la configuration système.</span>
                    <button
                      onClick={() => {
                        updateTableStatus(selectedTable.id, 'libre');
                        setSelectedTable({ ...selectedTable, status: 'libre' });
                      }}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 shrink-0"
                    >
                      Remettre libre
                    </button>
                  </div>
                )}
                <div className="text-xs font-bold text-slate-600 mb-2">Modifier manuellement le statut :</div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      'libre',
                      'occupee',
                      ...(isTablesReservationsAllowed ? (['reservee'] as TableStatus[]) : []),
                      'attente_paiement',
                      ...(isCleaningAllowed ? (['a_nettoyer'] as TableStatus[]) : []),
                      'hors_service',
                    ] as TableStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        updateTableStatus(selectedTable.id, st);
                        setSelectedTable({ ...selectedTable, status: st });
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
                        selectedTable.status === st
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {TABLE_STATUS_MAP[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tablet Kiosk Remote Controls (Direction / Firebase) */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tablet className="w-3.5 h-3.5 text-amber-600" />
                    <span>Borne & Tablette Client (Menu Numérique) :</span>
                  </span>
                  {selectedTable.tabletLocked ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Verrouillée à distance</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Tablette Active</span>
                    </span>
                  )}
                </div>

                {/* Notifications en cours sur la tablette */}
                {selectedTable.tabletCallWaiterPending && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                      <span className="font-semibold">Appel Serveur en cours sur cette table !</span>
                    </div>
                    <button
                      onClick={async () => {
                        await dismissWaiterCall(selectedTable.id);
                        setSelectedTable({ ...selectedTable, tabletCallWaiterPending: false });
                        showToast('Appel serveur acquitté', 'info');
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 text-[11px]"
                    >
                      Acquitter
                    </button>
                  </div>
                )}

                {selectedTable.tabletBillRequested && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs text-blue-900 font-semibold">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>Les convives ont demandé l'addition depuis la tablette.</span>
                  </div>
                )}

                {selectedTable.tabletLocked && (
                  <div className="mb-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                    <div className="text-rose-900 font-bold">
                      Motif : « {selectedTable.tabletLockedReason || 'Verrouillée à distance par la Direction'} »
                    </div>
                    {selectedTable.tabletLockedBy && (
                      <div className="text-[11px] text-rose-700">
                        Verrouillée par {selectedTable.tabletLockedBy}{' '}
                        {selectedTable.tabletLockedAt &&
                          `à ${new Date(selectedTable.tabletLockedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {selectedTable.tabletLocked ? (
                    <button
                      onClick={async () => {
                        await unlockTableTablet(selectedTable.id);
                        setSelectedTable({
                          ...selectedTable,
                          tabletLocked: false,
                          tabletLockedReason: undefined,
                        });
                        showToast(`Tablette de la Table ${selectedTable.number} déverrouillée`, 'success');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Déverrouiller à distance (Firebase)</span>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        const reason =
                          window.prompt(
                            `Motif de verrouillage de la Table ${selectedTable.number} :`,
                            "Table en cours d'encaissement"
                          ) || 'Verrouillée à distance par la Direction';
                        await lockTableTablet(selectedTable.id, reason);
                        setSelectedTable({
                          ...selectedTable,
                          tabletLocked: true,
                          tabletLockedReason: reason,
                          tabletLockedBy: 'Direction',
                          tabletLockedAt: new Date().toISOString(),
                        });
                        showToast(`Tablette de la Table ${selectedTable.number} verrouillée à distance`, 'warning');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Verrouiller à distance</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const tId = selectedTable.id;
                      setSelectedTable(null);
                      if (onOpenKiosk) {
                        onOpenKiosk(tId);
                      } else {
                        setActiveKioskTableId(tId);
                      }
                    }}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    title="Ouvrir l'écran de la tablette client pour cette table"
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Lancer Borne</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
              {currentOrder ? (
                <>
                  <button
                    onClick={() => {
                      onOpenOrder(selectedTable.id);
                      setSelectedTable(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>+ Ajouter plats</span>
                  </button>

                  {currentOrder.status !== 'servi' && currentOrder.status !== 'payee' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(currentOrder.id, 'servi');
                        showToast(`Commande Table ${selectedTable.number} marquée servie aux convives`, 'success');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                      title="Marquer les plats comme apportés et servis à table"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>Marquer Servie</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      sendOrderToCashier(currentOrder.id, selectedTable.id);
                      setSelectedTable({ ...selectedTable, status: 'attente_paiement' });
                      showToast(`Table ${selectedTable.number} transmise au caissier pour addition`, 'info');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="Alerter le caissier que la table a demandé l'addition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Envoyer à la caisse</span>
                  </button>

                  {/* Bouton d'encaissement direct (réservé Caisse / Manager / Direction) */}
                  {(currentUser?.role === 'direction' || currentUser?.role === 'manager' || currentUser?.role === 'caisse') && (
                    <button
                      onClick={() => {
                        onPayOrder(currentOrder.id);
                        setSelectedTable(null);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Encaisser ({formatCurrency(currentOrder.total, settings.currency)})</span>
                    </button>
                  )}
                </>
              ) : selectedTable.status === 'a_nettoyer' ? (
                <button
                  onClick={() => {
                    updateTableStatus(selectedTable.id, 'libre');
                    setSelectedTable(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Marquer Nettoyée & Prête</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenOrder(selectedTable.id);
                    setSelectedTable(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Ouvrir Commande sur Table {selectedTable.number}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TABLE DETAILS (IN EDIT MODE) */}
      {editingTableDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Propriétés Table {editingTableDetails.number}
              </h3>
              <button
                onClick={() => setEditingTableDetails(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Numéro de table</label>
                <input
                  type="text"
                  value={editingTableDetails.number}
                  onChange={(e) =>
                    setEditingTableDetails({ ...editingTableDetails, number: e.target.value })
                  }
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Capacité (convives)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingTableDetails.capacity}
                    onChange={(e) =>
                      setEditingTableDetails({
                        ...editingTableDetails,
                        capacity: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Forme géométrique</label>
                  <select
                    value={editingTableDetails.shape || 'carree'}
                    onChange={(e) =>
                      setEditingTableDetails({
                        ...editingTableDetails,
                        shape: e.target.value as TableShape,
                      })
                    }
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  >
                    <option value="carree">Carrée</option>
                    <option value="rectangulaire">Rectangulaire</option>
                    <option value="ronde">Ronde</option>
                    <option value="ovale">Ovale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Salle / Zone rattachée</label>
                <select
                  value={editingTableDetails.zoneId || ''}
                  onChange={(e) => {
                    const z = zones.find((item) => item.id === e.target.value);
                    setEditingTableDetails({
                      ...editingTableDetails,
                      zoneId: e.target.value,
                      zone: z ? z.name : editingTableDetails.zone,
                    });
                  }}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Rotation ({editingTableDetails.rotation || 0}°)</label>
                  <input
                    type="range"
                    min="0"
                    max="315"
                    step="45"
                    value={editingTableDetails.rotation || 0}
                    onChange={(e) =>
                      setEditingTableDetails({
                        ...editingTableDetails,
                        rotation: Number(e.target.value),
                      })
                    }
                    className="w-full mt-2"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer la table ${editingTableDetails.number} ?`)) {
                        deleteTable(editingTableDetails.id);
                        setEditingTableDetails(null);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTableDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTable(editingTableDetails.id, editingTableDetails);
                  setEditingTableDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TABLE */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateTable}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Ajouter une Table</h3>
              <button
                type="button"
                onClick={() => setShowAddTableModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Numéro ou Nom</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: T12, VIP 1, Terr. 4"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Capacité (convives)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Forme</label>
                  <select
                    value={newTableShape}
                    onChange={(e) => setNewTableShape(e.target.value as TableShape)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  >
                    <option value="carree">Carrée</option>
                    <option value="rectangulaire">Rectangulaire</option>
                    <option value="ronde">Ronde</option>
                    <option value="ovale">Ovale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Salle / Zone</label>
                <select
                  value={newTableZoneId}
                  onChange={(e) => setNewTableZoneId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddTableModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
              >
                Créer la Table
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD ZONE / SALLE */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateZone}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Créer une Salle / Zone</h3>
              <button
                type="button"
                onClick={() => setShowAddZoneModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Nom de la Zone</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rooftop, Salle VIP, Terrasse Bar"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Type d'espace</label>
                  <select
                    value={newZoneType}
                    onChange={(e) => setNewZoneType(e.target.value as ZoneType)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  >
                    <option value="salle_principale">Salle principale</option>
                    <option value="terrasse">Terrasse</option>
                    <option value="vip">VIP / Privilège</option>
                    <option value="bar">Bar & Comptoir</option>
                    <option value="salon_prive">Salon privé</option>
                    <option value="climatisee">Climatisée</option>
                    <option value="exterieure">Extérieure</option>
                    <option value="rooftop">Rooftop</option>
                    <option value="evenementielle">Salle événementielle</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Capacité totale</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={newZoneCapacity}
                    onChange={(e) => setNewZoneCapacity(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Couleur d'identification</label>
                <div className="flex items-center gap-2 mt-1">
                  {['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewZoneColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newZoneColor === color ? 'scale-125 border-white ring-2 ring-slate-900' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddZoneModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700"
              >
                Créer l'Espace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mode Borne Client Tablette Kiosk Fullscreen Overlay */}
      {activeKioskTableId && (
        <TableKioskView
          initialTableId={activeKioskTableId}
          onExit={() => setActiveKioskTableId(null)}
        />
      )}
    </div>
  );
};
