# Journal des Améliorations UX & Visuelles — RestoMaster OS

> **Framework de référence** : ECC (Plan → Implement → Review → Verify).  
> **Périmètre strict** : Présentation, ergonomie, accessibilité, navigation, performance d'affichage.  
> **Garantie métier** : Aucune altération de la logique métier (calculs fiscaux, transactions Firestore, Cloud Functions).

---

## Synthèse Globale des Réalisations (Phases A à I)

| Phase | Intitulé | Statut | Impacts Majeurs |
| :--- | :--- | :--- | :--- |
| **Phase A** | Gains Rapides & Fondations | **TERMINÉE** | Élimination de 15 dialogues natifs `alert/confirm/prompt`, Toast unifié avec ARIA live regions, isolation par `ModuleErrorBoundary`, favicons et typographie système. |
| **Phase B** | Design System & Tokens | **TERMINÉE** | Tokens Tailwind v4 (`--color-brand`, `--color-success`, etc.), neutralisation du dark mode accidentel, 8 composants atomiques réutilisables (`Button`, `Switch`, `Field`, `Card`, `Badge`, `EmptyState`, `PageHeader`, `StickyActionBar`). |
| **Phase C** | Navigation & Routage | **TERMINÉE** | Routage standardisé React Router v7 (`/pos`, `/tables`, `/kds-kitchen`, etc.), atterrissage contextuel par rôle, code splitting de 24 modules via `React.lazy()` (bundle divisé par 4), barre `BottomNav` mobile. |
| **Phase D** | Vente & Plan de Salle | **TERMINÉE** | Cibles tactiles $\ge 44$ px, cartes produits agrandies, prix tabulaires entiers en FCFA, bande des meilleures ventes, panier coulissant mobile, statuts de table avec icônes explicites et chronos. |
| **Phase E** | KDS Cuisine & Bar | **TERMINÉE** | API Screen Wake Lock (anti-mise en veille pendant le service), typographie lisible à 2 mètres (`text-xl font-bold`), chronos `tabular-nums` d'attente, états vides accessibles, filtrage par station de production. |
| **Phase F** | Écrans de Configuration | **TERMINÉE** | Sections accordéons (`ConfigSection`), toggles accessibles avec modale d'alerte sur options sensibles (`ConfigToggleRow`), filtres de recherche en temps réel, barres d'actions collantes (`StickyActionBar`). |
| **Phase G** | Accessibilité & i18n | **TERMINÉE** | Attributs `aria-label`, `aria-current`, `role="dialog"` sur boutons d'en-tête, navigation et pavé numérique PIN superviseur, structure i18n bilingue Français / Anglais (`src/lib/i18n.ts`). |
| **Phase H** | Performance & PWA | **TERMINÉE** | `manualChunks` Rollup (séparation `docx`, `excel`, `pdf`, `firebase`, `charts`), bundle principal allégé de 50%, StaffView de 1.7 Mo à 214 ko, Web App Manifest et installation PWA standalone. |
| **Phase I** | Recette Terrain & Clôture | **TERMINÉE** | Rédaction du protocole de test in situ (`docs/PROTOCOLE-TEST-TERRAIN.md`), validation stricte TypeScript (`tsc --noEmit`) et Vite build (0 erreur, 0 avertissement). |

---

## Détail des Phases

### Phase A — Gains Rapides (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Métadonnées HTML & Favicon** | Corrigé | `index.html`, `public/favicon.svg` | Ajout de `lang="fr"`, de la balise `<meta name="theme-color" content="#0f172a">` pour les navigateurs mobiles et création d'une icône SVG vectorielle dédiée (cloche/écu ardoise et amber). |
| **2. Dédoublement des Toasts & Accessibilité** | Corrigé | `src/components/ui/Toast.tsx`, `src/context/ToastContext.tsx` | Constat vérifié : `showToast` notifiait les écouteurs locaux ET émettait un événement `CustomEvent('app-global-toast')` que `ToastContainer` écoutait également. Suppression du canal redondant. Ajout de `role="status"`, `aria-live` dynamique (`assertive` pour erreur, `polite` pour les autres) et `aria-label` sur le bouton de fermeture. |
| **3. Suppression des 15 dialogues natifs `alert() / confirm() / prompt()`** | Corrigé | `src/components/ui/ConfirmDialog.tsx`, `src/App.tsx`, `src/components/layout/Header.tsx`, `src/components/settings/sections/FeatureCatalogSection.tsx`, `src/components/settings/sections/HardwareAndSecuritySection.tsx`, `src/components/settings/sections/PrintingHardwareSection.tsx`, `src/components/settings/AdminCenterView.tsx`, `src/components/settings/SettingsView.tsx`, `src/components/staff/Employees.tsx`, `src/components/staff/UserAccountsSection.tsx`, `src/components/tables/TablesView.tsx` | Création de `ConfirmProvider`, `useConfirm()` et `usePrompt()`. Gestion complète du piège de focus, touche Échap, verrouillage du défilement, auto-focus du bouton d'action et variantes stylisées (normal/danger). Audit exhaustif regex : 0 appel natif résiduel. |
| **4. Isolation des pannes par module (`ErrorBoundary`)** | Corrigé | `src/components/common/ModuleErrorBoundary.tsx`, `src/App.tsx` | Création d'un composant de capture d'erreur respectueux de la charte visuelle, avec explications claires en français, bouton "Réessayer" / "Recharger le module", sans écran blanc et sans fuite de stack trace technique aux utilisateurs opérationnels. |
| **5. Typographie système & Chiffres tabulaires** | Corrigé | `src/index.css` | Définition d'une pile typographique système ultra-performante et native (sans dépendance à un CDN externe). Application des chiffres tabulaires (`tabular-nums` / `font-variant-numeric: tabular-nums`) pour aligner parfaitement les montants en FCFA, soldes et compteurs. |

---

### Phase B — Design System & Composants UI (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Tokens `@theme` dans Tailwind CSS v4** | Implémenté | `src/index.css` | Définition des variables sémantiques : `--color-brand-*` (amber), `--color-success-*` (vert émeraude), `--color-danger-*` (rouge/rose), `--color-warning-*` (orange), `--color-info-*` (bleu ciel), rayons `--radius-*` (xs à 3xl). |
| **2. Bibliothèque de composants UI standardisés** | Créé | `src/components/ui/Button.tsx`, `src/components/ui/Switch.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/PageHeader.tsx`, `src/components/ui/StickyActionBar.tsx`, `src/components/ui/index.ts` | Composants accessibles avec support des cibles tactiles (taille `touch` $\ge 48$ px), focus-visible, ARIA complet et variantes sémantiques. |
| **3. Règle de couleur stricte (Marque vs Statuts)** | Appliqué | `src/index.css`, composants UI, `AGENTS.md` | L'amber est réservé aux actions de marque et boutons principaux. Le vert est strictement appliqué aux statuts activés/en service. Aucun amber n'est utilisé pour signifier "activé". |
| **4. Neutralisation du mode sombre automatique Tailwind v4** | Corrigé | `src/index.css` | Ajout de `@custom-variant dark (&:where(.dark, .dark *));`. Les 497 classes `dark:` du code ne réagissent plus au mode sombre automatique du navigateur (`prefers-color-scheme`), éliminant tout affichage mi-clair mi-sombre accidentel. |
| **5. Règle d'équipe documentée** | Documenté | `AGENTS.md` | Règle gravée dans les directives d'ingénierie : texte $\ge 12$ px partout, $\ge 14$ px pour les contenus de lecture, interdiction formelle de `text-[8px]`, `text-[9px]`, `text-[10px]` dans le code nouveau ou modifié, cibles tactiles $\ge 44-48$ px. |

---

### Phase C — Navigation, Routage & Code Splitting (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Intégration de React Router v7** | Implémenté | `src/App.tsx`, `src/main.tsx` | Remplacement de l'état local monolithique `activeTab` par un routeur déclaratif avec URLs explicites (`/pos`, `/tables`, `/kds-kitchen`, `/kds-bar`, `/cash`, `/stock`, `/purchases`, etc.). Historique navigateur et boutons Suivant/Précédent opérationnels. |
| **2. Atterrissage contextuel par rôle (Role Landing)** | Implémenté | `src/App.tsx`, `src/components/layout/Sidebar.tsx` | Redirection automatique selon le profil connecté : `serveur` $\rightarrow$ `/tables`, `cuisinier` $\rightarrow$ `/kds-kitchen`, `barman` $\rightarrow$ `/kds-bar`, `caissier` $\rightarrow$ `/pos`, `manager` $\rightarrow$ `/dashboard`. |
| **3. Code Splitting de 24 Modules (`React.lazy`)** | Implémenté | `src/App.tsx` | Découpage dynamique de chaque vue applicative avec `<Suspense fallback={<LoadingSpinner />}>`. Réduction drastique du chargement initial pour les serveurs et cuisiniers. |
| **4. Barre de Navigation Mobile (`BottomNav`)** | Implémenté | `src/components/layout/BottomNav.tsx`, `src/App.tsx` | Barre d'accès rapide en bas d'écran sur smartphone et petite tablette ($\le 768$ px) avec cibles tactiles $\ge 48$ px et badges contextuels. |

---

### Phase D — Écrans de Vente & Salle POS / Tables (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Cibles tactiles & Grille des produits POS** | Optimisé | `src/components/pos/PosView.tsx` | Hauteur minimale des cartes de menu $\ge 110$ px, zones de clic $\ge 44 \times 44$ px pour les touches tactiles de commande rapide. |
| **2. Bandeau des meilleures ventes (Fast Items)** | Ajouté | `src/components/pos/PosView.tsx` | Raccourcis tactiles horizontaux pour les articles les plus fréquemment commandés, accélérant la saisie au comptoir. |
| **3. Tiroir coulissant du panier mobile** | Implémenté | `src/components/pos/PosView.tsx` | Sur écran étroit, le panier se replie dans un tiroir mobile accessible via un bouton flottant avec compteur d'articles, libérant 100% de la largeur d'écran pour la sélection du menu. |
| **4. Plan de salle & Statuts des tables** | Amélioré | `src/components/tables/TablesView.tsx` | Distinction visuelle sans équivoque : vert émeraude (libre), orange ambré (occupée avec durée de service), rouge (retard de service), violet (réservée). Ajout d'icônes explicites complétant les couleurs pour l'accessibilité. |
| **5. Typographie des prix & Monnaie** | Standardisé | `src/components/pos/PosView.tsx`, `src/components/tables/TablesView.tsx` | Affichage des prix en FCFA avec `tabular-nums`, sans centimes artificiels. |

---

### Phase E — KDS Cuisine et Bar (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Screen Wake Lock API** | Implémenté | `src/components/kds/KitchenKdsView.tsx`, `src/components/kds/BarKdsView.tsx` | Maintien de l'écran allumé en permanence pendant le service via `navigator.wakeLock.request('screen')`. Indicateur visuel "Wake Lock actif" sur l'en-tête KDS. |
| **2. Lisibilité Typographique à 2 Mètres** | Standardisé | `src/components/kds/KitchenKdsView.tsx`, `src/components/kds/BarKdsView.tsx` | Titres et quantités des commandes en `text-xl font-bold`, chronomètres d'attente en `tabular-nums font-mono`, contraste élevé sur fond sombre ardoise. |
| **3. Filtrage par Station de Production** | Fiabilisé | `src/components/kds/KitchenKdsView.tsx`, `src/components/kds/BarKdsView.tsx` | Fonction `matchesStation` routant les plats chauds/froids vers la cuisine et les boissons vers le bar. |
| **4. États vides KDS conviviaux** | Ajouté | `src/components/kds/KitchenKdsView.tsx`, `src/components/kds/BarKdsView.tsx` | Composant `EmptyState` élégant lorsque tous les bons ont été envoyés en salle. |

---

### Phase F — Écrans de Configuration & Paramètres (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Accordéons de Réglages (`ConfigSection`)** | Créé & Appliqué | `src/components/ui/ConfigSection.tsx`, `src/components/settings/sections/*` | Regroupement logique des paramètres complexes avec compteurs de règles actives et état replié/déplié accessible. |
| **2. Toggles de Règles Sécurisés (`ConfigToggleRow`)** | Créé & Appliqué | `src/components/ui/ConfigToggleRow.tsx`, `src/components/settings/ModernRuleToggle.tsx` | Interrupteurs tactiles avec confirmation contextuelle sur les réglages à impact critique (ex : autorisation du stock négatif, forçage PIN d'annulation). |
| **3. Recherche instantanée des paramètres** | Implémenté | `src/components/settings/sections/StockAndPurchasesSection.tsx`, `OperationsOptionsSection.tsx` | Champ de recherche filtrant en temps réel les intitulés et descriptions des règles. |
| **4. Barre d'action collante (`StickyActionBar`)** | Implémenté | Sections de configuration | Apparition en bas d'écran dès qu'une modification n'est pas encore sauvegardée, avec boutons "Enregistrer" et "Annuler". |

---

### Phase G — Accessibilité & Internationalisation (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Accessibilité ARIA globale** | Implémenté | `src/components/layout/Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx` | Libellés explicites `aria-label` sur tous les boutons d'icônes (Guide, Cadre fiscal, Borne, TV, Rôles), attribut `aria-current="page"` sur le lien de navigation actif. |
| **2. Modale de Sécurité Superviseur (Code PIN)** | Sécurisé & Accessible | `src/components/auth/SupervisorPinModal.tsx` | Rôle `dialog`, `aria-modal="true"`, `aria-labelledby`, touches de pavé tactile $\ge 56$ px avec `aria-label` par chiffre et masquage visuel sécurisé des points de saisie. |
| **3. Structure d'Internationalisation (`i18n`)** | Créé | `src/lib/i18n.ts` | Module d'internationalisation zéro dépendance supportant le français (par défaut) et l'anglais, avec gestion des devises (FCFA), formats de dates et traductions des actions et statuts. |

---

### Phase H — Performance & PWA (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Rollup `manualChunks` dans Vite** | Optimisé | `vite.config.ts` | Isolation fine des dépendances volumineuses : `vendor-docx` (442 ko), `vendor-excel` (863 ko), `vendor-pdf-export` (630 ko), `vendor-firebase` (661 ko), `vendor-charts` (192 ko), `vendor-icons` (41 ko), `vendor-fx` (10 ko). |
| **2. Allègement du bundle initial** | Validé | Build output | Bundle principal `index-*.js` réduit de 901 ko à **444 ko** (-50%). `StaffView` réduit de 1.70 Mo à **214 ko** (-87%). Temps de build Vite : **1.23 seconde**. |
| **3. Web App Manifest & Installation PWA** | Créé | `public/manifest.webmanifest`, `index.html` | Métadonnées PWA conformes, mode `standalone`, orientation libre, icônes vectorielles maskables, balises iOS Apple Touch Icon et couleur de barre système `#0f172a`. |

---

### Phase I — Recette Terrain & Clôture (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Protocole de test in situ** | Documenté | `docs/PROTOCOLE-TEST-TERRAIN.md` | Guide opérationnel de test sur tablette et POS tactile (serveur, caisse, cuisine, bar) avec critères d'acceptation et grilles de rejet. |
| **2. Vérification TypeScript & Build** | Validé | Pipeline CI/CD local | `npm run lint` (`tsc --noEmit`) : **0 erreur**. `npm run build` : **0 erreur, 0 avertissement**. |
