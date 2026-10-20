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
    try {
      const payload = JSON.parse(
        JSON.stringify({
          ...table,
          restaurantId: table.restaurantId || '',
          updatedAt: new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'tables', table.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('Erreur saveTable Firestore:', err);
      try {
        const cleanPayload = JSON.parse(JSON.stringify(table));
        offlineSyncService.enqueue('tables', 'CREATE', table.id, cleanPayload);
      } catch {}
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
   * Lock or unlock table tablet
   */
  async updateTableTabletLock(
    tableId: string,
    locked: boolean,
    reason?: string,
    lockedBy?: string
  ): Promise<void> {
    const payload = {
      tabletLocked: locked,
      tabletLockedReason: locked ? (reason || 'Verrouillée à distance par la Direction') : null,
      tabletLockedAt: locked ? new Date().toISOString() : null,
      tabletLockedBy: locked ? (lockedBy || 'Admin') : null,
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
   * Set or dismiss call waiter status
   */
  async updateCallWaiterStatus(tableId: string, pending: boolean): Promise<void> {
    const payload = {
      tabletCallWaiterPending: pending,
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
    restaurantId: string | undefined,
    callback: (tables: RestaurantTable[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'tables');
      const q = restaurantId && restaurantId !== 'all'
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as RestaurantTable);
          callback(list);
        },
        (err) => {
          console.warn('[tablesFirestoreService] Écoute tables interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  subscribeToRestaurantZones(
    restaurantId: string | undefined,
    callback: (zones: Zone[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'zones');
      const q = restaurantId && restaurantId !== 'all'
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as Zone);
          callback(list);
        },
        (err) => {
          console.warn('[tablesFirestoreService] Écoute zones interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },
};
