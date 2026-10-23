# RestoMaster OS — Système Intégré de Gestion de Restaurant

**RestoMaster OS** est une plateforme SaaS centralisée et temps réel conçue pour la gestion complète et intégrée d’un restaurant, brasserie, bar lounge ou complexe hôtelier professionnel.

L'application unifie l'ensemble des flux opérationnels autour d'une **source unique de vérité** temps réel (Firebase Firestore) :
$$\text{Approvisionnement} \rightarrow \text{Stock} \rightarrow \text{Production} \rightarrow \text{POS} \rightarrow \text{Cuisine/Bar KDS} \rightarrow \text{Service} \rightarrow \text{Paiement} \rightarrow \text{Caisse} \rightarrow \text{Finance} \rightarrow \text{Rapports}$$

---

## 1. Abonnements Officiels & Boutique d'Options

RestoMaster OS propose un modèle tarifaire clair, transparent et sans frais cachés, calibré pour le marché africain (Cameroun, zone CEMAC) :

### Les 3 Formules Officielles
| Formule | Tarif Mensuel | Caisses / Terminaux | Collaborateurs | Ventes / Mois | Modules Clés Inclus |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Minimum** | **25 000 FCFA** | 1 poste fixe | 3 comptes PIN | 1 500 commandes | POS essentiel, encaissement, journal de caisse, rapports. |
| **Médium** (Recommandé) | **35 000 FCFA** | 3 postes | 8 comptes PIN | 6 000 commandes | + KDS Cuisine, KDS Bar, Stocks avancés & alertes, Achats. |
| **Premium** | **50 000 FCFA** | 8 postes | 20 comptes PIN | 20 000 commandes | + Tous modules (Fiscalité DGI, Main courante, Hygiène HACCP, GED). |

### Cycles de Facturation
- **Mensuel** : Multiplicateur x1, reconduction mensuelle standard.
- **Annuel (Recommandé)** : Facturation sur **10 mois seulement (2 mois offerts)**. Ex: Minimum = 250 000 FCFA/an (économie de 50 000 FCFA), Médium = 350 000 FCFA/an (économie de 70 000 FCFA).
- **Licence À Vie** : Multiplicateur x25 sur le tarif mensuel avec redevance de maintenance annuelle plafonnée à 2,4 mois.

### Options à la Carte (Addons)
Des modules spécialisés peuvent être ajoutés unitairement à n'importe quelle formule :
- **KDS Cuisine / Bar** : 1 500 FCFA/mois
- **Gestion des Salles & Tables** : 1 500 FCFA/mois
- **Cahier de Réservations** : 1 500 FCFA/mois
- **Scanner & Documents GED** : 1 500 FCFA/mois
- **Programme de Fidélité Clients** : 1 500 FCFA/mois
- **Module Livraisons & Coursiers** : 2 000 FCFA/mois
- **Événements, Banquets & Traiteur** : 2 500 FCFA/mois
- **Contrôle Hygiène & Relevés HACCP** : 2 500 FCFA/mois
- **Comptabilité & Trésorerie Simplifiée** : 3 000 FCFA/mois
- **Gestion Avancée des Stocks & FEFO** : 3 500 FCFA/mois
- **Bons de Commande & Achats Fournisseurs** : 3 500 FCFA/mois
- **Fiches Techniques & Déstockage Recettes** : 3 500 FCFA/mois
- **Postes / Caisses Supplémentaires** : 3 000 FCFA/mois par terminal
- **Collaborateurs Additionnels** : 1 000 FCFA/mois par utilisateur
- **Bloc de Ventes Additionnel** : 3 000 FCFA/mois pour 5 000 commandes

---

## 2. Les 8 Profils Métiers de Restauration

L'installation adapte automatiquement l'interface et les préréglages matériels selon la spécialité culinaire :
1. **Snack & Takeaway** : Encaissement rapide, tickets 58mm, vente à emporter prioritaire.
2. **Fast-Food & Burger** : Écran KDS cuisine cadencé, gros volumes, tickets 80mm.
3. **Restaurant Classique & Grill** : Service à table complet, plan de salle interactif et gestion des rangs.
4. **Maquis & Bar-Restaurant** : Double pôle boissons comptoir et grillades braisées.
5. **Bar-Lounge & Cave à Vins** : Happy hours, tarifs horaires, cartes de cocktails.
6. **Boulangerie, Pâtisserie & Salon de Thé** : Vente au poids/pièce, gestion des pertes du jour.
7. **Traiteur & Événementiel** : Devis traiteur, gestion des acomptes, banquets extérieurs.
8. **Hôtel & Complexe Touristique** : Multi-points de vente, room-service, main courante hôtelière.

---

## 3. Assistant d'Installation Pas-à-Pas (Style OS)

L'expérience initiale (OOBE) guide le propriétaire d'établissement en 5 chapitres ergonomiques :
- **Chapitre 1 — Identité de l'Établissement** : Raison sociale, forme juridique (SARL, ETS, SAS), NIU (13 car.), RCCM, ville, quartier.
- **Chapitre 2 — Profil Métier & Choix du Pack** : Sélection parmi les 8 profils et 3 packs officiels (avec simulateur mensuel/annuel/à vie).
- **Chapitre 3 — Options à la Carte & Capacités** : Boutique d'addons avec devis certifié en direct par la Cloud Function `computeQuote`.
- **Chapitre 4 — Matériel & Collaborateurs** : Format de tickets (80mm/58mm), mode cuisine (KDS ou imprimante de bons), création des comptes collaborateurs clés avec code PIN 4 chiffres.
- **Chapitre 5 — Facturation & Activation** : Référence officielle `RM-AAAA-NNNNNN`, coordonnées Orange Money / MTN MoMo / virement bancaire et déclaration du justificatif de règlement.

---

## 4. Contrôle d'Accès & Matrice des Rôles (RBAC)

L'accès à chaque fonctionnalité est validé côté serveur via les règles de sécurité Firestore et Cloud Functions :

| Rôle | Périmètre d'Intervention |
| :--- | :--- |
| **Superadmin** | Administration système intégrale, gestion du catalogue, validation des paiements et licences globales. |
| **Direction** | Supervision financière, souscription, clôtures de caisse, audit immuable, conformité fiscale et reporting. |
| **Manager** | Pilotage quotidien du service, plan de salle, approbations superviseur, gestion des équipes et stocks. |
| **Caisse** | Sessions de caisse, encaissements multi-moyens (Espèces, MoMo, Cartes), remises autorisées avec PIN. |
| **Serveur** | Prise de commande tactile sur tablettes et POS, envoi en production, suivi du service en salle. |
| **Cuisine (Chef)** | Écran de production cuisine (KDS), gestion des temps de cuisson, alertes de commande prête. |
| **Bar (Barman)** | Écran de production bar (KDS), préparation des boissons, cocktails et suivi des stocks bar. |
| **Stock** | Réceptions de marchandises, inventaires physiques, fiches ingrédients et alertes de réapprovisionnement. |
| **Finance / Comptable** | Déclaration des charges, conformité fiscale CGI 2026, export du journal fiscal et comptable. |
| **Tablette Kiosk** | Interface verrouillée en salle rattachée à une table pour consultation du menu ou commande directe. |

---

## 5. Conformité Fiscale & Intégrité Monétaire (CGI 2026)

- **Taux de TVA légal** : 17,5 %
- **Centimes Additionnels Communaux (CAC)** : 10 % de la TVA (1,75 % du montant hors-taxes)
- **Taux combiné officiel** : **19,25 %**
- **Monnaie d'exploitation** : FCFA avec arrondi strict à l'entier légal (aucune décimale fractionnaire fantôme).
- **Arrêté des montants en toutes lettres** sur les factures et reçus fiscaux certifiés.
- **Journal d'audit immuable** : traçabilité horodatée de tout encaissement, annulation, régularisation ou dépense.

---

## 6. Stack Technologique

- **Frontend** : React 19, TypeScript 5.8+ (mode strict), Tailwind CSS v4, Motion, Lucide Icons, Canvas Confetti.
- **Packaging Desktop** : Electron & Tauri (architecture préservée et compatible multi-plateformes).
- **Backend & Données** : Google Firebase (Cloud Firestore SDK v12 modulaire, Firebase Auth avec Custom Claims, Cloud Functions v2 europe-west1, Firebase Storage).
- **Architecture Offline** : Détection de l'état réseau, file d'attente d'actions locales et resynchronisation automatique.

---

## 7. Commandes & Scripts Utiles

```bash
# Vérification du typage TypeScript
npm run lint          # exécute tsc --noEmit

# Tests unitaires et d'intégration
npm test

# Audit de propreté des données (zéro fausse donnée)
npm run check:demo

# Construction des bundles de production (App restaurant + Admin panel)
npm run build
npm run build:admin

# Build des Cloud Functions
npm --prefix functions run build

# Provisionnement du Superadmin initial
npm run create:superadmin

# Initialisation du catalogue de prix officiel
npm run seed:catalog
```
