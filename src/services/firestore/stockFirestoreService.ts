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
  runTransaction,
  increment,
  getDocs,
} from 'firebase/firestore';
import {
  StockItem,
  StockMovement,
  StockLot,
  Supplier,
  PurchaseOrder,
  HygieneCheck,
} from '../../types/restaurant';
import { generateSecureId } from '../../lib/utils';

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

  /**
   * Déduction atomique d'un article de stock par transaction avec increment()
   * Enregistre le stock négatif réel (sans Math.max) et alerte si nécessaire.
   */
  async deductStockItemAtomically(
    itemId: string,
    deltaQuantity: number, // Valeur négative (ex: -2.5)
    movementMeta: {
      type: StockMovement['type'];
      reason: string;
      unit: string;
      referenceId?: string;
      userId: string;
      userName: string;
    }
  ): Promise<{ previousQuantity: number; newQuantity: number; isNegative: boolean; movement: StockMovement }> {
    const itemRef = doc(db, 'stock_items', itemId);
    const movementId = generateSecureId('mv');
    const movementRef = doc(db, 'stock_movements', movementId);
    const now = new Date().toISOString();

    const result = await runTransaction(db, async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists()) {
        throw new Error(`Article de stock ${itemId} introuvable pour la transaction.`);
      }

      const itemData = itemSnap.data() as StockItem;
      const previousQuantity = itemData.currentQuantity || 0;
      const newQuantity = Math.round((previousQuantity + deltaQuantity) * 100) / 100;

      // Mise à jour atomique avec increment()
      transaction.update(itemRef, {
        currentQuantity: increment(deltaQuantity),
        lastUpdated: now,
      });

      const movement: StockMovement = {
        id: movementId,
        stockItemId: itemId,
        stockItemName: itemData.name,
        type: movementMeta.type,
        quantityChange: deltaQuantity,
        previousQuantity,
        newQuantity,
        unit: movementMeta.unit || itemData.unit,
        reason: movementMeta.reason,
        referenceId: movementMeta.referenceId,
        userName: movementMeta.userName,
        timestamp: now,
      };

      transaction.set(movementRef, movement);

      return {
        previousQuantity,
        newQuantity,
        isNegative: newQuantity < 0,
        movement,
      };
    });

    return result;
  },

  /**
   * Déstockage des lots en FEFO (First Expired, First Out)
   */
  async deductLots(
    stockItemId: string,
    quantityToDeduct: number,
    strategy: 'fefo' | 'fifo' = 'fefo'
  ): Promise<Array<{ lotId: string; lotNumber: string; deducted: number; remainingLotQty: number }>> {
    if (quantityToDeduct <= 0) return [];
    try {
      const lotsCol = collection(db, 'stock_lots');
      const sortField = strategy === 'fifo' ? 'receptionDate' : 'expiryDate';
      const q = query(
        lotsCol,
        where('stockItemId', '==', stockItemId),
        where('remainingQuantity', '>', 0),
        orderBy(sortField, 'asc')
      );

      const snapshot = await getDocs(q);
      let remainingToDeduct = quantityToDeduct;
      const deductions: Array<{ lotId: string; lotNumber: string; deducted: number; remainingLotQty: number }> = [];

      for (const lotDoc of snapshot.docs) {
        if (remainingToDeduct <= 0) break;
        const lot = lotDoc.data() as StockLot;
        const deductFromThisLot = Math.min(lot.remainingQuantity, remainingToDeduct);
        const newLotQty = Math.round((lot.remainingQuantity - deductFromThisLot) * 100) / 100;

        await setDoc(
          lotDoc.ref,
          {
            remainingQuantity: newLotQty,
            status: newLotQty === 0 ? 'epuise' : lot.status,
          },
          { merge: true }
        );

        deductions.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          deducted: deductFromThisLot,
          remainingLotQty: newLotQty,
        });

        remainingToDeduct -= deductFromThisLot;
      }

      return deductions;
    } catch (err) {
      console.warn(`Erreur deductLots (${strategy}) Firestore:`, err);
      return [];
    }
  },

  async deductLotsFEFO(
    stockItemId: string,
    quantityToDeduct: number
  ): Promise<Array<{ lotId: string; lotNumber: string; deducted: number; remainingLotQty: number }>> {
    return this.deductLots(stockItemId, quantityToDeduct, 'fefo');
  },

  /**
   * Remise en stock atomique lors de l'annulation d'une commande
   */
  async restockItemsAtomically(
    itemsToRestock: Array<{
      stockItemId: string;
      stockItemName: string;
      quantityToRestore: number;
      unit: string;
    }>,
    orderNumber: string,
    userName: string
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const item of itemsToRestock) {
      if (item.quantityToRestore <= 0) continue;
      try {
        const itemRef = doc(db, 'stock_items', item.stockItemId);
        const movementId = generateSecureId('mv-rst');
        const movementRef = doc(db, 'stock_movements', movementId);

        await runTransaction(db, async (transaction) => {
          const itemSnap = await transaction.get(itemRef);
          if (!itemSnap.exists()) return;

          const itemData = itemSnap.data() as StockItem;
          const previousQuantity = itemData.currentQuantity || 0;
          const newQuantity = Math.round((previousQuantity + item.quantityToRestore) * 100) / 100;

          transaction.update(itemRef, {
            currentQuantity: increment(item.quantityToRestore),
            lastUpdated: now,
          });

          const movement: StockMovement = {
            id: movementId,
            stockItemId: item.stockItemId,
            stockItemName: item.stockItemName,
            type: 'inventaire_correction',
            quantityChange: item.quantityToRestore,
            previousQuantity,
            newQuantity,
            unit: item.unit,
            reason: `Restock automatique suite annulation commande ${orderNumber}`,
            referenceId: orderNumber,
            userName,
            timestamp: now,
          };

          transaction.set(movementRef, movement);
        });
      } catch (err) {
        console.warn('Erreur restockItemsAtomically:', err);
      }
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
