import { RestaurantTable, DecorElement } from '../../types/restaurant';

export const LOGICAL_WIDTH = 1200;
export const LOGICAL_HEIGHT = 800;

/**
 * Normalisation stricte de coordonnée X (repère logique 1200x800).
 * L'ancienne heuristique erronée (<= 100 = pourcentage) est supprimée (D-03).
 * Une coordonnée x=60 reste désormais 60.
 */
export function normalizeCoordinateX(val: number | undefined | null, fallback = 200): number {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return fallback;
  }
  return val;
}

/**
 * Normalisation stricte de coordonnée Y (repère logique 1200x800).
 * L'ancienne heuristique erronée (<= 100 = pourcentage) est supprimée (D-03).
 */
export function normalizeCoordinateY(val: number | undefined | null, fallback = 200): number {
  if (val === undefined || val === null || !Number.isFinite(val)) {
    return fallback;
  }
  return val;
}

/**
 * Migration réversible des anciennes tables ayant des coordonnées en pourcentages (version 1)
 * vers les unités logiques absolues (coordVersion = 2).
 */
export function migrateTableCoordinates(table: RestaurantTable): {
  migratedTable: RestaurantTable;
  wasMigrated: boolean;
} {
  if (table.coordVersion === 2) {
    return { migratedTable: table, wasMigrated: false };
  }

  // Ancienne convention : si x ou y <= 100 sans coordVersion, c'était un pourcentage
  let newX = table.x ?? 200;
  let newY = table.y ?? 200;
  let changed = false;

  // On stocke les coordonnées d'origine dans des métadonnées pour garantie de réversibilité
  const legacyCoords = { originalX: table.x, originalY: table.y };

  if (table.x !== undefined && table.x > 0 && table.x <= 100) {
    newX = Math.round((table.x / 100) * LOGICAL_WIDTH);
    changed = true;
  }

  if (table.y !== undefined && table.y > 0 && table.y <= 100) {
    newY = Math.round((table.y / 100) * LOGICAL_HEIGHT);
    changed = true;
  }

  return {
    migratedTable: {
      ...table,
      x: newX,
      y: newY,
      coordVersion: 2,
      // Trace réversible
      ...(changed ? { _legacyCoords: legacyCoords } : {}),
    },
    wasMigrated: changed || table.coordVersion !== 2,
  };
}

/**
 * Restauration réversible vers l'ancien format si nécessaire
 */
export function revertTableCoordinatesMigration(table: RestaurantTable & { _legacyCoords?: { originalX?: number; originalY?: number } }): RestaurantTable {
  if (!table._legacyCoords) {
    const { coordVersion, ...rest } = table;
    return rest;
  }

  const { _legacyCoords, coordVersion, ...rest } = table;
  return {
    ...rest,
    x: _legacyCoords.originalX,
    y: _legacyCoords.originalY,
  };
}

/**
 * Migration pour les éléments de décor
 */
export function migrateDecorCoordinates(decor: DecorElement): {
  migratedDecor: DecorElement;
  wasMigrated: boolean;
} {
  if (decor.coordVersion === 2) {
    return { migratedDecor: decor, wasMigrated: false };
  }

  let newX = decor.x;
  let newY = decor.y;
  let changed = false;

  if (decor.x > 0 && decor.x <= 100) {
    newX = Math.round((decor.x / 100) * LOGICAL_WIDTH);
    changed = true;
  }
  if (decor.y > 0 && decor.y <= 100) {
    newY = Math.round((decor.y / 100) * LOGICAL_HEIGHT);
    changed = true;
  }

  return {
    migratedDecor: {
      ...decor,
      x: newX,
      y: newY,
      coordVersion: 2,
    },
    wasMigrated: changed || decor.coordVersion !== 2,
  };
}
