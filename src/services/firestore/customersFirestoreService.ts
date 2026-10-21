import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { Customer } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const customersFirestoreService = {
  /**
   * Sauvegarder ou mettre à jour un client
   */
  async saveCustomer(customer: Customer): Promise<void> {
    try {
      const cleanCustomer = JSON.parse(
        JSON.stringify({
          ...customer,
          updatedAt: new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'customers', customer.id);
      await setDoc(docRef, cleanCustomer, { merge: true });
    } catch (err) {
      console.error('Erreur sauvegarde client Firestore:', err);
      try {
        const clean = JSON.parse(JSON.stringify(customer));
        offlineSyncService.enqueue('customers', 'CREATE', customer.id, clean, `customer_${customer.id}`);
      } catch (queueErr) {
        console.warn('[customersFirestoreService] Échec mise en file hors-ligne:', queueErr);
      }
    }
  },

  /**
   * Supprimer un client
   */
  async deleteCustomer(customerId: string): Promise<void> {
    try {
      const docRef = doc(db, 'customers', customerId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erreur suppression client Firestore:', err);
      offlineSyncService.enqueue('customers', 'DELETE', customerId, {}, `customer_del_${customerId}`);
    }
  },

  /**
   * Créditer des points de fidélité et incrémenter le volume d'achat
   */
  async addLoyaltyPoints(customerId: string, pointsToAdd: number, amountSpent: number): Promise<void> {
    try {
      const docRef = doc(db, 'customers', customerId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) return;
        const current = snap.data() as Customer;
        tx.update(docRef, {
          loyaltyPoints: (current.loyaltyPoints || 0) + pointsToAdd,
          totalSpent: (current.totalSpent || 0) + amountSpent,
          totalVisits: (current.totalVisits || 0) + 1,
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.warn('Erreur addLoyaltyPoints Firestore:', err);
    }
  },

  /**
   * Écoute en temps réel de tous les clients
   */
  subscribeToCustomers(
    onData: (customers: Customer[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, 'customers');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Customer[];
        onData(items);
      },
      (err) => {
        console.warn('Erreur souscription customers Firestore:', err);
        if (onError) onError(err);
      }
    );
  },
};
