import { RestaurantTable, DecorElement } from '../../types/restaurant';

export type TableLayoutPayload = Pick<
  RestaurantTable,
  'id' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'shape' | 'number' | 'zoneId' | 'zone' | 'capacity' | 'coordVersion' | 'layoutVersion' | 'active'
>;

/**
 * Filtre un objet table pour ne conserver STRICTEMENT QUE les champs de mise en page spatiale.
 * Ne touche JAMAIS au statut opérationnel (status, currentOrderId, timeOccupied, assignedServer...).
 */
export function extractTableLayoutFields(table: RestaurantTable): TableLayoutPayload {
  return {
    id: table.id,
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation,
    shape: table.shape,
    number: table.number,
    zoneId: table.zoneId,
    zone: table.zone,
    capacity: table.capacity,
    coordVersion: 2,
    layoutVersion: 2,
    active: table.active !== false,
  };
}

export interface FloorPlanDiffResult {
  tablesToCreate: RestaurantTable[];
  tablesToUpdate: TableLayoutPayload[];
  tablesToDelete: string[];
  decorToUpsert: DecorElement[];
  decorToDelete: string[];
  hasChanges: boolean;
}

/**
 * Calcule le différentiel précis entre l'état initial (Firestore) et le brouillon d'édition.
 */
export function computeFloorPlanDiff(
  initialTables: RestaurantTable[],
  draftTables: RestaurantTable[],
  removedTableIds: string[],
  initialDecor: DecorElement[],
  draftDecor: DecorElement[],
  removedDecorIds: string[]
): FloorPlanDiffResult {
  const initialTableMap = new Map(initialTables.map((t) => [t.id, t]));
  const tablesToCreate: RestaurantTable[] = [];
  const tablesToUpdate: TableLayoutPayload[] = [];

  for (const draft of draftTables) {
    const initial = initialTableMap.get(draft.id);
    if (!initial) {
      // Nouvelle table créée en mode édition
      tablesToCreate.push({
        ...draft,
        coordVersion: 2,
        layoutVersion: 2,
        status: draft.status || 'libre',
      });
    } else {
      // Vérifier si des champs de layout ont été modifiés
      const isChanged =
        draft.x !== initial.x ||
        draft.y !== initial.y ||
        draft.width !== initial.width ||
        draft.height !== initial.height ||
        draft.rotation !== initial.rotation ||
        draft.shape !== initial.shape ||
        draft.number !== initial.number ||
        draft.zoneId !== initial.zoneId ||
        draft.capacity !== initial.capacity ||
        draft.active !== initial.active ||
        initial.layoutVersion !== 2 ||
        initial.coordVersion !== 2;

      if (isChanged) {
        tablesToUpdate.push(extractTableLayoutFields(draft));
      }
    }
  }

  // Filtrer les tables supprimées : seulement celles qui existaient réellement en base
  const validTablesToDelete = Array.from(
    new Set(removedTableIds.filter((id) => initialTableMap.has(id)))
  );

  // Décor diff
  const initialDecorMap = new Map(initialDecor.map((d) => [d.id, d]));
  const decorToUpsert: DecorElement[] = [];

  for (const draft of draftDecor) {
    const initial = initialDecorMap.get(draft.id);
    if (!initial) {
      decorToUpsert.push({ ...draft, coordVersion: 2 });
    } else {
      const isChanged =
        draft.x !== initial.x ||
        draft.y !== initial.y ||
        draft.width !== initial.width ||
        draft.height !== initial.height ||
        draft.rotation !== initial.rotation ||
        draft.type !== initial.type ||
        draft.name !== initial.name ||
        draft.label !== initial.label ||
        draft.zoneId !== initial.zoneId ||
        initial.coordVersion !== 2;

      if (isChanged) {
        decorToUpsert.push({ ...draft, coordVersion: 2 });
      }
    }
  }

  const validDecorToDelete = Array.from(
    new Set(removedDecorIds.filter((id) => initialDecorMap.has(id)))
  );

  const hasChanges =
    tablesToCreate.length > 0 ||
    tablesToUpdate.length > 0 ||
    validTablesToDelete.length > 0 ||
    decorToUpsert.length > 0 ||
    validDecorToDelete.length > 0;

  return {
    tablesToCreate,
    tablesToUpdate,
    tablesToDelete: validTablesToDelete,
    decorToUpsert,
    decorToDelete: validDecorToDelete,
    hasChanges,
  };
}
