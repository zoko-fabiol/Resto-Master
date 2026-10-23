import { describe, it, expect } from 'vitest';
import {
  normalizeCoordinateX,
  normalizeCoordinateY,
  migrateTableCoordinates,
} from '../components/tables/floorPlanCoordinates';
import { computeFloorPlanDiff } from '../components/tables/floorPlanDiff';
import {
  findFirstAvailableTablePosition,
  computeBatchTablePositions,
} from '../components/tables/floorPlanPlacement';
import {
  findTableCollisions,
  autoSeparateTables,
} from '../lib/floorPlanGeometry';
import { RestaurantTable, DecorElement } from '../types/restaurant';

describe('Phase 4 — Audit critique n°2 & Fiabilisation du Plan de Table 2D', () => {
  describe('D-03 : Normalisation des coordonnées sans heuristique destructrice', () => {
    it('préserve fidèlement les coordonnées <= 100 sans les multiplier arbitrairement par 12', () => {
      // Dans l'ancien code, toute valeur <= 100 était considérée comme un pourcentage (60 -> 720, 80 -> 960)
      expect(normalizeCoordinateX(60)).toBe(60);
      expect(normalizeCoordinateX(80)).toBe(80);
      expect(normalizeCoordinateX(100)).toBe(100);
      expect(normalizeCoordinateY(50)).toBe(50);
      expect(normalizeCoordinateY(75)).toBe(75);
    });

    it('gère correctement le repli pour les valeurs indéfinies ou nulles', () => {
      expect(normalizeCoordinateX(undefined, 200)).toBe(200);
      expect(normalizeCoordinateX(null, 150)).toBe(150);
      expect(normalizeCoordinateY(NaN, 300)).toBe(300);
    });

    it('ne migre pas une table déjà en version coordVersion=2 ou layoutVersion=2', () => {
      const tableV2: RestaurantTable = {
        id: 'tbl-1',
        number: 'T1',
        capacity: 4,
        status: 'libre',
        shape: 'carree',
        zone: 'Salle 1',
        x: 60,
        y: 80,
        coordVersion: 2,
        layoutVersion: 2,
      };

      const result = migrateTableCoordinates(tableV2);
      expect(result.wasMigrated).toBe(false);
      expect(result.migratedTable.x).toBe(60);
      expect(result.migratedTable.y).toBe(80);
    });
  });

  describe('D-01 & D-02 : Diff-based Save et Préservation de l\'état de service', () => {
    const existingTables: RestaurantTable[] = [
      {
        id: 'tbl-1',
        number: 'T1',
        capacity: 4,
        status: 'occupee', // En service !
        currentOrderId: 'order-123', // Commande active !
        timeOccupied: '45m',
        assignedServerName: 'Jean',
        shape: 'carree',
        zone: 'Salle 1',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        zoneId: 'zone-1',
        coordVersion: 2,
        layoutVersion: 2,
      },
      {
        id: 'tbl-2',
        number: 'T2',
        capacity: 2,
        status: 'libre',
        shape: 'ronde',
        zone: 'Salle 1',
        x: 400,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        zoneId: 'zone-1',
        coordVersion: 2,
        layoutVersion: 2,
      },
    ];

    it('ne modifie QUE les champs géométriques (LAYOUT ONLY) et n\'écrase pas le statut de service', () => {
      // Le manager a déplacé T1 de (200, 200) à (250, 260) et l'a tournée à 45°
      const draftTables: RestaurantTable[] = [
        {
          ...existingTables[0],
          x: 250,
          y: 260,
          rotation: 45,
          status: 'libre', // Simuler un brouillon figé à l'état libre
          currentOrderId: undefined,
        },
        existingTables[1],
      ];

      const diff = computeFloorPlanDiff(
        existingTables,
        draftTables,
        [],
        [],
        [],
        []
      );

      expect(diff.hasChanges).toBe(true);
      expect(diff.tablesToUpdate).toHaveLength(1);

      const updatePayload = diff.tablesToUpdate[0];
      expect(updatePayload.id).toBe('tbl-1');
      expect(updatePayload.x).toBe(250);
      expect(updatePayload.y).toBe(260);
      expect(updatePayload.rotation).toBe(45);

      // Le diff NE DOIT PAS contenir le statut ou la commande
      expect((updatePayload as Record<string, unknown>).status).toBeUndefined();
      expect((updatePayload as Record<string, unknown>).currentOrderId).toBeUndefined();
      expect((updatePayload as Record<string, unknown>).timeOccupied).toBeUndefined();
      expect((updatePayload as Record<string, unknown>).serverName).toBeUndefined();
    });

    it('génère fidèlement la liste tablesToDelete et decorToDelete pour les suppressions réelles (D-01)', () => {
      const draftAfterDelete: RestaurantTable[] = [existingTables[0]]; // T2 retirée du brouillon
      const removedTableIds = ['tbl-2'];

      const existingDecor: DecorElement[] = [
        {
          id: 'decor-1',
          restaurantId: 'resto-1',
          type: 'plante',
          x: 100,
          y: 100,
          width: 60,
          height: 60,
          zoneId: 'zone-1',
        },
      ];
      const removedDecorIds = ['decor-1'];

      const diff = computeFloorPlanDiff(
        existingTables,
        draftAfterDelete,
        removedTableIds,
        existingDecor,
        [],
        removedDecorIds
      );

      expect(diff.hasChanges).toBe(true);
      expect(diff.tablesToDelete).toEqual(['tbl-2']);
      expect(diff.decorToDelete).toEqual(['decor-1']);
    });
  });

  describe('P-05 & P-06 : Algorithmes de placement intelligent et sans écrasement', () => {
    it('trouve la première coordonnée libre sans superposer les tables à (200, 200)', () => {
      const existingTables: RestaurantTable[] = [
        {
          id: 'tbl-1',
          number: 'T1',
          capacity: 4,
          status: 'libre',
          shape: 'carree',
          zone: 'Salle 1',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
        },
      ];

      const pos = findFirstAvailableTablePosition(existingTables, 100, 100);
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
      // Ne doit pas être au même centre que T1
      const dist = Math.hypot(pos.x - 100, pos.y - 100);
      expect(dist).toBeGreaterThan(80);
    });

    it('génère un lot de 10 tables sans écraser les dernières tables sur la même coordonnée', () => {
      const positions = computeBatchTablePositions(10, 'grille', 'carree');
      expect(positions).toHaveLength(10);

      // Vérifier que chaque table a une coordonnée distincte (aucune paire identique)
      const coordinateKeys = new Set(positions.map((p) => `${p.x},${p.y}`));
      expect(coordinateKeys.size).toBe(10);
    });
  });

  describe('Collisions & Séparation automatique (Separating Axis Theorem)', () => {
    it('détecte correctement deux tables qui se chevauchent', () => {
      const overlapping: RestaurantTable[] = [
        {
          id: 't-1',
          number: 'T1',
          capacity: 4,
          status: 'libre',
          shape: 'carree',
          zone: 'Salle 1',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
        },
        {
          id: 't-2',
          number: 'T2',
          capacity: 4,
          status: 'libre',
          shape: 'carree',
          zone: 'Salle 1',
          x: 220,
          y: 210, // Fort chevauchement
          width: 100,
          height: 100,
        },
      ];

      const { collidingTableIds, pairs } = findTableCollisions(overlapping);
      expect(collidingTableIds.has('t-1')).toBe(true);
      expect(collidingTableIds.has('t-2')).toBe(true);
      expect(pairs.length).toBeGreaterThan(0);
    });

    it('écarte automatiquement les tables en collision sans modifier les identifiants ni les statuts', () => {
      const overlapping: RestaurantTable[] = [
        {
          id: 't-1',
          number: 'T1',
          capacity: 4,
          status: 'occupee',
          shape: 'carree',
          zone: 'Salle 1',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
        },
        {
          id: 't-2',
          number: 'T2',
          capacity: 4,
          status: 'libre',
          shape: 'carree',
          zone: 'Salle 1',
          x: 210,
          y: 205,
          width: 100,
          height: 100,
        },
      ];

      const separated = autoSeparateTables(overlapping);
      expect(separated).toHaveLength(2);
      expect(separated[0].status).toBe('occupee');
      expect(separated[1].status).toBe('libre');

      // Après séparation, la distance entre les centres doit avoir augmenté
      const initialDist = Math.hypot(overlapping[0].x! - overlapping[1].x!, overlapping[0].y! - overlapping[1].y!);
      const newDist = Math.hypot(separated[0].x! - separated[1].x!, separated[0].y! - separated[1].y!);
      expect(newDist).toBeGreaterThan(initialDist);
    });
  });
});
