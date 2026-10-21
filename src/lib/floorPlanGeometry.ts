/**
 * RestoMaster OS — floorPlanGeometry.ts
 *
 * Moteur géométrique pur pour le plan de salle 2D vectoriel (repère 1200 x 800) :
 * - Conversion universelle écran -> coordonnées logiques via getScreenCTM().inverse()
 * - Calcul des 8 poignées de redimensionnement dans les axes locaux avec coin opposé fixe
 * - Rotation avec pas de 15° ou libre avec Maj
 * - Aimantation unifiée (bords, centres, guides d'espacement)
 * - Détection des collisions par Separating Axis Theorem (SAT) et algorithme d'écartement automatique
 * - Outils d'alignement et de répartition pour sélections multiples
 */

import { RestaurantTable, DecorElement, TableShape } from '../types/restaurant';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 800;

export interface Point {
  x: number;
  y: number;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface HandleDescriptor {
  type: HandleType;
  x: number;
  y: number;
  cursor: string;
  oppositeType: HandleType;
}

export interface SnapGuide {
  type: 'x' | 'y';
  position: number;
  start?: number;
  end?: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: SnapGuide[];
  didSnapX: boolean;
  didSnapY: boolean;
}

export interface CollisionPair {
  tableAId: string;
  tableBId: string;
  tableANumber?: string;
  tableBNumber?: string;
}

// ============================================================================
// 1. CONVERSION D'ÉCRAN À COORDONNÉES LOGIQUES VIA CTM INVERSE (P-01)
// ============================================================================

/**
 * Convertit un point écran (clientX, clientY) en point logique strict dans le repère SVG 1200x800.
 * Utilise getScreenCTM().inverse() du groupe de contenu principal, ce qui gère
 * automatiquement : le zoom, le pan, le ratio du conteneur (preserveAspectRatio) et le letterboxing.
 */
export function screenToLogicalPoint(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement | null,
  contentGroupElement: SVGGElement | null
): Point {
  if (!svgElement) return { x: clientX, y: clientY };

  // Utilisation prioritaire de la matrice de transformation CTM de l'élément de contenu
  if (contentGroupElement && typeof contentGroupElement.getScreenCTM === 'function') {
    const ctm = contentGroupElement.getScreenCTM();
    if (ctm) {
      const pt = svgElement.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
  }

  // Fallback mathématique exact pour environnement de test unitaire ou sans CTM
  const rect = svgElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: clientX, y: clientY };
  }
  const scaleX = LOGICAL_WIDTH / rect.width;
  const scaleY = LOGICAL_HEIGHT / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

// ============================================================================
// 2. POIGNÉES DE REDIMENSIONNEMENT DANS LES AXES LOCAUX PIVOTÉS (1.5)
// ============================================================================

const OPPOSITE_HANDLE_MAP: Record<HandleType, HandleType> = {
  nw: 'se',
  n: 's',
  ne: 'sw',
  e: 'w',
  se: 'nw',
  s: 'n',
  sw: 'ne',
  w: 'e',
};

const HANDLE_OFFSETS: Record<HandleType, { xRatio: number; yRatio: number; cursor: string }> = {
  nw: { xRatio: -0.5, yRatio: -0.5, cursor: 'nwse-resize' },
  n: { xRatio: 0, yRatio: -0.5, cursor: 'ns-resize' },
  ne: { xRatio: 0.5, yRatio: -0.5, cursor: 'nesw-resize' },
  e: { xRatio: 0.5, yRatio: 0, cursor: 'ew-resize' },
  se: { xRatio: 0.5, yRatio: 0.5, cursor: 'nwse-resize' },
  s: { xRatio: 0, yRatio: 0.5, cursor: 'ns-resize' },
  sw: { xRatio: -0.5, yRatio: 0.5, cursor: 'nesw-resize' },
  w: { xRatio: -0.5, yRatio: 0, cursor: 'ew-resize' },
};

/**
 * Calcule les positions absolues des 8 poignées de redimensionnement
 * en tenant compte de la rotation de l'objet.
 */
export function compute8Handles(
  cx: number,
  cy: number,
  width: number,
  height: number,
  rotation = 0,
  padding = 6
): HandleDescriptor[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const handles: HandleDescriptor[] = [];
  const entries = Object.entries(HANDLE_OFFSETS) as [HandleType, { xRatio: number; yRatio: number; cursor: string }][];

  for (const [type, cfg] of entries) {
    // Coordonnées locales par rapport au centre
    const localX = cfg.xRatio * (width + padding * 2);
    const localY = cfg.yRatio * (height + padding * 2);

    // Rotation vectorielle
    const rx = localX * cos - localY * sin;
    const ry = localX * sin + localY * cos;

    handles.push({
      type,
      x: cx + rx,
      y: cy + ry,
      cursor: cfg.cursor,
      oppositeType: OPPOSITE_HANDLE_MAP[type],
    });
  }

  return handles;
}

/**
 * Calcule le redimensionnement d'un objet orienté en maintenant le coin/côté opposé rigoureusement FIXE.
 * Gère le maintien des proportions avec Maj (preserveRatio).
 */
export function computeResizedBox(params: {
  handle: HandleType;
  startBox: { x: number; y: number; width: number; height: number; rotation: number };
  pointerLogical: Point;
  preserveRatio?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}): { x: number; y: number; width: number; height: number } {
  const {
    handle,
    startBox,
    pointerLogical,
    preserveRatio = false,
    minWidth = 50,
    minHeight = 50,
    maxWidth = 400,
    maxHeight = 400,
  } = params;

  const rad = ((startBox.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Position du point opposé fixe dans le repère global
  const oppCfg = HANDLE_OFFSETS[OPPOSITE_HANDLE_MAP[handle]];
  const oppLocalX = oppCfg.xRatio * startBox.width;
  const oppLocalY = oppCfg.yRatio * startBox.height;
  const oppWorldX = startBox.x + oppLocalX * cos - oppLocalY * sin;
  const oppWorldY = startBox.y + oppLocalX * sin + oppLocalY * cos;

  // Vecteur du point opposé vers le curseur logique
  const dx = pointerLogical.x - oppWorldX;
  const dy = pointerLogical.y - oppWorldY;

  // Projection de ce vecteur dans le repère local orienté
  let localDx = dx * cos + dy * sin;
  let localDy = -dx * sin + dy * cos;

  // Signes selon la direction de la poignée active
  const handleCfg = HANDLE_OFFSETS[handle];

  let newWidth = startBox.width;
  let newHeight = startBox.height;

  if (handleCfg.xRatio !== 0) {
    const rawW = handleCfg.xRatio > 0 ? localDx : -localDx;
    newWidth = Math.max(minWidth, Math.min(maxWidth, rawW));
  }
  if (handleCfg.yRatio !== 0) {
    const rawH = handleCfg.yRatio > 0 ? localDy : -localDy;
    newHeight = Math.max(minHeight, Math.min(maxHeight, rawH));
  }

  // Maintien des proportions si Maj est enfoncé
  if (preserveRatio && startBox.width > 0 && startBox.height > 0) {
    const initialRatio = startBox.width / startBox.height;
    if (handleCfg.xRatio !== 0 && handleCfg.yRatio !== 0) {
      // Coin diagonal : échelle uniforme basée sur la plus grande dimension
      const scale = Math.max(newWidth / startBox.width, newHeight / startBox.height);
      newWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startBox.width * scale)));
      newHeight = Math.max(minHeight, Math.min(maxHeight, Math.round(newWidth / initialRatio)));
    } else if (handleCfg.xRatio !== 0) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, Math.round(newWidth / initialRatio)));
    } else {
      newWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(newHeight * initialRatio)));
    }
  }

  // Le nouveau centre est situé exactement à mi-chemin entre le point opposé fixe et le nouveau coin actif
  const newLocalActiveX = handleCfg.xRatio > 0 ? newWidth : handleCfg.xRatio < 0 ? -newWidth : 0;
  const newLocalActiveY = handleCfg.yRatio > 0 ? newHeight : handleCfg.yRatio < 0 ? -newHeight : 0;

  // Nouveau centre dans le repère local
  const newLocalCenterX = (0 + newLocalActiveX) / 2;
  const newLocalCenterY = (0 + newLocalActiveY) / 2;

  // Re-projection vers le repère global
  const newCenterX = oppWorldX + newLocalCenterX * cos - newLocalCenterY * sin;
  const newCenterY = oppWorldY + newLocalCenterX * sin + newLocalCenterY * cos;

  return {
    x: Math.round(newCenterX),
    y: Math.round(newCenterY),
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

// ============================================================================
// 3. ROTATION AVEC PAS DE 15° OU LIBRE (1.4)
// ============================================================================

/**
 * Calcule l'angle de rotation d'un objet vers le curseur logique.
 * Pas de 15° par défaut, ou continu (libre) avec la touche Maj.
 */
export function computeRotationAngle(
  centerX: number,
  centerY: number,
  pointerLogical: Point,
  isFreeRotation = false,
  stepDegrees = 15
): number {
  const dx = pointerLogical.x - centerX;
  const dy = pointerLogical.y - centerY;

  // La poignée est au-dessus du centre (direction -Y = angle 0°)
  const rad = Math.atan2(dy, dx);
  let deg = Math.round((rad * 180) / Math.PI) + 90;
  deg = ((deg % 360) + 360) % 360;

  if (!isFreeRotation) {
    deg = Math.round(deg / stepDegrees) * stepDegrees;
    deg = ((deg % 360) + 360) % 360;
  }

  return deg;
}

// ============================================================================
// 4. AIMANTATION UNIFIÉE (GRILLE + BORDS & CENTRES VOISINS) (1.7)
// ============================================================================

export interface SnapTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calcule une aimantation cohérente sans conflit entre grille et guides voisins.
 * Priorité :
 * 1. Bords et centres des tables voisines si à portée (seuil dynamique ~10px)
 * 2. Si non aimanté aux voisins et grille active : aimantation à la grille (ex: 10px)
 */
export function computeUnifiedSnapping(params: {
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
  targetId: string;
  otherObjects: SnapTarget[];
  snapToGrid: boolean;
  snapToMagnet: boolean;
  gridSize?: number;
  snapThreshold?: number;
}): SnapResult {
  const {
    targetX,
    targetY,
    targetWidth,
    targetHeight,
    targetId,
    otherObjects,
    snapToGrid,
    snapToMagnet,
    gridSize = 10,
    snapThreshold = 10,
  } = params;

  let snappedX = targetX;
  let snappedY = targetY;
  const guides: SnapGuide[] = [];
  let didSnapX = false;
  let didSnapY = false;

  const halfW = targetWidth / 2;
  const halfH = targetHeight / 2;

  // Lignes clés de la cible en mouvement
  const targetLinesX = [
    { pos: targetX - halfW, offset: -halfW }, // Bord gauche
    { pos: targetX, offset: 0 },              // Centre X
    { pos: targetX + halfW, offset: halfW },  // Bord droit
  ];

  const targetLinesY = [
    { pos: targetY - halfH, offset: -halfH }, // Bord haut
    { pos: targetY, offset: 0 },              // Centre Y
    { pos: targetY + halfH, offset: halfH },  // Bord bas
  ];

  if (snapToMagnet) {
    let bestDistX = snapThreshold;
    let bestTargetX: number | undefined;
    let guideXPos: number | undefined;

    let bestDistY = snapThreshold;
    let bestTargetY: number | undefined;
    let guideYPos: number | undefined;

    for (const other of otherObjects) {
      if (other.id === targetId) continue;
      const otherHalfW = other.width / 2;
      const otherHalfH = other.height / 2;

      // Lignes de référence de l'autre objet
      const otherLinesX = [other.x - otherHalfW, other.x, other.x + otherHalfW];
      const otherLinesY = [other.y - otherHalfH, other.y, other.y + otherHalfH];

      // Test des alignements X
      for (const tLine of targetLinesX) {
        for (const oX of otherLinesX) {
          const dist = Math.abs(tLine.pos - oX);
          if (dist < bestDistX) {
            bestDistX = dist;
            bestTargetX = oX - tLine.offset;
            guideXPos = oX;
          }
        }
      }

      // Test des alignements Y
      for (const tLine of targetLinesY) {
        for (const oY of otherLinesY) {
          const dist = Math.abs(tLine.pos - oY);
          if (dist < bestDistY) {
            bestDistY = dist;
            bestTargetY = oY - tLine.offset;
            guideYPos = oY;
          }
        }
      }
    }

    if (bestTargetX !== undefined && guideXPos !== undefined) {
      snappedX = bestTargetX;
      didSnapX = true;
      guides.push({ type: 'x', position: guideXPos });
    }

    if (bestTargetY !== undefined && guideYPos !== undefined) {
      snappedY = bestTargetY;
      didSnapY = true;
      guides.push({ type: 'y', position: guideYPos });
    }
  }

  // Si pas d'aimant magnétique sur l'axe et grille active, aligner sur la grille
  if (!didSnapX && snapToGrid) {
    snappedX = Math.round(snappedX / gridSize) * gridSize;
  }
  if (!didSnapY && snapToGrid) {
    snappedY = Math.round(snappedY / gridSize) * gridSize;
  }

  // Bornage dans le plan
  snappedX = Math.max(halfW + 10, Math.min(LOGICAL_WIDTH - halfW - 10, snappedX));
  snappedY = Math.max(halfH + 10, Math.min(LOGICAL_HEIGHT - halfH - 10, snappedY));

  return {
    x: snappedX,
    y: snappedY,
    guides,
    didSnapX,
    didSnapY,
  };
}

// ============================================================================
// 5. DÉTECTION DES COLLISIONS ET ÉCARTEMENT AUTOMATIQUE (1.8)
// ============================================================================

/**
 * Calcule les 4 coins d'une boîte orientée.
 */
export function getOrientedBoxCorners(box: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}): Point[] {
  const rad = ((box.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = box.width / 2;
  const hh = box.height / 2;

  const corners: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  return corners.map((c) => ({
    x: box.x + c.x * cos - c.y * sin,
    y: box.y + c.x * sin + c.y * cos,
  }));
}

/**
 * Teste la collision entre deux boîtes orientées via le théorème de l'axe séparateur (SAT).
 * Une marge de tolérance de 6px est appliquée pour éviter les faux positifs lors du contact bord à bord.
 */
export function areBoxesColliding(
  boxA: { x: number; y: number; width: number; height: number; rotation?: number },
  boxB: { x: number; y: number; width: number; height: number; rotation?: number },
  tolerance = 6
): boolean {
  const cornersA = getOrientedBoxCorners({
    ...boxA,
    width: Math.max(10, boxA.width - tolerance),
    height: Math.max(10, boxA.height - tolerance),
  });
  const cornersB = getOrientedBoxCorners({
    ...boxB,
    width: Math.max(10, boxB.width - tolerance),
    height: Math.max(10, boxB.height - tolerance),
  });

  const polygons = [cornersA, cornersB];

  for (let p = 0; p < polygons.length; p++) {
    const polygon = polygons[p];
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];

      // Normale à l'arête
      const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };

      // Normalisation
      const len = Math.hypot(normal.x, normal.y);
      if (len === 0) continue;
      const axis = { x: normal.x / len, y: normal.y / len };

      // Projection des deux polygones sur l'axe
      let minA = Infinity;
      let maxA = -Infinity;
      for (const pt of cornersA) {
        const dot = pt.x * axis.x + pt.y * axis.y;
        minA = Math.min(minA, dot);
        maxA = Math.max(maxA, dot);
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (const pt of cornersB) {
        const dot = pt.x * axis.x + pt.y * axis.y;
        minB = Math.min(minB, dot);
        maxB = Math.max(maxB, dot);
      }

      // Si disjoint sur au moins un axe séparateur, pas de collision
      if (maxA < minB || maxB < minA) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Détecte l'ensemble des collisions entre tables sur le plan.
 * Ignore les tables fusionnées légitimement.
 */
export function findTableCollisions(tables: RestaurantTable[]): {
  collidingTableIds: Set<string>;
  pairs: CollisionPair[];
} {
  const collidingTableIds = new Set<string>();
  const pairs: CollisionPair[] = [];

  for (let i = 0; i < tables.length; i++) {
    const t1 = tables[i];
    const x1 = t1.x ?? 200;
    const y1 = t1.y ?? 200;
    const w1 = t1.width || 100;
    const h1 = t1.height || 100;
    const r1 = t1.rotation || 0;

    for (let j = i + 1; j < tables.length; j++) {
      const t2 = tables[j];

      // Ignorer les tables fusionnées entre elles
      if (t1.mergedWithTableId === t2.id || t2.mergedWithTableId === t1.id) continue;
      if (t1.mergedTableIds?.includes(t2.id) || t2.mergedTableIds?.includes(t1.id)) continue;

      const x2 = t2.x ?? 200;
      const y2 = t2.y ?? 200;
      const w2 = t2.width || 100;
      const h2 = t2.height || 100;
      const r2 = t2.rotation || 0;

      const isColliding = areBoxesColliding(
        { x: x1, y: y1, width: w1, height: h1, rotation: r1 },
        { x: x2, y: y2, width: w2, height: h2, rotation: r2 }
      );

      if (isColliding) {
        collidingTableIds.add(t1.id);
        collidingTableIds.add(t2.id);
        pairs.push({
          tableAId: t1.id,
          tableBId: t2.id,
          tableANumber: t1.number,
          tableBNumber: t2.number,
        });
      }
    }
  }

  return { collidingTableIds, pairs };
}

/**
 * Algorithme de répulsion automatique (« Écarter automatiquement ») (1.8).
 * Repousse les tables qui se chevauchent jusqu'à résolution complète des collisions.
 */
export function autoSeparateTables(
  tables: RestaurantTable[],
  maxIterations = 50
): RestaurantTable[] {
  let currentTables = tables.map((t) => ({ ...t }));

  for (let iter = 0; iter < maxIterations; iter++) {
    const { pairs } = findTableCollisions(currentTables);
    if (pairs.length === 0) break;

    const tableMap = new Map(currentTables.map((t) => [t.id, t]));

    for (const pair of pairs) {
      const a = tableMap.get(pair.tableAId);
      const b = tableMap.get(pair.tableBId);
      if (!a || !b) continue;

      const ax = a.x ?? 200;
      const ay = a.y ?? 200;
      const bx = b.x ?? 200;
      const by = b.y ?? 200;

      let dx = bx - ax;
      let dy = by - ay;
      let dist = Math.hypot(dx, dy);

      if (dist === 0) {
        dx = (Math.random() - 0.5) * 20;
        dy = (Math.random() - 0.5) * 20;
        dist = Math.hypot(dx, dy) || 1;
      }

      const minDist = ((a.width || 100) + (b.width || 100)) / 2 + 15;
      const overlap = minDist - dist;

      if (overlap > 0) {
        const pushX = (dx / dist) * (overlap / 2 + 4);
        const pushY = (dy / dist) * (overlap / 2 + 4);

        const halfWa = (a.width || 100) / 2;
        const halfHa = (a.height || 100) / 2;
        const halfWb = (b.width || 100) / 2;
        const halfHb = (b.height || 100) / 2;

        a.x = Math.max(halfWa + 20, Math.min(LOGICAL_WIDTH - halfWa - 20, Math.round(ax - pushX)));
        a.y = Math.max(halfHa + 20, Math.min(LOGICAL_HEIGHT - halfHa - 20, Math.round(ay - pushY)));

        b.x = Math.max(halfWb + 20, Math.min(LOGICAL_WIDTH - halfWb - 20, Math.round(bx + pushX)));
        b.y = Math.max(halfHb + 20, Math.min(LOGICAL_HEIGHT - halfHb - 20, Math.round(by + pushY)));
      }
    }

    currentTables = Array.from(tableMap.values());
  }

  return currentTables;
}

// ============================================================================
// 6. OUTILS D'ALIGNEMENT ET DE RÉPARTITION (1.6)
// ============================================================================

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionAxis = 'horizontal' | 'vertical';

/**
 * Aligne une collection d'objets sélectionnés.
 */
export function alignObjects<T extends { id: string; x?: number; y?: number; width?: number; height?: number }>(
  items: T[],
  alignment: AlignmentType
): T[] {
  if (items.length <= 1) return items;

  const boxes = items.map((it) => {
    const x = it.x ?? 200;
    const y = it.y ?? 200;
    const w = it.width || 100;
    const h = it.height || 100;
    return {
      id: it.id,
      item: it,
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      cx: x,
      cy: y,
      w,
      h,
    };
  });

  const overallMinX = Math.min(...boxes.map((b) => b.minX));
  const overallMaxX = Math.max(...boxes.map((b) => b.maxX));
  const overallMinY = Math.min(...boxes.map((b) => b.minY));
  const overallMaxY = Math.max(...boxes.map((b) => b.maxY));
  const overallCenterX = (overallMinX + overallMaxX) / 2;
  const overallCenterY = (overallMinY + overallMaxY) / 2;

  return items.map((it) => {
    const b = boxes.find((bx) => bx.id === it.id);
    if (!b) return it;

    let nextX = it.x ?? 200;
    let nextY = it.y ?? 200;

    switch (alignment) {
      case 'left':
        nextX = overallMinX + b.w / 2;
        break;
      case 'center':
        nextX = overallCenterX;
        break;
      case 'right':
        nextX = overallMaxX - b.w / 2;
        break;
      case 'top':
        nextY = overallMinY + b.h / 2;
        break;
      case 'middle':
        nextY = overallCenterY;
        break;
      case 'bottom':
        nextY = overallMaxY - b.h / 2;
        break;
    }

    return { ...it, x: Math.round(nextX), y: Math.round(nextY) };
  });
}

/**
 * Répartit équitablement les objets sélectionnés sur un axe (horizontal ou vertical).
 */
export function distributeObjects<T extends { id: string; x?: number; y?: number; width?: number; height?: number }>(
  items: T[],
  axis: DistributionAxis
): T[] {
  if (items.length <= 2) return items;

  if (axis === 'horizontal') {
    const sorted = [...items].sort((a, b) => (a.x ?? 200) - (b.x ?? 200));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const startX = first.x ?? 200;
    const endX = last.x ?? 200;
    const step = (endX - startX) / (sorted.length - 1);

    const updatedMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      updatedMap.set(item.id, Math.round(startX + idx * step));
    });

    return items.map((it) => {
      const newX = updatedMap.get(it.id);
      return newX !== undefined ? { ...it, x: newX } : it;
    });
  } else {
    const sorted = [...items].sort((a, b) => (a.y ?? 200) - (b.y ?? 200));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const startY = first.y ?? 200;
    const endY = last.y ?? 200;
    const step = (endY - startY) / (sorted.length - 1);

    const updatedMap = new Map<string, number>();
    sorted.forEach((item, idx) => {
      updatedMap.set(item.id, Math.round(startY + idx * step));
    });

    return items.map((it) => {
      const newY = updatedMap.get(it.id);
      return newY !== undefined ? { ...it, y: newY } : it;
    });
  }
}
