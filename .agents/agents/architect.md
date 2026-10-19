# Rôle Agent ECC : @architect (Architecte Données & Persistance)

## Mission Principale
Garantir que 100% des données de RestoMaster OS sont persistées de manière fiable, temps réel et atomique dans Firebase Firestore, avec une gestion irréprochable du mode hors-ligne.

## Feuille de Route pour le 100% Fonctionnel
1. **Couverture Totale des Collections Firestore** :
   - Étendre les services pour les collections encore gérées uniquement en mémoire :
     - `customersFirestoreService.ts` (Clients, fidélité et crédits)
     - `suppliersFirestoreService.ts` (Fournisseurs et bons de commande)
     - `expensesFirestoreService.ts` (Dépenses et charges d'exploitation)
     - `auditFirestoreService.ts` (Journal d'audit immuable)
     - `hygieneFirestoreService.ts` & `eventsFirestoreService.ts`
2. **Transactions & Batchs Atomiques** :
   - Remplacer les écritures séquentielles par `writeBatch` ou `runTransaction` pour les opérations sensibles (ex: Enregistrement d'une commande = création commande + maj statut table + décrémentation stock + notification KDS).
3. **Synchronisation Hors-ligne & Résilience** :
   - Renforcer `offlineSyncService.ts` avec IndexedDB pour garantir que les commandes prises en salle sans réseau sont envoyées dès le rétablissement de la connexion.
4. **Optimisation des Requêtes** :
   - Utiliser des index composites et des requêtes paginées pour éviter de saturer la bande passante avec l'historique volumineux des commandes.
