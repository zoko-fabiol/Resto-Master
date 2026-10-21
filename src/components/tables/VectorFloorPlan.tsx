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
  Lock,
  Bell,
  GitMerge,
  RotateCw,
  Plus,
  Box,
  Maximize2,
  Magnet,
  Trash2,
  Copy,
  Pencil,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Split,
  Sparkles,
  MousePointer,
  Hand,
  X,
} from 'lucide-react';
import {
  screenToLogicalPoint,
  compute8Handles,
  computeResizedBox,
  computeRotationAngle,
  computeUnifiedSnapping,
  findTableCollisions,
  autoSeparateTables,
  alignObjects,
  distributeObjects,
  HandleType,
  Point,
  SnapGuide,
  CollisionPair,
  AlignmentType,
  DistributionAxis,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../../lib/floorPlanGeometry';
import {
  normalizeCoordinateX,
  normalizeCoordinateY,
} from './floorPlanCoordinates';

export { normalizeCoordinateX, normalizeCoordinateY, LOGICAL_WIDTH, LOGICAL_HEIGHT };

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const SNAP_GRID = 10;
const DRAG_THRESHOLD = 4;

export interface VectorFloorPlanProps {
  tables: RestaurantTable[];
  decorElements: DecorElement[];
  ordersMap: Map<string, Order>;
  settings: RestaurantSettings;
  activeZone?: Zone;
  isEditMode: boolean;
  snapToGrid: boolean;
  snapToMagnet?: boolean;
  selectedTableId: string | null;
  selectedDecorId: string | null;
  selectedTableIds?: Set<string>;
  onSelectTable: (table: RestaurantTable, isMultiSelect?: boolean) => void;
  onTableAction: (table: RestaurantTable) => void;
  onSelectDecor: (decor: DecorElement) => void;
  onEditTableProps?: (table: RestaurantTable) => void;
  onEditDecorProps?: (decor: DecorElement) => void;
  onDeselect?: () => void;
  onUpdateDraftTables: (tables: RestaurantTable[]) => void;
  onUpdateDraftDecor: (decor: DecorElement[]) => void;
  onPushHistory: () => void;
  onAddTableClick: () => void;
  onBatchAddClick: () => void;
  onAlignSelected?: (alignment: AlignmentType) => void;
  onDistributeSelected?: (axis: DistributionAxis) => void;
  onAutoSeparate?: () => void;
  onCollisionsChange?: (collidingIds: Set<string>, pairs: CollisionPair[]) => void;
}

export const VectorFloorPlan: React.FC<VectorFloorPlanProps> = ({
  tables,
  decorElements,
  ordersMap,
  settings,
  activeZone,
  isEditMode,
  snapToGrid,
  snapToMagnet = true,
  selectedTableId,
  selectedDecorId,
  selectedTableIds,
  onSelectTable,
  onTableAction,
  onSelectDecor,
  onEditTableProps,
  onEditDecorProps,
  onDeselect,
  onUpdateDraftTables,
  onUpdateDraftDecor,
  onPushHistory,
  onAddTableClick,
  onBatchAddClick,
  onAlignSelected,
  onDistributeSelected,
  onAutoSeparate,
  onCollisionsChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const contentGroupRef = useRef<SVGGElement>(null);

  // Zoom & Pan state (bornes strictes unifiées 0.5 à 3.0)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Multi-touch tracking (pincement et déplacement à 2 doigts sur tablette)
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    zoom: number;
    midLogical: Point;
  } | null>(null);

  // Internal multi-selection set if not passed from parent
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const activeSelectedTableIds = useMemo(() => {
    if (selectedTableIds && selectedTableIds.size > 0) return selectedTableIds;
    if (selectedTableId) return new Set([selectedTableId, ...Array.from(internalSelectedIds)]);
    return internalSelectedIds;
  }, [selectedTableIds, selectedTableId, internalSelectedIds]);

  // Rectangle de sélection lasso
  const [lassoBox, setLassoBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Dragging state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: 'table' | 'group' | 'decor' | 'resize' | 'rotate' | 'lasso';
    id?: string;
    handle?: HandleType;
  } | null>(null);

  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const dragEntityStartPosRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    groupPositions?: Map<string, { x: number; y: number }>;
  }>({ x: 0, y: 0, width: 0, height: 0, rotation: 0 });

  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const dragHasExceededThresholdRef = useRef(false);

  // Alignment guide lines
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // Écoute de la barre d'espace pour basculer en outil Main
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Conversion directe via utilitaire pur CTM inverse (1.1)
  const toLogical = useCallback(
    (clientX: number, clientY: number): Point => {
      return screenToLogicalPoint(clientX, clientY, svgRef.current, contentGroupRef.current);
    },
    []
  );

  // Collision detection between tables via Separating Axis Theorem (1.8)
  const { collidingTableIds, pairs: collisionPairs } = useMemo(() => {
    return findTableCollisions(tables);
  }, [tables]);

  useEffect(() => {
    onCollisionsChange?.(collidingTableIds, collisionPairs);
  }, [collidingTableIds, collisionPairs, onCollisionsChange]);

  // Selected table object
  const primarySelectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Selected decor object
  const primarySelectedDecor = useMemo(() => {
    if (!selectedDecorId) return null;
    return decorElements.find((d) => d.id === selectedDecorId) || null;
  }, [decorElements, selectedDecorId]);

  // Reset zoom & pan à 100%
  const handleResetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Ajuster à l'écran (calcul d'échelle optimal pour le conteneur) (1.2)
  const handleFitToScreen = () => {
    if (!svgRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const padding = 24;
    const availW = Math.max(100, rect.width - padding * 2);
    const availH = Math.max(100, rect.height - padding * 2);
    const scale = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, Math.min(availW / LOGICAL_WIDTH, availH / LOGICAL_HEIGHT) * (LOGICAL_WIDTH / rect.width))
    );
    setZoom(scale || 1);
    setPan({ x: 0, y: 0 });
  };

  // P-02: Zoom centré à la molette SANS besoin de Ctrl (passive: false)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const cursorX = e.clientX;
      const cursorY = e.clientY;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom * zoomFactor));
        if (nextZoom === prevZoom) return prevZoom;

        const scaleToSvg = LOGICAL_WIDTH / rect.width;
        const logicalXAtCursor = ((cursorX - rect.left) * scaleToSvg - pan.x) / prevZoom;
        const logicalYAtCursor = ((cursorY - rect.top) * scaleToSvg - pan.y) / prevZoom;

        setPan({
          x: (cursorX - rect.left) * scaleToSvg - logicalXAtCursor * nextZoom,
          y: (cursorY - rect.top) * scaleToSvg - logicalYAtCursor * nextZoom,
        });

        return nextZoom;
      });
    };

    svgEl.addEventListener('wheel', onWheelNative, { passive: false });
    return () => svgEl.removeEventListener('wheel', onWheelNative);
  }, [pan]);

  // Pointer Down sur Table (1.1, 1.6)
  const handleTablePointerDown = (e: React.PointerEvent, table: RestaurantTable) => {
    // Si l'outil main ou barre d'espace est actif, laisser le canevas gérer le pan
    if (activeTool === 'hand' || isSpacePressed) {
      return;
    }

    e.stopPropagation();
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const p = toLogical(e.clientX, e.clientY);
    const tblX = normalizeCoordinateX(table.x);
    const tblY = normalizeCoordinateY(table.y);

    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragHasExceededThresholdRef.current = false;

    if (!isEditMode) {
      // En mode service, clic simple géré au pointer up
      return;
    }

    // Capture du pointeur
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Gestion de la sélection multiple (Maj + clic)
    if (e.shiftKey) {
      const next = new Set(activeSelectedTableIds);
      if (next.has(table.id)) {
        next.delete(table.id);
      } else {
        next.add(table.id);
      }
      setInternalSelectedIds(next);
      onSelectTable(table, true);
      return;
    }

    // Si la table n'est pas déjà dans le groupe de sélection, remplacer la sélection
    let groupIds = activeSelectedTableIds;
    if (!groupIds.has(table.id)) {
      groupIds = new Set([table.id]);
      setInternalSelectedIds(groupIds);
      onSelectTable(table, false);
    }

    // Enregistrer les positions initiales pour déplacement de groupe
    const groupPositions = new Map<string, { x: number; y: number }>();
    for (const id of groupIds) {
      const t = tables.find((item) => item.id === id);
      if (t) {
        groupPositions.set(id, {
          x: normalizeCoordinateX(t.x),
          y: normalizeCoordinateY(t.y),
        });
      }
    }

    dragEntityStartPosRef.current = {
      x: tblX,
      y: tblY,
      width: table.width || 100,
      height: table.height || 100,
      rotation: table.rotation || 0,
      groupPositions,
    };

    grabOffsetRef.current = {
      x: p.x - tblX,
      y: p.y - tblY,
    };

    if (groupIds.size > 1) {
      setDraggingEntity({ type: 'group' });
    } else {
      setDraggingEntity({ type: 'table', id: table.id });
    }
  };

  // Pointer Down sur Élément de Décor (1.1)
  const handleDecorPointerDown = (e: React.PointerEvent, decor: DecorElement) => {
    if (!isEditMode || activeTool === 'hand' || isSpacePressed) return;
    e.stopPropagation();
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    const p = toLogical(e.clientX, e.clientY);
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: decor.x,
      y: decor.y,
      width: decor.width,
      height: decor.height,
      rotation: decor.rotation || 0,
    };
    grabOffsetRef.current = {
      x: p.x - decor.x,
      y: p.y - decor.y,
    };
    dragHasExceededThresholdRef.current = false;

    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDraggingEntity({ type: 'decor', id: decor.id });
    setInternalSelectedIds(new Set());
    onSelectDecor(decor);
  };

  // Pointer Down sur Poignée de Redimensionnement (1.5)
  const handleResizePointerDown = (e: React.PointerEvent, tableId: string, handle: HandleType) => {
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: normalizeCoordinateX(table.x),
      y: normalizeCoordinateY(table.y),
      width: table.width || 100,
      height: table.height || 100,
      rotation: table.rotation || 0,
    };
    dragHasExceededThresholdRef.current = true;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setDraggingEntity({ type: 'resize', id: tableId, handle });
  };

  // Pointer Down sur Poignée de Rotation (1.4)
  const handleRotatePointerDown = (e: React.PointerEvent, tableId: string) => {
    e.stopPropagation();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragEntityStartPosRef.current = {
      x: normalizeCoordinateX(table.x),
      y: normalizeCoordinateY(table.y),
      width: table.width || 100,
      height: table.height || 100,
      rotation: table.rotation || 0,
    };
    dragHasExceededThresholdRef.current = true;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setDraggingEntity({ type: 'rotate', id: tableId });
  };

  // Pointer Down sur Canvas SVG (1.2, 1.6)
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Mode Main, barre d'espace ou clic milieu : panoramique
    const isPanAction =
      activeTool === 'hand' ||
      isSpacePressed ||
      e.button === 1 ||
      (!isEditMode && e.target === svgRef.current);

    if (isPanAction) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    // En mode édition sur fond vide : démarrer sélection lasso ou désélectionner
    if (isEditMode && e.target === svgRef.current) {
      const p = toLogical(e.clientX, e.clientY);
      if (!e.shiftKey) {
        onDeselect?.();
        setInternalSelectedIds(new Set());
      }
      setLassoBox({
        startX: p.x,
        startY: p.y,
        currentX: p.x,
        currentY: p.y,
      });
      setDraggingEntity({ type: 'lasso' });
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Pointer Move sur Canvas SVG (1.1, 1.2, 1.4, 1.5, 1.6, 1.7)
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // 1. Support multi-touch tablette : Pincement pour zoomer & Panoramique à deux doigts (1.2)
    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      if (!pinchStartRef.current) {
        pinchStartRef.current = {
          dist,
          zoom,
          midLogical: toLogical(midX, midY),
        };
      } else {
        const scaleFactor = dist / pinchStartRef.current.dist;
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartRef.current.zoom * scaleFactor));
        setZoom(newZoom);

        const midLogical = pinchStartRef.current.midLogical;
        if (svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const scaleToSvg = LOGICAL_WIDTH / rect.width;
          const svgMidX = (midX - rect.left) * scaleToSvg;
          const svgMidY = (midY - rect.top) * scaleToSvg;
          setPan({
            x: svgMidX - midLogical.x * newZoom,
            y: svgMidY - midLogical.y * newZoom,
          });
        }
      }
      return;
    }

    // 2. Panoramique
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // 3. Lasso de sélection multiple (1.6)
    if (draggingEntity?.type === 'lasso' && lassoBox) {
      const p = toLogical(e.clientX, e.clientY);
      setLassoBox((prev) => (prev ? { ...prev, currentX: p.x, currentY: p.y } : null));

      const minX = Math.min(lassoBox.startX, p.x);
      const maxX = Math.max(lassoBox.startX, p.x);
      const minY = Math.min(lassoBox.startY, p.y);
      const maxY = Math.max(lassoBox.startY, p.y);

      const enclosedIds = new Set<string>();
      for (const t of tables) {
        const tx = normalizeCoordinateX(t.x);
        const ty = normalizeCoordinateY(t.y);
        const tw = t.width || 100;
        const th = t.height || 100;
        // Intersection entre boîte lasso et table
        if (tx + tw / 2 >= minX && tx - tw / 2 <= maxX && ty + th / 2 >= minY && ty - th / 2 <= maxY) {
          enclosedIds.add(t.id);
        }
      }
      setInternalSelectedIds(enclosedIds);
      return;
    }

    if (!draggingEntity || !isEditMode) return;

    const dxClient = e.clientX - dragStartClientRef.current.x;
    const dyClient = e.clientY - dragStartClientRef.current.y;

    // Seuil de déclenchement (4px) pour distinguer un clic d'un glissement
    if (!dragHasExceededThresholdRef.current) {
      if (Math.hypot(dxClient, dyClient) >= DRAG_THRESHOLD) {
        dragHasExceededThresholdRef.current = true;
      } else {
        return;
      }
    }

    const p = toLogical(e.clientX, e.clientY);

    // 4. Déplacement d'une table unique (1.1, 1.7)
    if (draggingEntity.type === 'table' && draggingEntity.id) {
      const rawTargetX = p.x - grabOffsetRef.current.x;
      const rawTargetY = p.y - grabOffsetRef.current.y;

      const snapResult = computeUnifiedSnapping({
        targetX: rawTargetX,
        targetY: rawTargetY,
        targetWidth: dragEntityStartPosRef.current.width || 100,
        targetHeight: dragEntityStartPosRef.current.height || 100,
        targetId: draggingEntity.id,
        otherObjects: tables.map((t) => ({
          id: t.id,
          x: normalizeCoordinateX(t.x),
          y: normalizeCoordinateY(t.y),
          width: t.width || 100,
          height: t.height || 100,
        })),
        snapToGrid,
        snapToMagnet,
      });

      setActiveGuides(snapResult.guides);

      onUpdateDraftTables(
        tables.map((t) => (t.id === draggingEntity.id ? { ...t, x: snapResult.x, y: snapResult.y } : t))
      );
    }
    // 5. Déplacement de groupe (1.6)
    else if (draggingEntity.type === 'group' && dragEntityStartPosRef.current.groupPositions) {
      const rawDeltaX = p.x - (dragEntityStartPosRef.current.x + grabOffsetRef.current.x);
      const rawDeltaY = p.y - (dragEntityStartPosRef.current.y + grabOffsetRef.current.y);

      let deltaX = rawDeltaX;
      let deltaY = rawDeltaY;

      if (snapToGrid) {
        deltaX = Math.round(deltaX / SNAP_GRID) * SNAP_GRID;
        deltaY = Math.round(deltaY / SNAP_GRID) * SNAP_GRID;
      }

      const initialPositions = dragEntityStartPosRef.current.groupPositions;
      onUpdateDraftTables(
        tables.map((t) => {
          const initPos = initialPositions.get(t.id);
          if (!initPos) return t;
          const nextX = Math.max(40, Math.min(LOGICAL_WIDTH - 40, initPos.x + deltaX));
          const nextY = Math.max(40, Math.min(LOGICAL_HEIGHT - 40, initPos.y + deltaY));
          return { ...t, x: nextX, y: nextY };
        })
      );
    }
    // 6. Déplacement d'un élément de décor (1.1)
    else if (draggingEntity.type === 'decor' && draggingEntity.id) {
      let targetX = p.x - grabOffsetRef.current.x;
      let targetY = p.y - grabOffsetRef.current.y;

      if (snapToGrid) {
        targetX = Math.round(targetX / SNAP_GRID) * SNAP_GRID;
        targetY = Math.round(targetY / SNAP_GRID) * SNAP_GRID;
      }

      targetX = Math.max(30, Math.min(LOGICAL_WIDTH - 30, targetX));
      targetY = Math.max(30, Math.min(LOGICAL_HEIGHT - 30, targetY));

      onUpdateDraftDecor(
        decorElements.map((d) => (d.id === draggingEntity.id ? { ...d, x: targetX, y: targetY } : d))
      );
    }
    // 7. Redimensionnement avec les 8 poignées dans les axes locaux (1.5)
    else if (draggingEntity.type === 'resize' && draggingEntity.id && draggingEntity.handle) {
      const resized = computeResizedBox({
        handle: draggingEntity.handle,
        startBox: dragEntityStartPosRef.current,
        pointerLogical: p,
        preserveRatio: e.shiftKey,
        minWidth: 50,
        minHeight: 50,
        maxWidth: 400,
        maxHeight: 400,
      });

      onUpdateDraftTables(
        tables.map((t) =>
          t.id === draggingEntity.id
            ? { ...t, x: resized.x, y: resized.y, width: resized.width, height: resized.height }
            : t
        )
      );
    }
    // 8. Rotation précise (pas de 15°, libre avec Maj) (1.4)
    else if (draggingEntity.type === 'rotate' && draggingEntity.id) {
      const deg = computeRotationAngle(
        dragEntityStartPosRef.current.x,
        dragEntityStartPosRef.current.y,
        p,
        e.shiftKey,
        15
      );

      onUpdateDraftTables(
        tables.map((t) => (t.id === draggingEntity.id ? { ...t, rotation: deg } : t))
      );
    }
  };

  // Pointer Up
  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (lassoBox) {
      setLassoBox(null);
    }

    if (draggingEntity) {
      if (dragHasExceededThresholdRef.current) {
        onPushHistory();
      } else {
        // Clic sans déplacement significatif
        if (draggingEntity.type === 'table' && draggingEntity.id) {
          const table = tables.find((t) => t.id === draggingEntity.id);
          if (table) {
            if (!isEditMode) {
              onTableAction(table);
            } else {
              onSelectTable(table, e.shiftKey);
            }
          }
        }
      }

      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDraggingEntity(null);
      setActiveGuides([]);
    }
  };

  // Pointer Cancel / LostPointerCapture (P-03)
  const handlePointerCancel = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (isPanning) setIsPanning(false);
    if (lassoBox) setLassoBox(null);
    if (draggingEntity) {
      setDraggingEntity(null);
      setActiveGuides([]);
    }
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Rotation rapide par pas de 45°
  const handleRotateTableStep = (table: RestaurantTable, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRot = ((table.rotation || 0) + 45) % 360;
    onUpdateDraftTables(
      tables.map((t) => (t.id === table.id ? { ...t, rotation: nextRot } : t))
    );
    onPushHistory();
  };

  // Écarter automatiquement les tables en collision (1.8)
  const handleAutoSeparate = () => {
    if (onAutoSeparate) {
      onAutoSeparate();
    } else {
      const separated = autoSeparateTables(tables);
      onUpdateDraftTables(separated);
      onPushHistory();
    }
  };

  // Raccourci Ctrl+A pour sélectionner toutes les tables en mode édition (1.6)
  useEffect(() => {
    if (!isEditMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setInternalSelectedIds(new Set(tables.map((t) => t.id)));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, tables]);

  // Group clusters for merged tables
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
      {/* Top Floating Control Bar (Zoom, Pan, Fit, Snapping) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-white shadow-xl">
        {isEditMode && (
          <>
            <button
              onClick={() => setActiveTool((t) => (t === 'select' ? 'hand' : 'select'))}
              className={`p-2 rounded-xl transition-colors ${
                activeTool === 'hand' || isSpacePressed
                  ? 'bg-amber-500 text-slate-950'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title={activeTool === 'hand' ? 'Outil Sélection' : 'Outil Main / Pan (Espace)'}
            >
              {activeTool === 'hand' || isSpacePressed ? (
                <Hand className="w-4 h-4" />
              ) : (
                <MousePointer className="w-4 h-4" />
              )}
            </button>
            <div className="w-px h-4 bg-slate-700 mx-0.5" />
          </>
        )}

        <button
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.15) * 100) / 100))}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom avant (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-bold px-1.5 tabular-nums text-slate-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.15) * 100) / 100))}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Zoom arrière (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <button
          onClick={handleFitToScreen}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Ajuster à l'écran (cadrage optimal)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoomPan}
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Réinitialiser zoom et cadrage (100%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Collision Alert Banner with Auto-Separate Option (1.8) */}
      {isEditMode && collidingTableIds.size > 0 && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-rose-500/95 text-white text-xs font-bold shadow-xl border border-rose-400">
          <AlertCircle className="w-4 h-4 animate-bounce" />
          <span>
            {collidingTableIds.size} tables en collision (
            {Array.from(collidingTableIds)
              .map((id) => tables.find((t) => t.id === id)?.number || '?')
              .slice(0, 4)
              .join(', ')}
            {collidingTableIds.size > 4 ? '...' : ''})
          </span>
          <button
            onClick={handleAutoSeparate}
            className="flex items-center gap-1.5 px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-black shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Écarter automatiquement</span>
          </button>
        </div>
      )}

      {/* Multi-Selection Action Toolbar (1.6: Align & Distribute) */}
      {isEditMode && activeSelectedTableIds.size >= 2 && (
        <div className="absolute top-16 left-4 z-20 flex items-center gap-1 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white shadow-2xl">
          <span className="text-xs font-bold text-amber-400 px-2 tabular-nums">
            {activeSelectedTableIds.size} tables sélectionnées
          </span>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={() => onAlignSelected?.('left')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner à gauche"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignSelected?.('center')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner au centre vertical"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignSelected?.('right')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner à droite"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={() => onAlignSelected?.('top')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner en haut"
          >
            <AlignVerticalJustifyStart className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignSelected?.('middle')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner au milieu horizontal"
          >
            <AlignVerticalJustifyCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignSelected?.('bottom')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aligner en bas"
          >
            <AlignVerticalJustifyEnd className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={() => onDistributeSelected?.('horizontal')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Répartir horizontalement"
          >
            <Split className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Properties Panel for Single Selected Table (1.4) */}
      {isEditMode && primarySelectedTable && activeSelectedTableIds.size <= 1 && (
        <div className="absolute bottom-4 right-4 z-20 w-80 p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-2xl text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-amber-400 uppercase tracking-wider text-xs">
              Table {primarySelectedTable.number} • Propriétés
            </span>
            <button
              onClick={() => onDeselect?.()}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              title="Fermer le panneau"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">Numéro</label>
              <input
                type="text"
                value={primarySelectedTable.number}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, number: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">Forme</label>
              <select
                value={primarySelectedTable.shape || 'rectangulaire'}
                onChange={(e) => {
                  const val = e.target.value as TableShape;
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, shape: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold"
              >
                <option value="rectangulaire">Rectangulaire</option>
                <option value="ronde">Ronde</option>
                <option value="carree">Carrée</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 font-mono">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">X</label>
              <input
                type="number"
                min="40"
                max="1160"
                value={primarySelectedTable.x ?? 200}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, x: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Y</label>
              <input
                type="number"
                min="40"
                max="760"
                value={primarySelectedTable.y ?? 200}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, y: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Larg.</label>
              <input
                type="number"
                min="50"
                max="400"
                value={primarySelectedTable.width || 100}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, width: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Haut.</label>
              <input
                type="number"
                min="50"
                max="400"
                value={primarySelectedTable.height || 100}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, height: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1.5 py-1 text-white tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">
                Capacité ({primarySelectedTable.capacity || 4}p)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={primarySelectedTable.capacity || 4}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, capacity: val } : t))
                  );
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-0.5">
                Angle ({primarySelectedTable.rotation || 0}°)
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={primarySelectedTable.rotation || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateDraftTables(
                    tables.map((t) => (t.id === primarySelectedTable.id ? { ...t, rotation: val } : t))
                  );
                }}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Architectural Watermark */}
      <div className="absolute bottom-4 left-4 pointer-events-none opacity-20 text-white flex items-center gap-3 font-mono text-xs z-10">
        <Compass className="w-8 h-8" />
        <div>
          <div className="font-bold tracking-widest">REPÈRE VECTORIEL 1200 x 800</div>
          <div className="text-xs uppercase opacity-75 font-semibold">
            {activeZone?.name || 'SALLE PRINCIPALE'}
          </div>
        </div>
      </div>

      {/* Welcoming Empty State */}
      {tables.length === 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-slate-900/90 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Aucune table dans {activeZone?.name || 'cette salle'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Concevez l'agencement de votre salle en ajoutant une première table ou en générant
            automatiquement un ensemble complet de tables.
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
          activeTool === 'hand' || isSpacePressed
            ? 'cursor-grab active:cursor-grabbing'
            : isEditMode
            ? 'cursor-crosshair'
            : 'cursor-default'
        }`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
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
          <pattern
            id="wallHatch"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
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

        {/* Global Pan & Zoom SVG Group with contentGroupRef (1.1, 1.2) */}
        <g ref={contentGroupRef} transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Background Grid */}
          <rect
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            fill="#090d16"
            onClick={() => {
              if (isEditMode) {
                onDeselect?.();
                setInternalSelectedIds(new Set());
              }
            }}
          />
          <rect
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            fill="url(#majorGrid)"
            onClick={() => {
              if (isEditMode) {
                onDeselect?.();
                setInternalSelectedIds(new Set());
              }
            }}
          />

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

          {/* Snap Alignment Guides (1.7) */}
          {activeGuides.map((g, idx) =>
            g.type === 'x' ? (
              <line
                key={`guide_x_${idx}`}
                x1={g.position}
                y1="0"
                x2={g.position}
                y2={LOGICAL_HEIGHT}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            ) : (
              <line
                key={`guide_y_${idx}`}
                x1="0"
                y1={g.position}
                x2={LOGICAL_WIDTH}
                y2={g.position}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )
          )}

          {/* ARCHITECTURAL DECOR ELEMENTS */}
          {decorElements.map((decor) => {
            const isSelected = isEditMode && selectedDecorId === decor.id;
            return (
              <g
                key={decor.id}
                transform={`translate(${decor.x}, ${decor.y}) rotate(${decor.rotation || 0})`}
                onPointerDown={(e) => handleDecorPointerDown(e, decor)}
                onDoubleClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    onEditDecorProps?.(decor);
                  }
                }}
                className={isEditMode ? 'cursor-move' : ''}
              >
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
                    <rect
                      x={-decor.width / 2}
                      y={-decor.height / 2}
                      width={decor.width}
                      height={decor.height}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    <path
                      d={`M ${-decor.width / 2} ${decor.height / 2} A ${decor.width} ${decor.width} 0 0 1 ${
                        decor.width / 2
                      } ${-decor.height / 2}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
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

          {/* MERGED TABLES OUTLINES */}
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

          {/* RESTAURANT TABLES */}
          {tables.map((table) => {
            const posX = normalizeCoordinateX(table.x);
            const posY = normalizeCoordinateY(table.y);
            const width = table.width || (table.shape === 'rectangulaire' ? 140 : 100);
            const height = table.height || 100;
            const rotation = table.rotation || 0;

            const isSelected = isEditMode && activeSelectedTableIds.has(table.id);
            const isColliding = collidingTableIds.has(table.id);
            const order = table.currentOrderId ? ordersMap.get(table.currentOrderId) : null;
            const elapsed = table.timeOccupied ? getMinutesElapsed(table.timeOccupied) : 0;
            const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;

            let fillColor = '#1e293b';
            let strokeColor = '#10b981'; // libre: emerald
            let statusIcon = '✓';

            if (
              table.status === 'occupee' ||
              table.status === 'en_service' ||
              table.status === 'attente_commande'
            ) {
              fillColor = '#451a03';
              strokeColor = '#f59e0b';
              statusIcon = '🍽️';
            } else if (table.status === 'attente_paiement') {
              fillColor = '#4c0519';
              strokeColor = '#f43f5e';
              statusIcon = '💳';
            } else if (table.status === 'reservee') {
              fillColor = '#172554';
              strokeColor = '#3b82f6';
              statusIcon = '📅';
            } else if (table.status === 'a_nettoyer') {
              fillColor = '#334155';
              strokeColor = '#94a3b8';
              statusIcon = '🧹';
            } else if (table.status === 'hors_service') {
              fillColor = '#1e1e1e';
              strokeColor = '#ef4444';
              statusIcon = '⚠️';
            }

            // Alerte collision prioritaire (1.8)
            if (isColliding && isEditMode) {
              strokeColor = '#f43f5e';
            }

            // Calcul des 8 poignées pour la table sélectionnée (1.5)
            const handles = isSelected ? compute8Handles(0, 0, width, height, 0, 6) : [];

            return (
              <g
                key={table.id}
                transform={`translate(${posX}, ${posY})`}
                onPointerDown={(e) => handleTablePointerDown(e, table)}
                onDoubleClick={(e) => {
                  if (isEditMode) {
                    e.stopPropagation();
                    onEditTableProps?.(table);
                  }
                }}
                className={`select-none ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
              >
                {/* ROTATED SHAPE CONTAINER */}
                <g transform={`rotate(${rotation})`}>
                  {/* Outer glow on collision or selection */}
                  {isColliding && isEditMode && (
                    <rect
                      x={-width / 2 - 8}
                      y={-height / 2 - 8}
                      width={width + 16}
                      height={height + 16}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      rx={table.shape === 'ronde' ? width : 18}
                      className="animate-pulse"
                    />
                  )}

                  {table.shape === 'ronde' ? (
                    <circle
                      cx="0"
                      cy="0"
                      r={Math.min(width, height) / 2}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-colors"
                    />
                  ) : (
                    <rect
                      x={-width / 2}
                      y={-height / 2}
                      width={width}
                      height={height}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      rx={table.shape === 'carree' ? 14 : 18}
                      className="transition-colors"
                    />
                  )}

                  {/* Chairs (Visual indicators around table) */}
                  {Array.from({ length: Math.min(table.capacity || 4, 12) }).map((_, i, arr) => {
                    const angle = (i * 2 * Math.PI) / arr.length;
                    const dist = Math.max(width, height) / 2 + 12;
                    const cx = Math.cos(angle) * dist;
                    const cy = Math.sin(angle) * dist;
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="#334155"
                        stroke="#64748b"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* Table Label / Number (Text >= 12px obligatoire 1.14) */}
                  <text
                    x="0"
                    y={order ? -12 : -4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="18"
                    fontWeight="900"
                    fontFamily="sans-serif"
                    className="select-none tracking-tight pointer-events-none"
                  >
                    {table.number}
                  </text>

                  {/* Capacity & Timer Pill */}
                  <g transform={`translate(0, ${order ? 6 : 14})`}>
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      className="tabular-nums"
                    >
                      {table.capacity || 4}p {elapsed > 0 ? `• ${elapsed}m` : ''}
                    </text>
                  </g>

                  {/* Active Order Pill or Status label with Icon (1.14) */}
                  {order ? (
                    <g transform="translate(0, 24)">
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="6"
                        fill="rgba(0, 0, 0, 0.75)"
                        stroke="rgba(255, 255, 255, 0.25)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4"
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
                    <g transform="translate(0, 32)">
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        fill={strokeColor}
                        fontSize="12"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {statusIcon} {statusConfig.label}
                      </text>
                    </g>
                  )}

                  {/* Kiosk Lock & Waiter Call Badges */}
                  {table.tabletLocked && (
                    <g transform={`translate(${width / 2 - 14}, ${-height / 2 + 14})`}>
                      <circle cx="0" cy="0" r="11" fill="#e11d48" />
                      <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                        🔒
                      </text>
                    </g>
                  )}

                  {table.tabletCallWaiterPending && (
                    <g transform={`translate(${-width / 2 + 14}, ${-height / 2 + 14})`}>
                      <circle cx="0" cy="0" r="12" fill="#f59e0b" />
                      <text x="0" y="4.5" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="bold">
                        🔔
                      </text>
                    </g>
                  )}

                  {/* 8 RESIZE HANDLES & ROTATION HANDLE IN LOCAL AXES (1.4, 1.5, 1.14) */}
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

                      {/* 8 Resize Handles with 44px touch target (1.5, 1.14) */}
                      {handles.map((h) => (
                        <g
                          key={h.type}
                          transform={`translate(${h.x}, ${h.y})`}
                          className={h.cursor}
                          onPointerDown={(e) => handleResizePointerDown(e, table.id, h.type)}
                        >
                          {/* Invisible 44x44px touch target */}
                          <circle cx="0" cy="0" r="22" fill="transparent" />
                          {/* Visible 16px handle dot */}
                          <circle
                            cx="0"
                            cy="0"
                            r="8"
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            className="shadow-md"
                          />
                        </g>
                      ))}

                      {/* Free / Step Rotation Handle with stem line (1.4) */}
                      <line
                        x1="0"
                        y1={-height / 2 - 6}
                        x2="0"
                        y2={-height / 2 - 28}
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                      <g
                        transform={`translate(0, ${-height / 2 - 28})`}
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => handleRotatePointerDown(e, table.id)}
                      >
                        {/* 44x44px touch target */}
                        <circle cx="0" cy="0" r="22" fill="transparent" />
                        <circle
                          cx="0"
                          cy="0"
                          r="10"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="shadow-md"
                        />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill="#000000"
                          fontSize="9"
                          fontWeight="900"
                        >
                          ↻
                        </text>
                      </g>

                      {/* Quick +45° Step Rotation Button */}
                      <g
                        transform={`translate(${width / 2 + 22}, ${-height / 2 - 10})`}
                        onClick={(e) => handleRotateTableStep(table, e)}
                        className="cursor-pointer"
                      >
                        <circle cx="0" cy="0" r="11" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          +45°
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              </g>
            );
          })}

          {/* LASSO SELECTION RECTANGLE (1.6) */}
          {lassoBox && (
            <rect
              x={Math.min(lassoBox.startX, lassoBox.currentX)}
              y={Math.min(lassoBox.startY, lassoBox.currentY)}
              width={Math.abs(lassoBox.currentX - lassoBox.startX)}
              height={Math.abs(lassoBox.currentY - lassoBox.startY)}
              fill="rgba(245, 158, 11, 0.15)"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
