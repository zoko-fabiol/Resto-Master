import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { Order, OrderStatus, Payment } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const ordersFirestoreService = {
  /**
   * Save or update an order with robust serialization (no undefined fields)
   */
  async saveOrder(order: Order): Promise<void> {
    try {
      // Nettoyage strict des clés 'undefined' que Firestore rejette systématiquement
      const cleanOrder = JSON.parse(
        JSON.stringify({
          ...order,
          restaurantId: order.restaurantId || '',
          updatedAt: new Date().toISOString(),
        })
      );

      const docRef = doc(db, 'orders', order.id);
      await setDoc(docRef, cleanOrder, { merge: true });
      console.log('[OrdersFirestoreService] Commande synchronisée dans Firestore avec succès:', cleanOrder.orderNumber, cleanOrder.id);
    } catch (err: any) {
      console.error('[OrdersFirestoreService] Erreur lors de l\'enregistrement de la commande dans Firestore:', err);
      try {
        const cleanOrder = JSON.parse(JSON.stringify(order));
        offlineSyncService.enqueue('orders', 'CREATE', order.id, cleanOrder, `order_create_${order.id}`);
      } catch {}
    }
  },

  /**
   * Update status of an order
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const payload = {
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, payload);
    } catch (err) {
      console.warn('Erreur updateOrderStatus Firestore:', err);
      offlineSyncService.enqueue('orders', 'UPDATE', orderId, payload, `order_status_${orderId}_${status}`);
    }
  },

  /**
   * Update individual order item status (kitchen/bar progress)
   */
  async updateOrderItemStatus(
    order: Order,
    itemId: string,
    itemStatus: 'en_attente' | 'en_preparation' | 'pret' | 'servi'
  ): Promise<void> {
    const updatedItems = order.items.map((item) =>
      item.id === itemId ? { ...item, status: itemStatus } : item
    );

    const cleanPayload = JSON.parse(
      JSON.stringify({
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      })
    );

    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, cleanPayload);
    } catch (err) {
      console.warn('Erreur updateOrderItemStatus Firestore:', err);
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, cleanPayload);
    }
  },

  /**
   * Atomic payment recording in Firestore
   */
  async recordOrderPayment(order: Order, payment: Payment): Promise<void> {
    const existingPayments = order.payments || [];
    const newPayments = [...existingPayments, payment];
    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus: OrderStatus = totalPaid >= order.total ? 'payee' : order.status;

    const cleanPayload = JSON.parse(
      JSON.stringify({
        payments: newPayments,
        status: newStatus,
        paymentStatus: totalPaid >= order.total ? 'paye' : totalPaid > 0 ? 'partiel' : 'non_paye',
        paidAmount: totalPaid,
        updatedAt: new Date().toISOString(),
      })
    );

    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, cleanPayload);
    } catch (err) {
      console.warn('Erreur recordOrderPayment Firestore:', err);
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, cleanPayload, `order_pay_${payment.id}`);
    }
  },

  /**
   * Cancel order with audit reason
   */
  async cancelOrder(orderId: string, reason: string, approvedBy?: string): Promise<void> {
    const payload = {
      status: 'annulee' as OrderStatus,
      cancellationReason: reason,
      cancellationApprovedBy: approvedBy || 'Direction',
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, payload);
    } catch (err) {
      console.warn('Erreur cancelOrder Firestore:', err);
      offlineSyncService.enqueue('orders', 'UPDATE', orderId, payload, `order_cancel_${orderId}`);
    }
  },

  /**
   * Real-time subscription to orders filtered by restaurant
   */
  subscribeToRestaurantOrders(
    restaurantId: string | undefined,
    callback: (orders: Order[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'orders');
      const q = restaurantId && restaurantId !== 'all'
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => d.data() as Order);
          list.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          callback(list);
        },
        (err) => {
          console.warn('Écoute temps réel des commandes (mode offline ou attente réseau):', err);
        }
      );
    } catch (err) {
      console.error('Erreur lors de la création de la souscription aux commandes:', err);
      return () => {};
    }
  },
};
