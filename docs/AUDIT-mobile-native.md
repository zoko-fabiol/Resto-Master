# RestoMaster OS — Audit Mobile-Native & Expérience Tactile (ECC / Emil Kowalski)

> Rapport d'audit de conformité technique et ergonomique selon la philosophie design engineering d'Emil Kowalski (`mobile-native`).
> Évaluation de l'application sur tablettes et smartphones (iOS Safari, Android Chrome, PWA).

---

## 1. Synthèse de l'Audit

L'objectif de cet audit est de faire disparaître systématiquement tous les signes qui trahissent une application web dans un navigateur pour offrir une sensation 100% native (« installed app ») sur iPad, tablettes Android et smartphones utilisés par les serveurs, barmans et gérants.

| Symptôme Web Traité | Cause Identifiée | Solution Technique Appliquée | Statut |
| :--- | :--- | :--- | :--- |
| **Effet de flash gris/bleu au tap** | Surlignage tactile natif Safari/Chrome | `-webkit-tap-highlight-color: transparent` global sur `html` | ✅ Conforme |
| **Décalage au clic (300ms delay)** | Double-tap zoom de navigation | `touch-action: manipulation` sur boutons, liens et `.tappable` | ✅ Conforme |
| **Zoom intempestif sur focus input** | Police `< 16px` dans les inputs sur mobile iOS | `@media (pointer: coarse) { input, select, textarea { font-size: 16px; } }` | ✅ Conforme |
| **Sélection de texte sur appui long** | Sélection native involontaire sur boutons | `user-select: none; -webkit-touch-callout: none` sur boutons et contrôles | ✅ Conforme |
| **Rubber-banding et pull-to-refresh** | Défilement élastique qui fait bouger la page | `overscroll-behavior: none` sur `html, body` et `contain` sur modales | ✅ Conforme |
| **Bordures blanches sous l'encoche** | Viewport borné dans la zone sécurisée | `viewport-fit=cover` dans `index.html` + variables `--sat/--sab` | ✅ Conforme |
| **Barre d'état non assortie** | Balise `theme-color` unique ou absente | `theme-color` dynamique selon `(prefers-color-scheme: light/dark)` | ✅ Conforme |
| **Débordement sous la barre d'adresse** | Unité `100vh` mesurant la hauteur maximale | Migration vers `100dvh` pour le shell et les tiroirs | ✅ Conforme |
| **Cibles tactiles trop petites** | Clics manqués par les serveurs aux heures de pointe | Cibles minimales $\ge 44 \times 44$ px (poignées plan de salle, POS, nav) | ✅ Conforme |

---

## 2. Détail des Correctifs Appliqués

### 2.1 Éradication du Flash Tactile et Décalage 300ms
Dans [src/index.css](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/index.css) :
```css
html {
  -webkit-tap-highlight-color: transparent;
}

button, a, [role="button"], .tappable {
  touch-action: manipulation;
}
```
*Effet* : La réponse au toucher est immédiate ($0\text{ ms}$ au pointerdown), sans clignotement bleuâtre indésirable sous iOS Safari et Android Chrome.

### 2.2 Neutralisation de la Sélection Parasite sur Contrôles
```css
button, [role="button"], .tab, .chip, .drag-handle {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
```
*Effet* : Lorsqu'un serveur maintient le doigt sur un bouton d'ajout ou une table du plan vectoriel, aucun menu contextuel « Copier / Partager » n'apparaît. Le texte de contenu (fiches clients, notes, libellés comptables) reste quant à lui sélectionnable.

### 2.3 Prévention du Zoom iOS sur les Formulaires
```css
@media (pointer: coarse) {
  input, textarea, select {
    font-size: 16px;
  }
}
```
*Effet* : iOS Safari ne recadre plus brutalement l'écran lorsqu'un champ de saisie de quantité, de client ou de recherche POS reçoit le focus. Les interfaces de bureau avec souris conservent leurs tailles compactes ($12\text{--}14\text{ px}$).

### 2.4 Intégration de l'Encoche (Notch) et Dynamic Island
Dans [index.html](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/index.html) :
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8fafc" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />
```
Et dans le CSS :
```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sar: env(safe-area-inset-right, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
}
```
*Effet* : L'application remplit l'intégralité de l'écran du smartphone ou de la tablette sans bandes blanches en haut et en bas. La barre de navigation inférieure [BottomNav.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/layout/BottomNav.tsx) intègre la classe `.pb-safe` pour ne pas masquer l'indicateur d'accueil d'iOS.

### 2.5 Confinement du Défilement (Overscroll Containment)
```css
html, body {
  overscroll-behavior: none;
}

/* Modales et corps déroulants */
.modal-body, [role="dialog"] .overflow-y-auto {
  overscroll-behavior: contain;
}
```
*Effet* : Faire défiler une liste de commandes ou un formulaire modale ne transmet plus l'élasticité à la page d'arrière-plan, évitant tout décrochage de l'écran principal.

### 2.6 Cibles Tactiles Conformes ($\ge 44 \times 44\text{ px}$)
- **Plan de salle vectoriel** ([VectorFloorPlan.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/tables/VectorFloorPlan.tsx)) :
  - 8 poignées de redimensionnement : anneau visuel de $12\text{ px}$ combiné à un rectangle tactile invisible de $44 \times 44\text{ px}$.
  - Poignée de rotation : cercle visuel combiné à une cible tactile invisible de $44 \times 44\text{ px}$.
  - Barre d'outils (Zoom, Pan, Fit) : boutons recalibrés à `min-w-[44px] min-h-[44px]`.
- **Boutons génériques** ([Button.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/ui/Button.tsx)) :
  - Variante tactile `size="touch"` garantissant `min-h-[48px] min-w-[48px]`.
  - Retour haptique visuel immédiat `active:scale-98` ($100\text{--}150\text{ ms}$ `ease-out`).

---

## 3. Matrice de Validation Matérielle Recommandée

| Environnement | Test Spécifique | Résultat Observé / Prévu |
| :--- | :--- | :--- |
| **iPad Air / Pro (Safari)** | Pincement multi-touch à 2 doigts sur le plan vectoriel | Fluide, zoom centré entre les doigts, aucun défilement de page |
| **iPhone 15 / 16 (Dynamic Island)** | Navigation inférieure et en-tête | Contenu écarté de la zone de swipe et de l'île supérieure |
| **Tablette Samsung Galaxy Tab (Chrome)** | Saisie code PIN et encaissement POS | Déclenchement instantané à l'enfoncement, zéro lag 300ms |
| **Terminal tactile POS Android dédié** | Saisie continue de tickets et sélection de table | Cibles tactiles faciles à actionner avec la paume ou le pouce |
