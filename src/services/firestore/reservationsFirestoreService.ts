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
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'reservations');
      const q = restaurantId === 'all'
        ? query(colRef)
        : query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as Reservation));
        },
        (err) => {
          console.warn('[reservationsFirestoreService] Écoute réservations interrompue:', err);
        }
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

  subscribeToDeliveries(
    callback: (deliveries: DeliveryOrder[]) => void,
    restaurantId?: string
  ): () => void {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'deliveries');
      const q = restaurantId === 'all'
        ? query(colRef)
        : query(colRef, where('restaurantId', '==', restaurantId));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as DeliveryOrder));
        },
        (err) => {
          console.warn('[reservationsFirestoreService] Écoute livraisons interrompue:', err);
        }
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

  subscribeToEvents(
    callback: (events: RestaurantEvent[]) => void,
    restaurantId?: string
  ): () => void {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'events');
      const q = restaurantId === 'all'
        ? query(colRef, orderBy('date', 'desc'))
        : query(colRef, where('restaurantId', '==', restaurantId), orderBy('date', 'desc'));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as RestaurantEvent));
        },
        (err) => {
          console.warn('[reservationsFirestoreService] Écoute événements interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },
};
