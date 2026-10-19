import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { Expense } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const expensesFirestoreService = {
  /**
   * Sauvegarder ou mettre à jour une dépense
   */
  async saveExpense(expense: Expense): Promise<void> {
    try {
      const clean = JSON.parse(
        JSON.stringify({
          ...expense,
          updatedAt: new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'expenses', expense.id);
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.error('Erreur sauvegarde dépense Firestore:', err);
      try {
        const clean = JSON.parse(JSON.stringify(expense));
        offlineSyncService.enqueue('expenses', 'CREATE', expense.id, clean, `exp_${expense.id}`);
      } catch {}
    }
  },

  /**
   * Supprimer une dépense
   */
  async deleteExpense(expenseId: string): Promise<void> {
    try {
      const docRef = doc(db, 'expenses', expenseId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erreur suppression dépense Firestore:', err);
      offlineSyncService.enqueue('expenses', 'DELETE', expenseId, {}, `exp_del_${expenseId}`);
    }
  },

  /**
   * Écoute en temps réel des dépenses
   */
  subscribeToExpenses(
    onData: (expenses: Expense[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, 'expenses');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Expense[];
        onData(items);
      },
      (err) => {
        console.warn('Erreur souscription expenses Firestore:', err);
        if (onError) onError(err);
      }
    );
  },
};
