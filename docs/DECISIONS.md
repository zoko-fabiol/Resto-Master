# RestoMaster OS — Registre des Décisions d'Architecture (ADR)
Branche : `release/livraison` — Tag de sauvegarde initial : `v1.0.0-pre-livraison-backup`

Ce document consigne les décisions d'architecture prises pour la livraison d'une version de production épurée, sécurisée et mono-établissement par défaut de RestoMaster OS.

---

## ADR-001 : Séparation stricte des rôles Superadmin (Intégrateur) et Direction (Exploitant)
- **Contexte** : Précédemment, le rôle `direction` cumulait la gestion du restaurant et l'administration système technique, avec des profils de démonstration interchangeables.
- **Décision** :
  - Création du rôle distinct `superadmin`.
  - Le `superadmin` est le seul habilité à exécuter l'assistant de premier lancement, à configurer l'infrastructure (serveurs, périphériques, fiscalité, clés), à provisionner l'établissement et à verrouiller la configuration (`configurationVerrouillee`).
  - Le rôle `direction` est réservé au gérant / propriétaire du restaurant : il gère le personnel de son établissement, les cartes, les stocks, les rapports et les paramètres quotidiens, sans accès aux réglages d'infrastructure ni aux paramètres fiscaux verrouillés.
- **Conséquences** : Protection absolue de l'exploitant contre les dérèglements accidentels des taux légaux (CGI 2026) et de l'architecture réseau.

---

## ADR-002 : Source unique de vérité serveur pour les opérations financières et d'authentification
- **Contexte** : Certaines écritures (paiements, sessions de caisse, vérification de PIN superviseur) possédaient un repli ou une validation côté client susceptible de désynchroniser la caisse ou de contourner les règles.
- **Décision** :
  - Le serveur (Cloud Functions Firebase v2 + règles de sécurité Firestore) est l'unique autorité pour : les paiements (`recordPayment`), les clôtures de caisse Z, les numéros de factures/commandes séquentiels, la validation des PINs et jetons superviseurs à usage unique.
  - Le client n'envoie que des intentions transactionnelles avec clé d'idempotence (`idempotencyKey`).
- **Conséquences** : Intégrité financière garantie même en cas de tentative de manipulation côté navigateur ou d'instabilité réseau.

---

## ADR-003 : Éradication totale des données fictives et catalogue statique neutre
- **Contexte** : Le dépôt contenait des jeux de démonstration (`INITIAL_*`, `seedData.ts`) avec des noms, adresses camerounaises arbitraires et identifiants fixes (`org-cameroun-hospitality`, `out-1`, etc.).
- **Décision** :
  - Suppression complète de `seedData.ts` et de `firebaseSeedService`.
  - Aucune base client livrée ne contiendra de données pré-remplies.
  - Les catalogues de règles et fonctionnalités sont déplacés dans `src/config/defaults/` avec des identifiants sémantiques neutres.
  - Un script de contrôle automatisé `scripts/check-no-demo.ts` bloque le build si une chaîne fictive ou de démonstration est réintroduite.
- **Conséquences** : Livraison d'une plateforme vierge, prête à être configurée pour le restaurant client via l'assistant de démarrage.

---

## ADR-004 : Coordonnées logiques fixes pour le Plan de Salle 2D (1200 x 800)
- **Contexte** : Les tables étaient positionnées en pourcentages ou coordonnées mixtes, provoquant des distorsions selon la résolution d'écran (mobile vs tablette POS vs écran 4K).
- **Décision** :
  - Adoption d'un repère logique vectoriel fixe de 1200 x 800 unités par zone.
  - Mise à l'échelle automatique via CSS / SVG transform / viewBox sans distorsion.
  - Contre-rotation systématique des textes et badges pour conserver une lecture horizontale quel que soit l'angle de la table.
  - Séparation stricte du mode "Service" (lecture seule des tables, commandes, statuts) et du mode "Édition" (déplacement, redimensionnement, fusion, éléments de décor) avec confirmation par lot.
- **Conséquences** : Rendu identique sur tous les terminaux, ergonomie tactile optimisée et intégrité des données de plan.

---

## ADR-005 : Purge Firebase sécurisée et non destructive par défaut
- **Contexte** : La purge des données de test sur Firebase doit pouvoir s'exécuter avant remise au client sans risquer d'effacer une mauvaise base.
- **Décision** :
  - Le script `scripts/purge-test-data.ts` tourne obligatoirement en mode simulation `--dry-run` par défaut.
  - L'exécution réelle `--execute` exige la confirmation interactive du `projectId` exact.
  - Le script ne s'exécute jamais automatiquement au build ni au déploiement.
- **Conséquences** : Sécurité maximale contre les pertes accidentelles de données.

---

## ADR-006 : Authentification et Déverrouillage PIN Exclusivement Serveur (Custom Claims)
- **Contexte** : Le déverrouillage de session comparait les codes PIN localement dans le navigateur (parcours de `employees` et `user_accounts`), et restaurait les rôles depuis `localStorage`.
- **Décision** :
  - L'attribution et la vérification des rôles s'appuient exclusivement sur les **Firebase Custom Claims** (`getIdTokenResult`) et la collection Firestore `users/{uid}`.
  - Le rôle `superadmin` possède un accès universel non restreint.
  - Tout déverrouillage tactile par code PIN (`PinLockScreen`) appelle la Cloud Function `unlockWithPin(pin, terminalId)`. Le serveur vérifie le hachage PBKDF2 avec sel, applique un verrouillage anti force-brute (5 essais: 1 min, 6 essais: 5 min, 7+ essais: 15 min), journalise dans `audit_logs` et génère un jeton d'authentification Firebase Auth personnalisé (`createCustomToken`).
  - Aucun code PIN ou mot de passe en clair ne transite vers le client ni ne réside en mémoire navigateur.
  - Les mots de passe temporaires sont générés de manière cryptographique forte avec obligation de renouvellement au premier lancement (`mustChangePassword`).
- **Conséquences** : Zéro vulnérabilité d'élévation de privilèges via DevTools ou localStorage. Isolation complète des sessions sur postes partagés.

---

### ADR-007 : Éradication Totale des Fausses Données et Isolation des Catalogues Neutres (Phase C)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Le système contenait d'importants jeux de données de démonstration codés en dur (`seedData.ts`, `configurationSeed.ts`, faux numéros camerounais, courriels inventés, établissements Oasis, agence Genesis, et images distantes Unsplash) avec un service d'amorçage automatique qui réinjectait ces fausses données dans Firestore au démarrage.
- **Décision** :
  - Suppression totale de `seedData.ts`, `configurationSeed.ts` et `firebaseSeedService.ts`.
  - Migration des configurations structurelles neutres dans `src/config/defaults/` (`DEFAULT_SETTINGS`, `DEFAULT_ORGANIZATION`, `DEFAULT_CASH_SESSION`, `DEFAULT_FEATURES`, `DEFAULT_ROLE_LIMITS`, `DEFAULT_OPERATION_RULES`).
  - Initialisation de toutes les entités métier de `RestaurantContext` à des tableaux vides `[]`.
  - Purge automatique des clés `localStorage` obsolètes (`restomaster_*`, `rh_app_*`, `stock_expert_*`) basée sur le versionnage `restomaster_storage_version: "2.0.0-clean"`.
  - Remplacement de toutes les URLs Unsplash en dur par des initiales stylisées ou icônes vectorielles locales.
  - Implémentation du script de pré-validation `scripts/check-no-demo.ts` exécuté à chaque build pour garantir le respect strict du critère "Zéro Donnée Fictive".
- **Conséquences** : La plateforme livrée est garantie 100% vierge, prête à être configurée pour un nouveau restaurant client sans aucun résidu de données fictives.

