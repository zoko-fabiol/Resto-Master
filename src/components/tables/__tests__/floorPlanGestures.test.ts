import { describe, it, expect } from 'vitest';

/**
 * Calcul du nouveau pan pour un zoom centré sur un point logique P(x, y)
 */
export function calculateCenteredZoom(
  currentPan: { x: number; y: number },
  currentZoom: number,
  targetZoom: number,
  logicalPoint: { x: number; y: number }
): { pan: { x: number; y: number }; zoom: number } {
  const clampedZoom = Math.min(3.0, Math.max(0.5, targetZoom));
  const newPanX = currentPan.x + logicalPoint.x * (currentZoom - clampedZoom);
  const newPanY = currentPan.y + logicalPoint.y * (currentZoom - clampedZoom);
  return {
    pan: { x: Math.round(newPanX * 100) / 100, y: Math.round(newPanY * 100) / 100 },
    zoom: clampedZoom,
  };
}

/**
 * Sélection du voisin le plus proche pour l'aimant (P-04)
 */
export function findClosestMagneticNeighbor(
  targetPos: { x: number; y: number },
  neighbors: Array<{ id: string; x: number; y: number }>,
  threshold: number
): { snappedX?: number; snappedY?: number; guideX?: number; guideY?: number } {
  let closestDiffX = Infinity;
  let snappedX: number | undefined;
  let closestDiffY = Infinity;
  let snappedY: number | undefined;

  for (const n of neighbors) {
    const diffX = Math.abs(targetPos.x - n.x);
    if (diffX <= threshold && diffX < closestDiffX) {
      closestDiffX = diffX;
      snappedX = n.x;
    }

    const diffY = Math.abs(targetPos.y - n.y);
    if (diffY <= threshold && diffY < closestDiffY) {
      closestDiffY = diffY;
      snappedY = n.y;
    }
  }

  return {
    snappedX,
    snappedY,
    guideX: snappedX,
    guideY: snappedY,
  };
}

describe('floorPlanGestures - Zoom centré et Aimant précis', () => {
  it('calcule un zoom centré préservant le point visé sous le curseur', () => {
    const initialPan = { x: 0, y: 0 };
    const initialZoom = 1.0;
    const cursorLogicalPoint = { x: 600, y: 400 }; // Centre du plan

    // Zoom avant à 1.5x
    const resZoomIn = calculateCenteredZoom(initialPan, initialZoom, 1.5, cursorLogicalPoint);
    expect(resZoomIn.zoom).toBe(1.5);
    // newPanX = 0 + 600 * (1 - 1.5) = -300
    // newPanY = 0 + 400 * (1 - 1.5) = -200
    expect(resZoomIn.pan.x).toBe(-300);
    expect(resZoomIn.pan.y).toBe(-200);

    // Zoom arrière à 0.8x depuis l état initial
    const resZoomOut = calculateCenteredZoom(initialPan, initialZoom, 0.8, cursorLogicalPoint);
    expect(resZoomOut.zoom).toBe(0.8);
    // newPanX = 0 + 600 * (1 - 0.8) = +120
    expect(resZoomOut.pan.x).toBe(120);
    expect(resZoomOut.pan.y).toBe(80);
  });

  it('respecte les bornes strictes de zoom entre 0.5 et 3.0', () => {
    const resMin = calculateCenteredZoom({ x: 0, y: 0 }, 1.0, 0.2, { x: 600, y: 400 });
    expect(resMin.zoom).toBe(0.5);

    const resMax = calculateCenteredZoom({ x: 0, y: 0 }, 1.0, 4.5, { x: 600, y: 400 });
    expect(resMax.zoom).toBe(3.0);
  });

  it('P-04 : sélectionne le voisin le plus proche et NON le dernier de la liste', () => {
    const targetPos = { x: 202, y: 300 };
    const neighbors = [
      { id: 'table-proche', x: 200, y: 500 }, // diffX = 2
      { id: 'table-eloignee', x: 207, y: 500 }, // diffX = 5
      { id: 'table-derniere-de-la-boucle', x: 206, y: 500 }, // diffX = 4
    ];

    const threshold = 8;
    const snap = findClosestMagneticNeighbor(targetPos, neighbors, threshold);

    // Dans l'ancienne implémentation buggée, c'était le dernier de la boucle (x=206) qui l'emportait !
    // Avec la correction, c'est le voisin à distance minimale (x=200, diff=2).
    expect(snap.snappedX).toBe(200);
    expect(snap.snappedX).not.toBe(206);
  });

  it('P-04 : ne produit aucun magnétisme si la distance dépasse le seuil', () => {
    const targetPos = { x: 220, y: 300 };
    const neighbors = [
      { id: 'table-1', x: 200, y: 300 }, // diffX = 20 > threshold(8)
    ];

    const snap = findClosestMagneticNeighbor(targetPos, neighbors, 8);
    expect(snap.snappedX).toBeUndefined();
    expect(snap.guideX).toBeUndefined();
  });
});
