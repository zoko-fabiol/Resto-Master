import { RestaurantTable, DecorElement } from '../../types/restaurant';

export interface LayoutSnapshot {
  tables: RestaurantTable[];
  decor: DecorElement[];
  removedTableIds: string[];
  removedDecorIds: string[];
}

export interface FloorPlanHistoryState {
  past: LayoutSnapshot[];
  present: LayoutSnapshot;
  future: LayoutSnapshot[];
}

export function cloneSnapshot(snapshot: LayoutSnapshot): LayoutSnapshot {
  return {
    tables: snapshot.tables.map((t) => ({ ...t })),
    decor: snapshot.decor.map((d) => ({ ...d })),
    removedTableIds: [...snapshot.removedTableIds],
    removedDecorIds: [...snapshot.removedDecorIds],
  };
}

import { alignObjects, distributeObjects, autoSeparateTables, AlignmentType, DistributionAxis } from '../../lib/floorPlanGeometry';

export type FloorPlanAction =
  | { type: 'INIT'; payload: { tables: RestaurantTable[]; decor: DecorElement[] } }
  | { type: 'SET_TABLES_TRANSIENT'; payload: RestaurantTable[] }
  | { type: 'SET_DECOR_TRANSIENT'; payload: DecorElement[] }
  | { type: 'COMMIT_TRANSACTION'; payload: { startSnapshot: LayoutSnapshot } }
  | { type: 'UPDATE_TABLE_POS'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_TABLES'; payload: RestaurantTable[] }
  | { type: 'UPDATE_DECOR_POS'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_DECOR'; payload: DecorElement[] }
  | { type: 'ADD_TABLE'; payload: RestaurantTable }
  | { type: 'ADD_TABLES_BATCH'; payload: RestaurantTable[] }
  | { type: 'UPDATE_SINGLE_TABLE'; payload: { id: string; updates: Partial<RestaurantTable> } }
  | { type: 'MOVE_TABLES_GROUP'; payload: { tableIds: string[]; dx: number; dy: number } }
  | { type: 'ALIGN_TABLES'; payload: { tableIds: string[]; alignment: AlignmentType } }
  | { type: 'DISTRIBUTE_TABLES'; payload: { tableIds: string[]; axis: DistributionAxis } }
  | { type: 'AUTO_SEPARATE_TABLES' }
  | { type: 'REMOVE_TABLE'; payload: { id: string; isPersisted: boolean } }
  | { type: 'SAVE_DECOR_ELEMENT'; payload: DecorElement }
  | { type: 'REMOVE_DECOR'; payload: { id: string; isPersisted: boolean } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'DISCARD_CHANGES'; payload: { tables: RestaurantTable[]; decor: DecorElement[] } };

export function floorPlanReducer(
  state: FloorPlanHistoryState,
  action: FloorPlanAction
): FloorPlanHistoryState {
  switch (action.type) {
    case 'INIT': {
      return {
        past: [],
        present: {
          tables: action.payload.tables.map((t) => ({ ...t })),
          decor: action.payload.decor.map((d) => ({ ...d })),
          removedTableIds: [],
          removedDecorIds: [],
        },
        future: [],
      };
    }

    case 'SET_TABLES_TRANSIENT': {
      return {
        ...state,
        present: {
          ...state.present,
          tables: action.payload.map((t) => ({ ...t })),
        },
      };
    }

    case 'SET_DECOR_TRANSIENT': {
      return {
        ...state,
        present: {
          ...state.present,
          decor: action.payload.map((d) => ({ ...d })),
        },
      };
    }

    case 'COMMIT_TRANSACTION': {
      return {
        past: [...state.past, cloneSnapshot(action.payload.startSnapshot)],
        present: state.present,
        future: [],
      };
    }

    case 'UPDATE_TABLE_POS': {
      const nextTables = state.present.tables.map((t) =>
        t.id === action.payload.id ? { ...t, x: action.payload.x, y: action.payload.y } : t
      );
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
        },
        future: [],
      };
    }

    case 'UPDATE_TABLES': {
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: action.payload.map((t) => ({ ...t })),
        },
        future: [],
      };
    }

    case 'UPDATE_DECOR': {
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          decor: action.payload.map((d) => ({ ...d })),
        },
        future: [],
      };
    }

    case 'ADD_TABLE': {
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: [...state.present.tables, { ...action.payload }],
        },
        future: [],
      };
    }

    case 'ADD_TABLES_BATCH': {
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: [...state.present.tables, ...action.payload.map((t) => ({ ...t }))],
        },
        future: [],
      };
    }

    case 'UPDATE_SINGLE_TABLE': {
      const nextTables = state.present.tables.map((t) =>
        t.id === action.payload.id ? ({ ...t, ...action.payload.updates } as RestaurantTable) : t
      );
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
        },
        future: [],
      };
    }

    case 'MOVE_TABLES_GROUP': {
      const idSet = new Set(action.payload.tableIds);
      const nextTables = state.present.tables.map((t) => {
        if (!idSet.has(t.id)) return t;
        const newX = Math.max(40, Math.min(1160, (t.x ?? 200) + action.payload.dx));
        const newY = Math.max(40, Math.min(760, (t.y ?? 200) + action.payload.dy));
        return { ...t, x: newX, y: newY };
      });
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
        },
        future: [],
      };
    }

    case 'ALIGN_TABLES': {
      const idSet = new Set(action.payload.tableIds);
      const selected = state.present.tables.filter((t) => idSet.has(t.id));
      if (selected.length <= 1) return state;

      const aligned = alignObjects(selected, action.payload.alignment);
      const alignedMap = new Map(aligned.map((t) => [t.id, t]));

      const nextTables = state.present.tables.map((t) => alignedMap.get(t.id) || t);
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
        },
        future: [],
      };
    }

    case 'DISTRIBUTE_TABLES': {
      const idSet = new Set(action.payload.tableIds);
      const selected = state.present.tables.filter((t) => idSet.has(t.id));
      if (selected.length <= 2) return state;

      const distributed = distributeObjects(selected, action.payload.axis);
      const distMap = new Map(distributed.map((t) => [t.id, t]));

      const nextTables = state.present.tables.map((t) => distMap.get(t.id) || t);
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
        },
        future: [],
      };
    }

    case 'AUTO_SEPARATE_TABLES': {
      const separated = autoSeparateTables(state.present.tables);
      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: separated,
        },
        future: [],
      };
    }

    case 'REMOVE_TABLE': {
      const nextTables = state.present.tables.filter((t) => t.id !== action.payload.id);
      const nextRemoved = action.payload.isPersisted
        ? Array.from(new Set([...state.present.removedTableIds, action.payload.id]))
        : state.present.removedTableIds;

      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          tables: nextTables,
          removedTableIds: nextRemoved,
        },
        future: [],
      };
    }

    case 'SAVE_DECOR_ELEMENT': {
      const exists = state.present.decor.some((d) => d.id === action.payload.id);
      const nextDecor = exists
        ? state.present.decor.map((d) => (d.id === action.payload.id ? { ...action.payload } : d))
        : [...state.present.decor, { ...action.payload }];

      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          decor: nextDecor,
        },
        future: [],
      };
    }

    case 'REMOVE_DECOR': {
      const nextDecor = state.present.decor.filter((d) => d.id !== action.payload.id);
      const nextRemoved = action.payload.isPersisted
        ? Array.from(new Set([...state.present.removedDecorIds, action.payload.id]))
        : state.present.removedDecorIds;

      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: {
          ...state.present,
          decor: nextDecor,
          removedDecorIds: nextRemoved,
        },
        future: [],
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [cloneSnapshot(state.present), ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, cloneSnapshot(state.present)],
        present: next,
        future: newFuture,
      };
    }

    case 'DISCARD_CHANGES': {
      return {
        past: [],
        present: {
          tables: action.payload.tables.map((t) => ({ ...t })),
          decor: action.payload.decor.map((d) => ({ ...d })),
          removedTableIds: [],
          removedDecorIds: [],
        },
        future: [],
      };
    }

    default:
      return state;
  }
}
