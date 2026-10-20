import { RestaurantTable } from '../../types/restaurant';

export interface Box2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function doBoxesOverlap(a: Box2D, b: Box2D, margin: number = 20): boolean {
  const aLeft = a.x - a.width / 2 - margin;
  const aRight = a.x + a.width / 2 + margin;
  const aTop = a.y - a.height / 2 - margin;
  const aBottom = a.y + a.height / 2 + margin;

  const bLeft = b.x - b.width / 2;
  const bRight = b.x + b.width / 2;
  const bTop = b.y - b.height / 2;
  const bBottom = b.y + b.height / 2;

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
}

/**
 * Calcule la première coordonnée libre sur la grille logique 1200x800 pour placer une nouvelle table.
 */
export function findFirstAvailableTablePosition(
  existingTables: RestaurantTable[],
  tableWidth: number = 100,
  tableHeight: number = 100,
  logicalWidth: number = 1200,
  logicalHeight: number = 800
): { x: number; y: number } {
  const marginX = 100;
  const marginY = 100;
  const stepX = 60;
  const stepY = 60;

  const candidateBox: Box2D = {
    x: marginX,
    y: marginY,
    width: tableWidth,
    height: tableHeight,
  };

  const tableBoxes: Box2D[] = existingTables.map((t) => ({
    x: t.x ?? 200,
    y: t.y ?? 200,
    width: t.width || 100,
    height: t.height || 100,
  }));

  for (let y = marginY; y <= logicalHeight - marginY; y += stepY) {
    for (let x = marginX; x <= logicalWidth - marginX; x += stepX) {
      candidateBox.x = x;
      candidateBox.y = y;

      const hasCollision = tableBoxes.some((b) => doBoxesOverlap(candidateBox, b, 20));
      if (!hasCollision) {
        return { x, y };
      }
    }
  }

  // Si tout l'espace est dense, décaler selon le nombre de tables
  const fallbackIndex = existingTables.length;
  return {
    x: Math.min(logicalWidth - 100, 100 + (fallbackIndex % 8) * 120),
    y: Math.min(logicalHeight - 100, 100 + Math.floor(fallbackIndex / 8) * 120),
  };
}

/**
 * Calcule les positions d'un lot de tables sans écrasement ni bornage destructeur.
 */
export function computeBatchTablePositions(
  count: number,
  layout: 'grille' | 'ligne' | 'colonne',
  shape: string,
  logicalWidth: number = 1200,
  logicalHeight: number = 800
): Array<{ x: number; y: number; width: number; height: number }> {
  const spacingX = shape === 'rectangulaire' ? 160 : 130;
  const spacingY = 130;
  const defaultWidth = shape === 'rectangulaire' ? 140 : 100;
  const defaultHeight = 100;
  const marginX = 100;
  const marginY = 100;

  const maxColsPerRow = Math.max(1, Math.floor((logicalWidth - marginX * 2) / spacingX));

  let cols = maxColsPerRow;
  if (layout === 'colonne') {
    cols = 1;
  } else if (layout === 'grille') {
    cols = count <= 4 ? 2 : count <= 8 ? 4 : Math.min(5, maxColsPerRow);
  }

  const results: Array<{ x: number; y: number; width: number; height: number }> = [];

  for (let i = 0; i < count; i++) {
    const colIndex = i % cols;
    const rowIndex = Math.floor(i / cols);

    const x = marginX + colIndex * spacingX;
    const y = marginY + rowIndex * spacingY;

    results.push({
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
    });
  }

  return results;
}
