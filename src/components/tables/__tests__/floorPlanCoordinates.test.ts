import { describe, it, expect } from 'vitest';
import {
  normalizeCoordinateX,
  normalizeCoordinateY,
  migrateTableCoordinates,
  revertTableCoordinatesMigration,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../floorPlanCoordinates';
import { RestaurantTable } from '../../../types/restaurant';

describe('floorPlanCoordinates - Bogue D-03 et Versioning coordVersion: 2', () => {
  it('garantit qu une table posée à x=60 et y=60 reste à 60 sans être convertie en 720/480', () => {
    // Dans l'ancienne implémentation avec heuristique (val <= 100 ? (val/100) * 1200 : val) :
    // 60 devenait (60 / 100) * 1200 = 720 !
    const posX = 60;
    const posY = 60;

    const normalizedX = normalizeCoordinateX(posX);
    const normalizedY = normalizeCoordinateY(posY);

    expect(normalizedX).toBe(60);
    expect(normalizedY).toBe(60);
    expect(normalizedX).not.toBe(720);
    expect(normalizedY).not.toBe(480);
  });

  it('gère correctement les valeurs aux limites et indéfinies sans division par 100', () => {
    expect(normalizeCoordinateX(undefined)).toBe(200);
    expect(normalizeCoordinateX(null)).toBe(200);
    expect(normalizeCoordinateX(0)).toBe(0);
    expect(normalizeCoordinateX(100)).toBe(100);
    expect(normalizeCoordinateX(1200)).toBe(1200);

    expect(normalizeCoordinateY(undefined)).toBe(200);
    expect(normalizeCoordinateY(null)).toBe(200);
    expect(normalizeCoordinateY(80)).toBe(80);
  });

  it('migre les anciennes tables legacy en pourcentages et applique coordVersion: 2', () => {
    const legacyTable: RestaurantTable = {
      id: 'tbl-test-1',
      number: 'T1',
      capacity: 4,
      zone: 'Salle',
      status: 'libre',
      x: 50, // Ancien pourcentage (50% de la largeur = 600)
      y: 25, // Ancien pourcentage (25% de la hauteur = 200)
    };

    const { migratedTable, wasMigrated } = migrateTableCoordinates(legacyTable);

    expect(wasMigrated).toBe(true);
    expect(migratedTable.coordVersion).toBe(2);
    expect(migratedTable.x).toBe(600); // 50% * 1200
    expect(migratedTable.y).toBe(200); // 25% * 800
  });

  it('ne modifie pas une table déjà en coordVersion: 2 avec x=60', () => {
    const modernTable: RestaurantTable = {
      id: 'tbl-modern-1',
      number: 'T60',
      capacity: 2,
      zone: 'Salle',
      status: 'libre',
      coordVersion: 2,
      x: 60,
      y: 75,
    };

    const { migratedTable, wasMigrated } = migrateTableCoordinates(modernTable);

    expect(wasMigrated).toBe(false);
    expect(migratedTable.coordVersion).toBe(2);
    expect(migratedTable.x).toBe(60);
    expect(migratedTable.y).toBe(75);
  });

  it('garantit la réversibilité de la migration vers l état d origine', () => {
    const legacyTable: RestaurantTable = {
      id: 'tbl-reversible-1',
      number: 'T9',
      capacity: 6,
      zone: 'VIP',
      status: 'libre',
      x: 40,
      y: 30,
    };

    const { migratedTable } = migrateTableCoordinates(legacyTable);
    expect(migratedTable.x).toBe(480);
    expect(migratedTable.y).toBe(240);

    const revertedTable = revertTableCoordinatesMigration(migratedTable);
    expect(revertedTable.x).toBe(40);
    expect(revertedTable.y).toBe(30);
    expect(revertedTable.coordVersion).toBeUndefined();
  });
});
