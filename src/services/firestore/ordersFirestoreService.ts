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
   * Save or update an order with offline sync fallback
   */
  async saveOrder(order: Order): Promise<void> {
    const orderDoc = {
      ...order,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('orders', 'CREATE', order.id, orderDoc, `order_create_${order.id}`);
      return;
    }

    try {
      const docRef = doc(db, 'orders', order.id);
      await setDoc(docRef, orderDoc, { merge: true });
    } catch {
      offlineSyncService.enqueue('orders', 'CREATE', order.id, orderDoc, `order_create_${order.id}`);
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

    if (!navigator.onLine) {
      offlineSyncService.enqueue('orders', 'UPDATE', orderId, payload, `order_status_${orderId}_${status}`);
      return;
    }

    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, payload);
    } catch {
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

    const payload = {
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, payload);
      return;
    }

    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, payload);
    } catch {
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, payload);
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

    const payload = {
      payments: newPayments,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (!navigator.onLine) {
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, payload, `order_pay_${payment.id}`);
      return;
    }

    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, payload);
    } catch {
      offlineSyncService.enqueue('orders', 'UPDATE', order.id, payload, `order_pay_${payment.id}`);
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

    if (!navigator.onLine) {
      offlineSyncService.enqueue('orders', 'UPDATE', orderId, payload, `order_cancel_${orderId}`);
      return;
    }

    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, payload);
    } catch {
      offlineSyncService.enqueue('orders', 'UPDATE', orderId, payload, `order_cancel_${orderId}`);
    }
  },

  /**
   * Real-time subscription to orders filtered by restaurant
   */
  subscribeToRestaurantOrders(
    restaurantId: string,
    callback: (orders: Order[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'orders');
      const q = query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((d) => d.data() as Order);
            list.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            callback(list);
          }
        },
        () => {
          // offline listener fallback
        }
      );
    } catch {
      return () => {};
    }
  },
};
