# Construire RestoMaster OS avec Tauri 2

Ce document décrit les prérequis du portage desktop Windows/macOS/Linux et Android. Le navigateur reste la cible de référence tant que les phases de parité ne sont pas validées.

## Prérequis communs

- Node.js LTS et npm ;
- Rust stable installé avec `rustup` ;
- les variables Firebase publiques présentes dans `.env` ;
- un projet Firebase accessible depuis l’environnement de build.

## Relier Tauri à Firebase

Tauri n'exécute pas un Firebase local : son interface React est compilée dans `dist`, puis embarquée dans l'application desktop. Les variables `VITE_*` sont donc injectées au moment du build, jamais après la génération de l'installateur.

### 1. Préparer l'environnement web

Depuis la racine du dépôt Windows :

```powershell
Copy-Item .env.example .env
```

Renseigner dans `.env` les valeurs de l'application Web Firebase créée dans **Console Firebase > Paramètres du projet > Vos applications** :

```dotenv
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="resto-master-310f7.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="resto-master-310f7"
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"
VITE_USE_CLOUD_FUNCTIONS="true"
```

Ne jamais copier `.env` dans Git ni dans l'installateur. Les valeurs `VITE_*` sont intégrées dans le bundle client ; elles ne doivent donc jamais contenir de secret privé.

### 2. Sélectionner le projet Firebase

Le dépôt contient `.firebaserc` avec le projet `resto-master-310f7`. Vérifier l'identité Firebase CLI :

```powershell
npm run firebase:use
npm run firebase:check
```

Le compte utilisé doit avoir les droits de déploiement sur Firebase/Google Cloud. Si `npx firebase-tools` signale une installation corrompue, supprimer uniquement le cache temporaire `npx` concerné puis relancer la commande ; ne pas modifier le code source pour contourner cette erreur.

### 3. Déployer Firestore et les Cloud Functions

Les fonctions RestoMaster sont exportées en région `europe-west1`, notamment `submitSignup` :

```powershell
npm run firebase:deploy
firebase functions:list --project resto-master-310f7
```

La liste doit contenir `submitSignup` avec la région `europe-west1`. Le code source des fonctions ne doit pas être déployé depuis un autre projet.

### 4. Construire Tauri après le déploiement

Chaque modification de `.env`, du frontend ou des fonctions nécessite un nouveau build Tauri :

```powershell
npm run setup:verify
npm run check:tauri
npm run lint
npm run build:tauri
npm run check:tauri
npm run tauri:dev
npm run tauri:build -- --bundles nsis
```

Le nouvel installateur se trouve dans `src-tauri\target\release\bundle\nsis\`. Désinstaller l'ancienne version avant de tester afin de ne pas relancer un ancien bundle.

### Procédure anti-ancien bundle

1. Désinstaller l'ancienne application RestoMaster OS.
2. Fermer tous les processus WebView liés à l'application.
3. Supprimer le cache WebView :
   `%LOCALAPPDATA%\com.restomaster.os\EBWebView`
   Sur une machine de test, le script contrôlé `.\scripts\reset-webview-cache.ps1` peut être utilisé. Cette opération est strictement réservée aux tests et peut supprimer des ventes Firestore hors ligne non synchronisées ; elle ne doit jamais être exécutée sur un poste client.
4. Vérifier le backend :
   `firebase functions:list --project resto-master-310f7`
5. Confirmer que `submitSignup` est déployée en `europe-west1`.
6. Exécuter `npm run build:tauri`, puis `npm run check:tauri`.
7. Tester avec `npm run tauri:dev`.
8. Générer ensuite l'installateur avec `npm run tauri:build -- --bundles nsis`.
9. Installer uniquement le fichier portant la nouvelle version, puis vérifier dans « Détails techniques » du formulaire que le `Build` est récent. Un ancien message `unavailable: Cloud Function ... non configurée ou non déployée` prouve que l'ancien installateur ou un ancien cache est encore utilisé.

Le build Tauri n'embarque aucun service worker PWA. Le contrôle `check:dist` échoue si un ancien chunk, un service worker ou la variable `VITE_USE_CLOUD_FUNCTIONS` incorrecte est détecté.

### CSP Tauri

La configuration de production utilise une CSP explicite dans `src-tauri/tauri.conf.json` :

- `script-src` n'autorise que les scripts embarqués (`'self'`) ;
- `connect-src` autorise uniquement les domaines Firebase, Cloud Functions, Cloudinary et les protocoles IPC nécessaires ;
- `img-src` autorise les images locales, les données générées, les blobs, Cloudinary et Firebase Storage ;
- `object-src 'none'`, `base-uri 'self'` et `frame-ancestors 'none'` réduisent les surfaces d'injection ;
- `unsafe-eval` est interdit en production ;
- `style-src 'unsafe-inline'` est conservé car l'interface existante utilise des styles React inline pour des dimensions et positions calculées ; ce n'est pas requis par Tailwind lui-même.

`devCsp` est volontairement plus souple pour permettre le serveur Vite local et le diagnostic pendant `tauri dev`. Il ne doit jamais remplacer la CSP de production dans une livraison.

| Message affiché | Cause probable | Action |
| --- | --- | --- |
| Le service d'inscription n'est pas déployé sur ce projet. | `submitSignup` absente ou mauvais projet Firebase. | Vérifier `firebase functions:list --project resto-master-310f7` et la région `europe-west1`. |
| Le service est injoignable. | Réseau, WebView ou blocage de sécurité. | Tester la connexion, vérifier le projet et supprimer le cache `EBWebView`. |
| Trop de demandes. | Rate limiting serveur actif. | Attendre quelques minutes avant de réessayer. |
| Le service de demande en ligne est désactivé. | `VITE_USE_CLOUD_FUNCTIONS` n'est pas `true` au build. | Corriger `.env`, reconstruire `dist`, puis reconstruire Tauri. |
| Erreur de validation du serveur. | Données absentes ou invalides. | Corriger les champs du formulaire ; le backend a bien répondu. |

### App Check et Tauri

> **Avertissement temporaire :** `submitSignup` est une fonction publique sans App Check ni limitation robuste par adresse IP. Le contrôle peut être contourné en changeant d'adresse e-mail. Ne pas déployer cette fonction telle quelle en production ; le flux cible est une création de compte authentifiée avec vérification d'e-mail et App Check.

Ne pas activer une clé reCAPTCHA Enterprise dans le build Tauri tant que l'origine desktop n'est pas enregistrée et testée. Utiliser temporairement :

```dotenv
VITE_FIREBASE_APPCHECK_KEY=""
VITE_FIREBASE_APPCHECK_DEBUG="false"
```

Les appels Firebase restent protégés par Authentication, les règles Firestore et les contrôles côté Cloud Functions. App Check pourra être activé séparément après validation de l'origine Tauri et du mécanisme de jeton desktop.

Diagnostic local :

```bash
npm run check:tauri
```

Le diagnostic distingue les outils obligatoires pour le projet web et les outils nécessaires uniquement pour Tauri. Il ne considère pas une absence de Rust ou d’Android comme une réussite de build Tauri.

## Windows

- Microsoft C++ Build Tools avec le workload Desktop C++ ;
- WebView2 Runtime ;
- Rust stable avec la cible Windows MSVC ;
- PowerShell et les outils de signature si une signature de code est prévue.

## macOS et Linux

- Rust stable avec la cible native ;
- les dépendances système indiquées par Tauri 2 pour la distribution visée ;
- WebKitGTK et les paquets de développement requis sous Linux.

## Android

- JDK 17 ;
- Android Studio ;
- Android SDK Platform et Build Tools ;
- Android NDK ;
- `ANDROID_HOME` ou `ANDROID_SDK_ROOT` ;
- `NDK_HOME` ;
- `JAVA_HOME` ;
- `adb` accessible dans le `PATH` ;
- cibles Rust Android : `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android` et `x86_64-linux-android`.

L’APK et l’AAB de production nécessitent un keystore conservé hors du dépôt. Les secrets de signature sont fournis uniquement par variables d’environnement ou par le coffre de l’environnement CI.

### État des vérifications Android du poste de développement

Le build Android n'est pas exécutable sur le poste utilisé pour cette phase : les commandes `java`, `adb`, `sdkmanager` et `gradle` ne sont pas disponibles, et `ANDROID_HOME` n'est pas défini. Cette absence ne constitue pas un succès partiel : les scénarios Android restent **À VÉRIFIER SUR APPAREIL**.

Après installation du JDK, du SDK Android, du NDK et d'ADB, vérifier :

```powershell
java --version
adb version
sdkmanager --version
$env:ANDROID_HOME
npx tauri android init
npx tauri android build --apk
```

Installer ensuite l'APK sur un appareil ou un émulateur et tester connexion Firebase, vente hors ligne, bouton Retour, écran KDS, export, impression TCP et Bluetooth. Consigner chaque résultat dans la matrice de parité ; ne pas annoncer la parité Android avant ces tests.

## Fonctions natives Tauri activées

Les plugins Tauri de dialogue, système de fichiers, presse-papiers et ouverture de liens sont enregistrés dans `src-tauri/src/lib.rs` avec des permissions dédiées. Les exports utilisent la boîte « Enregistrer sous » puis une écriture réelle ; une annulation ou une erreur de permission est remontée à l'interface.

Sur Windows, l'impression brute locale utilise désormais le spouleur par nom d'imprimante. L'impression réseau utilise la commande TCP sur le port configuré, par défaut `9100`. Une imprimante physique doit encore être utilisée pour prouver le résultat matériel.

## Règles de sécurité

- Ne jamais inclure `.env`, un keystore, `local.properties`, `.git` ou `src-tauri/target` dans un livrable.
- La clé Firebase est publique, mais ses restrictions doivent autoriser les origines Tauri réellement utilisées (`tauri://localhost` et `tauri.localhost` selon la configuration).
- Les permissions Tauri seront limitées aux fonctionnalités nécessaires : fichiers utilisateur, impression, presse-papiers, réseau et maintien de l’écran actif.
- Une fonction native doit être appelée via `src/platform/`, jamais directement depuis un composant React.

## État actuel

Le portage Windows Tauri 2 est initialisé et peut produire un installateur NSIS. Android, les abstractions natives de fichiers/impression/presse-papiers et la signature de code restent des étapes séparées.
