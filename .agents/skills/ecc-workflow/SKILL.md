---
name: ecc-workflow
description: >-
  Guide standardisé pour planifier, implémenter, tester et vérifier des fonctionnalités
  ou corrections sur RestoMaster OS selon le cycle d'ingénierie ECC.
---

# Skill ECC : Workflow de Développement Structuré

Ce skill guide l'agent à travers les 6 étapes du cycle ECC pour toute modification sur RestoMaster OS.

## Protocole par Étape

### 1. Recherche & Cadrage (Plan)
- Identifier les fichiers existants concernés (`src/components/`, `src/services/firestore/`, `src/types/restaurant.ts`).
- Vérifier si une fonction similaire existe déjà pour éviter les doublons de code.
- Cartographier les effets de bord potentiels sur les flux du restaurant (commandes, tables, KDS, stocks, caisse).

### 2. Définition des Contrats (Test)
- Mettre à jour les interfaces TypeScript si de nouveaux champs ou modèles sont nécessaires.
- Préparer mentalement ou par écrit les cas de test :
  - Cas passant (happy path).
  - Cas limite (quantités à 0, stock insuffisant, déconnexion temporaire).
  - Cas d'erreur (droits d'accès insuffisants, PIN superviseur invalide).

### 3. Implémentation Atomique (Implement)
- Modifier ou créer les fichiers de manière ciblée.
- Conserver la séparation des responsabilités :
  - **Types** dans `src/types/`
  - **Appels Firestore** dans `src/services/firestore/`
  - **Interface utilisateur** dans `src/components/`
- Appliquer les classes Tailwind CSS v4 cohérentes avec le reste de l'application.

### 4. Auto-Revue (Review)
- Vérifier qu'aucun type `any` n'a été inséré.
- S'assurer que tous les textes, boutons et messages d'alerte sont rédigés en français soigné.
- Vérifier que les actions sensibles émettent un log d'audit si nécessaire.

### 5. Vérification Technique (Verify)
- Exécuter la commande de linting et de typage strict :
  ```bash
  npm run lint
  ```
- Vérifier que le build Vite s'exécute sans erreur si des dépendances ou des exports ont été modifiés :
  ```bash
  npm run build
  ```

### 6. Synthèse & Restitution (Remember)
- Fournir un compte-rendu clair et concis à l'utilisateur résumant :
  - Ce qui a été modifié.
  - La façon dont la fonctionnalité s'intègre au reste de la plateforme.
  - Les commandes exécutées pour valider la santé du code.
