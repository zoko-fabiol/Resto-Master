# Construire RestoMaster OS avec Tauri 2

Ce document décrit les prérequis du portage desktop Windows/macOS/Linux et Android. Le navigateur reste la cible de référence tant que les phases de parité ne sont pas validées.

## Prérequis communs

- Node.js LTS et npm ;
- Rust stable installé avec `rustup` ;
- les variables Firebase publiques présentes dans `.env` ;
- un projet Firebase accessible depuis l’environnement de build.

Diagnostic local :

```bash
npm run check:tauri
```

Le diagnostic distingue les outils obligatoires pour le projet web et les outils nécessaires uniquement pour Tauri. Il ne considère pas une absence de Rust ou d’Android comme une réussite de build Tauri.

### CSP Tauri

La configuration de production utilise une CSP explicite dans `src-tauri/tauri.conf.json` :

- `script-src` n'autorise que les scripts embarqués (`'self'`) ;
- `connect-src` autorise uniquement les domaines Firebase, Cloud Functions, Cloudinary et les protocoles IPC nécessaires ;
- `img-src` autorise les images locales, les données générées, les blobs, Cloudinary et Firebase Storage ;
- `object-src 'none'`, `base-uri 'self'` et `frame-ancestors 'none'` réduisent les surfaces d'injection ;
- `unsafe-eval` est interdit en production ;
- `style-src 'unsafe-inline'` est conservé car l'interface existante utilise des styles React inline pour des dimensions et positions calculées ; ce n'est pas requis par Tailwind lui-même.

`devCsp` est volontairement plus souple pour permettre le serveur Vite local et le diagnostic pendant `tauri dev`. Il ne doit jamais remplacer la CSP de production dans une livraison.

### Avertissement sur `submitSignup`

> **Avertissement temporaire :** `submitSignup` est une fonction publique sans App Check ni limitation robuste par adresse IP. Le contrôle peut être contourné en changeant d'adresse e-mail. Ne pas déployer cette fonction telle quelle en production ; le flux cible est une création de compte authentifiée avec vérification d'e-mail et App Check.

Le client et la fonction utilisent la région `europe-west1`. Les Cloud Functions de deuxième génération nécessitent le forfait Blaze Firebase.

### Réinitialiser le cache WebView en développement

La suppression de `%LOCALAPPDATA%\com.restomaster.os\EBWebView` est strictement réservée aux machines de test. Ce dossier peut contenir le cache Firestore hors ligne, y compris des ventes non synchronisées. Fermez RestoMaster OS et utilisez uniquement le script contrôlé `.\scripts\reset-webview-cache.ps1` après avoir confirmé la synchronisation des opérations ; ne lancez jamais cette procédure sur un poste client.

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

## Règles de sécurité

- Ne jamais inclure `.env`, un keystore, `local.properties`, `.git` ou `src-tauri/target` dans un livrable.
- La clé Firebase est publique, mais ses restrictions doivent autoriser les origines Tauri réellement utilisées (`tauri://localhost` et `tauri.localhost` selon la configuration).
- Les permissions Tauri seront limitées aux fonctionnalités nécessaires : fichiers utilisateur, impression, presse-papiers, réseau et maintien de l’écran actif.
- Une fonction native doit être appelée via `src/platform/`, jamais directement depuis un composant React.

## État actuel

Le dépôt n’a pas encore d’outillage Rust, Android ou `src-tauri/`. Cette page correspond à la phase T0 ; les phases d’initialisation, d’abstraction native et de parité doivent être réalisées et validées séparément.
