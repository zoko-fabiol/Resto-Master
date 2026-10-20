# Guide Officiel de Livraison RestoMaster OS

Ce document consigne la procédure standard de déploiement et de livraison de la plateforme **RestoMaster OS** à un restaurant client.

---

## 1. Prérequis & Sécurité Initiale

1. **Régénération des Clés API Firebase** :
   - Assurez-vous que les clés d'API dans la console Google Cloud / Firebase sont restreintes aux domaines autorisés et aux APIs requises (`Identity Toolkit`, `Firestore`, `Cloud Functions`, `Firebase Storage`).
2. **Variables d'environnement** :
   - Le fichier `.env` de production doit contenir les variables Firebase réelles (`VITE_FIREBASE_*`).
   - Aucune variable `VITE_DEMO_*` ne doit être présente.

---

## 2. Étape 1 : Création du Premier Super Administrateur (Intégrateur)

Avant toute ouverture du site au client, l'équipe technique provisionne le premier compte **Super Administrateur** via le Firebase Admin SDK.

### Procédure :
1. Définir la variable d'environnement vers la clé de service Firebase Admin (ou s'assurer que `serviceAccountKey.json` est présent à la racine du projet, exclu par `.gitignore`) :
   ```bash
   $env:GOOGLE_APPLICATION_CREDENTIALS = "chemin/vers/serviceAccountKey.json"
   ```
2. Lancer le script interactif de création du superadmin :
   ```bash
   npx tsx scripts/create-superadmin.ts
   ```
3. Saisir de manière interactive :
   - L'adresse e-mail du super administrateur
   - Le nom complet
   - Le mot de passe (saisie masquée par des étoiles, jamais affiché en clair ni transmis en argument CLI)
   - La confirmation du mot de passe
4. Le script :
   - Crée ou met à jour l'utilisateur dans **Firebase Authentication**
   - Assigne les Custom Claims stricts `{ role: "superadmin", active: true, outlets: ["*"] }`
   - Enregistre le document dans la collection Firestore `users/{uid}`
   - Consigne l'opération dans `audit_logs`

---

## 3. Étape 2 : Connexion et Assistant de Premier Lancement

1. Accédez à l'application web via le navigateur.
2. L'écran de connexion (`LoginScreen`) s'affiche sans lien d'inscription publique.
3. Connectez-vous avec les identifiants du Super Administrateur.
4. L'assistant de premier lancement vous guide à travers la configuration complète de l'établissement :
   - Identité légale (Raison sociale, NIU, RCCM, Ville, Téléphone, Logo)
   - Paramètres fiscaux (TVA 17,5 %, CAC 10 % de la TVA, taux combiné 19,25 %)
   - Établissement(s), zones et tables (Plan 2D)
   - Caisses, comptes utilisateurs (Direction, Managers, Serveurs, Caissiers)
5. Une fois le contrôle « Prêt à livrer » validé, posez le verrouillage de livraison (`configurationVerrouillee`).

---

## 4. Étape 3 : Remise au Client

1. Remettez à la Direction générale du restaurant sa fiche d'accès officielle (e-mail et mot de passe temporaire à changer obligatoirement à la première connexion).
2. La Direction du client ne voit que l'onglet **Paramètres** opérationnels et n'a pas accès à la Configuration Système verrouillée de l'intégrateur.
3. La plateforme est livrée **vierge de toute donnée fictive**.

---

## 5. Audit Automatique "Zéro Donnée Fictive"

Avant toute livraison ou déploiement, exécutez systématiquement :
```bash
npm run check:demo
```
Ce script vérifie l'absence absolue de :
- Domaines et adresses e-mails de test (`@demo.restaurant`, `@resto.cm`, etc.)
- Numéros de téléphone fictifs
- Noms d'établissements inventés (`L'Oasis Gourmande`, `Oasis Express`, etc.)
- URLs d'images distantes Unsplash (utilisation exclusive d'icônes vectorielles ou d'initiales en local)
- Préfixes ou simulations fiscales fictives (`SIM-DGI`, `SIM-OCR`)

---

## 6. Outil Sécurisé de Purge des Anciennes Données de Test (Firebase Admin SDK)

Le script `scripts/purge-test-data.ts` permet de nettoyer intégralement un projet Firebase ayant servi aux essais ou tests d'intégration avant sa remise officielle au restaurant client.

### Garde-Fous Inviolables :
1. **Mode Simulation (Dry-Run) par Défaut** : Aucune suppression n'a lieu sans l'argument explicite `--execute`.
2. **Confirmation Stricte du Project ID** : En mode exécution, l'argument `--confirm-project=<ID>` doit correspondre exactement au `projectId` actif pour prévenir toute destruction sur une base inadéquate.
3. **Bouclier Super Administrateur** : Tout compte possédant le rôle `superadmin` ou des Custom Claims superadmin est strictement préservé de toute suppression.
4. **Purge Ciblée d'Anciens Comptes de Test** : Détection des adresses `@demo.restaurant`, `@resto.cm`, `@example.com`, etc.
5. **Suppression par Lots Firestore** : Nettoyage atomique (`db.batch()`) par blocs de 500 documents pour les identifiants d'essai (`org-cameroun-hospitality`, `out-1..3`, `demo-*`, `test-*`).
6. **Nettoyage Storage & Rapport JSON** : Fichiers orphelins supprimés et rapport horodaté consigné dans `docs/reports/purge-report-*.json`.

### Commandes d'Exécution :

```bash
# 1. Simulation sans écriture (Dry-Run actif par défaut)
npm run purge:test-data

# 2. Exécution réelle avec confirmation obligatoire du projet cible
npm run purge:test-data -- --execute --confirm-project=restomaster-os-firebase
```

---

## 7. Conformité Fiscale & Monétaire Cameroun (CGI 2026)

- **Taux combiné légal** : 19,25 % (17,5 % TVA + 10 % CAC sur TVA = 1,75 %).
- **Arrondi monétaire** : FCFA entiers sans décimales fantômes.
- **Factures certifiées** : Arrêté du montant en toutes lettres et mention officielle d'enregistrement au journal fiscal interne.

