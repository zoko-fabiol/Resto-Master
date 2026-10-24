import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { RestaurantTable, TableStatus, Zone, DecorElement, LayoutLock } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';
import { FloorPlanDiffResult } from '../../components/tables/floorPlanDiff';

export const tablesFirestoreService = {
  /**
   * Sauvegarde atomique sélective du plan de table (D-01, D-02, D-05)
   * N'écrit QUE les champs géométriques de layout pour les tables existantes.
   * Ne modifie JAMAIS le statut opérationnel (status, currentOrderId, timeOccupied...).
   * Supprime réellement les documents désignés dans Firestore.
   */
  async batchApplyFloorPlanDiff(diff: FloorPlanDiffResult, restaurantId?: string): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // 1. Nouvelles tables créées dans le brouillon
    for (const table of diff.tablesToCreate) {
      const docRef = doc(db, 'tables', table.id);
      const payload = {
        ...table,
        restaurantId: table.restaurantId || restaurantId || '',
        coordVersion: 2,
        layoutVersion: 2,
        status: table.status || 'libre',
        createdAt: table.createdAt || now,
        updatedAt: now,
      };
      batch.set(docRef, JSON.parse(JSON.stringify(payload)));
    }

    // 2. Mises à jour partielles géométriques (LAYOUT ONLY)
    for (const layout of diff.tablesToUpdate) {
      const docRef = doc(db, 'tables', layout.id);
      const payload = {
        ...layout,
        coordVersion: 2,
        layoutVersion: 2,
        updatedAt: now,
      };
      batch.update(docRef, JSON.parse(JSON.stringify(payload)));
    }

    // 3. Suppressions réelles de tables
    for (const tableId of diff.tablesToDelete) {
      const docRef = doc(db, 'tables', tableId);
      batch.delete(docRef);
    }

    // 4. Upsert décor
    for (const decor of diff.decorToUpsert) {
      const docRef = doc(db, 'decor_elements', decor.id);
      const payload = {
        ...decor,
        restaurantId: decor.restaurantId || restaurantId || '',
        coordVersion: 2,
        layoutVersion: 2,
        updatedAt: now,
      };
      batch.set(docRef, JSON.parse(JSON.stringify(payload)), { merge: true });
    }

    // 5. Suppressions réelles de décor
    for (const decorId of diff.decorToDelete) {
      const docRef = doc(db, 'decor_elements', decorId);
      batch.delete(docRef);
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('[tablesFirestoreService] Échec du batchApplyFloorPlanDiff:', err);
      throw err;
    }
  },

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
      } catch (offlineErr) {
        console.warn('[tablesFirestoreService] Erreur mise en file offline table:', offlineErr);
      }
      throw err;
    }
  },

  /**
   * Batch save or update multiple tables atomically
   */
  async batchSaveTables(tables: RestaurantTable[]): Promise<void> {
    if (!tables.length) return;
    const now = new Date().toISOString();

    try {
      const batch = writeBatch(db);
      for (const table of tables) {
        const payload = JSON.parse(
          JSON.stringify({
            ...table,
            restaurantId: table.restaurantId || '',
            updatedAt: now,
          })
        );
        const docRef = doc(db, 'tables', table.id);
        batch.set(docRef, payload, { merge: true });
      }
      await batch.commit();
    } catch (err) {
      console.error('Erreur batchSaveTables Firestore:', err);
      for (const table of tables) {
        try {
          const cleanPayload = JSON.parse(JSON.stringify(table));
          offlineSyncService.enqueue('tables', 'CREATE', table.id, cleanPayload);
        } catch (offlineErr) {
          console.warn('[tablesFirestoreService] Erreur mise en file offline batch table:', offlineErr);
        }
      }
      throw err;
    }
  },

  /**
   * Batch delete multiple tables atomically
   */
  async batchDeleteTables(tableIds: string[]): Promise<void> {
    if (!tableIds.length) return;
    try {
      const batch = writeBatch(db);
      for (const id of tableIds) {
        const docRef = doc(db, 'tables', id);
        batch.delete(docRef);
      }
      await batch.commit();
    } catch (err) {
      console.error('Erreur batchDeleteTables Firestore:', err);
      for (const id of tableIds) {
        offlineSyncService.enqueue('tables', 'DELETE', id, {});
      }
      throw err;
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
   * Atomically merge two tables in Firestore
   */
  async mergeTablesAtomic(targetTable: RestaurantTable, sourceTable: RestaurantTable): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    const mergedList = Array.from(new Set([...(targetTable.mergedTableIds || []), sourceTable.id]));

    // Update target table
    const targetRef = doc(db, 'tables', targetTable.id);
    batch.update(targetRef, {
      mergedTableIds: mergedList,
      status: 'occupee',
      updatedAt: now,
    });

    // Update source table
    const sourceRef = doc(db, 'tables', sourceTable.id);
    batch.update(sourceRef, {
      mergedWithTableId: targetTable.id,
      status: 'occupee',
      updatedAt: now,
    });

    await batch.commit();
  },

  /**
   * Atomically split merged tables in Firestore
   */
  async splitTablesAtomic(primaryTableId: string, secondaryTableIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Reset primary table
    const primaryRef = doc(db, 'tables', primaryTableId);
    batch.update(primaryRef, {
      mergedTableIds: [],
      mergedWithTableId: null,
      updatedAt: now,
    });

    // Reset all secondary tables
    for (const secId of secondaryTableIds) {
      const secRef = doc(db, 'tables', secId);
      batch.update(secRef, {
        mergedWithTableId: null,
        status: 'libre',
        updatedAt: now,
      });
    }

    await batch.commit();
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
   * Decor Elements CRUD
   */
  async saveDecorElement(decor: DecorElement): Promise<void> {
    const payload = JSON.parse(
      JSON.stringify({
        ...decor,
        restaurantId: decor.restaurantId || '',
        updatedAt: new Date().toISOString(),
      })
    );

    try {
      const docRef = doc(db, 'decor_elements', decor.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.error('Erreur saveDecorElement Firestore:', err);
      throw err;
    }
  },

  async deleteDecorElement(decorId: string): Promise<void> {
    try {
      const docRef = doc(db, 'decor_elements', decorId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erreur deleteDecorElement Firestore:', err);
      throw err;
    }
  },

  async batchSaveDecor(elements: DecorElement[], removedIds: string[] = []): Promise<void> {
    const now = new Date().toISOString();
    try {
      const batch = writeBatch(db);

      // Upsert modified decor elements
      for (const el of elements) {
        const payload = JSON.parse(
          JSON.stringify({
            ...el,
            restaurantId: el.restaurantId || '',
            updatedAt: now,
          })
        );
        const docRef = doc(db, 'decor_elements', el.id);
        batch.set(docRef, payload, { merge: true });
      }

      // Delete removed decor elements
      for (const id of removedIds) {
        const docRef = doc(db, 'decor_elements', id);
        batch.delete(docRef);
      }

      await batch.commit();
    } catch (err) {
      console.error('Erreur batchSaveDecor Firestore:', err);
      throw err;
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
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'tables');
      const q = restaurantId === 'all'
        ? query(colRef)
        : query(colRef, where('restaurantId', '==', restaurantId));

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
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'zones');
      const q = restaurantId === 'all'
        ? query(colRef)
        : query(colRef, where('restaurantId', '==', restaurantId));

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

  subscribeToRestaurantDecorElements(
    restaurantId: string | undefined,
    callback: (decor: DecorElement[]) => void
  ): () => void {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'decor_elements');
      const q = restaurantId === 'all'
        ? query(colRef)
        : query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as DecorElement);
          callback(list);
        },
        (err) => {
          console.warn('[tablesFirestoreService] Écoute decor_elements interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  /**
   * Tente d'acquérir le verrou d'édition pour une salle (D-06).
   * Durée du verrou : 2 minutes (120 000 ms).
   */
  async acquireLayoutLock(
    restaurantId: string,
    zoneId: string,
    user: { id: string; name: string; role?: string }
  ): Promise<{ success: boolean; lock?: LayoutLock; message?: string }> {
    const lockId = `${restaurantId}_${zoneId}`;
    const lockRef = doc(db, 'layout_locks', lockId);
    const now = Date.now();
    const lockDurationMs = 120_000;

    try {
      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(lockRef);
        if (snap.exists()) {
          const data = snap.data() as LayoutLock;
          const expiresAtMs = new Date(data.expiresAt).getTime();
          const isExpired = expiresAtMs <= now;
          const isSameUser = data.userId === user.id;

          if (!isExpired && !isSameUser) {
            return {
              success: false,
              lock: data,
              message: `Le plan de salle est en cours de modification par ${data.userName || 'un autre utilisateur'}.`,
            };
          }
        }

        const newLock: LayoutLock = {
          id: lockId,
          restaurantId,
          zoneId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          acquiredAt: new Date(now).toISOString(),
          expiresAt: new Date(now + lockDurationMs).toISOString(),
        };

        tx.set(lockRef, newLock);
        return { success: true, lock: newLock };
      });

      return result;
    } catch (err) {
      console.error('[tablesFirestoreService] Erreur acquireLayoutLock:', err);
      // En mode hors ligne ou en cas de problème de réseau temporaire, autoriser l'édition locale
      return { success: true };
    }
  },

  /**
   * Prolonge le verrou d'édition actif (heartbeat toutes les 45s).
   */
  async renewLayoutLock(restaurantId: string, zoneId: string, userId: string): Promise<boolean> {
    const lockId = `${restaurantId}_${zoneId}`;
    const lockRef = doc(db, 'layout_locks', lockId);
    const now = Date.now();
    const lockDurationMs = 120_000;

    try {
      const snap = await getDoc(lockRef);
      if (snap.exists()) {
        const data = snap.data() as LayoutLock;
        if (data.userId === userId) {
          await updateDoc(lockRef, {
            expiresAt: new Date(now + lockDurationMs).toISOString(),
          });
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Libère le verrou d'édition à la fermeture ou sauvegarde du mode édition.
   */
  async releaseLayoutLock(restaurantId: string, zoneId: string, userId: string): Promise<void> {
    const lockId = `${restaurantId}_${zoneId}`;
    const lockRef = doc(db, 'layout_locks', lockId);

    try {
      const snap = await getDoc(lockRef);
      if (snap.exists()) {
        const data = snap.data() as LayoutLock;
        if (data.userId === userId) {
          await deleteDoc(lockRef);
        }
      }
    } catch (err) {
      console.warn('[tablesFirestoreService] Erreur releaseLayoutLock:', err);
    }
  },
};
