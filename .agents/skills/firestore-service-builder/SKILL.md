---
name: firestore-service-builder
description: >-
  Guide pour créer, étendre ou maintenir les services Firestore dans RestoMaster OS
  avec typage fort, gestion du temps réel et opérations atomiques.
---

# Skill : Création & Extension de Services Firestore

Ce skill détaille les bonnes pratiques de création d'un service Firestore dans `src/services/firestore/`.

## Structure d'un Service Firestore Recommandé

Chaque service Firestore dans RestoMaster OS doit respecter le pattern suivant :

```typescript
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { MonEntite } from '../../types/restaurant';

const COLLECTION_NAME = 'mes_entites';

// 1. Récupération ponctuelle
export async function getMesEntites(): Promise<MonEntite[]> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonEntite));
}

// 2. Écoute temps réel avec désabonnement
export function subscribeToMesEntites(
  onData: (items: MonEntite[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTION_NAME);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonEntite));
      onData(items);
    },
    (err) => {
      console.error(`[Firestore] Erreur écoute ${COLLECTION_NAME}:`, err);
      if (onError) onError(err);
    }
  );
}

// 3. Sauvegarde / Mise à jour avec ID explicite
export async function saveMonEntite(item: MonEntite): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, item.id);
  await setDoc(docRef, item, { merge: true });
}

// 4. Suppression
export async function deleteMonEntite(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
```

## Règles Clés
1. **Toujours renvoyer `Unsubscribe`** dans les fonctions `subscribeTo*`.
2. **Ne jamais laisser de `console.log` de débogage temporaire**. Utiliser des `console.error` préfixés pour le traçage des erreurs.
3. **Utiliser des écritures par lot (`writeBatch`)** si plusieurs documents doivent être mis à jour simultanément.
