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

---

### ADR-008 : Élimination des Simulations et Transparence des Statuts Matériels et Fiscaux (Phase D)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Plusieurs composants et services feignaient des fonctionnalités inexistantes ou simulaient des succès fictifs : simulation OCR automatique avec faux document SVG dans `ScannerModal.tsx`, retours `success: true` systématiques dans `printerService.ts` même sans imprimante matérielle branchée, faux intervalles de progression de téléversement dans `MediaUploader.tsx` et `MenuView.tsx`, `isSimulated: true` dans `fiscalProvider.ts`, attribution automatique de moyens de paiement Mobile Money non configurés, et numérotation locale aléatoire pouvant masquer l'absence de certification serveur.
- **Décision** :
  - **D1 (Scanner GED)** : Suppression de toute promesse d'OCR simulé. Acquisition par caméra réelle (`capture="environment"`) ou fichier (PDF/image) avec saisie explicite et qualification des métadonnées (titre, fournisseur, date, montant).
  - **D2 (Fiscalité DGI)** : Fixation de `isSimulated: false` et clarification légale que le système opère en mode autonome conforme au journal fiscal interne CGI 2026 en l'attente d'une clé d'API et convention d'homologation officielle DGI.
  - **D3 (Impression)** : Élimination des retours `success: true` sans périphérique. `printerService.ts` retourne désormais des échecs explicites et informatifs lorsque l'API WebUSB, le pont IP ou le Bluetooth ne sont pas connectés. Les composants UI (`PrintingHardwareSection.tsx`, `ThermalReceiptModal.tsx`) orientent vers l'impression système (Ctrl+P).
  - **D4 & D5 (Médias & Progression)** : Suppression des `setInterval` feignant une progression de téléversement. Si Cloudinary n'est pas configuré, le système alerte clairement l'utilisateur sans générer de faux blob silencieux persistant.
  - **D6 (Appairage de terminaux)** : Affichage transparent de l'expiration du jeton d'appairage éphémère (15 minutes) et blocage clair des codes expirés avec invitation à régénérer.
  - **D7 (Mobile Money)** : Les boutons Orange Money et MTN MoMo sont conditionnellement désactivés avec le libellé "(À configurer)" si aucun compte marchand (code, téléphone ou QR officiel) n'est configuré dans les paramètres de l'établissement. La méthode par défaut bascule automatiquement sur les espèces FCFA.
  - **D8 (Numérotation séquentielle)** : Formalisation de la séquence continue certifiée serveur `CMD-YYYYMMDD-XXXX` via Cloud Functions atomiques transactionnelles, et étiquetage transparent des commandes locales hors-ligne avec le préfixe provisoire `PROV-YYYYMMDD-XXXX`.

---

### ADR-009 : Assistant de Premier Lancement, Audit Prêt à Livrer et Verrouillage de Livraison (Phase E)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Après l'éradication des jeux de données de démonstration (Phase C) et des simulations trompeuses (Phase D), la mise en service d'un restaurant neuf nécessitait un parcours fluide, guidé et rigoureusement audité pour le superadmin. Il fallait s'assurer qu'aucun restaurant ne soit livré sans identité fiscale complète (CGI 2026, 19,25%), sans caisse configurée, sans zones ni tables, et que la configuration structurelle soit protégée contre toute altération accidentelle par les utilisateurs opérationnels. De plus, les abonnements Firestore ignoraient les collections initialement vides en raison de gardes `if (!snapshot.empty)`.
- **Décision** :
  - **E1, E2, E3 (Services Firestore fiabilisés)** :
    - Élimination systématique des gardes `if (!snapshot.empty)` dans tous les services Firestore (`configFirestoreService`, `cashFirestoreService`, `restaurantFirestoreService`, `tablesFirestoreService`, `productsFirestoreService`) : une collection vide transmet immédiatement l'état `[]` à l'application sans rester bloquée sur un état de chargement ou un cache obsolète.
    - Émission et retransmission propre de toutes les erreurs de persistance Firestore (fin des blocs `catch` silencieux).
    - Ajout des abonnements temps réel `subscribeToOutlets`, `subscribeToOrganization` et `subscribeToSettings`.
  - **E4 & E5 (Assistant Plein Écran `OnboardingWizard`)** :
    - Création d'un assistant d'accueil guidé en 9 étapes pour le Superadmin :
      1. Identité légale (Raison sociale, NIU, RCCM, ville, boîte postale, adresse, contact, pied de ticket).
      2. Paramètres financiers & fiscaux (Devise FCFA entière, TVA 17,5% + CAC 1,75% = 19,25%, mention légale d'arrêté en toutes lettres, déduction automatique des stocks).
      3. Établissement initial (Création de la succursale principale avec profil métier).
      4. Zones & Tables (Création interactive de la première zone et génération par lot de tables configurées).
      5. Caisses & Moyens de paiement (Caisse principale N°1, fond de caisse initial, validation espèces, CB, Orange Money et MTN MoMo).
      6. Périphériques & Matériel (Imprimante thermique de caisse 80mm, terminal POS principal).
      7. Catalogue & Fiche technique (Plat témoin et téléchargement immédiat du gabarit UTF-8 `modele_catalogue_restomaster_os.csv`).
      8. Comptes utilisateurs initiaux (Codes PIN direction, caisse et serveur).
      9. Contrôle « Prêt à livrer » & Certification (Checklist dynamique en 9 points interactifs vert/rouge renvoyant directement aux étapes concernées).
  - **E6, E7, E8 (Verrouillage & Séparation Superadmin / Direction)** :
    - Implémentation du drapeau `configurationVerrouillee` et `certifiedReadyForHandover` dans les paramètres de restaurant.
    - Seul le rôle `superadmin` peut verrouiller ou déverrouiller la configuration structurelle ou supprimer un établissement.
    - La Direction accède à l'espace "Paramètres Restaurant" pour la gestion opérationnelle courante (horaires, coordonnées, carte) mais ne peut pas altérer la structure verrouillée.
    - Protection renforcée dans `firestore.rules` pour `/restaurants/{restaurantId}` (suppression réservée à `isSuperadmin()`) et `/settings/{docId}` (interdiction de déverrouillage pour les rôles non-superadmin).
    - Génération et impression d'une Fiche Officielle de Mise en Service et Remise Client (A4 avec signatures intégrateur / client).
- **Conséquences** : Parcours de déploiement clé-en-main, intégrité garantie dès le premier lancement, audit automatique infaillible et traçabilité de remise certifiée conforme.

---

### ADR-010 : Gestion Serveur des Comptes Utilisateurs, Sécurité Cryptographique des PINs et Fiches de Remise Sécurisées (Phase F)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Historiquement, certains comptes étaient gérés en local ou dans une collection `user_accounts` non sécurisée avec des codes PIN en clair exposés dans l'interface client (cartes tablettes et tableau). Les opérations de création/modification/suppression n'étaient pas synchronisées avec Firebase Auth et les Cloud Functions. Il était impératif de supprimer la collection `user_accounts`, de basculer l'écoute sur la collection canonique `/users`, de hacher cryptographiquement les codes PIN (PBKDF2) côté serveur dans `/user_pins/{uid}` sans jamais stocker ni afficher de PIN en clair, d'introduire des fiches de remise d'identifiants imprimables (A4) pour l'employé, de lier les tablettes à `assignedTableId`, de découpler proprement les fiches RH des comptes d'accès, et de garantir l'unicité stricte des identifiants.
- **Décision** :
  - **F1 & F2 (Sécurité Serveur & Hachage PBKDF2)** :
    - Suppression de la collection `user_accounts` au profit de la collection canonique sécurisée `/users`.
    - Les PINs sont hachés côté serveur avec PBKDF2 (100 000 itérations, sel unique) dans `/user_pins/{uid}` via Cloud Functions (`createUser`, `setPin`). Le profil utilisateur dans Firestore `/users` conserve uniquement le drapeau booléen `hasPin: true`.
    - Éradication complète de tout affichage de code PIN en clair dans l'interface (remplacé par des badges d'état "PIN Actif" / "Sans PIN" et boutons d'action sécurisés).
  - **F3 (Fiche de Remise Sécurisée d'Identifiants `CredentialHandoverModal`)** :
    - Création du composant `CredentialHandoverModal` assurant l'affichage unique des identifiants (email, mot de passe temporaire aléatoire fort généré côté serveur, code PIN) lors de la création ou de la réinitialisation.
    - Format d'impression A4 officiel avec logo de l'établissement, engagements de confidentialité et bloc de double signature (direction / collaborateur).
  - **F4 (Comptes Bornes Tablettes)** :
    - Attribution et liaison directe du compte tablette à la table physique sélectionnée (`assignedTableId`, `assignedTableName`).
    - Restriction en mode Kiosk client tactile sans barre latérale.
  - **F5 (Découplage RH vs Accès)** :
    - Séparation stricte des fiches d'employés RH (`employees`) et des comptes d'accès système (`users`).
    - Passerelle fluide lors de la création permettant de lier un compte système à un profil RH existant en 1 clic sans fusionner les collections.
  - **F6 (Unicité & Prévention des Comptes Fictifs)** :
    - Contrôle d'unicité stricte de l'adresse email côté client et rejet des doublons côté Cloud Function (`already-exists`).
    - Protection contre la suppression accidentelle des comptes superadmin ou du compte actif connecté.
- **Conséquences** : Zéro code PIN en clair en base ou à l'écran, conformité RBAC via Custom Claims Firebase Auth, fiches de remise officielles imprimables pour la remise au personnel, traçabilité serveur complète via les journaux d'audit.

---

### ADR-011 : Plan de Salle 2D Vectoriel, Persistance par Lot et Éléments de Décor Architectural (Phase G)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Les versions précédentes utilisaient un modèle mixte de pourcentages et de pixels déclenchant des écritures Firestore à chaque événement `mousemove`, générant des latences et des surcoûts d'écritures. Le personnel de service pouvait accidentellement déplacer des tables en voulant ouvrir une commande, les textes s'orientaient de façon illisible lors des rotations de tables, les éléments d'architecture (murs, comptoirs, bar, portes, colonnes) n'étaient pas modélisés, et la fusion de tables ne persistait pas atomiquement en base.
- **Décision** :
  - **G1 & G14 (Séparation Stricte Service vs Édition & Sécurité Firestore)** :
    - Le mode Service est dédié à l'exploitation (prise de commande, suivi du statut, encaissement, temps d'occupation) avec cibles tactiles $\ge 44\text{ px}$. Tout glisser-déposer de table y est proscrit.
    - Le mode Édition est réservé aux rôles `superadmin`, `direction` et `manager`. Les serveurs et barmen ne peuvent pas entrer en mode édition.
    - Dans `firestore.rules`, les mises à jour structurelles de tables (`x`, `y`, `width`, `height`, `rotation`, `shape`, `capacity`, `zoneId`, `number`) sont formellement rejetées pour les rôles non-managers.
  - **G2, G3 & G11 (Déplacement Vectoriel Fluide, Seuil Anti-Clic 4px & Historique)** :
    - Utilisation de `setPointerCapture` pour un dragging fluide indépendant de la vitesse du curseur.
    - Seuil anti-clic parasite de 4px : tout geste inférieur à 4px est interprété comme un clic franc de sélection ou d'action de service.
    - Aucune écriture Firestore pendant les déplacements : les coordonnées sont gérées en mémoire dans un état brouillon (`draftTables`, `draftDecor`). L'écriture en base s'effectue exclusivement lors de la validation explicite "Enregistrer le Plan" via des `writeBatch` atomiques.
    - Pile d'historique locale avec raccourcis clavier `Ctrl+Z` (Annuler) et `Ctrl+Y` (Rétablir).
  - **G4 (Contre-Rotation Systématique des Libellés)** :
    - Application mathématique d'une transformation inverse `rotate(-θ)` sur le groupe SVG intérieur des libellés (numéro de table, capacité, nom du serveur, badge montant et temps d'occupation) : tous les textes restent strictement horizontaux et lisibles quel que soit l'angle de la table.
  - **G5 & G6 (Repère Logique 1200 x 800 & Plan Dédié par Zone)** :
    - Viewport SVG standardisé `1200 x 800` garantissant un ratio fixe (3:2) et un rendu parfaitement identique sur tablettes POS, smartphones et écrans muraux.
    - Un plan vectoriel dédié est rendu pour chaque zone/salle sélectionnée, évitant la surcharge visuelle.
  - **G7 (Grille Magnétique 10px, Alignement et Détection des Collisions)** :
    - Grille magnétique de 10 unités avec repères visuels d'alignement dynamique (lignes guides pointillées) lors du déplacement près d'une table voisine.
    - Détection temps réel des chevauchements avec surbrillance d'avertissement et compteur de collisions.
  - **G8 (Génération par Lot de Tables)** :
    - Modal de création automatisée permettant d'ajouter en 1 clic un ensemble de tables ordonnées (préfixe, numéro de début, capacité, disposition en ligne/grille/colonne) avec espacement calculé.
  - **G9 (Éléments de Décor Architectural)** :
    - Collection dédiée `decor_elements` avec typage strict (`mur`, `comptoir`, `bar`, `porte`, `colonne`, `entree`, `escalier`, `fenetre`, `plante`).
    - Rendu vectoriel SVG stylisé (hachures murales, texture bar avec tabourets, arc d'ouverture 90° de porte, colonnes massives).
  - **G10 (Fusion et Séparation Atomiques)** :
    - La fusion et la séparation mettent à jour les tables cibles atomiquement via `writeBatch` (`mergedTableIds` et `mergedWithTableId`).
    - Rendu sur le plan d'un contour unifié SVG en pointillés reliant les tables fusionnées avec badge récapitulatif de capacité.
  - **G13 (État d'Accueil Épuré)** :
    - Affichage d'un état d'accueil chaleureux avec boutons d'action rapide si une salle ne comporte encore aucune table.
- **Conséquences** : Ergonomie tactile professionnelle de niveau industriel, intégrité des données sans écritures superflues, plan lisible sur tout écran et conformité totale aux exigences d'exploitation restaurant.

---

### ADR-012 : Transactions Financières, Déduction de Stock Pilotée et Idempotence Serveur (Phase H)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Les opérations d'encaissement et de déduction des stocks doivent garantir une intégrité absolue (zéro double encaissement en cas de retry réseau, calcul fiscal serveur strict, libération automatique des tables associées, imputation comptable en session de caisse, et déstockage des ingrédients selon le paramètre `stockDeductionTiming`). De plus, les règles de sécurité Firestore doivent interdire formellement aux clients de falsifier les montants financiers (`total`, `subtotal`, `tax`, `orderNumber`) ou de manipuler unilatéralement les mouvements de caisse ou factures.
- **Décision** :
  - **H1 & H2 (Transaction d'Encaissement Atomique & Idempotence)** :
    - Implémentation de la Cloud Function `recordPayment` (région `europe-west1`) encapsulant l'ensemble des écritures dans une transaction Firestore atomique (`runTransaction`).
    - Cache d'idempotence via collection privée `_idempotency_keys/{key}`. Tout appel réseau rejoué avec la même clé renvoie immédiatement le résultat mis en cache sans réappliquer les débits/crédits ni recréer de documents.
    - Mise à jour du document de commande (`orders/{id}`): statut `payee` si le solde atteint 0, actualisation de `paidAmount` et `remainingAmount`.
    - Libération automatique de la table associée (`status: 'libre'`, `currentOrderId: null`).
    - Enregistrement d'un mouvement de caisse immuable (`cash_movements`) si une session de caisse active est fournie ou détectée.
    - Émission de la facture (`invoices/{id}`).
    - Intégration côté client dans `offlineSyncService` pour mise en file d'attente hors-ligne résiliente.
  - **H4 (Déduction des Stocks Selon Recettes & Paramètre de Timing)** :
    - Prise en charge du paramètre de restaurant `stockDeductionTiming` (`envoi_cuisine` ou `encaissement`).
    - Lors de l'envoi en cuisine (`orders.ts: createOrder` ou `addItemsToOrder`), si le paramètre est `envoi_cuisine` (ou non défini par défaut), les ingrédients des recettes sont déduits du stock et des mouvements de stock `stock_movements` (type `sortie`, raison `vente`) sont créés. Le drapeau `stockDeducted: true` est apposé sur la commande.
    - Lors de l'encaissement complet (`payments.ts: recordPayment`), si `stockDeductionTiming === 'encaissement'` et que `stockDeducted !== true`, le déstockage des recettes est déclenché de manière transactionnelle avec création des mouvements de stock et bascule du drapeau `stockDeducted: true`.
    - Évite tout double déstockage.
  - **H5 (Règles Firestore Durcies pour l'Intégrité Financière)** :
    - Règles de sécurité Firestore (`firestore.rules`) interdisant aux clients de modifier `orderNumber`, `total`, `subtotal`, `tax`, ou de réduire `paidAmount`.
    - Collections d'intégrité immuables (`cash_movements`, `invoices`, `_idempotency_keys`, `_counters`) protégées contre toute suppression ou altération client.
  - **H3 & H6 (Validation Automatisée & Région Serveur)** :
    - Suite de tests automatisée `scripts/verify-phase-h-finance.ts` (`npm run test:phase-h`) couvrant l'idempotence, le rejet des sur-paiements, le rejet des écritures client directes, et la déduction de stock.
    - Déploiement vérifié sur `europe-west1` pour toutes les Cloud Functions.
- **Conséquences** : Intégrité financière et de stock de classe entreprise, conformité fiscale, traçabilité immuable des flux d'espèces et de cartes, résilience aux déconnexions réseau.

---

### ADR-013 : Élimination des Dialogues Natifs, Modularisation du Contexte et Architecture PWA Hors-Ligne (Phase I)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Pour une expérience utilisateur de classe industrielle en environnement tactile (POS, KDS, bornes tablettes), les dialogues natifs bloquants du navigateur (`alert`, `confirm`, `prompt`) brisent le flux ergonomique et ne s'intègrent pas au design system. De plus, l'accès hors-ligne, la résilience aux erreurs par module et la maintenabilité TypeScript du grand contexte applicatif nécessitent un découpage modulaire en hooks spécialisés, une PWA conforme et des frontières d'erreurs renforcées.
- **Décision** :
  - **I1 (Éradication des Dialogues Natifs)** :
    - Remplacement de 100% des appels natifs `alert()`, `confirm()` et `prompt()` par les composants asynchrones personnalisés `ConfirmDialog` et `useToast`.
    - Aucune interruption bloquante de la boucle d'événements du navigateur.
  - **I2 (Encapsulation d'Erreur & Code-Splitting)** :
    - Chaque module principal et vue spécialisée (Écran Retrait, Kiosk Borne Tablette) est isolé dans un `ModuleErrorBoundary` avec reprise immédiate et `Suspense` avec squelette de chargement (`ModuleSkeleton`).
    - Empêche tout écran blanc global : l'échec d'un module n'affecte pas le reste de l'exploitation du restaurant.
  - **I4 (Configuration PWA & Cache Applicatif)** :
    - Intégration de `vite-plugin-pwa` avec génération automatique du Service Worker (`dist/sw.js`) et stratégie Workbox pour mise en cache complète des ressources statiques (HTML, CSS, JS, SVG, PNG) et polices distantes.
    - Création des 4 icônes normalisées PWA (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`) respectant la zone de sécurité (safe zone) et l'identité de marque RestoMaster OS.
  - **I5 (Modularisation en Hooks Métier Spécialisés & Typage Strict)** :
    - Création de hooks spécialisés dans `src/hooks/restaurant/` : `useTables`, `useOrders`, `useStock`, `useCashRegister`, `useStaff`, `useRestaurantSettings`.
    - Élimination de tous les contournements `as any` sur le contexte applicatif.
  - **I6 (Accessibilité ARIA & Focus Trap)** :
    - Modales équipées de piège à focus (navigation Tab / Shift+Tab cyclique), focus automatique sur le premier champ interactif à l'ouverture, et association sémantique `aria-labelledby` / `aria-modal="true"`.
- **Conséquences** : Ergonomie fluide et non bloquante, résilience éprouvée face aux pannes ou coupures réseau, conformité PWA installable sur tablette/mobile/desktop, et architecture frontend modulaire et typée.

---

### ADR-014 : Outil Sécurisé de Purge des Données d'Essai Firebase et Garde-Fous de Pré-Livraison (Phase J)
- **Date** : 2026-10-20
- **Statut** : Accepté & Implémenté
- **Contexte** : Avant de livrer un environnement Firebase à un restaurant client, l'équipe technique doit pouvoir éliminer de manière exhaustive et vérifiable les comptes utilisateurs et documents de test résiduels accumulés pendant le développement ou les tests d'intégration, tout en garantissant qu'aucun accident de suppression ne puisse cibler le compte Super Administrateur ni un mauvais projet Firebase.
- **Décision** :
  - **J1 (Simulation Dry-Run & Validation Stricte du Projet)** :
    - Le script `scripts/purge-test-data.ts` (`npm run purge:test-data`) s'exécute par défaut en mode simulation inoffensive (`dry-run: true`).
    - L'exécution réelle exige formellement le drapeau `--execute` combiné au paramètre de confirmation `--confirm-project=<PROJECT_ID>`. En cas de discordance avec le projet actif, l'exécution s'interrompt immédiatement avec code d'erreur 1.
  - **J2 (Bouclier Super Administrateur & Détection des Domaines d'Essai)** :
    - Tout utilisateur disposant des custom claims `role: 'superadmin'` ou du drapeau superadmin est formellement immunisé contre toute purge.
    - Détection ciblée des comptes d'anciens tests (`@demo.restaurant`, `@resto.cm`, `@example.com`, `@test.com`, préfixes `demo`, `test`, `mock`).
  - **J3 (Purge Transactionnelle par Lots Firestore)** :
    - Analyse de 35 collections Firestore avec sélecteurs stricts (préfixes `org-cameroun-hospitality`, `out-1..3`, `demo-*`, `test-*`).
    - Suppression atomique par blocs de 500 documents via `db.batch()`.
  - **J4 & J5 (Nettoyage Storage & Rapport JSON Daté)** :
    - Balayage des fichiers d'essai (`temp/`, `samples/`, `demo*`) sur Firebase Storage.
    - Émission systématique d'un rapport de conformité JSON horodaté dans `docs/reports/purge-report-*.json` détaillant les comptes préservés, purgés, et documents inspectés.
  - **J6 (Documentation d'Exploitation)** :
    - Procédure officielle de purge et d'audit consignée dans `docs/LIVRAISON.md`.
- **Conséquences** : Nettoyage pré-livraison zéro risque, base client livrée vierge de toute pollution d'essai, et traçabilité technique absolue par rapport JSON.

### ADR-015 : Remplacement planifié du formulaire public d'inscription
- **Date** : 2026-10-21
- **Statut** : Temporaire, remplacement requis avant production
- **Contexte** : `RestaurantSignupModal` appelle actuellement la Cloud Function publique `submitSignup` pour recueillir une demande d'ouverture d'établissement. Cette fonction n'exige pas encore App Check et sa limitation de débit ne constitue pas une limitation robuste par adresse IP ; une adresse e-mail différente permet donc de contourner une partie du contrôle.
- **Décision** :
  - Le composant `RestaurantSignupModal` et la méthode `cloudFunctionsService.submitSignup` sont marqués **TEMPORAIRES**.
  - Le flux cible sera une création de compte authentifiée, suivie d'une vérification d'e-mail et protégée par App Check.
  - Le client et la fonction utilisent actuellement la région `europe-west1` ; le forfait Blaze est requis pour les Cloud Functions de deuxième génération.
  - Aucun déploiement de `submitSignup` n'est effectué dans le cadre de cette décision.
- **Conséquences** : Le flux actuel reste disponible pour la transition, mais ne doit pas être considéré comme une protection anti-abus suffisante ni comme le flux d'inscription final.

---

### ADR-016 : Hiérarchie stricte des Rôles : Superadmin Interne vs Propriétaire (Direction + setupOwner)
- **Date** : 2026-10-23
- **Statut** : Accepté & Implémenté (Chantier Installation & Abonnements)
- **Contexte** : Précédemment, le créateur ou propriétaire d'un restaurant recevait le rôle `superadmin`. Cette ambiguïté permettait à un exploitant de restaurant de posséder des privilèges comparables à l'intégrateur technique de la plateforme SaaS, et rendait floue la frontière d'accès entre le panneau d'administration central (`admin-panel`) et l'instance locale du restaurant.
- **Décision** :
  1. **Rôle `superadmin`** : Réservé exclusivement à l'équipe technique interne et aux intégrateurs de la plateforme RestoMaster OS.
  2. **Rôle Propriétaire d'Établissement** : Le créateur d'un restaurant reçoit désormais le rôle métier `direction` accompagné du drapeau immuable `setupOwner: true` (tant dans ses Custom Claims Auth que dans son document `users/{uid}`). Il n'a JAMAIS le rôle `superadmin` ni aucun `platformRole`.
  3. **Accès au Panneau Admin Plateforme (`admin-panel`)** : Strictement conditionné par le custom claim `platformRole` (`platform_owner`, `platform_admin`, `support`, `billing`). Tout utilisateur sans ce claim se voit refuser l'accès sans exception.
  4. **Périmètre `setupOwner`** : Le propriétaire `direction + setupOwner: true` est autorisé à exécuter l'assistant d'installation initial, à certifier la mise en route et à gérer son abonnement, sans avoir accès aux fonctions SaaS multi-tenants.
  5. **Données Internes Plateforme** : Les annotations internes (`internalNotes`, `labels`, `healthScore`) sont isolées dans le sous-document `tenants/{orgId}/admin/private`, invisible pour le propriétaire et ses employés.
- **Conséquences** : Cloisonnement étanche entre les privilèges SaaS plateforme et la gestion quotidienne d'un restaurant, prévention absolue de l'escalade de privilèges, et conformité de sécurité multi-locataires.



