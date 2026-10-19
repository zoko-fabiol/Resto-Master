# Règle ECC : Patterns & Bonnes Pratiques Firestore

## 1. Organisation du Service Layer
- Toutes les opérations vers Firestore doivent être encapsulées dans `src/services/firestore/`.
- Aucun composant React ne doit exécuter d'appels directs bruts au SDK Firestore (`collection`, `doc`, `getDocs`, `setDoc`) sans passer par un service dédié (ex: `ordersFirestoreService.ts`, `tablesFirestoreService.ts`).

## 2. Temps Réel et Désabonnements (Unsubscribe)
- Les écoutes temps réel via `onSnapshot` doivent toujours retourner leur fonction de désabonnement (`Unsubscribe`).
- Dans les `useEffect` React, s'assurer que le nettoyage est fait pour éviter les fuites de mémoire et les lectures Firestore redondantes :
  ```tsx
  useEffect(() => {
    const unsubscribe = subscribeToActiveOrders((orders) => {
      setOrders(orders);
    });
    return () => unsubscribe();
  }, []);
  ```

## 3. Atomicité & Cohérence Multi-Documents
- Lorsqu'une opération modifie plusieurs documents (ex: création d'une commande + mise à jour du statut de table + décrémentation des stocks), utiliser `writeBatch(db)` ou `runTransaction(db, ...)` :
  - **Batch** : Pour appliquer plusieurs écritures indépendantes de manière atomique (tout réussit ou tout échoue).
  - **Transaction** : Quand la mise à jour dépend d'une lecture préalable critique (ex: vérifier le stock disponible avant de valider la vente).

## 4. Gestion Hors-ligne & Erreurs
- Entourer systématiquement les promesses d'un bloc `try / catch`.
- Remonter des messages d'erreurs explicites et compréhensibles en français pour l'utilisateur (via toast ou alerte visuelle).
