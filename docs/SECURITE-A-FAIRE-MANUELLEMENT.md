# RestoMaster OS — Guide des Actions Manuelles de Sécurité (Hors Code)

> Ce document recense l'ensemble des actions de sécurité obligatoires à réaliser manuellement dans les consoles **Google Cloud Platform (GCP)** et **Firebase** avant tout déploiement en production ou exploitation réelle au Cameroun.

---

## Sommaire

1. [Restriction de la Clé API Firebase (Google Cloud Console)](#1-restriction-de-la-clé-api-firebase)
2. [Activation et Déploiement de Firebase App Check](#2-activation-et-déploiement-de-firebase-app-check)
3. [Durcissement de Firebase Authentication](#3-durcissement-de-firebase-authentication)
4. [Mise en Place des Alertes Budgétaires GCP](#4-mise-en-place-des-alertes-budgétaires-gcp)
5. [Rotation et Révocation de la Clé API Compromise](#5-rotation-et-révocation-de-la-clé-api-compromise)
6. [Purge de l'Historique Git (Suppression des Secrets Commitées)](#6-purge-de-lhistorique-git)

---

## 1. Restriction de la Clé API Firebase

Par défaut, les clés d'API générées par Firebase ne possèdent aucune restriction d'application ni de service. Cela permet à un tiers d'extraire la clé et de l'utiliser depuis n'importe quel domaine.

### Étapes pas-à-pas :
1. Connectez-vous à la [Console Google Cloud](https://console.cloud.google.com/).
2. Sélectionnez votre projet : **`resto-master-310f7`** (ou votre projet de production dédié).
3. Accédez à **APIs et services** > **Identifiants** (`Credentials`).
4. Dans la section **Clés API**, cliquez sur la clé utilisée par l'application Web (généralement nommée *Browser key (auto created by Firebase)*).
5. **Restrictions d'application** :
   - Cochez **Référents HTTP (sites Web)**.
   - Sous *Autoriser les requêtes provenant de ces référents HTTP*, ajoutez :
     - `http://localhost:3000/*` *(développement local)*
     - `http://localhost:5173/*` *(développement local Vite standard)*
     - `https://votre-domaine-restaurant.cm/*` *(domaine de production)*
     - `https://resto-master-310f7.web.app/*` *(hébergement Firebase Hosting)*
     - `https://resto-master-310f7.firebaseapp.com/*`
6. **Restrictions d'API** :
   - Cochez **Restreindre la clé**.
   - Dans la liste déroulante, sélectionnez **strictement** les APIs requises par RestoMaster OS :
     - *Identity Toolkit API* (Firebase Auth)
     - *Cloud Firestore API*
     - *Firebase Storage API*
     - *Firebase App Check API*
     - *Token Service API*
7. Cliquez sur **Enregistrer**.

---

## 2. Activation et Déploiement de Firebase App Check

Firebase App Check protège vos ressources Cloud (Firestore, Auth, Storage) contre le scraping, la rétro-ingénierie et les abus automatisés en attestant que les requêtes proviennent exclusivement de votre application légitime.

### 2.1 Configuration de reCAPTCHA Enterprise
1. Dans la [Console Firebase](https://console.firebase.google.com/), ouvrez votre projet.
2. Dans le menu de gauche, rendez-vous dans **Général** > **App Check**.
3. Cliquez sur l'onglet **Applications**, sélectionnez votre application Web.
4. Choisissez le fournisseur **reCAPTCHA Enterprise** (ou reCAPTCHA v3).
5. Suivez l'assistant pour créer ou lier une clé de site reCAPTCHA Enterprise :
   - Définissez les domaines autorisés (ex: `localhost`, `votre-domaine.cm`, `resto-master-310f7.web.app`).
6. Copiez la clé de site publique obtenue et renseignez-la dans votre fichier `.env` :
   ```env
   VITE_FIREBASE_APPCHECK_KEY="6Lc..."
   VITE_FIREBASE_APPCHECK_DEBUG="false"
   ```

### 2.2 Activation du mode Debug pour les développeurs
1. En environnement local (`npm run dev`), ouvrez la console DevTools du navigateur.
2. Firebase affichera un message contenant un token de debug :
   `App Check debug token: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
3. Copiez ce token.
4. Dans la Console Firebase > App Check > Menu de l'application Web > **Gérer les jetons de débogage** (`Debug tokens`).
5. Cliquez sur **Ajouter un jeton de débogage**, nommez-le (ex: `PC-Claus-Dev`) et collez la valeur.

### 2.3 Application des règles de blocage (Enforcement)
1. Une fois que le trafic légitime validé par App Check atteint ~100% dans la console, activez l'**Application forcée (Enforce)** pour :
   - **Cloud Firestore**
   - **Cloud Storage**
2. *Attention : Ne pas forcer l'application tant que l'ensemble des terminaux de caisse n'a pas été déployé avec la nouvelle version.*

---

## 3. Durcissement de Firebase Authentication

Pour empêcher que des utilisateurs non autorisés ne créent des comptes autonomes et ne tentent d'accéder aux données :

1. Dans la Console Firebase, accédez à **Authentication** > **Settings** (Paramètres) > **User account management**.
2. **Désactiver la création publique de comptes** :
   - Désactivez l'option *Autoriser les utilisateurs à créer un compte* si tous les comptes doivent être créés exclusivement par un administrateur ou la direction.
3. Si la création publique doit rester active :
   - Activez l'obligation de **vérification d'adresse e-mail**.
   - Notez que RestoMaster OS attribue désormais automatiquement le rôle `'aucun'` et le statut `active: false` à tout nouvel inscrit non provisionné.
4. **Politique de complexité des mots de passe** :
   - Activez les exigences de mot de passe fort (8 caractères minimum, minuscules, majuscules, chiffres, caractères spéciaux).

---

## 4. Mise en Place des Alertes Budgétaires GCP

Pour vous prémunir contre des dépassements de coûts imprévus :

1. Ouvrez la [Console de Facturation Google Cloud](https://console.cloud.google.com/billing/).
2. Sélectionnez votre compte de facturation.
3. Allez dans **Budgets et alertes** > **Définir un budget**.
4. Définissez un montant cible mensuel adapté (ex: 20 000 FCFA ou 30 EUR pour démarrer).
5. Configurez des seuils d'alerte à :
   - **50%** du budget
   - **90%** du budget
   - **100%** du budget
6. Renseignez l'adresse email de la direction et des administrateurs techniques pour recevoir les notifications instantanées.

---

## 5. Rotation et Révocation de la Clé API Compromise

L'ancienne clé d'API Firebase figurait en clair dans le code source source versionné (`src/lib/firebase.ts`). Elle doit impérativement être renouvelée.

### Procédure de rotation sans interruption de service :
1. Dans Google Cloud Console > **APIs et services** > **Identifiants**.
2. Cliquez sur **+ Créer des identifiants** > **Clé API**.
3. Renommez la nouvelle clé : `RestoMaster-Web-Prod-2026`.
4. Appliquez immédiatement les restrictions de domaines et d'APIs (voir section 1).
5. Mettez à jour les fichiers `.env` sur tous les serveurs et postes de travail :
   ```env
   VITE_FIREBASE_API_KEY="NOUVELLE_CLE_API"
   ```
6. Reconstruisez et déployez l'application (`npm run build`).
7. Vérifiez le bon fonctionnement de l'application pendant 24 à 48 heures.
8. Retournez dans Google Cloud Console et **Supprimez (ou désactivez)** l'ancienne clé API compromise.

---

## 6. Purge de l'Historique Git

Si le dépôt Git est ou a vocation à être hébergé sur une forge publique ou partagée avec des prestataires externes, la clé compromise subsiste dans les commits antérieurs.

### Outil recommandé : `git-filter-repo` (Python)
```bash
# 1. Cloner un miroir propre du dépôt
git clone --mirror https://github.com/votre-compte/Resto-Master.git repo-backup
cd repo-backup

# 2. Remplacer l'ancienne clé API dans tout l'historique
# Créer un fichier de remplacement expressions.txt avec :
# <ANCIENNE_CLE_RETIREE>==>CLE_RETIREE_DE_L_HISTORIQUE

git filter-repo --replace-text expressions.txt

# 3. Forcer la mise à jour des branches distantes
git push origin --force --all
git push origin --force --tags
```

> [!CAUTION]
> La réécriture d'historique Git (`filter-repo`) modifie tous les SHA-1 des commits. Coordonnez cette opération avec l'ensemble des collaborateurs avant l'exécution du `push --force`.

---

*Document produit dans le cadre de la Phase 0 de Durcissement Sécuritaire RestoMaster OS.*
