import { describe, it, expect } from 'vitest';
import {
  screenToLogicalPoint,
  compute8Handles,
  computeResizedBox,
  computeRotationAngle,
  computeUnifiedSnapping,
  areBoxesColliding,
  findTableCollisions,
  autoSeparateTables,
  alignObjects,
  distributeObjects,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../../../lib/floorPlanGeometry';
import { floorPlanReducer, FloorPlanHistoryState } from '../floorPlanReducer';
import { computeFloorPlanDiff, extractTableLayoutFields } from '../floorPlanDiff';
import { RestaurantTable } from '../../../types/restaurant';

describe('floorPlanGeometry (Phase 1.15 Unit & Integration Suite)', () => {
  // --------------------------------------------------------------------------
  // 1. Conversion de Coordonnées (1.1)
  // --------------------------------------------------------------------------
  describe('screenToLogicalPoint', () => {
    it('calcule la position logique exacte en fonction du ratio d échelle et du conteneur', () => {
      // Simuler un conteneur SVG sans CTM (fallback géométrique exact)
      const mockSvg = {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 600, // moitie de 1200 -> échelle = 2x
          height: 400, // moitie de 800 -> échelle = 2x
          right: 700,
          bottom: 450,
        }),
      } as unknown as SVGSVGElement;

      // Pointeur au centre de l'écran : clientX = 400, clientY = 250
      // (400 - 100) * (1200 / 600) = 300 * 2 = 600
      // (250 - 50) * (800 / 400) = 200 * 2 = 400
      const pt = screenToLogicalPoint(400, 250, mockSvg, null);
      expect(pt.x).toBeCloseTo(600, 1);
      expect(pt.y).toBeCloseTo(400, 1);
    });

    it('gère les conteneurs étroits (700px), moyens (1100px) et larges (1500px)', () => {
      const widths = [700, 1100, 1500];
      for (const w of widths) {
        const mockSvg = {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: w,
            height: (w * 2) / 3,
            right: w,
            bottom: (w * 2) / 3,
          }),
        } as unknown as SVGSVGElement;

        // Pointeur au coin supérieur gauche
        const origin = screenToLogicalPoint(0, 0, mockSvg, null);
        expect(origin.x).toBeCloseTo(0, 0.5);
        expect(origin.y).toBeCloseTo(0, 0.5);

        // Pointeur au coin inférieur droit
        const end = screenToLogicalPoint(w, (w * 2) / 3, mockSvg, null);
        expect(end.x).toBeCloseTo(LOGICAL_WIDTH, 0.5);
        expect(end.y).toBeCloseTo(LOGICAL_HEIGHT, 0.5);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. 8 Poignées de redimensionnement dans les axes locaux (1.5)
  // --------------------------------------------------------------------------
  describe('compute8Handles & computeResizedBox', () => {
    it('génère 8 poignées avec des coordonnées symétriques pour un objet non pivoté', () => {
      const handles = compute8Handles(200, 200, 100, 80, 0, 0);
      expect(handles).toHaveLength(8);

      const se = handles.find((h) => h.type === 'se');
      expect(se).toBeDefined();
      expect(se!.x).toBe(250);
      expect(se!.y).toBe(240);

      const nw = handles.find((h) => h.type === 'nw');
      expect(nw).toBeDefined();
      expect(nw!.x).toBe(150);
      expect(nw!.y).toBe(160);
    });

    it('redimensionne en maintenant le coin opposé rigoureusement fixe', () => {
      const startBox = { x: 200, y: 200, width: 100, height: 100, rotation: 0 };
      // Tirer la poignée 'se' (coin bas-droit) vers (300, 300)
      // Le coin 'nw' opposé est à (150, 150).
      const resized = computeResizedBox({
        handle: 'se',
        startBox,
        pointerLogical: { x: 300, y: 300 },
        preserveRatio: false,
      });

      // La nouvelle largeur doit être 300 - 150 = 150
      expect(resized.width).toBe(150);
      expect(resized.height).toBe(150);
      // Le nouveau coin 'nw' doit TOUJOURS être à (150, 150)
      const newNwX = resized.x - resized.width / 2;
      const newNwY = resized.y - resized.height / 2;
      expect(newNwX).toBe(150);
      expect(newNwY).toBe(150);
    });

    it('conserve les proportions avec Maj (preserveRatio)', () => {
      const startBox = { x: 200, y: 200, width: 120, height: 60, rotation: 0 }; // ratio 2:1
      const resized = computeResizedBox({
        handle: 'se',
        startBox,
        pointerLogical: { x: 320, y: 260 },
        preserveRatio: true,
      });

      const newRatio = resized.width / resized.height;
      expect(newRatio).toBeCloseTo(2, 0.1);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Rotation (1.4)
  // --------------------------------------------------------------------------
  describe('computeRotationAngle', () => {
    it('applique un pas de 15 degrés par défaut', () => {
      // Centre (200, 200), pointeur à droite (300, 200) -> 90 degrés
      const angle = computeRotationAngle(200, 200, { x: 300, y: 200 }, false, 15);
      expect(angle % 15).toBe(0);
      expect(angle).toBe(90); // dy=0, dx=100 -> rad = 0 -> deg = 0 + 90 = 90
    });

    it('permet une rotation libre au degré près si Maj est enfoncé', () => {
      const angle = computeRotationAngle(200, 200, { x: 231, y: 154 }, true);
      expect(Number.isInteger(angle)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Aimantation Unifiée (1.7)
  // --------------------------------------------------------------------------
  describe('computeUnifiedSnapping', () => {
    it('aimante au bord voisin lorsqu une table s approche à moins de 10px', () => {
      const neighbor = { id: 't1', x: 200, y: 200, width: 100, height: 100 };
      // Bord droit de t1 est à 250.
      // Posons t2 (largeur 100) avec son bord gauche à 254 (targetX = 304).
      // Distance bord-à-bord = 4px < seuil (10px).
      const snap = computeUnifiedSnapping({
        targetX: 304,
        targetY: 200,
        targetWidth: 100,
        targetHeight: 100,
        targetId: 't2',
        otherObjects: [neighbor],
        snapToGrid: false,
        snapToMagnet: true,
        snapThreshold: 10,
      });

      expect(snap.didSnapX).toBe(true);
      // Le bord gauche de t2 doit se caler exactement à 250 -> targetX = 300
      expect(snap.x).toBe(300);
      expect(snap.guides.length).toBeGreaterThan(0);
    });

    it('applique l aimantation grille si l aimant magnétique n est pas actif', () => {
      const snap = computeUnifiedSnapping({
        targetX: 304,
        targetY: 207,
        targetWidth: 100,
        targetHeight: 100,
        targetId: 't2',
        otherObjects: [],
        snapToGrid: true,
        snapToMagnet: false,
        gridSize: 10,
      });

      expect(snap.x).toBe(300);
      expect(snap.y).toBe(210);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Collisions SAT & Écartement Automatique (1.8)
  // --------------------------------------------------------------------------
  describe('areBoxesColliding & autoSeparateTables', () => {
    it('détecte le chevauchement entre deux tables orientées', () => {
      const boxA = { x: 200, y: 200, width: 100, height: 100, rotation: 0 };
      const boxB = { x: 250, y: 200, width: 100, height: 100, rotation: 0 };
      const boxDisjoint = { x: 400, y: 200, width: 100, height: 100, rotation: 0 };

      expect(areBoxesColliding(boxA, boxB)).toBe(true);
      expect(areBoxesColliding(boxA, boxDisjoint)).toBe(false);
    });

    it('autoSeparateTables élimine les chevauchements en repoussant les tables', () => {
      const collidingTables: RestaurantTable[] = [
        { id: 't1', number: '1', x: 200, y: 200, width: 100, height: 100, capacity: 4, zone: 'Z1', status: 'libre' },
        { id: 't2', number: '2', x: 220, y: 200, width: 100, height: 100, capacity: 4, zone: 'Z1', status: 'libre' },
      ];

      const initialCheck = findTableCollisions(collidingTables);
      expect(initialCheck.collidingTableIds.size).toBe(2);

      const separated = autoSeparateTables(collidingTables);
      const afterCheck = findTableCollisions(separated);

      expect(afterCheck.collidingTableIds.size).toBe(0);
      // Les tables ont été écartées
      const dist = Math.abs((separated[0].x ?? 0) - (separated[1].x ?? 0));
      expect(dist).toBeGreaterThanOrEqual(100);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Alignement & Répartition (1.6)
  // --------------------------------------------------------------------------
  describe('alignObjects & distributeObjects', () => {
    const items = [
      { id: '1', x: 100, y: 200, width: 50, height: 50 },
      { id: '2', x: 300, y: 250, width: 50, height: 50 },
      { id: '3', x: 500, y: 180, width: 50, height: 50 },
    ];

    it('aligne tous les objets à gauche sur le bord minimal', () => {
      const aligned = alignObjects(items, 'left');
      const minLeft = Math.min(...items.map((it) => it.x - it.width / 2));
      for (const it of aligned) {
        expect(it.x - it.width / 2).toBe(minLeft);
      }
    });

    it('répartit horizontalement avec un espacement uniforme', () => {
      const distributed = distributeObjects(items, 'horizontal');
      const d1 = (distributed[1].x ?? 0) - (distributed[0].x ?? 0);
      const d2 = (distributed[2].x ?? 0) - (distributed[1].x ?? 0);
      expect(d1).toBe(d2);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Intégration Sauvegarde & Non-écrasement Statut Service (1.12)
  // --------------------------------------------------------------------------
  describe('Sauvegarde fiable & intégrité opérationnelle', () => {
    it('1.12 : la sauvegarde atomique ne contient QUE layoutVersion: 2 et les champs géométriques', () => {
      const tableWithLiveOrder: RestaurantTable = {
        id: 't-live-1',
        number: 'T1',
        capacity: 4,
        zone: 'Salle',
        zoneId: 'z-1',
        status: 'en_service',
        currentOrderId: 'cmd-active-123',
        timeOccupied: '2026-10-21T09:00:00Z',
        assignedServerId: 'srv-paul',
        assignedServerName: 'Paul',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        layoutVersion: 2,
      };

      // Le manager déplace la table en mode édition
      const movedDraft = { ...tableWithLiveOrder, x: 260, y: 320, rotation: 90 };
      const diff = computeFloorPlanDiff([tableWithLiveOrder], [movedDraft], [], [], [], []);

      expect(diff.tablesToUpdate).toHaveLength(1);
      const updatePayload = diff.tablesToUpdate[0];

      expect(updatePayload.id).toBe('t-live-1');
      expect(updatePayload.x).toBe(260);
      expect(updatePayload.y).toBe(320);
      expect(updatePayload.rotation).toBe(90);
      expect(updatePayload.layoutVersion).toBe(2);

      // Invariants critiques : JAMAIS de champs de service dans le payload de mise à jour
      expect((updatePayload as any).status).toBeUndefined();
      expect((updatePayload as any).currentOrderId).toBeUndefined();
      expect((updatePayload as any).timeOccupied).toBeUndefined();
      expect((updatePayload as any).assignedServerId).toBeUndefined();
    });

    it('1.12 : une table supprimée est bien répertoriée dans tablesToDelete', () => {
      const initialTable: RestaurantTable = {
        id: 'tbl-to-delete',
        number: 'T99',
        capacity: 2,
        zone: 'Terrasse',
        status: 'libre',
        x: 100,
        y: 100,
      };

      const diff = computeFloorPlanDiff(
        [initialTable],
        [],
        ['tbl-to-delete'],
        [],
        [],
        []
      );

      expect(diff.tablesToDelete).toEqual(['tbl-to-delete']);
      expect(diff.hasChanges).toBe(true);
    });
  });
});
