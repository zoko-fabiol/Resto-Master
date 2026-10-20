import { describe, it, expect } from 'vitest';
import { floorPlanReducer, FloorPlanHistoryState } from '../floorPlanReducer';
import { RestaurantTable } from '../../../types/restaurant';

describe('floorPlanShortcuts & Keyboard Nudge (Tâche 1.9)', () => {
  const initialTable: RestaurantTable = {
    id: 'tbl-1',
    number: 'T1',
    capacity: 4,
    zone: 'Salle',
    zoneId: 'z1',
    status: 'libre',
    x: 200,
    y: 200,
    width: 100,
    height: 100,
    rotation: 0,
    coordVersion: 2,
  };

  const initialState: FloorPlanHistoryState = {
    past: [],
    present: {
      tables: [initialTable],
      decor: [],
      removedTableIds: [],
      removedDecorIds: [],
    },
    future: [],
  };

  it('déplace une table avec une flèche clavier (1 unité)', () => {
    const movedState = floorPlanReducer(initialState, {
      type: 'UPDATE_SINGLE_TABLE',
      payload: { id: 'tbl-1', updates: { x: (initialTable.x ?? 200) + 1 } },
    });

    expect(movedState.present.tables[0].x).toBe(201);
    expect(movedState.past).toHaveLength(1);
    expect(movedState.past[0].tables[0].x).toBe(200);

    // Undo restaure la position
    const undone = floorPlanReducer(movedState, { type: 'UNDO' });
    expect(undone.present.tables[0].x).toBe(200);
  });

  it('déplace une table avec Maj + flèche clavier (10 unités)', () => {
    const movedState = floorPlanReducer(initialState, {
      type: 'UPDATE_SINGLE_TABLE',
      payload: { id: 'tbl-1', updates: { y: (initialTable.y ?? 200) + 10 } },
    });

    expect(movedState.present.tables[0].y).toBe(210);
    expect(movedState.past).toHaveLength(1);
  });

  it('duplique une table avec un nouvel identifiant et des coordonnées décalées', () => {
    const copyTable: RestaurantTable = {
      ...initialTable,
      id: 'tbl-copy-1',
      number: 'T1-copie',
      x: (initialTable.x ?? 200) + 30,
      y: (initialTable.y ?? 200) + 30,
    };

    const stateWithCopy = floorPlanReducer(initialState, {
      type: 'ADD_TABLE',
      payload: copyTable,
    });

    expect(stateWithCopy.present.tables).toHaveLength(2);
    expect(stateWithCopy.present.tables[1].id).toBe('tbl-copy-1');
    expect(stateWithCopy.present.tables[1].x).toBe(230);
    expect(stateWithCopy.present.tables[1].y).toBe(230);
  });
});
