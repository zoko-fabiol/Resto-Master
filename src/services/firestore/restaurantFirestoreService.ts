import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
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
      offlineSyncService.enqueue('organizations', 'CREATE', org.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'organizations', org.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('organizations', 'CREATE', org.id, payload);
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
    } catch {
      offlineSyncService.enqueue('restaurants', 'CREATE', outlet.id, payload);
    }
  },

  /**
   * Save restaurant settings
   */
  async saveSettings(settings: RestaurantSettings): Promise<void> {
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('settings', 'CREATE', settings.restaurantId || settings.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'settings', settings.restaurantId || settings.id);
      await setDoc(docRef, payload, { merge: true });
    } catch {
      offlineSyncService.enqueue('settings', 'CREATE', settings.restaurantId || settings.id, payload);
    }
  },

  /**
   * Listen to restaurants for an organization
   */
  subscribeToOutlets(
    organizationId: string,
    callback: (outlets: Outlet[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'restaurants');
      const q = query(colRef, where('organizationId', '==', organizationId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Outlet);
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
