import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { RestaurantTable, TableStatus, Zone } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const tablesFirestoreService = {
  /**
   * Save or update a table in Firestore
   */
  async saveTable(table: RestaurantTable): Promise<void> {
    const payload = {
      ...table,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('tables', 'CREATE', table.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'tables', table.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('tables', 'CREATE', table.id, payload);
    }
  },

  /**
   * Update table status
   */
  async updateTableStatus(tableId: string, status: TableStatus): Promise<void> {
    const payload = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('tables', 'UPDATE', tableId, payload);
      return;
    }

    try {
      const docRef = doc(db, 'tables', tableId);
      await updateDoc(docRef, payload);
    } catch {
      offlineSyncService.enqueue('tables', 'UPDATE', tableId, payload);
    }
  },

  /**
   * Delete a table
   */
  async deleteTable(tableId: string): Promise<void> {
    if (!navigator.onLine) {
      offlineSyncService.enqueue('tables', 'DELETE', tableId, {});
      return;
    }

    try {
      const docRef = doc(db, 'tables', tableId);
      await deleteDoc(docRef);
    } catch {
      offlineSyncService.enqueue('tables', 'DELETE', tableId, {});
    }
  },

  /**
   * Zones CRUD
   */
  async saveZone(zone: Zone): Promise<void> {
    const payload = {
      ...zone,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('zones', 'CREATE', zone.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'zones', zone.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('zones', 'CREATE', zone.id, payload);
    }
  },

  async deleteZone(zoneId: string): Promise<void> {
    if (!navigator.onLine) {
      offlineSyncService.enqueue('zones', 'DELETE', zoneId, {});
      return;
    }

    try {
      const docRef = doc(db, 'zones', zoneId);
      await deleteDoc(docRef);
    } catch {
      offlineSyncService.enqueue('zones', 'DELETE', zoneId, {});
    }
  },

  /**
   * Real-time listeners
   */
  subscribeToRestaurantTables(
    restaurantId: string,
    callback: (tables: RestaurantTable[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'tables');
      const q = query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as RestaurantTable);
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  subscribeToRestaurantZones(
    restaurantId: string,
    callback: (zones: Zone[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'zones');
      const q = query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Zone);
            callback(list);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
