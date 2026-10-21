import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { AuditLog, CancellationLog } from '../../types/restaurant';
import { offlineSyncService } from './offlineSyncService';

export const auditFirestoreService = {
  /**
   * Enregistrer une trace d'audit immuable
   */
  async recordAuditLog(log: AuditLog): Promise<void> {
    try {
      const clean = JSON.parse(
        JSON.stringify({
          ...log,
          timestamp: log.timestamp || new Date().toISOString(),
        })
      );
      const docRef = doc(db, 'audit_logs', log.id);
      await setDoc(docRef, clean, { merge: false });
    } catch (err) {
      console.error('Erreur enregistrement log audit Firestore:', err);
      try {
        const clean = JSON.parse(JSON.stringify(log));
        offlineSyncService.enqueue('audit_logs', 'CREATE', log.id, clean, `audit_${log.id}`);
      } catch (offlineErr) {
        console.warn('[auditFirestoreService] Erreur mise en file offline trace d audit:', offlineErr);
      }
    }
  },

  /**
   * Enregistrer une annulation critique
   */
  async recordCancellationLog(cancellation: CancellationLog): Promise<void> {
    try {
      const clean = JSON.parse(
        JSON.stringify({
          ...cancellation,
          date: cancellation.date || new Date().toISOString().slice(0, 10),
          time: cancellation.time || new Date().toLocaleTimeString(),
        })
      );
      const docRef = doc(db, 'cancellation_logs', cancellation.id);
      await setDoc(docRef, clean, { merge: false });
    } catch (err) {
      console.warn('Erreur enregistrement cancellation_log Firestore:', err);
    }
  },

  /**
   * Écoute en temps réel des logs d'audit (derniers 200)
   */
  subscribeToAuditLogs(
    onData: (logs: AuditLog[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, 'audit_logs');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(200));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as AuditLog[];
        onData(items);
      },
      (err) => {
        console.warn('Erreur souscription audit_logs Firestore:', err);
        if (onError) onError(err);
      }
    );
  },
};
