# RestoMaster OS — Agentic Engineering Guidelines (ECC Framework)

> Intégration du framework **ECC (Agentic Engineering Toolkit / Everything Claude Code)** adapté spécifiquement à **RestoMaster OS**.
> Ce document définit l'architecture, les conventions, le cycle de développement et les politiques de sécurité pour tous les agents IA intervenant sur la plateforme.

---

## 1. Cycle de Développement ECC (Core Workflow)

Tout agent IA opérant sur ce dépôt doit impérativement respecter le cycle en 6 étapes :

$$\text{1. Plan} \longrightarrow \text{2. Test} \longrightarrow \text{3. Implement} \longrightarrow \text{4. Review} \longrightarrow \text{5. Verify} \longrightarrow \text{6. Remember}$$

### Étape 1 : Plan (Recherche & Cadrage)
* Inspecter l'existant avant d'écrire la moindre ligne de code (lire les types dans `src/types/`, les services dans `src/services/firestore/`).
* Identifier les impacts croisés : ex. une modification de commande impacte la table, le KDS cuisine/bar, le stock théorique et la caisse.
* Proposer un plan clair et concis avant d'exécuter des modifications majeures.

### Étape 2 : Test & Contrats d'Interface
* Définir ou mettre à jour les types TypeScript dans `src/types/restaurant.ts`.
* Préparer les scénarios de test nominaux, les cas limites (quantités nulles, montants négatifs, rupture réseau Firebase, devise inhabituelle) et les erreurs potentielles.

### Étape 3 : Implement (Développement Atomique)
* Implémenter le code de manière chirurgicale, sans écraser de fichiers entiers sans nécessité.
* Respecter la séparation stricte : Vue UI (`src/components/`) $\leftrightarrow$ Logique Métier & Hooks $\leftrightarrow$ Services Firestore (`src/services/firestore/`).

### Étape 4 : Review (Auto-revue critique)
* Vérifier le respect du typage strict (`strict: true`, aucun type `any` toléré).
* S'assurer que les chaînes visibles par l'utilisateur sont en français soigné et naturel.
* Vérifier la gestion des états de chargement, d'erreur et d'absence de données.

### Étape 5 : Verify (Validation & Santé)
* Exécuter systématiquement la validation TypeScript : `npm run lint` (`tsc --noEmit`).
* S'assurer qu'aucune régression de build n'est introduite (`npm run build`).
* Valider visuellement ou structurellement que les composants s'intègrent au design Tailwind CSS v4 existant.

### Étape 6 : Remember (Capitalisation)
* Mettre à jour la documentation ou les règles si un pattern réutilisable a émergé.

---

## 2. Rôles et Profils d'Agents Spécialisés

Lorsque vous intervenez sur le projet, adoptez l'un des profils d'agent ECC selon la tâche :

| Agent | Rôle & Responsabilité | Fichiers Clés |
| :--- | :--- | :--- |
| `@planner` | Spécification, décomposition fonctionnelle, détection des effets de bord | `README.md`, specs |
| `@architect` | Modélisation des données Firestore, collections, transactions atomiques | `src/types/`, `src/services/firestore/`, `firestore.rules` |
| `@frontend-artisan` | Composants UI, accessibilité, Tailwind CSS v4, micro-interactions, responsive | `src/components/`, `src/index.css` |
| `@security-shield` | Contrôle d'accès RBAC, code PIN superviseur, règles de sécurité Firestore, journal d'audit | `src/services/permissions/`, `src/components/auth/`, `firestore.rules` |
| `@reviewer` | QA technique, conformité TypeScript, prévention des régressions, performance | `npm run lint`, `npm run build` |

---

## 3. Invariants Métier RestoMaster OS (Règles Inviolables)

1. **Source Unique de Vérité** : Firestore est la référence temps réel. Tout état local doit être synchronisé ou dérivé des services Firestore.
2. **Déduction des Stocks** : La validation d'une commande POS ou le passage en production doit systématiquement déduire les ingrédients selon les fiches techniques des recettes (`recipeIngredients`).
3. **Session de Caisse** : Aucun encaissement en espèces ne peut avoir lieu sans une session de caisse active (`CashRegisterSession`). Tout écart à la clôture journalière doit être consigné avec justification.
4. **Validation Superviseur (PIN)** : Les actions critiques (remises exceptionnelles, annulation de commande envoyée, clôture forcée de caisse, réinitialisation) requièrent l'authentification PIN d'un superviseur / manager.
5. **Traçabilité & Audit Trail** : Toute action sensible (encaissement, annulation, dépense, mouvement de stock manuel) doit émettre un enregistrement immuable dans la collection d'audit (`AuditLog`).
6. **Gestion des Montants Financiers** : Arrondir précisément les calculs de TVA et totaux (éviter les bugs de précision flottante JavaScript via des helpers dédiés).

---

## 4. Conventions Techniques

### Stack Technologique
- **Framework** : React 19 (Hooks fonctionnels, `useState`, `useEffect`, `useMemo`, `useCallback`)
- **Langage** : TypeScript 5.8+ (mode strict, typage exhaustif)
- **Styling** : Tailwind CSS v4 (classes utilitaires, tokens `@theme`, palette sémantique)
- **Base de données** : Firebase Firestore (SDK modulaire v12, `onSnapshot`, `runTransaction`, `writeBatch`)
- **Icônes & Animation** : `lucide-react`, `motion`, `canvas-confetti`

### Règles d'Équipe UI & Typographie (Design System)
1. **Échelle Typographique Minimale** :
   - Texte $\ge$ 12 px (`text-xs`) sur l'ensemble de l'interface (labels secondaires, badges).
   - Texte $\ge$ 14 px (`text-sm`) pour tous les contenus de lecture, descriptions, listes et champs de saisie.
   - **Interdiction formelle** d'utiliser des polices arbitraires minuscules (`text-[8px]`, `text-[9px]`, `text-[10px]`) dans le code nouveau ou modifié.
2. **Chiffres Tabulaires Obligatoires** :
   - Tout montant financier (FCFA, taxes), solde de caisse, décompte KDS ou compteur doit utiliser la classe `tabular-nums` ou l'attribut `data-tabular-nums="true"` pour garantir un alignement vertical parfait.
3. **Usage Strict de la Palette Sémantique** :
   - **Amber (`--color-brand-*`)** : réservé exclusivement à l'identité de marque et à l'action principale (bouton primaire, élément actif de navigation de marque).
   - **Interdiction formelle** d'utiliser l'amber pour signifier un état "activé" (utiliser systématiquement le vert/émeraude `success`).
   - **Vert / Émeraude (`--color-success-*`)** : statut actif, en service, payé, opérationnel.
   - **Rouge / Rose (`--color-danger-*`)** : suppression, annulation, erreur, retard critique.
   - **Orange (`--color-warning-*`)** : attente, avertissement, attention.
   - **Bleu (`--color-info-*`)** : information, transfert, synchronisation.
4. **Cibles Tactiles pour Tablettes & POS** :
   - Tout élément interactif sur POS, Tables et KDS doit respecter une cible tactile $\ge 44 \times 44\text{ px}$ (idéalement $\ge 48\text{ px}$ via la taille tactile `Button size="touch"`).

### Structure des Dossiers
```text
src/
├── components/          # Composants UI modulaires découpés par domaine
│   ├── auth/            # Authentification, PIN modal, sélection de profil
│   ├── pos/             # Écran de vente, panier, sélection de menu
│   ├── tables/          # Plan de salle interactif
│   ├── kds/             # Kitchen & Bar Display Systems
│   ├── stock/           # Inventaire, mouvements, fiches ingrédients
│   ├── cash/            # Gestion et clôture de caisse
│   └── common/          # Modales génériques, badges, boutons réutilisables
├── context/             # React Contexts (RestaurantContext, AuthContext, etc.)
├── services/
│   ├── firestore/       # Services d'accès aux collections Firestore (CRUD + temps réel)
│   ├── permissions/     # Matrice des droits RBAC
│   ├── printing/        # Impression thermique et tickets certifiés
│   └── fiscal/          # Calculs fiscaux et devises
├── types/
│   └── restaurant.ts    # Types TypeScript centralisés
└── lib/                 # Utilitaires, seedData, helpers
```

---

## 5. AgentShield : Politiques de Sécurité

- **Zéro fuite de credentials** : Ne jamais commiter de clés secrètes, tokens d'API ou mots de passe en clair.
- **Validation des entrées utilisateur** : Assainir les inputs de recherche et formulaires.
- **Protection des transactions** : Utiliser `writeBatch` ou `runTransaction` pour toute opération multi-documents (ex: créer une commande + mettre à jour la table + déduire le stock).
- **Règles Firestore** : Toujours aligner les accès services avec les permissions définies dans `firestore.rules`.
