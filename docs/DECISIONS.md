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
