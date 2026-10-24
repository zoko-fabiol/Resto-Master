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
  Invoice,
  FiscalJournalItem,
  WithholdingRecord,
  FiscalObligation,
  CancellationLog,
} from '../../types/restaurant';

export const fiscalFirestoreService = {
  // --- FACTURES NORMALISÉES ---
  async saveInvoice(invoice: Invoice): Promise<void> {
    try {
      const docRef = doc(db, 'invoices', invoice.id);
      await setDoc(docRef, invoice, { merge: true });
    } catch (err) {
      console.warn('Erreur saveInvoice Firestore:', err);
    }
  },

  subscribeToInvoices(
    restaurantId: string | undefined,
    callback: (invoices: Invoice[]) => void
  ): () => void {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'invoices');
      const q = restaurantId === 'all'
        ? query(colRef, orderBy('date', 'desc'), limit(200))
        : query(colRef, where('restaurantId', '==', restaurantId), orderBy('date', 'desc'), limit(200));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as Invoice));
        },
        (err) => {
          console.warn('[fiscalFirestoreService] Écoute factures interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // --- JOURNAL FISCAL INALTÉRABLE (AUDIT DGI) ---
  async appendFiscalJournal(item: FiscalJournalItem): Promise<void> {
    try {
      const docRef = doc(db, 'fiscal_journal', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (err) {
      console.warn('Erreur appendFiscalJournal Firestore:', err);
    }
  },

  subscribeToFiscalJournal(
    restaurantId: string | undefined,
    callback: (journal: FiscalJournalItem[]) => void
  ): () => void {
    try {
      if (!restaurantId || restaurantId.trim() === '') {
        callback([]);
        return () => {};
      }

      const colRef = collection(db, 'fiscal_journal');
      const q = restaurantId === 'all'
        ? query(colRef, orderBy('date', 'desc'), limit(200))
        : query(colRef, where('restaurantId', '==', restaurantId), orderBy('date', 'desc'), limit(200));

      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as FiscalJournalItem));
        },
        (err) => {
          console.warn('[fiscalFirestoreService] Écoute journal fiscal interrompue:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // --- RETENUES À LA SOURCE (TFT, TSR, AIR) ---
  async saveWithholding(record: WithholdingRecord): Promise<void> {
    try {
      const docRef = doc(db, 'fiscal_withholdings', record.id);
      await setDoc(docRef, record, { merge: true });
    } catch (err) {
      console.warn('Erreur saveWithholding Firestore:', err);
    }
  },

  subscribeToWithholdings(callback: (records: WithholdingRecord[]) => void): () => void {
    try {
      const colRef = collection(db, 'fiscal_withholdings');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as WithholdingRecord));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- OBLIGATIONS FISCALES ÉCHÉANCIER ---
  async saveFiscalObligation(obligation: FiscalObligation): Promise<void> {
    try {
      const docRef = doc(db, 'fiscal_obligations', obligation.id);
      await setDoc(docRef, obligation, { merge: true });
    } catch (err) {
      console.warn('Erreur saveFiscalObligation Firestore:', err);
    }
  },

  subscribeToFiscalObligations(callback: (obligations: FiscalObligation[]) => void): () => void {
    try {
      const colRef = collection(db, 'fiscal_obligations');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as FiscalObligation));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- JOURNAL DES ANNULATIONS ---
  async saveCancellationLog(log: CancellationLog): Promise<void> {
    try {
      const docRef = doc(db, 'cancellation_logs', log.id);
      await setDoc(docRef, log, { merge: true });
    } catch (err) {
      console.warn('Erreur saveCancellationLog Firestore:', err);
    }
  },

  subscribeToCancellationLogs(callback: (logs: CancellationLog[]) => void): () => void {
    try {
      const colRef = collection(db, 'cancellation_logs');
      const q = query(colRef, orderBy('date', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as CancellationLog));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
