// ============================================================
// src/services/firestoreService.ts
// Service de persistance et synchronisation unifiée pour les données RH
// ============================================================

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RhAppDataPayload, Employee, RhEmployee } from '../types/restaurant';
import { staffFirestoreService } from './firestore/staffFirestoreService';

const RH_STORAGE_KEY = 'rh_app_data';

export const rhEmployeeToEmployee = (rh: RhEmployee): Employee => {
  const nomComplet = `${rh.prenom || ''} ${rh.nom || ''}`.trim() || 'Employé';
  return {
    id: String(rh.id),
    fullName: nomComplet,
    role: (rh.role as any) || (rh.type === 'temporaire' ? 'serveur' : 'serveur'),
    matricule: rh.matricule || `EMP-${String(rh.id).slice(-4)}`,
    department: (rh.department as any) || (rh.site?.includes('Douala') ? 'Cuisine' : 'Salle'),
    phone: rh.contact || '',
    email: rh.email || '',
    contractType: rh.type === 'temporaire' ? 'Extra' : 'CDI',
    salary: Number(rh.salaireBase) || 0,
    hireDate: rh.dateEmbauche || new Date().toISOString().slice(0, 10),
    status: rh.statut === 'renvoye' ? 'archive' : 'actif',
  };
};

export const employeeToRhEmployee = (emp: Employee): RhEmployee => {
  const parts = (emp.fullName || '').trim().split(' ');
  const prenom = parts[0] || '';
  const nom = parts.slice(1).join(' ') || prenom;
  return {
    id: emp.id,
    nom: nom,
    prenom: prenom,
    site: emp.department === 'Cuisine' ? 'Cuisine' : 'Salle',
    type: emp.contractType === 'Extra' || emp.contractType === 'Stage' ? 'temporaire' : 'permanent',
    salaireBase: emp.salary || 0,
    contact: emp.phone || '',
    statut: emp.status === 'archive' ? 'renvoye' : 'actif',
    dateRenvoi: emp.status === 'archive' ? new Date().toISOString().slice(0, 10) : null,
    dateEmbauche: emp.hireDate || null,
    department: emp.department,
    role: emp.role,
    matricule: emp.matricule,
  };
};

export const saveRhAppData = async (data: RhAppDataPayload): Promise<void> => {
  // 1. Élimination stricte de toute fuite de données personnelles RH en clair dans localStorage
  try {
    localStorage.removeItem(RH_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rh-data-updated', { detail: data }));
    }
  } catch (err) {
    console.warn('Erreur localStorage cleanup saveRhAppData:', err);
  }

  // 2. Persistance Firestore segmentée pour éliminer le risque de dépassement de la limite de 1 Mo
  try {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

    // a. Sauvegarde segmentée des pointages
    if (data.attendance || data.attendanceDetails) {
      const attRef = doc(db, 'rh_attendances', currentMonthKey);
      await setDoc(
        attRef,
        {
          attendance: data.attendance || {},
          attendanceDetails: data.attendanceDetails || {},
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // b. Sauvegarde segmentée des extras salariaux (primes, retenues, avances)
    if (data.payrollExtras) {
      const payRef = doc(db, 'rh_payroll', currentMonthKey);
      await setDoc(
        payRef,
        {
          payrollExtras: data.payrollExtras || {},
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // c. Sauvegarde segmentée des notes quotidiennes de service
    if (data.dailyNotes) {
      const notesRef = doc(db, 'rh_notes', currentMonthKey);
      await setDoc(
        notesRef,
        {
          dailyNotes: data.dailyNotes || {},
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // d. Document parent consolidé allégé (rétro-compatibilité)
    const docRef = doc(db, 'rh', 'app_data');
    await setDoc(docRef, JSON.parse(JSON.stringify(data)), { merge: true });
  } catch (err) {
    console.warn('Erreur Firestore saveRhAppData:', err);
  }

  // 3. Synchronisation avec la collection principale `employees`
  if (data.employees && Array.isArray(data.employees)) {
    try {
      for (const rhEmp of data.employees) {
        await staffFirestoreService.saveEmployee(rhEmployeeToEmployee(rhEmp));
      }
    } catch (err) {
      console.warn('Erreur synchronisation employees Firestore:', err);
    }
  }
};

export const getRhAppData = async (): Promise<RhAppDataPayload | null> => {
  try {
    localStorage.removeItem(RH_STORAGE_KEY);
  } catch {}

  try {
    const docRef = doc(db, 'rh', 'app_data');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as RhAppDataPayload;
    }
  } catch {}

  return null;
};
