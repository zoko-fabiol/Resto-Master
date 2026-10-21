# RestoMaster OS — Revue Critique des Animations & Micro-Interactions (Emil Kowalski Review)

> Revue de conception et d'ingénierie visuelle selon les critères stricts de la compétence `emil-design-eng`.
> Format standardisé obligatoire : tableau comparatif Before / After / Why.

---

## 1. Revue Détaillée des Animations & Interactions

| Before | After | Why |
| :--- | :--- | :--- |
| `transition-all` sur les boutons génériques (`Button.tsx`) | `transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out` | Éviter d'interpoler involontairement les propriétés de layout lors des changements d'état. |
| Absence d'animation formalisée sur les modales (`Modal.tsx`) | `animate-fade-scale` (`transform: scale(0.96) -> scale(1)`, `opacity: 0 -> 1` en $180\text{ ms}` cubic-bezier(0.16, 1, 0.3, 1)) | Rien dans le monde réel n'apparaît de nulle part ; le léger zoom de $96\%$ à $100\%$ donne une sensation physique ancrée sans ralentir l'utilisateur. |
| Animation toast avec glissement basique (`ToastContext.tsx`) | `animate-toast-slide-in` ($200\text{ ms}` cubic-bezier(0.16, 1, 0.3, 1)) | Cohérence spatiale : les notifications surgissent avec un freinage naturel progressif (`ease-out` rapide au départ, doux à l'arrivée). |
| `transition-all` sur le panneau central de l'application (`App.tsx`) | `transition-[padding] duration-200 ease-out` | Le repli de la barre latérale ne doit animer que l'espacement gauche du contenu, sans recalculer les éléments internes. |
| Cartes interactives sans retour d'enfoncement (`Card.tsx`) | `active:scale-[0.99] transition-[border-color,box-shadow,transform] duration-150 ease-out` | Confirmer immédiatement au doigt ou au clic que l'interface a perçu l'ordre avant même que la navigation ne se déclenche. |
| Rangées d'interrupteurs système sans retour tactile (`ConfigToggleRow.tsx`) | `active:scale-[0.99] transition-transform duration-100 ease-out` | Fournit un micro-retour élastique satisfaisant simulant un interrupteur matériel physique. |
| Bouton de confirmation avec `active:scale-98 transition-all` (`ConfirmDialog.tsx`) | `transition-[background-color,transform] duration-100 ease-out active:scale-98 touch-manipulation` | Suppression du lag tactile 300ms et ciblage strict des deux propriétés peintes/composées. |
| Champ de recherche avec `transition-all` (`SearchInput.tsx`) | `transition-[border-color,box-shadow,background-color] duration-150 ease-out` | Fluidité instantanée du halo de focus sans sautillement du texte intérieur. |
| Absence de gestion de l'accessibilité mouvement | `@media (prefers-reduced-motion: reduce)` désactivant les durées de transition | Respect des utilisateurs sensibles au mal des transports visuel ou aux troubles vestibulaires. |
| Boutons de zoom du plan de salle de taille arbitraire | `min-w-[44px] min-h-[44px] touch-manipulation` | Respect de la cible tactile minimale WCAG 2.5.5 / ergonomie iPad en restauration. |

---

## 2. Principes d'Ingénierie Validés

1. **Fréquence & Nécessité d'Animation** :
   - Les raccourcis clavier et les frappes du pavé numérique de caisse sont à **durée zéro** (aucun délai d'animation).
   - Les modales et tiroirs d'encaissement adoptent une durée de **$150\text{--}180\text{ ms}$** avec une courbe exponentielle de décélération (`cubic-bezier(0.16, 1, 0.3, 1)`).
2. **Propriétés Composites Exclusivement** :
   - Aucune animation de `width`, `height`, `margin` ou `top/left` n'est tolérée dans le code actif.
   - Les transformations spatiales utilisent exclusivement `transform: translate(...) scale(...) rotate(...)`.
3. **Poids Sensoriel des Boutons** :
   - Chaque bouton possède désormais une réponse à l'état `:active` (`scale(0.97)` ou `scale(0.98)`).
   - L'effet cesse dès que le doigt quitte l'écran.
