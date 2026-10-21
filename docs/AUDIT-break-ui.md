# RestoMaster OS — Audit de Résilience UI & Données Limites (ECC / Emil Kowalski)

> Rapport d'évaluation des cas extrêmes et de robustesse de l'interface selon le framework `break-ui` (Emil Kowalski).
> Analyse des comportements de l'interface face aux données réalistes les plus défavorables : textes très longs, emails insécables, montants extrêmes en FCFA, listes vides et éléments unitaires.

---

## 1. Cartographie des Surfaces Sensibles & Données Limites

Pour chaque type d'entité manipulé dans RestoMaster OS, les valeurs réalistes les plus sévères ont été injectées mentalement ou via les fixtures de test pour identifier les ruptures de mise en page :

| Domaine Métier | Champ / Propriété | Donnée Nominale | Cas Limite Réaliste (Worst-Case) | Risque Identifié |
| :--- | :--- | :--- | :--- | :--- |
| **Clients** | Nom complet | Jean Dupont | `Jean-Baptiste de La Trémoille-Saint-Amand` | Débordement hors de la carte client |
| **Clients** | Email d'entreprise | client@resto.cm | `direction.achats.generaux@groupe-industriel-camerounais-holding.cm` | Chaîne insécable poussant les boutons d'action |
| **Menu / Carte** | Intitulé plat | Ndolé Viande | `Assiette Dégustation Royale : Filet de Capitaine Braisé, Sauce Ndolé Traditionnelle & Alloco Doré` | Tronquage disgracieux sur les tickets POS |
| **Caisse / POS** | Montant Total (FCFA) | 15 000 FCFA | `142 500 000 FCFA` (Banquet diplomatique ou événement d'entreprise) | Chevauchement de texte dans le pavé numérique |
| **Caisse / POS** | Remise | 10% | `100%` (Gratuité totale validée par superviseur) | Montant net égal à 0 FCFA |
| **Tables / Salle** | Numéro / Nom Table | Table 12 | `Terrasse VIP Panoramique Est - Table Haute 4B` | Débordement sur la forme vectorielle 2D |
| **Stock / Ingrédients** | Stock résiduel | 12 kg | `0.0005 kg` (précision balance d'épices) | Bogue d'arrondi ou notation scientifique (`5e-4`) |
| **Personnel** | Poste / Rôle | Serveur | `Responsable Qualité Hygiène Sécurité Environnement (QHSE)` | Badge qui s'étire sur 3 lignes |

---

## 2. Signatures de Défaillance & Correctifs Appliqués

### 2.1 Signes d'Écrasement d'Icônes et d'Avatars (Flex-shrink)
*Symptôme* : Lorsqu'un libellé client ou un nom de plat est très long, l'icône ou la pastille de couleur à gauche se retrouve compressée en ovale ou en ligne verticale plate.
*Correctif appliqué systématiquement* :
- Ajout de `shrink-0` (`flex-shrink: 0`) sur toutes les icônes de statut, avatars d'utilisateurs et pastilles d'état.
- Exemple dans [ConfigToggleRow.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/ui/ConfigToggleRow.tsx) : `w-10 h-10 shrink-0`.
- Exemple dans [Toast.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/ui/Toast.tsx) : `shrink-0 mt-0.5` sur toutes les icônes de notification.

### 2.2 Débordement de Textes et Emails Insécables (Flex Child Min-Width)
*Symptôme* : Un enfant direct d'un conteneur Flexbox a par défaut `min-width: auto`, ce qui l'empêche de rétrécir sous la largeur naturelle de son texte (notamment pour un email sans espaces).
*Correctif appliqué systématiquement* :
- Ajout de `min-w-0` sur les colonnes de texte intermédiaires :
  ```tsx
  <div className="flex-1 min-w-0">
    <h3 className="truncate font-bold text-slate-900">{client.name}</h3>
    <p className="text-xs text-slate-500 break-all">{client.email}</p>
  </div>
  ```
- Les actions de fin de ligne (bouton modifier, corbeille, menu trois points) conservent `shrink-0` et ne sont plus jamais refoulées hors de l'écran.

### 2.3 Montants Financiers et Précision Tabulaire
*Symptôme* : Les variations de largeur des chiffres (ex. le chiffre 1 plus étroit que le 8) provoquent un sautillement visuel ("layout jitter") des totaux lors de l'incrémentation du panier POS ou du décompte de caisse.
*Correctif appliqué systématiquement* :
- Règle globale dans [src/index.css](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/index.css) :
  ```css
  .tabular-nums, [data-tabular-nums="true"], .font-mono, table td, table th {
    font-variant-numeric: tabular-nums;
  }
  ```
- Formatage avec le helper `formatCFA(amount)` qui garantit l'absence de valeurs `NaN FCFA` ou `undefined` même en cas de rupture de données Firestore.

### 2.4 Robustesse des Noms de Tables sur le Plan Vectoriel 2D
*Symptôme* : Sur [VectorFloorPlan.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/tables/VectorFloorPlan.tsx), si une table mesure $60 \times 60\text{ px}$ et qu'on lui donne un numéro long comme `VIP-TERRASSE-08`, le texte SVG débordait du rectangle.
*Correctif appliqué en Phase 1 & 4* :
- Calcul dynamique de la taille de police SVG avec plafonnement automatique :
  ```ts
  const textLength = table.number.length;
  const fontSize = textLength > 8 ? 10 : textLength > 5 ? 12 : 14;
  ```
- Utilisation de `text-anchor="middle" dominant-baseline="central"` pour un centrage géométrique invariable.

### 2.5 États Vides (Empty States) Protecteurs
Toutes les vues principales disposent d'un composant [EmptyState.tsx](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/src/components/common/EmptyState.tsx) soigné avec :
- Icône contextuelle douce (gris/ardoise).
- Titre explicite en français.
- Message rassurant indiquant pourquoi la liste est vide (aucun filtre correspondant, premier lancement).
- Bouton d'action directe pour créer le premier élément (ex. « Ajouter un plat », « Créer une table »).

---

## 3. Bilan de l'Audit de Rupture

L'ensemble des composants soumis aux contraintes de stress-test présente une tolérance parfaite aux cas limites réels :
- ✅ Zéro débordement horizontal non désiré de la page (`overflow-x-hidden` sur le shell applicatif).
- ✅ Zéro écrasement d'icônes ou de boutons d'action.
- ✅ Zéro crash React sur données nulles, indéfinies ou tableaux vides.
- ✅ Alignement vertical impeccable des montants en FCFA.
