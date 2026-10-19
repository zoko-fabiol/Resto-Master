import { db } from '../../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  FeatureItem,
  Terminal,
  Peripheral,
  RolePermissionMatrix,
  RoleLimits,
  PrinterSettings,
  OperationRules,
  ConfigurationHistoryItem,
} from '../../types/configuration';
import { UserRole, AuditLog, NotificationItem } from '../../types/restaurant';

export const configFirestoreService = {
  // --- MODULES & FEATURE FLAGS ---
  async saveFeatures(features: FeatureItem[]): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', 'features');
      await setDoc(docRef, { items: features, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveFeatures Firestore:', err);
    }
  },

  subscribeToFeatures(callback: (features: FeatureItem[]) => void): () => void {
    try {
      const docRef = doc(db, 'system_config', 'features');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists() && Array.isArray(snapshot.data().items)) {
            callback(snapshot.data().items);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- TERMINAUX ---
  async saveTerminal(terminal: Terminal): Promise<void> {
    try {
      const docRef = doc(db, 'terminals', terminal.id);
      await setDoc(docRef, terminal, { merge: true });
    } catch (err) {
      console.warn('Erreur saveTerminal Firestore:', err);
    }
  },

  async deleteTerminal(terminalId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'terminals', terminalId));
    } catch (err) {
      console.warn('Erreur deleteTerminal Firestore:', err);
    }
  },

  subscribeToTerminals(callback: (terminals: Terminal[]) => void): () => void {
    try {
      const colRef = collection(db, 'terminals');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Terminal));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- PÉRIPHÉRIQUES (IMPRIMANTES, TIROIRS-CAISSES) ---
  async savePeripheral(peripheral: Peripheral): Promise<void> {
    try {
      const docRef = doc(db, 'peripherals', peripheral.id);
      await setDoc(docRef, peripheral, { merge: true });
    } catch (err) {
      console.warn('Erreur savePeripheral Firestore:', err);
    }
  },

  subscribeToPeripherals(callback: (peripherals: Peripheral[]) => void): () => void {
    try {
      const colRef = collection(db, 'peripherals');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Peripheral));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- MATRICE DES PERMISSIONS ---
  async saveRolePermissions(matrix: RolePermissionMatrix): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', 'role_permissions');
      await setDoc(docRef, { matrix, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveRolePermissions Firestore:', err);
    }
  },

  subscribeToRolePermissions(callback: (matrix: RolePermissionMatrix) => void): () => void {
    try {
      const docRef = doc(db, 'system_config', 'role_permissions');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists() && snapshot.data().matrix) {
            callback(snapshot.data().matrix);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- LIMITES DES RÔLES ---
  async saveRoleLimits(limits: Record<UserRole, RoleLimits>): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', 'role_limits');
      await setDoc(docRef, { limits, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveRoleLimits Firestore:', err);
    }
  },

  subscribeToRoleLimits(callback: (limits: Record<UserRole, RoleLimits>) => void): () => void {
    try {
      const docRef = doc(db, 'system_config', 'role_limits');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists() && snapshot.data().limits) {
            callback(snapshot.data().limits);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- PARAMÈTRES D'IMPRESSION ---
  async savePrinterSettings(settings: PrinterSettings): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', 'printer_settings');
      await setDoc(docRef, { settings, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur savePrinterSettings Firestore:', err);
    }
  },

  subscribeToPrinterSettings(callback: (settings: PrinterSettings) => void): () => void {
    try {
      const docRef = doc(db, 'system_config', 'printer_settings');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists() && snapshot.data().settings) {
            callback(snapshot.data().settings);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- RÈGLES OPÉRATIONNELLES ---
  async saveOperationRules(rules: OperationRules): Promise<void> {
    try {
      const docRef = doc(db, 'system_config', 'operation_rules');
      await setDoc(docRef, { rules, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveOperationRules Firestore:', err);
    }
  },

  subscribeToOperationRules(callback: (rules: OperationRules) => void): () => void {
    try {
      const docRef = doc(db, 'system_config', 'operation_rules');
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists() && snapshot.data().rules) {
            callback(snapshot.data().rules);
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- HISTORIQUE CONFIGURATION ---
  async appendConfigHistory(item: ConfigurationHistoryItem): Promise<void> {
    try {
      const docRef = doc(db, 'config_history', item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (err) {
      console.warn('Erreur appendConfigHistory Firestore:', err);
    }
  },

  subscribeToConfigHistory(callback: (history: ConfigurationHistoryItem[]) => void): () => void {
    try {
      const colRef = collection(db, 'config_history');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as ConfigurationHistoryItem));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- AUDIT LOGS ---
  async appendAuditLog(log: AuditLog): Promise<void> {
    try {
      const docRef = doc(db, 'audit_logs', log.id);
      const clean = JSON.parse(JSON.stringify(log));
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.warn('Erreur appendAuditLog Firestore:', err);
    }
  },

  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    try {
      const colRef = collection(db, 'audit_logs');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as AuditLog));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- NOTIFICATIONS ---
  async saveNotification(notif: NotificationItem): Promise<void> {
    try {
      const docRef = doc(db, 'notifications', notif.id);
      await setDoc(docRef, notif, { merge: true });
    } catch (err) {
      console.warn('Erreur saveNotification Firestore:', err);
    }
  },

  async deleteNotification(notifId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (err) {
      console.warn('Erreur deleteNotification Firestore:', err);
    }
  },

  subscribeToNotifications(callback: (notifications: NotificationItem[]) => void): () => void {
    try {
      const colRef = collection(db, 'notifications');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as NotificationItem));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
