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
import { Employee, Attendance, UserAccount } from '../../types/restaurant';

export const staffFirestoreService = {
  // --- COMPTES UTILISATEURS DU SYSTÈME (AVEC CODES PIN ET PERMISSIONS) ---
  async saveUserAccount(account: UserAccount): Promise<void> {
    try {
      const docRef = doc(db, 'user_accounts', account.id);
      await setDoc(docRef, { ...account, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Erreur saveUserAccount Firestore:', err);
    }
  },

  async deleteUserAccount(accountId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'user_accounts', accountId));
    } catch (err) {
      console.warn('Erreur deleteUserAccount Firestore:', err);
    }
  },

  subscribeToUserAccounts(callback: (accounts: UserAccount[]) => void): () => void {
    try {
      const colRef = collection(db, 'user_accounts');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as UserAccount));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- EMPLOYÉS & RH ---
  async saveEmployee(employee: Employee): Promise<void> {
    try {
      const docRef = doc(db, 'employees', employee.id);
      await setDoc(docRef, employee, { merge: true });
    } catch (err) {
      console.warn('Erreur saveEmployee Firestore:', err);
    }
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
    } catch (err) {
      console.warn('Erreur deleteEmployee Firestore:', err);
    }
  },

  subscribeToEmployees(callback: (employees: Employee[]) => void): () => void {
    try {
      const colRef = collection(db, 'employees');
      return onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Employee));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },

  // --- POINTAGES & PRÉSENCES ---
  async saveAttendance(attendance: Attendance): Promise<void> {
    try {
      const docRef = doc(db, 'attendances', attendance.id);
      await setDoc(docRef, attendance, { merge: true });
    } catch (err) {
      console.warn('Erreur saveAttendance Firestore:', err);
    }
  },

  subscribeToAttendances(callback: (attendances: Attendance[]) => void): () => void {
    try {
      const colRef = collection(db, 'attendances');
      const q = query(colRef, orderBy('date', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            callback(snapshot.docs.map((d) => d.data() as Attendance));
          }
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  },
};
