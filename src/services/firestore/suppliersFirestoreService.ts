import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { Supplier, PurchaseOrder } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const suppliersFirestoreService = {
  /**
   * Sauvegarder ou mettre à jour un fournisseur
   */
  async saveSupplier(supplier: Supplier): Promise<void> {
    try {
      const clean = JSON.parse(
        JSON.stringify({
          ...supplier,
          updatedAt: new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'suppliers', supplier.id);
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.error('Erreur sauvegarde fournisseur Firestore:', err);
      try {
        const clean = JSON.parse(JSON.stringify(supplier));
        offlineSyncService.enqueue('suppliers', 'CREATE', supplier.id, clean, `supp_${supplier.id}`);
      } catch {}
    }
  },

  /**
   * Supprimer un fournisseur
   */
  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      const docRef = doc(db, 'suppliers', supplierId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erreur suppression fournisseur Firestore:', err);
      offlineSyncService.enqueue('suppliers', 'DELETE', supplierId, {}, `supp_del_${supplierId}`);
    }
  },

  /**
   * Écoute en temps réel de tous les fournisseurs
   */
  subscribeToSuppliers(
    onData: (suppliers: Supplier[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, 'suppliers');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Supplier[];
        onData(items);
      },
      (err) => {
        console.warn('Erreur souscription suppliers Firestore:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Sauvegarder un bon de commande fournisseur
   */
  async savePurchaseOrder(order: PurchaseOrder): Promise<void> {
    try {
      const clean = JSON.parse(
        JSON.stringify({
          ...order,
          updatedAt: new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'purchase_orders', order.id);
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.error('Erreur sauvegarde bon de commande Firestore:', err);
      try {
        const clean = JSON.parse(JSON.stringify(order));
        offlineSyncService.enqueue('purchase_orders', 'CREATE', order.id, clean, `po_${order.id}`);
      } catch {}
    }
  },

  /**
   * Écoute en temps réel des bons de commande
   */
  subscribeToPurchaseOrders(
    onData: (orders: PurchaseOrder[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, 'purchase_orders');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as PurchaseOrder[];
        onData(items);
      },
      (err) => {
        console.warn('Erreur souscription purchase_orders Firestore:', err);
        if (onError) onError(err);
      }
    );
  },
};
