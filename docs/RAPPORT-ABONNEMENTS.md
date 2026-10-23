# RestoMaster OS — Rapport Officiel de Recette : Système d'Installation, Abonnements & Options

> **Date** : 23 Octobre 2026  
> **Branche Git** : `feature/installation-abonnements`  
> **Statut de validation** : ✅ Certifié Conforme (35 suites de tests, 322 tests réussis à 100%, 0 régression)  
> **Audits de conformité** : ✅ `npm run lint` (`tsc --noEmit`), ✅ `npm --prefix functions run build`, ✅ `npm run build:admin`, ✅ `npm run build`, ✅ `npm run check:demo` (245 fichiers certifiés zéro donnée fictive).

---

## 1. Synthèse Exécutive

À la demande du propriétaire de la plateforme RestoMaster OS, le présent chantier a refondu l'intégralité du parcours d'embarquement, de tarification et de gestion des abonnements SaaS pour les restaurants en zone CEMAC / FCFA :

1. **Assistant d'Installation Pas-à-Pas (Style OOBE OS)** : Une expérience immersive en 5 chapitres guidés, inspirée de la première mise en route d'un système d'exploitation moderne (Windows / macOS), assurant la conformité légale (NIU, RCCM), le choix du profil culinaire, le dimensionnement matériel et la création sécurisée des premiers collaborateurs.
2. **Grille Tarifaire Officielle à 3 Niveaux** :
   - **Minimum** : **25 000 FCFA / mois** (1 caisse, 3 collaborateurs, 1 500 commandes/mois).
   - **Médium** : **35 000 FCFA / mois** (3 caisses, 8 collaborateurs, 6 000 commandes/mois, KDS cuisine, gestion des stocks et fiches techniques).
   - **Premium** : **50 000 FCFA / mois** (8 caisses, 20 collaborateurs, 20 000 commandes/mois, KDS Bar, Hygiène HACCP, Centre Fiscal et Main Courante).
3. **Boutique d'Options à la Carte Fixées par l'Admin** : Possibilité d'associer des briques spécialisées (Livraison 2 000 FCFA, HACCP 3 500 FCFA, etc.) ou des extensions de capacité (3 000 FCFA/caisse, 1 000 FCFA/collaborateur). Tous les devis sont calculés exclusivement par le serveur (`computeQuote`).
4. **Adaptation Spécifique à 8 Métiers de la Restauration** : Snack/Emporté, Fast-Food, Restaurant Classique, Maquis/Bar-Restaurant, Bar-Lounge, Boulangerie-Pâtisserie, Traiteur/Banquets, Hôtel-Restaurant.
5. **Parcours Financier Idempotent & Paiements Locaux** : Prise en charge des règlements en FCFA par **Orange Money**, **MTN Mobile Money**, **Virement bancaire (BICEC, Afriland)** et chèque. Validation en 1 clic par l'administrateur avec calcul automatique de l'échéance (+12 mois pour le cycle annuel avec 2 mois offerts).
6. **Application Réelle des Droits & Quotas (Zero Bypass)** :
   - Côté client : Composant `FeatureGate` encapsulant les 17 écrans de l'application.
   - Côté serveur : Blocage strict dans les Cloud Functions `handleCreateUser`, `handleGeneratePairingCode` et `handleCreateOrder` dès qu'un quota est atteint (`resource-exhausted`).

---

## 2. Grille Tarifaire & Catalogue des Modules

### 2.1 Les 3 Formules Officielles

| Caractéristique | Minimum | Médium | Premium |
| :--- | :--- | :--- | :--- |
| **Tarif Mensuel** | **25 000 FCFA** | **35 000 FCFA** | **50 000 FCFA** |
| **Tarif Annuel (10 mois facturés)** | **250 000 FCFA** *(50 000 FCFA d'économie)* | **350 000 FCFA** *(70 000 FCFA d'économie)* | **500 000 FCFA** *(100 000 FCFA d'économie)* |
| **Licence à Vie (x25)** | **625 000 FCFA** | **875 000 FCFA** | **1 250 000 FCFA** |
| **Terminaux / Caisses inclus** | 1 poste | 3 postes | 8 postes |
| **Collaborateurs / Comptes inclus** | 3 comptes | 8 comptes | 20 comptes |
| **Plafond Commandes / Mois** | 1 500 commandes | 6 000 commandes | 20 000 commandes |
| **Modules Socles Inclus** | Vente POS, Encaissement, Tickets, Tableau de Bord, Documents | Tous les modules Minimum + KDS Cuisine, Gestion des Stocks, Achats, Fiches Ingrédients, Plan de Salle interactif | Tous les modules Médium + KDS Bar, Hygiène & Sécurité HACCP, Facturation Fiscale & TVA, Main Courante, Multi-salles |

### 2.2 Options Métier à la Carte & Extensions

| Identifiant Option | Libellé | Tarif Mensuel Fixé Admin | Module Débloqué |
| :--- | :--- | :--- | :--- |
| `addon_delivery` | Module Livraisons & Coursiers | 2 000 FCFA / mois | `mod_delivery` |
| `addon_kds_kitchen` | KDS Cuisine Dédié | 3 000 FCFA / mois | `mod_cuisine` |
| `addon_kds_bar` | KDS Bar & Boissons Dédié | 2 500 FCFA / mois | `mod_bar` |
| `addon_stocks` | Gestion des Stocks & Alertes | 3 500 FCFA / mois | `mod_stock` |
| `addon_recipes` | Fiches Recettes & Rendement | 2 500 FCFA / mois | `mod_recipes_yield` |
| `addon_reservations` | Réservations de Tables & Rangs | 2 000 FCFA / mois | `mod_reservations` |
| `addon_events` | Événements & Banquets | 3 000 FCFA / mois | `mod_events` |
| `addon_haccp` | Hygiène HACCP & Traçabilité | 3 500 FCFA / mois | `mod_hygiene` |
| `addon_fiscal` | Facturation Fiscale & Déclarations | 4 000 FCFA / mois | `mod_fiscal` |
| `addon_hotel` | Main Courante & Prise en Charge Chambre | 5 000 FCFA / mois | `mod_main_courante` |
| **Poste / Caisse Complémentaire** | Licence Terminal Supplémentaire | 3 000 FCFA / mois / poste | Extension `maxTerminals` |
| **Collaborateur Complémentaire** | Compte Utilisateur Supplémentaire | 1 000 FCFA / mois / utilisateur | Extension `maxUsers` |
| **Volume Supplémentaire** | Bloc de 5 000 Commandes / Mois | 2 500 FCFA / mois / bloc | Extension `maxOrdersPerMonth` |

---

## 3. Matrice des 8 Profils Métiers

| Profil Métier | Recommandation | Modules Spécifiques Inclus d'Office |
| :--- | :--- | :--- |
| **1. Snack & Vente à Emporter** | Minimum (25 000) | Vente rapide comptoir, impression tickets, documents légaux. |
| **2. Fast-Food & Burger** | Médium (35 000) | KDS Cuisine cadencé, chaîne de préparation, livraisons. |
| **3. Restaurant Classique & Grill** | Médium (35 000) | Plan de salle graphique, réservations, KDS Cuisine, stocks. |
| **4. Maquis & Bar-Restaurant** | Minimum (25 000) | Plan de salle extérieur, gestion casiers/boissons, encaissements fractionnés. |
| **5. Bar-Lounge & Night-Club** | Médium (35 000) | KDS Bar boisson express, service par bouteille/verre, cartes d'accès. |
| **6. Boulangerie & Salon de Thé** | Minimum (25 000) | Vente emportée + salon de thé, gestion des fournées, caisse tactile rapide. |
| **7. Traiteur & Banquets** | Médium (35 000) | Devis événementiels, fiches ingrédients en gros, livraisons programmées. |
| **8. Hôtel-Restaurant & Complexe** | Premium (50 000) | Main courante hébergement, multi-points de vente (resto, bar, piscine), fiscalité. |

---

## 4. Parcours d'Installation en 5 Chapitres (Style OS)

L'assistant (`src/components/setup/OnboardingInstallationWizard.tsx`) guide pas-à-pas le propriétaire d'établissement :

- **Chapitre 1 : Identité Légale de l'Établissement**
  - Raison sociale, forme juridique (SARL, ETS, SAS, SA), enseigne commerciale.
  - Localisation précise : Ville (Douala, Yaoundé, Bafoussam, Garoua, etc.), quartier, rue.
  - Identifiants légaux : NIU (Numéro d'Identifiant Unique à 14 caractères) et RCCM.
  - Devise officielle d'exploitation (défaut : Franc CFA XAF).
- **Chapitre 2 : Profil Métier & Choix de la Formule**
  - Sélection parmi les 8 types d'établissements.
  - Choix de la formule (Minimum 25 000, Médium 35 000, Premium 50 000 FCFA).
  - Choix du cycle : Mensuel, Annuel (2 mois offerts) ou Licence à vie (x25).
- **Chapitre 3 : Options à la Carte & Dimensionnement**
  - Grille d'addons par catégorie : Production, Service, Gestion, Hygiène, Finance.
  - Détection automatique des briques déjà incluses dans le profil métier.
  - Dimensionnement matériel (caisses additionnelles) et collaborateurs.
  - Calcul certifié par `computeQuote` avec indication d'économies annuelles et suggestions d'upsell.
- **Chapitre 4 : Matériel & Collaborateurs Initiaux**
  - Largeur d'impression des tickets de caisse (Standard 80 mm ou Mobile 58 mm).
  - Mode d'affichage en cuisine : Écran tactile KDS ou Imprimante de bons.
  - Création des premiers collaborateurs avec attribution de rôle et code PIN tactile à 4 chiffres.
- **Chapitre 5 : Facturation & Déclaration du Règlement**
  - Récapitulatif comptable infalsifiable avec référence d'ordre `RM-AAAA-NNNNNN`.
  - Coordonnées bancaires officielles (BICEC, Afriland First Bank) et comptes Mobile Money (Orange Money, MTN MoMo).
  - Saisie de la référence de transaction et soumission de certification.

---

## 5. Validation de Recette (13 Scénarios Métier Réussis à 100%)

La suite automatisée `src/__tests__/recette13ScenariosPhase8.test.ts` certifie les 13 scénarios fonctionnels demandés :

| N° | Scénario Testé | Résultat | Vérification Effectuée |
| :---: | :--- | :---: | :--- |
| **1** | Inscription nouveau restaurant (classique, Minimum) | ✅ PASSÉ | Profil validé, pack Minimum initialisé à 25 000 FCFA avec quotas par défaut. |
| **2** | Accès initial bloqué en vente / POS avec statut `installation` | ✅ PASSÉ | `evaluateTenantAccess` bloque la vente avec motif explicite, autorise la configuration. |
| **3** | Parcours complet de l'assistant (Chapitres 1 à 5) | ✅ PASSÉ | Données légales NIU/RCCM, profils métiers, calcul devis avec devis certifié serveur. |
| **4** | Émission de l'ordre avec référence `RM-AAAA-NNNNNN` | ✅ PASSÉ | Format certifié regex `^RM-\d{4}-\d{6}$`, rejet si l'appelant n'est pas le propriétaire. |
| **5** | Déclaration de paiement manuel (Orange / MTN / Virement) | ✅ PASSÉ | Rejet strict des références vides ou modes inconnus par la Cloud Function. |
| **6** | Passage au statut `paiement_a_verifier` | ✅ PASSÉ | Maintien du verrouillage commercial caisse et notification d'attente d'approbation. |
| **7** | Vue Admin `PendingPaymentsListView` | ✅ PASSÉ | Filtrage rigoureux des commandes soumises pour contrôle de l'équipe financière. |
| **8** | Validation du paiement par l'administrateur | ✅ PASSÉ | Exigence absolue du rôle de plateforme `superadmin` ou `finance` (`assertPlatformRole`). |
| **9** | Bascule automatique et idempotente au statut `actif` | ✅ PASSÉ | Déblocage de la vente, calcul d'échéance à +1 mois ou +12 mois avec reçu généré. |
| **10** | Déblocage immédiat du POS et des modules souscrits | ✅ PASSÉ | `resolveEntitlements` active `mod_pos`, `mod_caisse`, `mod_tables` et `mod_delivery`. |
| **11** | Verrouillage `FeatureGate` sur les modules non souscrits | ✅ PASSÉ | Écrans KDS Bar, Stocks avancés ou Fiscalité protégés contre tout accès frauduleux. |
| **12** | Espace « Mon Abonnement » : ajout d'option et devis | ✅ PASSÉ | Devis certifié serveur pour l'ajout de briques à la carte (ex. 25 000 + 2 000 + 3 500 = 30 500 FCFA). |
| **13** | Contrôle strict des quotas serveur | ✅ PASSÉ | Rejet avec code `resource-exhausted` en cas de dépassement de postes ou utilisateurs. |

---

## 6. Guide de Déploiement en Production Firebase (Passage au Forfait Blaze)

Pour déployer la plateforme en production réelle après les tests sur émulateurs :

### 6.1 Prérequis Firebase
1. **Activer le forfait Blaze (Pay-as-you-go)** sur la console Firebase du projet (`console.firebase.google.com`).  
   *Note : Le forfait Spark gratuit ne permet pas l'exécution des Cloud Functions v2 qui contactent des API externes (ex: webhooks Google Apps Script pour les emails) ni l'allocation CPU dynamique.*
2. **Initialiser le catalogue en base Firestore** :
   ```bash
   npx tsx scripts/seed-catalog.ts
   ```
3. **Déployer les règles de sécurité Firestore** :
   ```bash
   firebase deploy --only firestore:rules
   ```
4. **Déployer les Cloud Functions** :
   ```bash
   npm --prefix functions run build
   firebase deploy --only functions
   ```
5. **Déployer les interfaces Web & Panneau Admin** :
   ```bash
   npm run build
   npm run build:admin
   firebase deploy --only hosting
   ```

---

## 7. Décisions d'Architecture (ADR Associés)

- **ADR-016** : Sécurité Plateforme, Isolation des Rôles et Contrôle d'Accès Multi-Tenant (`functions/src/auth.ts`, `firestore.rules`).
- **ADR-017** : Catalogue Officiel, Moteur Tarifaire Serveur et Gestion Admin des Tarifs (`shared/catalog/`, `admin-panel`).
- **ADR-018** : Cycle d'Adhésion, Paiements Manuels et Activation Idempotente (`handleValidateSubscriptionPayment`).
- **ADR-019** : Refonte Totale de l'Assistant d'Installation Pas-à-Pas Style OS (`src/components/setup/`).
- **ADR-020** : Application Réelle des Droits (`FeatureGate`) et Contrôle Strict des Plafonds de Quotas.
- **ADR-021** : Espace Restaurant « Mon Abonnement & Boutique d'Options » (`AdminCenterView.tsx`).
- **ADR-022** : Validation de Recette Complète sur Émulateurs (13 Scénarios Métier E2E).

---
*Rapport rédigé et certifié par l'équipe d'ingénierie RestoMaster OS.*
