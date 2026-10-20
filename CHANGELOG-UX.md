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

## Vérifications Techniques Phase A
- **TypeScript (`npm run lint` / `tsc --noEmit`)** : Validé (0 erreur).
- **Vite Production Build (`npm run build`)** : Validé (0 erreur de compilation, génération des bundles `dist/`).
- **Grep natif** : 0 `window.alert()`, `window.confirm()`, `window.prompt()` restant dans `src/`.

---

## Points de Décision en Attente (Avant Phase B & C)
1. **Mode Sombre (Phase B.4)** : Vérification de la gestion actuelle par Tailwind v4 (`dark:` réagit par défaut au `prefers-color-scheme`). Décision requise : bascule manuelle complète vs désactivation de la variante.
2. **Routeur (Phase C.1)** : Choix du gestionnaire de routes pour les 24 modules applicatifs.
