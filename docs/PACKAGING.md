# RestoMaster OS — Architecture & Stratégie de Packaging Desktop

> Ce document clarifie le statut des technologies de packaging desktop (Electron vs Tauri), détaille les commandes de build et spécifie les règles d'hygiène du dépôt.

---

## 1. Statut Officiel : Electron en Production, Tauri Gelé

| Technologie | Répertoire | Statut | Usage |
| :--- | :--- | :--- | :--- |
| **Electron** | `electron/` | **ACTIF & OFFICIEL (Production)** | Packaging desktop principal pour caisses, bornes de commande et gestionnaires de salle (Windows x64 / Linux / macOS). Intègre l'impression thermique ESC/POS native, la gestion multi-écrans (affichage client / KDS) et le mode hors-ligne. |
| **Tauri 2** | `src-tauri/` | **GELÉ (Exploratoire / Recherche)** | Conservé intact comme prototype pour des explorations futures (faible empreinte mémoire, portage éventuel Android TPE). **Non utilisé pour la distribution client.** |

> **Règle absolue d'équipe** : Aucun fichier de packaging ne doit être supprimé. Le support officiel en production demeure exclusivement **Electron**.

---

## 2. Packaging Officiel : Electron

### Architecture & Composants
- `electron/main.cjs` : Processus principal. Gère le cycle de vie de la fenêtre, le plein écran pour caisses tactiles, les interactions matérielles (tiroir-caisse, imprimantes de tickets de caisse via protocole local) et la synchronisation avec le serveur local en cas de panne réseau.
- `electron/preload.cjs` : Script de préchargement avec `contextBridge` isolant l'environnement Node.js de l'interface utilisateur pour une sécurité maximale.
- `electron-builder.json` : Configuration de distribution pour les installateurs Windows NSIS :
  - Identifiant : `com.restomaster.os`
  - Cible : Installateur Windows exécutable (`.exe`) NSIS 64-bit avec raccourcis Bureau et Menu Démarrer.
  - Sortie : Dossier `release/`.

### Commandes npm
```bash
# Lancement en mode développement (Vite dev server + Electron avec rechargement à chaud)
npm run dev:electron

# Lancement d'Electron sur une instance existante
npm run electron:start

# Construction des bundles optimisés pour Electron (chemins relatifs ./)
npm run build:electron

# Génération de l'installateur Windows final (.exe dans release/)
npm run package:electron
```

---

## 3. Statut de Tauri 2 (Expérimental / Gelé)

Le dossier `src-tauri/` contient la configuration Cargo et Rust pour Tauri 2. Les versions applicatives sont harmonisées avec `package.json` (v1.0.0).

### Commandes npm associées (pour maintenance / test)
```bash
# Diagnostic des prérequis Tauri et Android
npm run check:tauri

# Construction du bundle web compatible Tauri
npm run build:tauri

# Lancement en dev Tauri (nécessite Rust 1.90+ et Microsoft C++ Build Tools)
npm run tauri:dev

# Compilation du binaire Tauri
npm run tauri:build
```

---

## 4. Hygiène du Dépôt & Gestion des Binaires

1. **Exclusion des artefacts de build (`.gitignore`)** :
   - `dist/` et `dist-admin/` : Bundles web compilés.
   - `release/` : Installateurs `.exe` générés par Electron Builder.
   - `build/` : Fichiers temporaires de compilation.
   - `src-tauri/target/` : Artefacts de compilation Rust.

2. **Archive d'outillage `wix314-binaries.zip`** :
   - Cette archive contient les binaires de WiX Toolset v3.14 requis pour l'assemblage d'installateurs Windows en environnement hors-ligne ou contraint.
   - Conformément à la règle `*.zip` dans `.gitignore`, elle n'est pas suivie par git afin de préserver la légèreté du dépôt, mais conservée localement si des builds MSI hors-connexion sont requis.

3. **Variables d'environnement & Sécurité** :
   - `.env` : Fichier local strictement confidentiel, exclu par `.gitignore`.
   - `.env.example` : Modèle de référence exhaustif documentant toutes les variables nécessaires sans aucune clé réelle.
