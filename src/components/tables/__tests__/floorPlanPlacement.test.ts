import { describe, it, expect } from 'vitest';
import {
  findFirstAvailableTablePosition,
  computeBatchTablePositions,
  doBoxesOverlap,
} from '../floorPlanPlacement';
import { RestaurantTable } from '../../../types/restaurant';

describe('floorPlanPlacement (Tâche 1.8)', () => {
  it('doBoxesOverlap détecte correctement le chevauchement avec marge', () => {
    const boxA = { x: 100, y: 100, width: 100, height: 100 };
    const boxB = { x: 150, y: 100, width: 100, height: 100 };
    const boxC = { x: 300, y: 300, width: 100, height: 100 };

    expect(doBoxesOverlap(boxA, boxB, 20)).toBe(true);
    expect(doBoxesOverlap(boxA, boxC, 20)).toBe(false);
  });

  it('findFirstAvailableTablePosition renvoie la 1ère case libre sans empiler sur une table existante', () => {
    const existing: RestaurantTable[] = [
      { id: 't1', number: 'T1', capacity: 4, zone: 'Salle', status: 'libre', x: 100, y: 100, width: 100, height: 100 },
    ];

    const freePos = findFirstAvailableTablePosition(existing, 100, 100);
    // La position libre ne doit pas chevaucher la table existante
    const overlaps = doBoxesOverlap(
      { x: freePos.x, y: freePos.y, width: 100, height: 100 },
      { x: 100, y: 100, width: 100, height: 100 },
      20
    );
    expect(overlaps).toBe(false);
  });

  it('computeBatchTablePositions passe proprement à la ligne sans écraser à x=1080', () => {
    // Génération de 15 tables en ligne
    const positions = computeBatchTablePositions(15, 'ligne', 'carree');
    expect(positions).toHaveLength(15);

    // Toutes les positions doivent être distinctes (aucun doublon)
    const posKeys = new Set(positions.map((p) => `${p.x},${p.y}`));
    expect(posKeys.size).toBe(15);

    // Vérifie qu'il y a plus d'une ligne (wrapping)
    const distinctY = new Set(positions.map((p) => p.y));
    expect(distinctY.size).toBeGreaterThan(1);
  });
});
