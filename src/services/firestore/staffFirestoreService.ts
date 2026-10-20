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
import { Employee, Attendance, UserAccount, UserProfile } from '../../types/restaurant';

export const staffFirestoreService = {
  // --- COMPTES UTILISATEURS CANONIQUES (COLLECTION USERS SÉCURISÉE) ---
  subscribeToUsers(callback: (users: UserAccount[]) => void): () => void {
    try {
      const colRef = collection(db, 'users');
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list = snapshot.docs.map((d) => {
            const data = d.data();
            const createdAtStr = data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString().slice(0, 10)
              : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString().slice(0, 10));
            const updatedAtStr = data.updatedAt?.toDate
              ? data.updatedAt.toDate().toISOString().slice(0, 10)
              : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString().slice(0, 10));

            return {
              id: d.id,
              name: data.name || data.displayName || 'Utilisateur',
              email: data.email || '',
              role: data.role || 'serveur',
              accountType: data.accountType || (data.role === 'tablette' ? 'tablette' : 'staff'),
              active: data.active !== false,
              avatar: data.avatar || '',
              phone: data.phone || '',
              matricule: data.matricule || '',
              hasPin: Boolean(data.hasPin),
              assignedTableId: data.assignedTableId || undefined,
              assignedTableName: data.assignedTableName || undefined,
              tabPermissions: data.tabPermissions || undefined,
              additionalTabs: data.additionalTabs || undefined,
              createdAt: createdAtStr,
              updatedAt: updatedAtStr,
            } as UserAccount;
          });
          callback(list);
        },
        (err) => {
          console.warn('[staffFirestoreService] Écoute users interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[staffFirestoreService] Erreur subscribeToUsers:', err);
      return () => {};
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserAccount>): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('[staffFirestoreService] Erreur updateUserProfile:', err);
      throw err;
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
          callback(snapshot.docs.map((d) => d.data() as Employee));
        },
        (err) => {
          console.warn('[staffFirestoreService] Écoute employees interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[staffFirestoreService] Erreur subscribeToEmployees:', err);
      return () => {};
    }
  },

  // --- POINTAGES & PRÉSENCES ---
  async saveAttendance(attendance: Attendance): Promise<void> {
    try {
      const docRef = doc(db, 'attendances', attendance.id);
      await setDoc(docRef, attendance, { merge: true });
    } catch (err) {
      console.error('[staffFirestoreService] Erreur saveAttendance:', err);
      throw err;
    }
  },

  subscribeToAttendances(callback: (attendances: Attendance[]) => void): () => void {
    try {
      const colRef = collection(db, 'attendances');
      const q = query(colRef, orderBy('date', 'desc'), limit(150));
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => d.data() as Attendance));
        },
        (err) => {
          console.warn('[staffFirestoreService] Écoute attendances interrompue:', err);
        }
      );
    } catch (err) {
      console.error('[staffFirestoreService] Erreur subscribeToAttendances:', err);
      return () => {};
    }
  },
};
