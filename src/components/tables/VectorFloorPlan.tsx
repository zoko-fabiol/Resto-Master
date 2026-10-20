import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  RestaurantTable,
  TableStatus,
  TableShape,
  Order,
  DecorElement,
  Zone,
  RestaurantSettings,
} from '../../types/restaurant';
import { TABLE_STATUS_MAP, formatCurrency, getMinutesElapsed } from '../../lib/utils';
import {
  Compass,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Utensils,
  CalendarDays,
  Sparkles,
  Lock,
  Bell,
  GitMerge,
  RotateCw,
  Plus,
  Box,
} from 'lucide-react';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 800;
const SNAP_GRID = 10;
const DRAG_THRESHOLD = 4;

interface VectorFloorPlanProps {
  tables: RestaurantTable[];
  decorElements: DecorElement[];
  ordersMap: Map<string, Order>;
  settings: RestaurantSettings;
  activeZone?: Zone;
  isEditMode: boolean;
  snapToGrid: boolean;
  selectedTableId: string | null;
  selectedDecorId: string | null;
  onSelectTable: (table: RestaurantTable) => void;
  onTableAction: (table: RestaurantTable) => void;
  onSelectDecor: (decor: DecorElement) => void;
  onUpdateDraftTables: (tables: RestaurantTable[]) => void;
  onUpdateDraftDecor: (decor: DecorElement[]) => void;
  onPushHistory: () => void;
  onAddTableClick: () => void;
  onBatchAddClick: () => void;
}

// Convert table coordinates (handles historical percentages <= 100)
export function normalizeCoordinateX(val: number | undefined): number {
  if (val === undefined || val === null) return 200;
  if (val > 0 && val <= 100) return (val / 100) * LOGICAL_WIDTH;
  return val;
}

export function normalizeCoordinateY(val: number | undefined): number {
  if (val === undefined || val === null) return 200;
  if (val > 0 && val <= 100) return (val / 100) * LOGICAL_HEIGHT;
  return val;
}

export const VectorFloorPlan: React.FC<VectorFloorPlanProps> = ({
  tables,
  decorElements,
  ordersMap,
  settings,
  activeZone,
  isEditMode,
  snapToGrid,
  selectedTableId,
  selectedDecorId,
  onSelectTable,
  onTableAction,
  onSelectDecor,
  onUpdateDraftTables,
  onUpdateDraftDecor,
  onPushHistory,
  onAddTableClick,
  onBatchAddClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: 'table' | 'decor' | 'resize' | 'rotate';
    id: string;
    handle?: string;
  } | null>(null);

  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragEntityStartPosRef = useRef({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });
  const dragHasExceededThresholdRef = useRef(false);

  // Alignment guide lines
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }>({});

  // Reset zoom & pan
  const handleResetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert client coordinates to 1200x800 logical SVG coordinates
  const clientToLogical = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      // Account for pan and zoom
      const logicalX = (normX * LOGICAL_WIDTH - pan.x) / zoom;
      const logicalY = (normY * LOGICAL_HEIGHT - pan.y) / zoom;
      return { x: logicalX, y: logicalY };
    },
    [zoom, pan]
  );

  // Collision detection between tables
  const collidingTableIds = useMemo(() => {
    const colliding = new Set<string>();
    for (let i = 0; i < tables.length; i++) {
      const t1 = tables[i];
      const x1 = normalizeCoordinateX(t1.x);
      const y1 = normalizeCoordinateY(t1.y);
      const w1 = t1.width || 100;
      const h1 = t1.height || 100;

      for (let j = i + 1; j < tables.length; j++) {
        const t2 = tables[j];
        const x2 = normalizeCoordinateX(t2.x);
        const y2 = normalizeCoordinateY(t2.y);
        const w2 = t2.width || 100;
        const h2 = t2.height || 100;

        // Skip tables merged together
        if (t1.mergedWithTableId === t2.id || t2.mergedWithTableId === t1.id) continue;
        if (t1.mergedTableIds?.includes(t2.id) || t2.mergedTableIds?.includes(t1.id)) continue;

        const overlapX = Math.abs(x1 - x2) < (w1 + w2) / 2 - 10;
        const overlapY = Math.abs(y1 - y2) < (h1 + h2) / 2 - 10;

        if (overlapX && overlapY) {
          colliding.add(t1.id);
          colliding.add(t2.id);
        }
      }
    }
    return colliding;
  }, [tables]);

  // Pointer Down on Table
  const handleTablePointerDown = (e: React.PointerEvent, table: RestaurantTable) => {
    e.stopPropagation();
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: normalizeCoordinateX(table.x),
      y: normalizeCoordinateY(table.y),
      width: table.width || 100,
      height: table.height || 100,
      rotation: table.rotation || 0,
    };
    dragHasExceededThresholdRef.current = false;

    if (isEditMode) {
      setDraggingEntity({ type: 'table', id: table.id });
      onSelectTable(table);
    }
  };

  // Pointer Down on Decor Element
  const handleDecorPointerDown = (e: React.PointerEvent, decor: DecorElement) => {
    if (!isEditMode) return;
    e.stopPropagation();
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: decor.x,
      y: decor.y,
      width: decor.width,
      height: decor.height,
      rotation: decor.rotation || 0,
    };
    dragHasExceededThresholdRef.current = false;

    setDraggingEntity({ type: 'decor', id: decor.id });
    onSelectDecor(decor);
  };

  // Pointer Down on Resize Handle (Edit Mode)
  const handleResizePointerDown = (e: React.PointerEvent, tableId: string, handle: string) => {
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: normalizeCoordinateX(table.x),
      y: normalizeCoordinateY(table.y),
      width: table.width || 100,
      height: table.height || 100,
      rotation: table.rotation || 0,
    };
    dragHasExceededThresholdRef.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);

    setDraggingEntity({ type: 'resize', id: tableId, handle });
  };

  // Pointer Down on Canvas (Pan or Deselect)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Left click on background: start pan if space held or middle click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    }
  };

  // Pointer Move on SVG Canvas
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!draggingEntity || !isEditMode) return;

    const dx = e.clientX - dragStartClientRef.current.x;
    const dy = e.clientY - dragStartClientRef.current.y;

    // Check anti-click parasite threshold (4px)
    if (!dragHasExceededThresholdRef.current) {
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        dragHasExceededThresholdRef.current = true;
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {}
      } else {
        return;
      }
    }

    // Scale delta into logical coordinates
    const logicalDx = dx / zoom;
    const logicalDy = dy / zoom;

    if (draggingEntity.type === 'table') {
      let targetX = dragEntityStartPosRef.current.x + logicalDx;
      let targetY = dragEntityStartPosRef.current.y + logicalDy;

      // Magnetic snapping (10 units)
      if (snapToGrid) {
        targetX = Math.round(targetX / SNAP_GRID) * SNAP_GRID;
        targetY = Math.round(targetY / SNAP_GRID) * SNAP_GRID;
      }

      // Constrain within logical boundaries
      const halfW = (dragEntityStartPosRef.current.width || 100) / 2;
      const halfH = (dragEntityStartPosRef.current.height || 100) / 2;
      targetX = Math.max(halfW + 10, Math.min(LOGICAL_WIDTH - halfW - 10, targetX));
      targetY = Math.max(halfH + 10, Math.min(LOGICAL_HEIGHT - halfH - 10, targetY));

      // Dynamic alignment guide lines with neighbor tables
      let guideX: number | undefined = undefined;
      let guideY: number | undefined = undefined;

      for (const other of tables) {
        if (other.id === draggingEntity.id) continue;
        const otherX = normalizeCoordinateX(other.x);
        const otherY = normalizeCoordinateY(other.y);

        if (Math.abs(targetX - otherX) <= 8) {
          targetX = otherX;
          guideX = otherX;
        }
        if (Math.abs(targetY - otherY) <= 8) {
          targetY = otherY;
          guideY = otherY;
        }
      }

      setGuideLines({ x: guideX, y: guideY });

      // Update draft tables state locally without any Firestore write!
      onUpdateDraftTables(
        tables.map((t) => (t.id === draggingEntity.id ? { ...t, x: targetX, y: targetY } : t))
      );
    } else if (draggingEntity.type === 'decor') {
      let targetX = dragEntityStartPosRef.current.x + logicalDx;
      let targetY = dragEntityStartPosRef.current.y + logicalDy;

      if (snapToGrid) {
        targetX = Math.round(targetX / SNAP_GRID) * SNAP_GRID;
        targetY = Math.round(targetY / SNAP_GRID) * SNAP_GRID;
      }

      targetX = Math.max(30, Math.min(LOGICAL_WIDTH - 30, targetX));
      targetY = Math.max(30, Math.min(LOGICAL_HEIGHT - 30, targetY));

      onUpdateDraftDecor(
        decorElements.map((d) => (d.id === draggingEntity.id ? { ...d, x: targetX, y: targetY } : d))
      );
    } else if (draggingEntity.type === 'resize') {
      const startW = dragEntityStartPosRef.current.width;
      const startH = dragEntityStartPosRef.current.height;

      let newW = Math.max(60, Math.min(300, startW + logicalDx));
      let newH = Math.max(60, Math.min(300, startH + logicalDy));

      if (snapToGrid) {
        newW = Math.round(newW / SNAP_GRID) * SNAP_GRID;
        newH = Math.round(newH / SNAP_GRID) * SNAP_GRID;
      }

      onUpdateDraftTables(
        tables.map((t) => (t.id === draggingEntity.id ? { ...t, width: newW, height: newH } : t))
      );
    }
  };

  // Pointer Up
  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (draggingEntity) {
      if (dragHasExceededThresholdRef.current) {
        // Drag was completed: push state to undo stack
        onPushHistory();
      } else {
        // Drag did NOT exceed 4px threshold -> Treat as clean click!
        if (draggingEntity.type === 'table') {
          const table = tables.find((t) => t.id === draggingEntity.id);
          if (table) {
            if (!isEditMode) {
              onTableAction(table);
            } else {
              onSelectTable(table);
            }
          }
        }
      }

      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingEntity(null);
      setGuideLines({});
    }
  };

  // Rotate table by 45 degrees
  const handleRotateTable = (table: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRot = ((table.rotation || 0) + 45) % 360;
    onUpdateDraftTables(
      tables.map((t) => (t.id === table.id ? { ...t, rotation: nextRot } : t))
    );
    onPushHistory();
  };

  // Wheel zoom (with Ctrl or standard wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => Math.max(0.6, Math.min(2.2, z * zoomFactor)));
    }
  };

  // Group merged tables for unified contour rendering (G10)
  const mergedClusters = useMemo(() => {
    const clusters: Array<{ primary: RestaurantTable; secondaries: RestaurantTable[] }> = [];
    const handled = new Set<string>();

    for (const table of tables) {
      if (handled.has(table.id)) continue;

      const hasMergedChildren = table.mergedTableIds && table.mergedTableIds.length > 0;
      if (hasMergedChildren && !table.mergedWithTableId) {
        const secondaries = tables.filter((t) => table.mergedTableIds?.includes(t.id));
        clusters.push({ primary: table, secondaries });
        handled.add(table.id);
        secondaries.forEach((s) => handled.add(s.id));
      }
    }
    return clusters;
  }, [tables]);

  return (
    <div className="relative w-full rounded-3xl bg-slate-950 border-4 border-slate-900 overflow-hidden shadow-2xl select-none">
      {/* Top Floating Control Bar (Zoom, Pan, Info) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom avant (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-bold px-2 tabular-nums text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom arrière (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <button
          onClick={handleResetZoomPan}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Réinitialiser zoom et cadrage (100%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Collision Alert Pill */}
      {isEditMode && collidingTableIds.size > 0 && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-bold shadow-lg animate-pulse">
          <AlertCircle className="w-4 h-4" />
          <span>{collidingTableIds.size} tables en collision sur le plan</span>
        </div>
      )}

      {/* Architectural Watermark */}
      <div className="absolute bottom-4 right-4 pointer-events-none opacity-20 text-white flex items-center gap-3 font-mono text-xs z-10">
        <Compass className="w-8 h-8" />
        <div>
          <div className="font-bold tracking-widest">REPERE VECTORIEL 1200 x 800</div>
          <div className="text-[10px] uppercase opacity-75">{activeZone?.name || 'SALLE PRINCIPALE'}</div>
        </div>
      </div>

      {/* Welcoming Empty State (G13) */}
      {tables.length === 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-slate-900/90 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Aucune table dans {activeZone?.name || 'cette salle'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Commencez par concevoir l'agencement de votre salle en ajoutant une première table ou en générant
            instantanément un ensemble complet de tables.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onBatchAddClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Grid className="w-4 h-4" />
              <span>Générer un lot de tables</span>
            </button>
            <button
              onClick={onAddTableClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une table unique</span>
            </button>
          </div>
        </div>
      )}

      {/* SVG Vector Canvas (1200 x 800 native resolution) */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LOGICAL_WIDTH} ${LOGICAL_HEIGHT}`}
        className={`w-full aspect-[3/2] max-h-[740px] block transition-colors ${
          isEditMode ? 'cursor-crosshair' : 'cursor-default'
        }`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onWheel={handleWheel}
        style={{
          touchAction: 'none',
        }}
      >
        <defs>
          {/* Architectural Snap Grid pattern */}
          <pattern id="minorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <pattern id="majorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#minorGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          </pattern>

          {/* Wall Hatch Pattern */}
          <pattern id="wallHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#334155" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="2" />
          </pattern>

          {/* Wood bar texture */}
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>

          {/* Counter texture */}
          <linearGradient id="counterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>

        {/* Global Pan & Zoom SVG Group */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background Grid */}
          <rect width={LOGICAL_WIDTH} height={LOGICAL_HEIGHT} fill="#090d16" />
          <rect width={LOGICAL_WIDTH} height={LOGICAL_HEIGHT} fill="url(#majorGrid)" />

          {/* Outer Room Border */}
          <rect
            x="20"
            y="20"
            width={LOGICAL_WIDTH - 40}
            height={LOGICAL_HEIGHT - 40}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3"
            rx="16"
          />

          {/* Alignment Guide Lines */}
          {guideLines.x !== undefined && (
            <line
              x1={guideLines.x}
              y1="0"
              x2={guideLines.x}
              y2={LOGICAL_HEIGHT}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}
          {guideLines.y !== undefined && (
            <line
              x1="0"
              y1={guideLines.y}
              x2={LOGICAL_WIDTH}
              y2={guideLines.y}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* ARCHITECTURAL DECOR ELEMENTS (G9) */}
          {decorElements.map((decor) => {
            const isSelected = isEditMode && selectedDecorId === decor.id;
            return (
              <g
                key={decor.id}
                transform={`translate(${decor.x}, ${decor.y}) rotate(${decor.rotation || 0})`}
                onPointerDown={(e) => handleDecorPointerDown(e, decor)}
                className={isEditMode ? 'cursor-move' : ''}
              >
                {/* Visual shape by type */}
                {decor.type === 'mur' && (
                  <rect
                    x={-decor.width / 2}
                    y={-decor.height / 2}
                    width={decor.width}
                    height={decor.height}
                    fill="url(#wallHatch)"
                    stroke="#64748b"
                    strokeWidth="2"
                    rx="2"
                  />
                )}

                {decor.type === 'bar' && (
                  <g>
                    <rect
                      x={-decor.width / 2}
                      y={-decor.height / 2}
                      width={decor.width}
                      height={decor.height}
                      fill="url(#barGradient)"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      rx="12"
                    />
                    {/* Stool indicators */}
                    {Array.from({ length: Math.max(2, Math.floor(decor.width / 45)) }).map((_, i, arr) => {
                      const stoolX = -decor.width / 2 + 25 + (i * (decor.width - 50)) / (arr.length - 1 || 1);
                      return (
                        <circle
                          key={i}
                          cx={stoolX}
                          cy={decor.height / 2 + 14}
                          r="7"
                          fill="#475569"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                )}

                {decor.type === 'comptoir' && (
                  <rect
                    x={-decor.width / 2}
                    y={-decor.height / 2}
                    width={decor.width}
                    height={decor.height}
                    fill="url(#counterGradient)"
                    stroke="#d97706"
                    strokeWidth="2"
                    rx="8"
                  />
                )}

                {decor.type === 'colonne' && (
                  <circle
                    cx="0"
                    cy="0"
                    r={Math.min(decor.width, decor.height) / 2}
                    fill="#334155"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                  />
                )}

                {decor.type === 'porte' && (
                  <g>
                    {/* Door frame */}
                    <line
                      x1={-decor.width / 2}
                      y1="0"
                      x2={decor.width / 2}
                      y2="0"
                      stroke="#64748b"
                      strokeWidth="3"
                    />
                    {/* 90-degree swing arc */}
                    <path
                      d={`M ${-decor.width / 2} 0 A ${decor.width} ${decor.width} 0 0 1 ${decor.width / 2} ${decor.width}`}
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {/* Door leaf */}
                    <line
                      x1={-decor.width / 2}
                      y1="0"
                      x2={-decor.width / 2}
                      y2={decor.width}
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                  </g>
                )}

                {decor.type === 'entree' && (
                  <g>
                    <rect
                      x={-decor.width / 2}
                      y={-decor.height / 2}
                      width={decor.width}
                      height={decor.height}
                      fill="rgba(16, 185, 129, 0.15)"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      rx="4"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#10b981"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      ENTRÉE
                    </text>
                  </g>
                )}

                {decor.type === 'escalier' && (
                  <g>
                    <rect
                      x={-decor.width / 2}
                      y={-decor.height / 2}
                      width={decor.width}
                      height={decor.height}
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="2"
                    />
                    {Array.from({ length: Math.max(3, Math.floor(decor.height / 15)) }).map((_, idx, arr) => {
                      const stepY = -decor.height / 2 + ((idx + 1) * decor.height) / (arr.length + 1);
                      return (
                        <line
                          key={idx}
                          x1={-decor.width / 2}
                          y1={stepY}
                          x2={decor.width / 2}
                          y2={stepY}
                          stroke="#64748b"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </g>
                )}

                {decor.type === 'fenetre' && (
                  <g>
                    <rect
                      x={-decor.width / 2}
                      y={-decor.height / 2}
                      width={decor.width}
                      height={decor.height}
                      fill="rgba(56, 189, 248, 0.2)"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      rx="2"
                    />
                    <line
                      x1={-decor.width / 2}
                      y1="0"
                      x2={decor.width / 2}
                      y2="0"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                  </g>
                )}

                {decor.type === 'plante' && (
                  <circle
                    cx="0"
                    cy="0"
                    r={Math.min(decor.width, decor.height) / 2}
                    fill="#065f46"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                )}

                {/* Optional Decor Label */}
                {decor.label && (
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    className="select-none pointer-events-none"
                  >
                    {decor.label}
                  </text>
                )}

                {/* Selection halo in Edit Mode */}
                {isSelected && (
                  <rect
                    x={-decor.width / 2 - 4}
                    y={-decor.height / 2 - 4}
                    width={decor.width + 8}
                    height={decor.height + 8}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    rx="6"
                  />
                )}
              </g>
            );
          })}

          {/* UNIFIED CONTOUR FOR MERGED TABLES (G10) */}
          {mergedClusters.map((cluster) => {
            const allInCluster = [cluster.primary, ...cluster.secondaries];
            const xs = allInCluster.map((t) => normalizeCoordinateX(t.x));
            const ys = allInCluster.map((t) => normalizeCoordinateY(t.y));
            const minX = Math.min(...xs) - 60;
            const maxX = Math.max(...xs) + 60;
            const minY = Math.min(...ys) - 60;
            const maxY = Math.max(...ys) + 60;
            const totalCapacity = allInCluster.reduce((acc, t) => acc + (t.capacity || 4), 0);

            return (
              <g key={`merged_${cluster.primary.id}`}>
                <rect
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  fill="rgba(245, 158, 11, 0.08)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  rx="24"
                />
                {/* Bridge tag */}
                <rect
                  x={(minX + maxX) / 2 - 45}
                  y={minY - 12}
                  width="90"
                  height="22"
                  fill="#f59e0b"
                  rx="6"
                />
                <text
                  x={(minX + maxX) / 2}
                  y={minY + 3}
                  textAnchor="middle"
                  fill="#000000"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="sans-serif"
                >
                  FUSION ({totalCapacity}p)
                </text>
              </g>
            );
          })}

          {/* RESTAURANT TABLES (G1, G2, G3, G4, G5, G7, G12) */}
          {tables.map((table) => {
            const posX = normalizeCoordinateX(table.x);
            const posY = normalizeCoordinateY(table.y);
            const width = table.width || (table.shape === 'rectangulaire' ? 140 : 100);
            const height = table.height || 100;
            const rotation = table.rotation || 0;

            const isSelected = isEditMode && selectedTableId === table.id;
            const isColliding = collidingTableIds.has(table.id);
            const order = table.currentOrderId ? ordersMap.get(table.currentOrderId) : null;
            const elapsed = table.timeOccupied ? getMinutesElapsed(table.timeOccupied) : 0;
            const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;

            // Palette colors according to TableStatus
            let fillColor = '#1e293b';
            let strokeColor = '#10b981'; // libre: emerald
            let textColor = '#ffffff';

            if (table.status === 'occupee' || table.status === 'en_service' || table.status === 'attente_commande') {
              fillColor = '#451a03';
              strokeColor = '#f59e0b'; // amber
            } else if (table.status === 'attente_paiement') {
              fillColor = '#4c0519';
              strokeColor = '#f43f5e'; // rose
            } else if (table.status === 'reservee') {
              fillColor = '#172554';
              strokeColor = '#3b82f6'; // blue
            } else if (table.status === 'a_nettoyer') {
              fillColor = '#334155';
              strokeColor = '#94a3b8'; // slate
            } else if (table.status === 'hors_service') {
              fillColor = '#1e1e1e';
              strokeColor = '#ef4444'; // red
            }

            return (
              <g
                key={table.id}
                transform={`translate(${posX}, ${posY})`}
                onPointerDown={(e) => handleTablePointerDown(e, table)}
                className={`select-none ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
              >
                {/* ROTATED SHAPE CONTAINER */}
                <g transform={`rotate(${rotation})`}>
                  {/* Outer table shadow */}
                  <rect
                    x={-width / 2}
                    y={-height / 2}
                    width={width}
                    height={height}
                    rx={table.shape === 'ronde' ? width / 2 : table.shape === 'ovale' ? 40 : 20}
                    fill={fillColor}
                    stroke={isColliding ? '#ef4444' : strokeColor}
                    strokeWidth={isSelected ? '3.5' : isColliding ? '3' : '2'}
                  />

                  {/* Chairs around table */}
                  {Array.from({ length: Math.min(8, table.capacity) }).map((_, cIdx, cArr) => {
                    const angle = (cIdx * 360) / cArr.length;
                    const rad = (angle * Math.PI) / 180;
                    const chairDistX = (width / 2 + 10) * Math.cos(rad);
                    const chairDistY = (height / 2 + 10) * Math.sin(rad);

                    return (
                      <circle
                        key={cIdx}
                        cx={chairDistX}
                        cy={chairDistY}
                        r="6"
                        fill="#334155"
                        stroke="#64748b"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </g>

                {/* G4: COUNTER-ROTATED LABELS (ALWAYS HORIZONTAL!) */}
                <g className="counter-rotated-content" pointerEvents="none">
                  {/* Table Number */}
                  <text
                    x="0"
                    y={order ? '-14' : '-2'}
                    textAnchor="middle"
                    fill={textColor}
                    fontSize="18"
                    fontWeight="900"
                    fontFamily="sans-serif"
                    className="select-none tracking-tight"
                  >
                    {table.number}
                  </text>

                  {/* Capacity & Server */}
                  <text
                    x="0"
                    y={order ? '4' : '16'}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    className="tabular-nums"
                  >
                    {table.capacity}p
                    {table.assignedServerName ? ` • ${table.assignedServerName.split(' ')[0]}` : ''}
                  </text>

                  {/* Order Total / Status / Elapsed Timer */}
                  {order ? (
                    <g transform="translate(0, 24)">
                      <rect
                        x="-45"
                        y="-10"
                        width="90"
                        height="18"
                        rx="6"
                        fill="rgba(0, 0, 0, 0.65)"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#fde047"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="sans-serif"
                        className="tabular-nums"
                      >
                        {formatCurrency(order.total, settings.currency)}
                      </text>
                    </g>
                  ) : (
                    <text
                      x="0"
                      y="32"
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {statusConfig.label}
                    </text>
                  )}

                  {/* Badges: Kiosk Lock, Waiter Call */}
                  {table.tabletLocked && (
                    <g transform={`translate(${width / 2 - 14}, ${-height / 2 + 14})`}>
                      <circle cx="0" cy="0" r="10" fill="#e11d48" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                        🔒
                      </text>
                    </g>
                  )}

                  {table.tabletCallWaiterPending && (
                    <g transform={`translate(${-width / 2 + 14}, ${-height / 2 + 14})`}>
                      <circle cx="0" cy="0" r="11" fill="#f59e0b" />
                      <text x="0" y="4" textAnchor="middle" fill="#000000" fontSize="10" fontWeight="bold">
                        🔔
                      </text>
                    </g>
                  )}
                </g>

                {/* EDIT MODE HANDLES & CONTROLS */}
                {isEditMode && isSelected && (
                  <g>
                    {/* Bounding box outline */}
                    <rect
                      x={-width / 2 - 6}
                      y={-height / 2 - 6}
                      width={width + 12}
                      height={height + 12}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      rx="14"
                    />

                    {/* Bottom-Right Resize Handle */}
                    <circle
                      cx={width / 2 + 6}
                      cy={height / 2 + 6}
                      r="9"
                      fill="#f59e0b"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-nwse-resize"
                      onPointerDown={(e) => handleResizePointerDown(e, table.id, 'se')}
                    />

                    {/* Quick Rotation Handle */}
                    <g
                      transform={`translate(${width / 2 + 6}, ${-height / 2 - 6})`}
                      onClick={(e) => handleRotateTable(table, e)}
                      className="cursor-pointer"
                    >
                      <circle cx="0" cy="0" r="11" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                      <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                        ↻
                      </text>
                    </g>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
