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
      console.error('Erreur saveFeatures Firestore:', err);
      throw err;
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
        (err) => {
          console.warn('Abonnement features Firestore interrompu:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // --- TERMINAUX ---
  async saveTerminal(terminal: Terminal): Promise<void> {
    try {
      const docRef = doc(db, 'terminals', terminal.id);
      const clean = JSON.parse(JSON.stringify(terminal));
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.error('Erreur saveTerminal Firestore:', err);
      throw err;
    }
  },

  async deleteTerminal(terminalId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'terminals', terminalId));
    } catch (err) {
      console.error('Erreur deleteTerminal Firestore:', err);
      throw err;
    }
  },

  subscribeToTerminals(callback: (terminals: Terminal[]) => void, outletId?: string): () => void {
    try {
      const colRef = collection(db, 'terminals');
      const q = outletId ? query(colRef, where('outletId', '==', outletId)) : colRef;
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as Terminal));
        },
        (err) => {
          console.warn('Abonnement terminals Firestore interrompu:', err);
        }
      );
    } catch {
      return () => {};
    }
  },

  // --- PÉRIPHÉRIQUES (IMPRIMANTES, TIROIRS-CAISSES) ---
  async savePeripheral(peripheral: Peripheral): Promise<void> {
    try {
      const docRef = doc(db, 'peripherals', peripheral.id);
      const clean = JSON.parse(JSON.stringify(peripheral));
      await setDoc(docRef, clean, { merge: true });
    } catch (err) {
      console.error('Erreur savePeripheral Firestore:', err);
      throw err;
    }
  },

  async deletePeripheral(peripheralId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'peripherals', peripheralId));
    } catch (err) {
      console.error('Erreur deletePeripheral Firestore:', err);
      throw err;
    }
  },

  subscribeToPeripherals(callback: (peripherals: Peripheral[]) => void, outletId?: string): () => void {
    try {
      const colRef = collection(db, 'peripherals');
      const q = outletId ? query(colRef, where('outletId', '==', outletId)) : colRef;
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as Peripheral));
        },
        (err) => {
          console.warn('Abonnement peripherals Firestore interrompu:', err);
        }
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
      console.error('Erreur saveRolePermissions Firestore:', err);
      throw err;
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
        (err) => {
          console.warn('Abonnement role_permissions Firestore interrompu:', err);
        }
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
      console.error('Erreur saveRoleLimits Firestore:', err);
      throw err;
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
        (err) => {
          console.warn('Abonnement role_limits Firestore interrompu:', err);
        }
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
      console.error('Erreur savePrinterSettings Firestore:', err);
      throw err;
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
        (err) => {
          console.warn('Abonnement printer_settings Firestore interrompu:', err);
        }
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
      console.error('Erreur saveOperationRules Firestore:', err);
      throw err;
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
        (err) => {
          console.warn('Abonnement operation_rules Firestore interrompu:', err);
        }
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
      console.error('Erreur appendConfigHistory Firestore:', err);
      throw err;
    }
  },

  subscribeToConfigHistory(callback: (history: ConfigurationHistoryItem[]) => void): () => void {
    try {
      const colRef = collection(db, 'config_history');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as ConfigurationHistoryItem));
        },
        (err) => {
          console.warn('Abonnement config_history Firestore interrompu:', err);
        }
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
      console.error('Erreur appendAuditLog Firestore:', err);
      throw err;
    }
  },

  subscribeToAuditLogs(callback: (logs: AuditLog[]) => void): () => void {
    try {
      const colRef = collection(db, 'audit_logs');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as AuditLog));
        },
        (err) => {
          console.warn('Abonnement audit_logs Firestore interrompu:', err);
        }
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
      console.error('Erreur saveNotification Firestore:', err);
      throw err;
    }
  },

  async deleteNotification(notifId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (err) {
      console.error('Erreur deleteNotification Firestore:', err);
      throw err;
    }
  },

  subscribeToNotifications(callback: (notifications: NotificationItem[]) => void): () => void {
    try {
      const colRef = collection(db, 'notifications');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(100));
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as NotificationItem));
        },
        (err) => {
          console.warn('Abonnement notifications Firestore interrompu:', err);
        }
      );
    } catch {
      return () => {};
    }
  },
};
