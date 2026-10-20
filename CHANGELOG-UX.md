# Journal des Améliorations UX & Visuelles — RestoMaster OS

> **Framework de référence** : ECC (Plan → Implement → Review → Verify).
> **Périmètre strict** : Présentation, ergonomie, accessibilité, navigation. Aucune altération de la logique métier (calculs fiscaux, transactions Firestore, Cloud Functions).

---

## Phase A — Gains Rapides (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Métadonnées HTML & Favicon** | Confirmé & Corrigé | `index.html`, `public/favicon.svg` | Ajout de `lang="fr"`, de la balise `<meta name="theme-color" content="#0f172a">` pour les navigateurs mobiles et création d'une icône SVG vectorielle dédiée (cloche/écu ardoise et amber). |
| **2. Dédoublement des Toasts & Accessibilité** | Confirmé & Corrigé | `src/components/ui/Toast.tsx`, `src/context/ToastContext.tsx` | Constat vérifié : `showToast` notifiait les écouteurs locaux ET émettait un événement `CustomEvent('app-global-toast')` que `ToastContainer` écoutait également. Suppression du canal redondant. Ajout de `role="status"`, `aria-live` dynamique (`assertive` pour erreur, `polite` pour les autres) et `aria-label` sur le bouton de fermeture. |
| **3. Suppression des 15 dialogues natifs `alert() / confirm() / prompt()`** | Confirmé & Corrigé | `src/components/ui/ConfirmDialog.tsx`, `src/App.tsx`, `src/components/layout/Header.tsx`, `src/components/settings/sections/FeatureCatalogSection.tsx`, `src/components/settings/sections/HardwareAndSecuritySection.tsx`, `src/components/settings/sections/PrintingHardwareSection.tsx`, `src/components/settings/AdminCenterView.tsx`, `src/components/settings/SettingsView.tsx`, `src/components/staff/Employees.tsx`, `src/components/staff/UserAccountsSection.tsx`, `src/components/tables/TablesView.tsx` | Création de `ConfirmProvider`, `useConfirm()` et `usePrompt()`. Gestion complète du piège de focus, touche Échap, verrouillage du défilement, auto-focus du bouton d'action et variantes stylisées (normal/danger). Audit exhaustif regex : 0 appel natif résiduel. |
| **4. Isolation des pannes par module (`ErrorBoundary`)** | Confirmé & Corrigé | `src/components/common/ModuleErrorBoundary.tsx`, `src/App.tsx` | Création d'un composant de capture d'erreur respectueux de la charte visuelle, avec explications claires en français, bouton "Réessayer" / "Recharger le module", sans écran blanc et sans fuite de stack trace technique aux utilisateurs opérationnels. |
| **5. Typographie système & Chiffres tabulaires** | Confirmé & Corrigé | `src/index.css` | Définition d'une pile typographique système ultra-performante et native (sans dépendance à un CDN externe). Application des chiffres tabulaires (`tabular-nums` / `font-variant-numeric: tabular-nums`) pour aligner parfaitement les montants en FCFA, soldes et compteurs. |

---

## Phase B — Design System & Composants UI (Statut : TERMINÉE)

| Constat / Point | Statut | Fichiers Modifiés | Détails & Justifications |
| :--- | :--- | :--- | :--- |
| **1. Tokens `@theme` dans Tailwind CSS v4** | Confirmé & Implémenté | `src/index.css` | Définition des variables sémantiques : `--color-brand-*` (amber), `--color-success-*` (vert émeraude), `--color-danger-*` (rouge/rose), `--color-warning-*` (orange), `--color-info-*` (bleu ciel), rayons `--radius-*` (xs à 3xl). |
| **2. Bibliothèque de composants UI standardisés** | Confirmé & Créé | `src/components/ui/Button.tsx`, `src/components/ui/Switch.tsx`, `src/components/ui/Field.tsx`, `src/components/ui/Card.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/EmptyState.tsx`, `src/components/ui/PageHeader.tsx`, `src/components/ui/StickyActionBar.tsx`, `src/components/ui/index.ts` | Composants accessibles avec support des cibles tactiles (taille `touch` $\ge 48$ px), focus-visible, ARIA complet et variantes sémantiques. |
| **3. Règle de couleur stricte (Marque vs Statuts)** | Confirmé & Appliqué | `src/index.css`, composants UI, `AGENTS.md` | L'amber est réservé aux actions de marque et boutons principaux. Le vert est strictement appliqué aux statuts activés/en service. Aucun amber n'est utilisé pour signifier "activé". |
| **4. Neutralisation du mode sombre automatique Tailwind v4** | Confirmé & Corrigé | `src/index.css` | Ajout de `@custom-variant dark (&:where(.dark, .dark *));`. Les 497 classes `dark:` du code ne réagissent plus au mode sombre automatique du navigateur (`prefers-color-scheme`), éliminant tout affichage mi-clair mi-sombre accidentel. |
| **5. Règle d'équipe documentée** | Confirmé & Documenté | `AGENTS.md` | Règle gravée dans les directives d'ingénierie : texte $\ge 12$ px partout, $\ge 14$ px pour les contenus de lecture, interdiction formelle de `text-[8px]`, `text-[9px]`, `text-[10px]` dans le code nouveau ou modifié, cibles tactiles $\ge 44-48$ px. |

---

## Vérifications Techniques Phase B
- **TypeScript (`npm run lint` / `tsc --noEmit`)** : Validé (0 erreur).
- **Vite Production Build (`npm run build`)** : Validé (0 erreur de compilation, succès en 1.78s).

---

## Points de Décision en Attente (Avant Phase C)
1. **Routeur (Phase C.1)** : Le projet utilise actuellement un `useState('dashboard')` dans `App.tsx`.
   - Option proposée pour la Phase C : `react-router-dom` v7 (pré-autorisé par vos instructions, standard éprouvé avec support complet des lazy routes et des historiques navigateur) ou alternative légère sans dépendance externe via un routeur Custom Hash / History HTML5.
