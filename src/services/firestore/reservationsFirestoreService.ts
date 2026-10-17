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
} from 'firebase/firestore';
import {
  Reservation,
  DeliveryOrder,
  RestaurantEvent,
} from '../../types/restaurant';

export const reservationsFirestoreService = {
  // --- RÉSERVATIONS DE TABLES ---
  async saveReservation(reservation: Reservation): Promise<void> {
    try {
      const docRef = doc(db, 'reservations', reservation.id);
      await setDoc(docRef, reservation, { merge: true });
    } catch (err) {
      console.warn('Erreur saveReservation Firestore:', err);
    }
  },

  async deleteReservation(reservationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reservations', reservationId));
    } catch (err) {
      console.warn('Erreur deleteReservation Firestore:', err);
    }
  },

  subscribeToReservations(
    restaurantId: string | undefined,
    callback: (reservations: Reservation[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'reservations');
      const q = restaurantId
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Reservation));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- LIVRAISONS À DOMICILE / ENTREPRISE ---
  async saveDelivery(delivery: DeliveryOrder): Promise<void> {
    try {
      const docRef = doc(db, 'deliveries', delivery.id);
      await setDoc(docRef, delivery, { merge: true });
    } catch (err) {
      console.warn('Erreur saveDelivery Firestore:', err);
    }
  },

  async deleteDelivery(deliveryId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'deliveries', deliveryId));
    } catch (err) {
      console.warn('Erreur deleteDelivery Firestore:', err);
    }
  },

  subscribeToDeliveries(callback: (deliveries: DeliveryOrder[]) => void): () => void {
    try {
      const colRef = collection(db, 'deliveries');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as DeliveryOrder));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- ÉVÉNEMENTS & BANQUETS ---
  async saveEvent(event: RestaurantEvent): Promise<void> {
    try {
      const docRef = doc(db, 'events', event.id);
      await setDoc(docRef, event, { merge: true });
    } catch (err) {
      console.warn('Erreur saveEvent Firestore:', err);
    }
  },

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (err) {
      console.warn('Erreur deleteEvent Firestore:', err);
    }
  },

  subscribeToEvents(callback: (events: RestaurantEvent[]) => void): () => void {
    try {
      const colRef = collection(db, 'events');
      const q = query(colRef, orderBy('date', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as RestaurantEvent));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
