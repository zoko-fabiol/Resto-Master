import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { Organization, RestaurantSettings } from '../../types/restaurant';
import { Outlet } from '../../types/configuration';
import { offlineSyncService } from './offlineSyncService';

export const restaurantFirestoreService = {
  /**
   * Save organization in Firestore
   */
  async saveOrganization(org: Organization): Promise<void> {
    const payload = {
      ...org,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('organizations', 'CREATE', org.id || 'default', payload);
      return;
    }

    try {
      const docRef = doc(db, 'organizations', org.id || 'default');
      await setDoc(docRef, payload, { merge: true });
    } catch (err: any) {
      console.error('[restaurantFirestoreService] Erreur saveOrganization:', err);
      offlineSyncService.enqueue('organizations', 'CREATE', org.id || 'default', payload);
      throw err;
    }
  },

  /**
   * Subscribe to organization changes
   */
  subscribeToOrganization(
    orgId: string,
    callback: (org: Organization | null) => void
  ): () => void {
    try {
      const targetId = orgId || 'default';
      const docRef = doc(db, 'organizations', targetId);
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as Organization);
          } else {
            callback(null);
          }
        },
        (err) => {
          console.warn('[restaurantFirestoreService] Écoute organization interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[restaurantFirestoreService] Erreur subscribeToOrganization:', err);
      return () => {};
    }
  },

  /**
   * Save or update an outlet/restaurant
   */
  async saveOutlet(outlet: Outlet): Promise<void> {
    const payload = {
      ...outlet,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('restaurants', 'CREATE', outlet.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'restaurants', outlet.id);
      await setDoc(docRef, payload, { merge: true });
    } catch (err: any) {
      console.error('[restaurantFirestoreService] Erreur saveOutlet:', err);
      offlineSyncService.enqueue('restaurants', 'CREATE', outlet.id, payload);
      throw err;
    }
  },

  /**
   * Delete an outlet/restaurant
   */
  async deleteOutlet(outletId: string): Promise<void> {
    if (!navigator.onLine) {
      offlineSyncService.enqueue('restaurants', 'DELETE', outletId, {});
      return;
    }

    try {
      const docRef = doc(db, 'restaurants', outletId);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.error('[restaurantFirestoreService] Erreur deleteOutlet:', err);
      offlineSyncService.enqueue('restaurants', 'DELETE', outletId, {});
      throw err;
    }
  },

  /**
   * Listen to restaurants / outlets in real time (immediate empty support)
   */
  subscribeToOutlets(
    organizationId: string | undefined,
    callback: (outlets: Outlet[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'restaurants');
      const q = organizationId && organizationId !== 'all'
        ? query(colRef, where('organizationId', '==', organizationId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as Outlet);
          callback(list);
        },
        (err) => {
          console.warn('[restaurantFirestoreService] Écoute restaurants interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[restaurantFirestoreService] Erreur subscribeToOutlets:', err);
      return () => {};
    }
  },

  /**
   * Save restaurant settings
   */
  async saveSettings(settings: RestaurantSettings): Promise<void> {
    const docId = settings.restaurantId || settings.id || 'default-settings';
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('settings', 'CREATE', docId, payload);
      return;
    }

    try {
      const docRef = doc(db, 'settings', docId);
      await setDoc(docRef, payload, { merge: true });
    } catch (err: any) {
      console.error('[restaurantFirestoreService] Erreur saveSettings:', err);
      offlineSyncService.enqueue('settings', 'CREATE', docId, payload);
      throw err;
    }
  },

  /**
   * Subscribe to restaurant settings in real time
   */
  subscribeToSettings(
    restaurantId: string | undefined,
    callback: (settings: RestaurantSettings | null) => void
  ): () => void {
    try {
      const docId = restaurantId && restaurantId !== 'all' ? restaurantId : 'default-settings';
      const docRef = doc(db, 'settings', docId);
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as RestaurantSettings);
          } else {
            callback(null);
          }
        },
        (err) => {
          console.warn('[restaurantFirestoreService] Écoute settings interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[restaurantFirestoreService] Erreur subscribeToSettings:', err);
      return () => {};
    }
  },
};
