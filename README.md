# RestoMaster OS — Système Intégré de Gestion de Restaurant

**RestoMaster OS** est une plateforme SaaS centralisée et temps réel conçue pour la gestion complète et intégrée d’un restaurant, brasserie ou bar lounge professionnel.

L'application unifie l'ensemble des flux opérationnels autour d'une **source unique de vérité** temps réel (Firebase Firestore) :
$$\text{Approvisionnement} \rightarrow \text{Stock} \rightarrow \text{Production} \rightarrow \text{POS} \rightarrow \text{Cuisine/Bar KDS} \rightarrow \text{Service} \rightarrow \text{Paiement} \rightarrow \text{Caisse} \rightarrow \text{Finance} \rightarrow \text{Rapports}$$

---

## 1. Parcours de Déploiement & Livraison Client

La plateforme est livrée **vierge de toute donnée fictive** et s'initialise selon le parcours structuré suivant :

1. **Provisionnement du Superadmin initial** :
   Création du compte administrateur racine via le script sécurisé en ligne de commande :
   ```bash
   npm run create:superadmin
   ```
2. **Authentification Sécurisée** :
   Connexion du Superadmin avec e-mail et mot de passe (zéro auto-inscription publique).
3. **Assistant de Premier Lancement** :
   Configuration guidée en 9 étapes : identité légale (Raison sociale, NIU, RCCM), fiscalité (TVA 17,5 %, CAC 10 % = 19,25 %), établissement, zones et plan de salle, caisses, terminaux, carte/menu et comptes utilisateurs.
4. **Verrouillage de Livraison** :
   Audit de conformité « Prêt à livrer » et verrouillage de la configuration technique.
5. **Remise des Accès Utilisateurs** :
   Génération des mots de passe temporaires avec changement obligatoire dès la première connexion et attribution des PIN serveur.

---

## 2. Contrôle d'Accès & Matrice des Rôles (RBAC)

L'accès à chaque fonctionnalité est validé côté serveur via les règles de sécurité Firestore et Cloud Functions :

| Rôle | Périmètre d'Intervention |
| :--- | :--- |
| **Superadmin** | Administration système intégrale, provisionnement des succursales, licences et sécurité globale. |
| **Direction** | Supervision financière, clôtures de caisse, audit immuable, conformité fiscale et reporting stratégique. |
| **Manager** | Pilotage quotidien du service, plan de salle, approbations superviseur, gestion des équipes et stocks. |
| **Caisse** | Gestion des sessions de caisse, encaissements multi-moyens (Espèces, MoMo, Cartes), remises autorisées. |
| **Serveur** | Prise de commande tactile sur tablettes et POS, envoi en production, suivi du service en salle. |
| **Cuisine (Chef)** | Écran de production cuisine (KDS), gestion des temps de préparation, alertes de commande prête. |
| **Bar (Barman)** | Écran de production bar (KDS), préparation des boissons, cocktails et gestion des bouteilles. |
| **Stock** | Réceptions de marchandises, inventaires physiques, fiches ingrédients et alertes de réapprovisionnement. |
| **Finance / Comptable** | Déclaration des charges, conformité fiscale CGI 2026, export du journal fiscal et comptable. |
| **Tablette Kiosk** | Interface verrouillée en salle rattachée à une table pour la consultation du menu ou la commande directe. |

---

## 3. Conformité Fiscale & Intégrité Monétaire (CGI 2026)

- **Taux de TVA légal** : 17,5 %
- **Centimes Additionnels Communaux (CAC)** : 10 % de la TVA (1,75 % du montant hors-taxes)
- **Taux combiné officiel** : **19,25 %**
- **Monnaie d'exploitation** : FCFA avec arrondi strict à l'entier légal (aucune décimale fractionnaire fantôme).
- **Arrêté des montants en toutes lettres** sur les factures et reçus fiscaux certifiés.
- **Journal d'audit immuable** : traçabilité horodatée de tout encaissement, annulation, régularisation ou dépense.

---

## 4. Stack Technologique

- **Frontend** : React 19, TypeScript (mode strict), Tailwind CSS v4, Motion, Lucide Icons, Canvas Confetti.
- **Backend & Données** : Google Firebase (Cloud Firestore SDK v12 modulaire, Firebase Auth avec Custom Claims, Cloud Functions v2, Firebase Storage).
- **Architecture Offline** : Détection de l'état réseau, file d'attente d'actions locales et resynchronisation automatique.

---

## 5. Commandes & Scripts Utiles

```bash
# Vérification du typage TypeScript
npm run lint          # exécute tsc --noEmit

# Audit de propreté des données (zéro fausse donnée)
npm run check:demo

# Construction du bundle de production
npm run build

# Provisionnement du Superadmin initial
npm run create:superadmin

# Purge sécurisée des anciennes données de test (simulation avec --dry-run)
npm run purge:test-data
```
