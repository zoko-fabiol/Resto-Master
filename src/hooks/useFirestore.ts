// ============================================================
// src/hooks/useFirestore.ts
// Hooks réactifs unifiés pour l'écoute temps réel Firestore et RH
// ============================================================

import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RhAppDataPayload, RhEmployee, Employee } from '../types/restaurant';
import { staffFirestoreService } from '../services/firestore/staffFirestoreService';
import { employeeToRhEmployee } from '../services/firestoreService';

export const useRhAppData = (): RhAppDataPayload => {
  const [data, setData] = useState<RhAppDataPayload>(() => {
    try {
      localStorage.removeItem('rh_app_data');
    } catch (storageErr) {
      console.warn('[useRhAppData] Impossible de nettoyer localStorage rh_app_data:', storageErr);
    }
    return {
      employees: [],
      attendance: {},
      attendanceDetails: {},
      dailyNotes: {},
      payrollExtras: {},
      visibleSundays: [],
    };
  });

  useEffect(() => {
    const handleLocalUpdate = (e: Event) => {
      const custom = e as CustomEvent<RhAppDataPayload>;
      if (custom.detail) setData(custom.detail);
    };
    window.addEventListener('rh-data-updated', handleLocalUpdate);

    // 1. Écoute du document RH complet (pointages, notes, extras)
    const docRef = doc(db, 'rh', 'app_data');
    const unsubDoc = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const val = snap.data() as RhAppDataPayload;
          setData((prev) => ({
            ...prev,
            ...val,
            employees: val.employees && val.employees.length > 0 ? val.employees : prev.employees,
          }));
        }
      },
      () => {}
    );

    // 2. Écoute de la collection unifiée `employees` de RestoMaster OS
    const unsubEmployees = staffFirestoreService.subscribeToEmployees((realEmps: Employee[]) => {
      if (realEmps && realEmps.length > 0) {
        const converted: RhEmployee[] = realEmps.map(employeeToRhEmployee);
        setData((prev) => {
          // Si prev.employees a des champs plus précis (ex: contact, site personnalisé), on fusionne
          const updated = {
            ...prev,
            employees: converted.map((c) => {
              const existing = prev.employees?.find((e) => String(e.id) === String(c.id));
              return existing ? { ...c, ...existing } : c;
            }),
          };
          return updated;
        });
      }
    });

    return () => {
      window.removeEventListener('rh-data-updated', handleLocalUpdate);
      unsubDoc();
      unsubEmployees();
    };
  }, []);

  return data;
};

export const useCollection = <T>(collectionName: string): T[] => {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(
        colRef,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as unknown as T[];
            setItems(list);
          }
        },
        () => {}
      );
      return () => unsub();
    } catch {
      return () => {};
    }
  }, [collectionName]);

  return items;
};
