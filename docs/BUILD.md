# RestoMaster OS — Guide de Build, Environnement & Émulateurs

> **Important** : L'intégralité du développement et des tests de la suite RestoMaster OS s'exécute sur les **émulateurs Firebase locaux**. Aucun déploiement cloud n'est exécuté sans activation préalable du forfait Blaze.

---

## 1. Environnement de Développement Local (Émulateurs Firebase)

Le projet utilise la suite d'émulateurs Firebase pour simuler l'ensemble des services sans consommer de quota cloud ni encourir de frais.

### Ports des Émulateurs configurés (`firebase.json`) :
| Service | Port | Description |
| :--- | :--- | :--- |
| **Auth** | `9099` | Simulation des comptes utilisateurs, custom claims et jetons |
| **Firestore** | `8080` | Base documentaire temps réel avec moteur de règles |
| **Functions** | `5001` | Exécution locale des Cloud Functions v2 (Node.js 20) |
| **UI Émulateurs** | `4000` | Console web locale pour visualiser les données et sessions |

### Démarrage des Émulateurs :
```bash
npm run emulators:start
```

### Activation de la Connexion Client aux Émulateurs :
Dans le fichier `.env` ou `.env.local` :
```env
VITE_USE_EMULATORS=true
```
Lorsque cette variable est égale à `true`, `src/lib/firebase.ts` connecte automatiquement Auth, Firestore et Functions aux ports locaux ci-dessus.

> [!WARNING]
> **Sécurité de Build** : La variable `VITE_USE_EMULATORS` ne doit **JAMAIS** être activée pour un build de production. Le script `scripts/check-build-env.ts` (exécuté automatiquement avant `npm run build`) échoue immédiatement si `VITE_USE_EMULATORS=true` est détecté.

---

## 2. Déploiement Cloud & Forfait Firebase Blaze

Le déploiement des Cloud Functions v2 et des règles en production exigera le forfait **Blaze** (Pay-as-you-go).

### Procédure d'Activation par le Propriétaire :
1. **Passer au forfait Blaze** sur la console Firebase (`resto-master-310f7`).
2. **Configurer une alerte de budget Google Cloud** :
   - Plafond d'alerte recommandé : 10 € / 6 500 FCFA avec alertes par email à 50%, 90% et 100%.
3. **Plafonnement des Instances (`maxInstances`)** :
   - Chaque fonction dans `functions/src/` doit être configurée avec un `maxInstances` bas (entre 2 et 5) pour empêcher tout emballement des coûts.
4. **App Check (reCAPTCHA Enterprise)** :
   - App Check doit être appliqué sur les points d'entrée des Cloud Functions pour rejeter toute requête ne provenant pas de l'application certifiée RestoMaster OS.
