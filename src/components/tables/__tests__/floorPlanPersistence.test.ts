import { describe, it, expect } from 'vitest';
import { floorPlanReducer, FloorPlanHistoryState } from '../floorPlanReducer';
import { computeFloorPlanDiff, extractTableLayoutFields } from '../floorPlanDiff';
import { RestaurantTable, DecorElement } from '../../../types/restaurant';

describe('floorPlanPersistence & floorPlanReducer (D-01, D-02, D-04, D-05)', () => {
  const tableEnService: RestaurantTable = {
    id: 'tbl-occupied-1',
    number: 'T10',
    capacity: 4,
    zone: 'Salle Principale',
    zoneId: 'zone-1',
    status: 'occupee',
    currentOrderId: 'cmd-999',
    timeOccupied: '2026-10-21T00:00:00Z',
    assignedServerId: 'srv-1',
    assignedServerName: 'Serge',
    x: 200,
    y: 300,
    width: 100,
    height: 100,
    rotation: 0,
    coordVersion: 2,
  };

  it('D-02 : extractTableLayoutFields n extrait QUE les champs de mise en page et préserve le statut', () => {
    const layoutOnly = extractTableLayoutFields(tableEnService);

    expect(layoutOnly.id).toBe('tbl-occupied-1');
    expect(layoutOnly.x).toBe(200);
    expect(layoutOnly.y).toBe(300);
    expect(layoutOnly.coordVersion).toBe(2);

    // Vérification absolue : AUCUN champ opérationnel n'est présent
    expect((layoutOnly as any).status).toBeUndefined();
    expect((layoutOnly as any).currentOrderId).toBeUndefined();
    expect((layoutOnly as any).timeOccupied).toBeUndefined();
    expect((layoutOnly as any).assignedServerId).toBeUndefined();
    expect((layoutOnly as any).assignedServerName).toBeUndefined();
  });

  it('D-01 : computeFloorPlanDiff détecte correctement les tables supprimées dans tablesToDelete', () => {
    const initialTables = [tableEnService];
    const draftTables: RestaurantTable[] = []; // Table supprimée du brouillon
    const removedTableIds = ['tbl-occupied-1'];

    const diff = computeFloorPlanDiff(
      initialTables,
      draftTables,
      removedTableIds,
      [],
      [],
      []
    );

    expect(diff.tablesToDelete).toEqual(['tbl-occupied-1']);
    expect(diff.tablesToCreate).toHaveLength(0);
    expect(diff.tablesToUpdate).toHaveLength(0);
    expect(diff.hasChanges).toBe(true);
  });

  it('D-02 : une modification de coordonnées d une table occupée ne modifie que son layout', () => {
    const initialTables = [tableEnService];
    // Le manager déplace la table à (350, 400)
    const draftTables = [{ ...tableEnService, x: 350, y: 400, rotation: 45 }];

    const diff = computeFloorPlanDiff(
      initialTables,
      draftTables,
      [],
      [],
      [],
      []
    );

    expect(diff.tablesToUpdate).toHaveLength(1);
    expect(diff.tablesToUpdate[0].x).toBe(350);
    expect(diff.tablesToUpdate[0].y).toBe(400);
    expect(diff.tablesToUpdate[0].rotation).toBe(45);
    expect((diff.tablesToUpdate[0] as any).status).toBeUndefined();
  });

  it('D-04 : le réducteur unifié enregistre l historique immédiatement sans cran mort', () => {
    const initialState: FloorPlanHistoryState = {
      past: [],
      present: {
        tables: [tableEnService],
        decor: [],
        removedTableIds: [],
        removedDecorIds: [],
      },
      future: [],
    };

    // Action 1 : Rotation de la table
    const stateAfterRotate = floorPlanReducer(initialState, {
      type: 'UPDATE_SINGLE_TABLE',
      payload: { id: 'tbl-occupied-1', updates: { rotation: 45 } },
    });

    expect(stateAfterRotate.present.tables[0].rotation).toBe(45);
    expect(stateAfterRotate.past).toHaveLength(1);
    expect(stateAfterRotate.past[0].tables[0].rotation).toBe(0);

    // Action 2 : Undo (Ctrl+Z) immédiat sans cran mort
    const stateAfterUndo = floorPlanReducer(stateAfterRotate, { type: 'UNDO' });
    expect(stateAfterUndo.present.tables[0].rotation).toBe(0);
    expect(stateAfterUndo.future).toHaveLength(1);
    expect(stateAfterUndo.future[0].tables[0].rotation).toBe(45);

    // Action 3 : Redo (Ctrl+Y)
    const stateAfterRedo = floorPlanReducer(stateAfterUndo, { type: 'REDO' });
    expect(stateAfterRedo.present.tables[0].rotation).toBe(45);
  });

  it('D-05 : les ajouts en mode édition sont jetables lors d une annulation (DISCARD_CHANGES)', () => {
    const initialState: FloorPlanHistoryState = {
      past: [],
      present: {
        tables: [tableEnService],
        decor: [],
        removedTableIds: [],
        removedDecorIds: [],
      },
      future: [],
    };

    // Ajout d'une table en brouillon
    const newDraftTable: RestaurantTable = {
      id: 'tbl-new-draft',
      number: 'T11',
      capacity: 2,
      zone: 'Salle Principale',
      status: 'libre',
      x: 500,
      y: 500,
    };

    const stateWithNewTable = floorPlanReducer(initialState, {
      type: 'ADD_TABLE',
      payload: newDraftTable,
    });

    expect(stateWithNewTable.present.tables).toHaveLength(2);

    // L'utilisateur clique sur « Annuler l'édition » -> DISCARD_CHANGES
    const stateDiscarded = floorPlanReducer(stateWithNewTable, {
      type: 'DISCARD_CHANGES',
      payload: { tables: [tableEnService], decor: [] },
    });

    expect(stateDiscarded.present.tables).toHaveLength(1);
    expect(stateDiscarded.present.tables[0].id).toBe('tbl-occupied-1');
    expect(stateDiscarded.past).toHaveLength(0);
  });

  it('D-04 : SET_TABLES_TRANSIENT met à jour la position sans saturer l historique, COMMIT_TRANSACTION fige le départ', () => {
    const initialState: FloorPlanHistoryState = {
      past: [],
      present: {
        tables: [tableEnService],
        decor: [],
        removedTableIds: [],
        removedDecorIds: [],
      },
      future: [],
    };

    const startSnapshot = { ...initialState.present };

    // Glisser la table : 3 mises à jour transitoires
    let transientState = floorPlanReducer(initialState, {
      type: 'SET_TABLES_TRANSIENT',
      payload: [{ ...tableEnService, x: 210, y: 310 }],
    });
    transientState = floorPlanReducer(transientState, {
      type: 'SET_TABLES_TRANSIENT',
      payload: [{ ...tableEnService, x: 220, y: 320 }],
    });
    transientState = floorPlanReducer(transientState, {
      type: 'SET_TABLES_TRANSIENT',
      payload: [{ ...tableEnService, x: 250, y: 350 }],
    });

    // L'historique n'a pas été saturé par les 3 mouvements intermédiaires
    expect(transientState.past).toHaveLength(0);
    expect(transientState.present.tables[0].x).toBe(250);

    // Fin du drag : commit de la transaction avec le snapshot de départ
    const committedState = floorPlanReducer(transientState, {
      type: 'COMMIT_TRANSACTION',
      payload: { startSnapshot },
    });

    expect(committedState.past).toHaveLength(1);
    expect(committedState.past[0].tables[0].x).toBe(200); // position initiale
    expect(committedState.present.tables[0].x).toBe(250); // position finale

    // Undo restaure la position initiale en 1 clic
    const undoneState = floorPlanReducer(committedState, { type: 'UNDO' });
    expect(undoneState.present.tables[0].x).toBe(200);

    // Redo restaure la position finale
    const redoneState = floorPlanReducer(undoneState, { type: 'REDO' });
    expect(redoneState.present.tables[0].x).toBe(250);
  });
});
