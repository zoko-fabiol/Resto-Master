import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  StockItem,
  StockMovement,
  StockLot,
  Supplier,
  PurchaseOrder,
  HygieneCheck,
} from '../../types/restaurant';

export const stockFirestoreService = {
  // --- ARTICLES DE STOCK ---
  async saveStockItem(item: StockItem): Promise<void> {
    try {
      const docRef = doc(db, 'stock_items', item.id);
      await setDoc(docRef, { ...item, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveStockItem Firestore:', err);
    }
  },

  async deleteStockItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'stock_items', itemId));
    } catch (err) {
      console.warn('Erreur deleteStockItem Firestore:', err);
    }
  },

  subscribeToStockItems(
    restaurantId: string | undefined,
    callback: (items: StockItem[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'stock_items');
      const q = restaurantId
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as StockItem));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- MOUVEMENTS DE STOCK ---
  async saveStockMovement(movement: StockMovement): Promise<void> {
    try {
      const docRef = doc(db, 'stock_movements', movement.id);
      await setDoc(docRef, movement, { merge: true });
    } catch (err) {
      console.warn('Erreur saveStockMovement Firestore:', err);
    }
  },

  subscribeToStockMovements(callback: (movements: StockMovement[]) => void): () => void {
    try {
      const colRef = collection(db, 'stock_movements');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as StockMovement));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- LOTS DE STOCK & TRAÇABILITÉ ---
  async saveStockLot(lot: StockLot): Promise<void> {
    try {
      const docRef = doc(db, 'stock_lots', lot.id);
      await setDoc(docRef, lot, { merge: true });
    } catch (err) {
      console.warn('Erreur saveStockLot Firestore:', err);
    }
  },

  async deleteStockLot(lotId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'stock_lots', lotId));
    } catch (err) {
      console.warn('Erreur deleteStockLot Firestore:', err);
    }
  },

  subscribeToStockLots(callback: (lots: StockLot[]) => void): () => void {
    try {
      const colRef = collection(db, 'stock_lots');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as StockLot));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- FOURNISSEURS ---
  async saveSupplier(supplier: Supplier): Promise<void> {
    try {
      const docRef = doc(db, 'suppliers', supplier.id);
      await setDoc(docRef, supplier, { merge: true });
    } catch (err) {
      console.warn('Erreur saveSupplier Firestore:', err);
    }
  },

  async deleteSupplier(supplierId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
    } catch (err) {
      console.warn('Erreur deleteSupplier Firestore:', err);
    }
  },

  subscribeToSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
    try {
      const colRef = collection(db, 'suppliers');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Supplier));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- BONS DE COMMANDE ACHATS ---
  async savePurchaseOrder(po: PurchaseOrder): Promise<void> {
    try {
      const docRef = doc(db, 'purchase_orders', po.id);
      await setDoc(docRef, po, { merge: true });
    } catch (err) {
      console.warn('Erreur savePurchaseOrder Firestore:', err);
    }
  },

  async deletePurchaseOrder(poId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'purchase_orders', poId));
    } catch (err) {
      console.warn('Erreur deletePurchaseOrder Firestore:', err);
    }
  },

  subscribeToPurchaseOrders(callback: (pos: PurchaseOrder[]) => void): () => void {
    try {
      const colRef = collection(db, 'purchase_orders');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as PurchaseOrder));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- CONTRÔLES D'HYGIÈNE ---
  async saveHygieneCheck(check: HygieneCheck): Promise<void> {
    try {
      const docRef = doc(db, 'hygiene_checks', check.id);
      await setDoc(docRef, check, { merge: true });
    } catch (err) {
      console.warn('Erreur saveHygieneCheck Firestore:', err);
    }
  },

  subscribeToHygieneChecks(callback: (checks: HygieneCheck[]) => void): () => void {
    try {
      const colRef = collection(db, 'hygiene_checks');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as HygieneCheck));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
