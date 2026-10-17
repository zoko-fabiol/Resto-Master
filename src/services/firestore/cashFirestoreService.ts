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
  CashRegister,
  CashRegisterSession,
  CashMovement,
  Expense,
  Customer,
  ClientCreditAccount,
} from '../../types/restaurant';

export const cashFirestoreService = {
  // --- CAISSES ENREGISTREUSES ---
  async saveCashRegister(register: CashRegister): Promise<void> {
    try {
      const docRef = doc(db, 'cash_registers', register.id);
      await setDoc(docRef, { ...register, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveCashRegister Firestore:', err);
    }
  },

  async deleteCashRegister(registerId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'cash_registers', registerId));
    } catch (err) {
      console.warn('Erreur deleteCashRegister Firestore:', err);
    }
  },

  subscribeToCashRegisters(
    restaurantId: string | undefined,
    callback: (registers: CashRegister[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'cash_registers');
      const q = restaurantId
        ? query(colRef, where('restaurantId', '==', restaurantId))
        : query(colRef);

      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as CashRegister));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- SESSIONS DE CAISSE ---
  async saveCashSession(session: CashRegisterSession): Promise<void> {
    try {
      const docRef = doc(db, 'cash_sessions', session.id);
      await setDoc(docRef, session, { merge: true });
    } catch (err) {
      console.warn('Erreur saveCashSession Firestore:', err);
    }
  },

  subscribeToCashSession(
    sessionId: string,
    callback: (session: CashRegisterSession | null) => void
  ): () => void {
    try {
      const docRef = doc(db, 'cash_sessions', sessionId);
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            callback(snapshot.data() as CashRegisterSession);
          } else {
            callback(null);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- MOUVEMENTS DE CAISSE (ESPÈCES) ---
  async saveCashMovement(movement: CashMovement): Promise<void> {
    try {
      const docRef = doc(db, 'cash_movements', movement.id);
      await setDoc(docRef, movement, { merge: true });
    } catch (err) {
      console.warn('Erreur saveCashMovement Firestore:', err);
    }
  },

  subscribeToCashMovements(callback: (movements: CashMovement[]) => void): () => void {
    try {
      const colRef = collection(db, 'cash_movements');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(200));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as CashMovement));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- DÉPENSES & DÉCAISSEMENTS ---
  async saveExpense(expense: Expense): Promise<void> {
    try {
      const docRef = doc(db, 'expenses', expense.id);
      await setDoc(docRef, expense, { merge: true });
    } catch (err) {
      console.warn('Erreur saveExpense Firestore:', err);
    }
  },

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (err) {
      console.warn('Erreur deleteExpense Firestore:', err);
    }
  },

  subscribeToExpenses(callback: (expenses: Expense[]) => void): () => void {
    try {
      const colRef = collection(db, 'expenses');
      const q = query(colRef, orderBy('date', 'desc'), limit(200));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Expense));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- CLIENTS ---
  async saveCustomer(customer: Customer): Promise<void> {
    try {
      const docRef = doc(db, 'customers', customer.id);
      await setDoc(docRef, customer, { merge: true });
    } catch (err) {
      console.warn('Erreur saveCustomer Firestore:', err);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (err) {
      console.warn('Erreur deleteCustomer Firestore:', err);
    }
  },

  subscribeToCustomers(callback: (customers: Customer[]) => void): () => void {
    try {
      const colRef = collection(db, 'customers');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Customer));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- CRÉDITS CLIENTS ---
  async saveClientCredit(credit: ClientCreditAccount): Promise<void> {
    try {
      const docRef = doc(db, 'client_credits', credit.id);
      await setDoc(docRef, credit, { merge: true });
    } catch (err) {
      console.warn('Erreur saveClientCredit Firestore:', err);
    }
  },

  subscribeToClientCredits(callback: (credits: ClientCreditAccount[]) => void): () => void {
    try {
      const colRef = collection(db, 'client_credits');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as ClientCreditAccount));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
