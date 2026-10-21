# RestoMaster OS & Admin Panel — Runbook d'Exploitation Opérationnelle

> **Classification** : Document Opérationnel Interne  
> **Applicabilité** : Équipe Plateforme RestoMaster, Support Technique, Direction des Opérations

---

## 1. Onboarding d'un Nouveau Restaurant Client

### Contexte
Un restaurateur soumet une demande d'inscription via le portail public ou un commercial initie son entrée.

### Procédure Étape par Étape
1. **Accès au flux d'inscriptions** :
   - Se connecter à la console Admin Panel (`http://localhost:3001` ou URL de production).
   - Cliquer sur **Inscriptions en Attente** dans la navigation ou sur la carte d'alerte du tableau de bord.
2. **Vérification de conformité administrative** :
   - Contrôler la raison sociale, la forme juridique (ex: SARL, SAS, ETS) et la ville d'exercice (ex: Douala, Yaoundé, Kribi).
   - Vérifier le format du NIU camerounais (lettre M suivie de 12 chiffres et d'une lettre de contrôle, ex: `M051812345678A`).
3. **Approbation & Amorçage du compte** :
   - Cliquer sur **Approuver et Créer l'Établissement**.
   - Saisir un motif de validation (ex: « Dossier d'inscription complet validé par commercial »).
   - La Cloud Function `approveSignup` exécute un batch atomique :
     - Passe la demande en statut `approuvee`.
     - Crée le document `tenants/{orgId}` avec le plan souscrit.
     - Initialise les droits dans `tenants/{orgId}/entitlements/current`.
     - Génère le compte propriétaire dans `users/` et lui attribue les claims `role: 'superadmin'`.
     - Émet un log scellé SHA-256 dans `platform_audit_logs`.
4. **Notification client** :
   - Le restaurateur reçoit le lien officiel de première connexion et configure son mot de passe.

---

## 2. Gestion des Impayés et Suspension Contractuelle

### Contexte
La redevance mensuelle (Starter: 25 000 FCFA, Pro: 50 000 FCFA, Enterprise: 95 000 FCFA) n'a pas été acquittée à l'échéance.

### Procédure Échelonnée
1. **Échéance + 5 jours (Statut Impayé)** :
   - Dans `TenantListView`, repérer l'établissement et changer son statut en `impaye`.
   - L'application restaurant affiche un bandeau orange discret : *« Facture en attente de règlement — Veuillez contacter votre conseiller RestoMaster »*. Le restaurant continue d'encaisser normalement.
2. **Échéance + 15 jours (Suspension en Lecture Seule : `read_only`)** :
   - Passer le statut en `suspendu` avec `suspensionMode: 'read_only'`.
   - Saisir le motif : « Défaut de paiement échéance [Mois/Année] ».
   - **Impact immédiat** : Les serveurs et caissiers ne peuvent plus valider de commandes ni clôturer de caisse. La direction peut consulter ses historiques et exporter ses états comptables.
3. **Échéance + 30 jours (Blocage Total : `full_block`)** :
   - Si aucun accord n'est trouvé, passer le mode en `full_block`. L'accès à la plateforme restaurant est entièrement verrouillé.
4. **Régularisation & Rétablissement** :
   - Dès réception du paiement (Orange Money, MTN Mobile Money, Virement bancaire), enregistrer le reçu dans l'onglet **Abonnement & Règlements**.
   - Réactiver le compte en statut `actif`. La levée des restrictions est instantanée.

---

## 3. Session de Télémaintenance Support (Dépannage à Distance)

### Contexte
Un restaurateur signale un blocage technique (ex: paramétrage d'un circuit d'envoi cuisine/bar ou anomalies de stock) et autorise une prise en main par le support.

### Procédure
1. Ouvrir la fiche du client dans l'Admin Panel et se rendre sur l'onglet **Télémaintenance Support**.
2. Renseigner le formulaire :
   - **Motif d'intervention obligatoire** (min. 10 caractères, ex: « Correction assignation imprimante thermique KDS Cuisine »).
   - **Numéro de ticket support** (ex: `TICK-2026-042`).
   - **Mode d'accès** : Sélectionner impérativement `Lecture seule (Audit & Diagnostic)` sauf autorisation expresse de niveau 3.
3. Cliquer sur **Démarrer la Session de Support**.
4. **Effet visuel immédiat** :
   - Un bandeau bleu s'affiche en temps réel sur tous les terminaux du restaurant : *« Session de télémaintenance en cours par support@restomaster.com (Ticket: TICK-2026-042) »*.
5. À la fin de l'intervention, cliquer impérativement sur **Clôturer la Session**. La session expire automatiquement après 60 minutes si non fermée manuellement.

---

## 4. Audit de Santé & Diagnostic Automatisé

### Contexte
Avant un renouvellement de licence ou lors d'un contrôle de conformité fiscale camerounaise (CGI 2026).

### Procédure
1. Dans la fiche du restaurant, ouvrir l'onglet **Santé & Diagnostics**.
2. Cliquer sur **Lancer un Diagnostic Serveur en Direct**.
3. La Cloud Function `runDiagnostics` inspecte et retourne l'analyse :
   - **Conformité Fiscale CGI 2026** : Taux de TVA (19,25%), présence et validité du NIU et du RCCM sur les reçus de vente.
   - **État des Caisses Enregistreuses** : Détection des sessions de caisse anormalement ouvertes depuis plus de 24 heures sans ticket Z.
   - **Cohérence Opérationnelle** : Analyse du ratio de commandes annulées et des anomalies d'ingrédients en stock négatif.
4. Si des anomalies sont relevées, communiquer le rapport de synthèse au gérant du restaurant.

---

## 5. Procédure d'Urgence : Révocation des Sessions (`forceSignOut`)

### Contexte
Suspicion de compromission de compte, vol d'une tablette POS ou départ conflictuel d'un employé possédant des accès managers.

### Procédure
1. Ouvrir l'onglet **Zone Critique & Cycle de Vie** (`DangerZoneTab`).
2. Dans la section **Révocation Forcée des Sessions**, cliquer sur **Déconnecter tous les postes**.
3. Confirmer avec un motif explicite (ex: « Vol signalé d'une tablette en salle Bonapriso »).
4. La Cloud Function appelle `auth.revokeRefreshTokens()` sur tous les comptes collaborateurs du restaurant.
5. **Résultat** : Dans les 60 secondes, toutes les requêtes actives sont invalidées et les terminaux sont redirigés vers l'écran d'authentification.

---

## 6. Procédure de Suppression Définitive (Règle des 2 Administrateurs)

### Contexte
Résiliation contractuelle définitive d'un client et demande légale de suppression de données.

### Procédure à Double Signature (2-Man Rule)
1. **Étape 1 : Demande d'initiation (Admin A)** :
   - Dans `DangerZoneTab`, cliquer sur **Initier la suppression du restaurant**.
   - Saisir le motif officiel de résiliation.
   - Le système passe le compte en statut `archive`, active le mode `full_block`, et crée un enregistrement dans `pending_deletions` fixant la purge légale à **J+30 jours**.
2. **Étape 2 : Blocage de l'auto-validation** :
   - L'Admin A ne peut en aucun cas valider sa propre demande. Toute tentative est interceptée par la Cloud Function et rejetée avec `permission-denied`.
3. **Étape 3 : Examen & Validation par le Second Administrateur (Admin B)** :
   - L'Admin B se connecte à l'Admin Panel.
   - La bannière rouge d'alerte s'affiche en tête de page : *« Procédure de Suppression en Attente — Règle des 2 Administrateurs »*.
   - L'Admin B clique sur **Approuver en tant que Second Admin** et motive sa signature.
4. **Étape 4 : Rétention & Purge** :
   - Les données restent scellées en archive pendant 30 jours pour répondre aux réquisitions légales ou fiscales, puis sont définitivement purgées.
