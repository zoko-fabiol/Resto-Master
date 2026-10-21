# Audit critique n°2 de RestoMaster OS

**Plan de table 2D, onglets de configuration à supprimer, et état réel de la plateforme après les corrections de la première version**

Date : 20 octobre 2026 · Version analysée : « Copie (1) » (166 fichiers source, dossier `functions` inclus)

---

## 1. Verdict en bref

La plateforme a **nettement progressé sur la sécurité** : la règle Firestore fourre-tout a disparu, le mode démo et les PIN en clair aussi, des Cloud Functions existent pour les commandes, paiements, caisse, factures et annulations. C'est un vrai travail.

En revanche, **deux écrans que les équipes utilisent tous les jours sont en mauvais état** : le plan de table 2D (déplacement imprécis, suppressions perdues, statuts écrasés) et la configuration système (onglets vides, réglages qui ne font rien, statuts inventés).

| Domaine | Estimation | Commentaire |
| :-- | :-: | :-- |
| Plan de table 2D | 3/10 | Beau rendu, mais le geste de base (placer une table) est faussé et des données se perdent |
| Configuration système | 4/10 | 40 réglages sur 113 ne sont lus nulle part ; onglets morts ; faux statuts |
| Sécurité | 5/10 (1/10 avant) | Gros progrès ; il reste des contournements (section 4) |
| Intégrité financière | 5/10 (2/10 avant) | Serveur autoritaire en principe, mais repli local et règles `orders` trop larges |
| Qualité du code | 3/10 | Aucun test, 150 `any`, un contexte de 4 023 lignes |

**Méthode et limites.** Analyse statique du code : je n'ai pas lancé l'application ni vu l'interface. Les chiffres du plan de table viennent d'une **simulation des formules du code** (Node.js). Pour les onglets, « sans effet » signifie que la clé du réglage n'est lue nulle part ailleurs dans le code (recherche par nom) : à confirmer à l'écran. Je n'ai pas re-vérifié dans cette version la facturation, la clôture de caisse ni le raccordement DGI.

---

## 2. Plan de table 2D

### 2.1 Pourquoi on n'arrive pas à placer les tables comme on veut

Le plan est dessiné dans `VectorFloorPlan.tsx` (repère logique 1 200 × 800) et piloté par `TablesView.tsx`. Voici les causes, de la plus gênante à la moins gênante.

**P-01 · La table ne suit pas le curseur (CRITIQUE).** Dans `handleCanvasPointerMove`, le déplacement est calculé par `logicalDx = dx / zoom`. Or `dx` est en **pixels écran**, alors que le plan est un repère de 1 200 unités étiré sur la largeur réelle du conteneur. La conversion pixels → unités n'est jamais appliquée (la fonction `clientToLogical`, qui existe dans le fichier, n'est pas utilisée pour le déplacement, et elle est elle-même fausse). Résultat mesuré par simulation pour un glissement de 100 px :

| Appareil (largeur du plan) | Distance parcourue par la table |
| :-- | :-: |
| Écran large (1 110 px utiles) | 93 % |
| Ordinateur portable (1 000 px) | 83 % |
| Tablette (800 px) | 67 % |
| Téléphone (380 px) | 32 % |

La table « traîne » derrière le doigt, d'autant plus que l'écran est petit, et l'effet change à chaque zoom. C'est exactement la sensation d'impossibilité à placer précisément.

**P-02 · Zoom et déplacement du cadrage inutilisables au doigt (CRITIQUE sur tablette).**

- Le panoramique exige Maj + clic ou la molette de la souris : **rien pour le tactile**, ni pincement ni deux doigts.
- Le zoom à la molette exige Ctrl, et `preventDefault()` est appelé dans un `onWheel` React, qui est passif depuis React 17 : le navigateur zoome probablement la page entière *(à vérifier dans le navigateur)*.
- Le zoom est centré sur le coin haut-gauche du plan, pas sur le curseur ; le décalage du panoramique est en pixels mais appliqué en unités du plan (même défaut que P-01).
- Bornes incohérentes : 0,6 à 2,0 avec les boutons, 0,6 à 2,2 à la molette.

**P-03 · Glisser « collant » possible (MOYENNE, à vérifier).** Il n'y a ni `onPointerCancel` ni `onLostPointerCapture`, et la capture du pointeur n'est prise qu'après 4 px de mouvement. Si le doigt est relevé hors du plan avant ce seuil, l'état de glissement reste actif et la table peut se remettre à bouger sans clic.

**P-04 · Aimant sur les autres tables, impossible à désactiver (MOYENNE).** Dès qu'une table est à 8 unités ou moins de l'axe d'une autre, elle s'y colle, **même si la grille est sur OFF**, et c'est le dernier voisin de la liste qui l'emporte. On ne peut donc pas poser finement une table près d'une autre.

**P-05 · Toute nouvelle table apparaît au même endroit (200, 200).** Le formulaire `AddEditTableModal` fixe `x: 200, y: 200` et ne propose **aucun champ X/Y**. Ajouter cinq tables donne cinq tables empilées, dont quatre invisibles.

**P-06 · Le placement par lot écrase les tables (ÉLEVÉE).** `BatchAddTablesModal` borne les positions avec `Math.min(1080, …)` et `Math.min(680, …)`.

- 10 tables en ligne : x = 140, 270, 400, 530, 660, 790, 920, 1050, **1080, 1080** (deux tables exactement au même point, une troisième à 30 unités).
- 30 tables en grille de 5 colonnes : les deux dernières lignes sont aplaties à y = 660 et 680.

**P-07 · La vue par défaut « Toutes les salles » superpose les salles.** Avec `selectedZoneId = 'all'`, les tables et décors de toutes les zones sont dessinés dans le même repère 1 200 × 800 : Salle, Terrasse et VIP se chevauchent.

**P-08 · Illisible sur téléphone.** Le numéro de table fait 18 unités du plan : sur un écran de 380 px, environ 6 px réels. Le plan est un ratio fixe 3:2 plafonné à 740 px de haut, sans adaptation mobile.

### 2.2 Bugs qui perdent ou corrompent des données

**D-01 · Supprimer une table ou un décor en mode édition n'est jamais enregistré (CRITIQUE).** La suppression ne touche que le brouillon (`setDraftTables(prev => prev.filter…)`). À l'enregistrement, `batchSaveTables(draftTables)` ne fait que des écritures (`set` avec fusion) : **aucune suppression n'est envoyée**, et la fusion locale conserve l'ancienne table. Pour le décor, `batchSaveDecorElements(draftDecor)` est appelé **sans** la liste `removedIds` pourtant prévue. La table « supprimée » réapparaît.

**D-02 · « Enregistrer le plan » écrase l'état du service (CRITIQUE).** En entrant en édition, une copie complète des tables est figée. À l'enregistrement, **tous** les documents sont réécrits en entier (statut, `currentOrderId`, `timeOccupied`, serveur assigné). Si un serveur ouvre une table pendant que le manager réorganise, la table repasse en « libre » avec sa commande détachée.

**D-03 · Les coordonnées de 100 ou moins sont relues comme des pourcentages (ÉLEVÉE).** `normalizeCoordinateX` traite toute valeur de 1 à 100 comme un pourcentage. Or le glisser autorise précisément x minimal = 60 (demi-largeur 50 + marge 10). Simulation :

| x enregistré | x relu au rechargement |
| :-: | :-: |
| 60 | 720 |
| 80 | 960 |
| 100 | 1 200 (au bord, hors de la salle) |

Toute table posée dans la bande de 100 unités du bord gauche ou haut **saute ailleurs** après rechargement.

**D-04 · Annuler / Rétablir décalé d'un cran (MOYENNE).** `pushHistorySnapshot` lit `draftTables` dans sa fermeture : appelé juste après `setDraftTables` (rotation, formulaire de table, décor), il enregistre l'état **d'avant**. Résultat : un Ctrl+Z qui « ne fait rien », et un Rétablir qui restaure le mauvais état.

**D-05 · « Annuler » n'annule pas tout (MOYENNE).** Les tables ajoutées par `+ Table` sont écrites en base **immédiatement** (`addTable`), avant « Enregistrer » : abandonner l'édition ne les retire pas.

**D-06 · Aucun verrou d'édition.** Rien n'empêche deux managers d'éditer en même temps, ni de modifier le plan en plein service : le dernier qui enregistre gagne.

**D-07 · Rotation et redimensionnement approximatifs.** Rotation par pas de 45° uniquement ; une seule poignée de redimensionnement (coin bas-droit) ; collisions et limites du plan calculées sans tenir compte de la rotation ; tailles bornées à 60–300.

### 2.3 Ce qui manque face à un éditeur de plan professionnel

- Champs **X / Y / largeur / hauteur / angle** saisissables, et déplacement au **clavier** (flèches, Maj pour 10 unités).
- **Sélection multiple** (cadre, Maj + clic) avec déplacement groupé ; **aligner** et **répartir** ; **dupliquer** et copier-coller.
- **Pincement et glisser à deux doigts** ; zoom centré sur le curseur ; bouton « Ajuster à l'écran ».
- **Plan de fond** (image du plan du local), échelle réelle en mètres, plusieurs salles et étages avec leurs propres dimensions.
- Rotation libre, poignées sur les quatre côtés, éléments **verrouillables**, calques (murs, décor, tables).
- **Verrou du plan pendant le service** et brouillon enregistrable.
- Numérotation automatique et ré-ordonnancement, aperçu « vue serveur ».

### 2.4 Correction recommandée

**Un seul convertisseur pointeur → plan**, valable avec le zoom, le panoramique et les bandes de cadrage, en utilisant la matrice de l'écran :

```ts
const toLogical = (clientX: number, clientY: number) => {
  const m = contentGroupRef.current!.getScreenCTM()!.inverse();
  const pt = svgRef.current!.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(m);
  return { x: p.x, y: p.y };
};
// pointerdown : grabOffset = toLogical(pointeur) - centre de la table
// pointermove : centre = toLogical(pointeur) - grabOffset, puis grille
// pointercancel / lostpointercapture : terminer proprement le glisser
```

Points de correction associés :

1. Remplacer partout `dx / zoom` par cette conversion ; supprimer l'ancienne `clientToLogical`.
2. Gérer deux pointeurs (pincement + panoramique), zoom centré sur le point visé, bornes uniques.
3. Aimant entre tables **optionnel** et visible (lignes de guidage), indépendant de la grille.
4. Supprimer l'heuristique « ≤ 100 = pourcentage » : migrer une fois les anciennes données avec un champ `coordVersion: 2`.
5. Enregistrer **uniquement les champs de mise en page** (`x, y, width, height, rotation, shape, number, zoneId`) en différence, jamais le statut de service ; envoyer les **suppressions** (`removedIds` pour tables et décor).
6. Prendre l'instantané d'historique **après** la mise à jour d'état (ou stocker l'état dans un réducteur unique).
7. Ajouter un verrou d'édition (document `layout_lock` avec propriétaire et expiration) et interdire l'édition d'une zone ayant des tables occupées, ou fusionner proprement.
8. Nouveau placement : première position libre de la grille ; lot sans bornage destructeur (passer à la ligne suivante, agrandir le plan si besoin) ; ouvrir par défaut sur **la première salle**, pas sur « Toutes ».
9. Ajouter les champs numériques et les flèches clavier (section 2.3).

---

## 3. Configuration système : onglets à retirer

### 3.1 Constat

Le centre de configuration (`AdminCenterView.tsx`) annonce **32 applications** dans son en-tête, les commentaires parlent de sections « 1 à 31 », mais la bibliothèque n'en contient que **25**. Les 25 entrées sont rendues par 9 composants. Neuf d'entre elles reposent sur 113 interrupteurs ; **40 de ces interrupteurs (35 %) ne sont lus nulle part** dans le code : on peut les activer, rien ne se passe.

### 3.2 Onglets et routes à supprimer ou nettoyer

| Élément | Problème constaté | Action |
| :-- | :-- | :-- |
| Route `avance` | Dans le routeur, mais absente de la bibliothèque et **ne rend rien** (`null`) | Supprimer |
| Route `integrations` | Inaccessible, et affiche des statuts **« Connecté » écrits en dur** pour MTN MoMo et Orange Money alors qu'aucune passerelle n'existe | Supprimer, ou réécrire avec l'état réel |
| Route `securite` | Simple alias de `permissions` | Supprimer l'alias |
| N°18 `personnel` | Liste statique de 11 rôles en **lecture seule**, aucun réglage ; la vraie gestion est dans le module Personnel | Supprimer ou fusionner dans Permissions |
| N°23 `audit` | Journal de modifications de configuration, doublon du module Journal d'audit | Fusionner en un seul écran |
| N°13 `evenements` | **6 réglages sur 8 sans effet** | Garder les 2 actifs dans le module Événements, supprimer l'onglet |
| N°12 `livraison` | **6 sur 9** sans effet | Idem avec le module Livraison |
| N°7 `bar` | 5 sur 10 sans effet | Nettoyer ; fusionner avec Cuisine si moins de 3 réglages actifs |
| N°17 `caisse` | 5 sur 12 sans effet | Nettoyer |
| N°11 `reservations` | 4 sur 8 sans effet | Nettoyer |
| N°4 `pos` | 7 sur 22 sans effet | Nettoyer |
| N°5 `tables` | 3 sur 11 sans effet | Nettoyer (voir ci-dessous) |
| N°6 `cuisine` | 3 sur 10 sans effet | Nettoyer |
| N°3 `modules` | 1 sur 23 (`mod_recipes_yield`) | Nettoyer |
| Fichier `SettingsView.tsx` | 472 lignes, **importé nulle part** | Supprimer |

Réglages inactifs à retirer, par onglet :

- **pos** : `pos_active`, `pos_custom_price`, `pos_item_comp`, `pos_change_server`, `pos_table_transfer`, `pos_table_merge`, `pos_table_split`.
- **tables** : `tables_auto_status`, `tables_transfer`, `tables_auto_server_assign`. Le transfert et la fusion de tables sont donc proposés à l'écran mais non branchés ici.
- **cuisine** : `cuisine_kds`, `cuisine_screen`, `cuisine_stations`.
- **bar** : `bar_module`, `bar_screen`, `bar_bottles`, `bar_glasses`, `bar_consumption_control`.
- **livraison** : `delivery_active`, `delivery_online_order`, `delivery_zones`, `delivery_tracking`, `delivery_customer_notifications`, `delivery_web_orders`.
- **reservations** : `res_online`, `res_auto_confirm`, `res_reminders`, `res_availability`.
- **evenements** : `event_active`, `event_custom_menus`, `event_banquet`, `event_hall`, `event_planning`, `event_billing`.
- **caisse** : `caisse_management`, `caisse_transfers`, `caisse_mandatory_close`, `caisse_block_after_close`, `caisse_reopen_with_auth`.

Attention : `caisse_mandatory_close` et `caisse_block_after_close` donnent l'impression de **protéger la clôture** alors qu'ils ne font rien. Soit on les branche (dans la fonction serveur de clôture), soit on les retire.

### 3.3 Comment retirer proprement un onglet

1. Supprimer l'entrée dans `appLibrary` (et ses `tags`, catégorie, `orderNumber`).
2. Supprimer le `case` dans `renderActiveSection` et la clé dans le type `SubMenuKey`.
3. Supprimer le bloc de rendu dans le composant de section et les imports devenus inutiles.
4. Retirer les clés mortes de `operationRules` (valeurs par défaut, données de départ, formulaire d'initialisation) pour qu'elles ne restent pas dans Firestore.
5. Recalculer les compteurs de catégories, la phrase d'en-tête (« 32 applications ») et la numérotation « Section N » (elle est aujourd'hui incohérente : le personnel est « Section 24 », l'audit « Section 29 » et le hors-ligne « Section 30 » dans les titres, mais n°18, 23 et 24 dans la bibliothèque).
6. Vérifier avec `npm run lint` et `npm run build`, puis ouvrir chaque onglet restant.

Si vous voyez à l'écran d'autres onglets vides que je n'ai pas listés, donnez-moi leur nom : j'ai travaillé sur le code, pas sur l'interface.

---

## 4. Sécurité et intégrité : ce qui reste après les corrections

### 4.1 Corrigé (à saluer)

- Règle `match /{document=**}` supprimée ; plus de règle `@direction.cm` ; mode démo et PIN de démonstration retirés.
- Noms de collections alignés entre règles et code (`audit_logs`, `cash_sessions`, `stock_items`…).
- PIN hachés (PBKDF2) dans `user_pins`, migration automatique des anciens PIN en clair *(paramètres de hachage et blocage après erreurs non revérifiés en détail)*.
- Cloud Functions : `createOrder`, `recordPayment`, `cancelOrder`, `voidItem`, `open/closeCashSession`, `issueInvoice`, `appendAuditLog`, `verifySupervisor`, appairage de terminaux ; compteur de commandes transactionnel ; prix relus depuis le catalogue ; remise plafonnée par rôle.

### 4.2 Ce qui reste ou apparaît

**R-01 · Les règles `orders` contredisent le serveur autoritaire (ÉLEVÉE).** `create` est ouvert à tout utilisateur authentifié de l'établissement, sans contrôle des montants. En mise à jour, un rôle non manager ne peut pas changer `total`, `subtotal`, `tax`, mais peut modifier `items` (prix des lignes), `discount`, `payments`, `status` et **augmenter `paidAmount`** : une commande peut donc être marquée payée sans passer par `recordPayment`. Le service `ordersFirestoreService` écrit d'ailleurs encore directement avec `setDoc` / `updateDoc`.

**R-02 · Le repli local rend le serveur contournable (ÉLEVÉE).** Dans `createOrder`, si l'erreur ressemble à un problème réseau (`isNetworkOrOfflineError`), l'application crée la commande **localement avec les totaux du client**. Combiné à R-01, bloquer l'appel à la fonction suffit à enregistrer une commande aux montants choisis. Le hors-ligne est légitime, mais il faut : marquer ces commandes « provisoires », les recalculer à la synchronisation, et refuser les paiements définitifs et factures tant qu'elles ne sont pas certifiées.

**R-03 · Numéros provisoires hors-ligne ≠ numéros définitifs.** Le ticket imprimé hors-ligne porte un numéro local ; la synchronisation rejoue `createOrder` et le serveur attribue **un autre numéro**. Ticket remis au client et commande enregistrée ne correspondent plus.

**R-04 · Deux calculs de taxe subsistent.** Le serveur calcule `round(base × 19,25 %)`, le moteur fiscal calcule TVA arrondie puis CAC sur la TVA arrondie. Pour 1 010 FCFA : **194** d'un côté, **195** (177 + 18) de l'autre. Le problème M-02 du premier audit n'est pas résolu.

**R-05 · Périmètre d'établissement.** `createOrder` retient `data.restaurantId` fourni par le client, sinon `caller.outlets[0]`, sinon `'default-restaurant'`, sans que j'aie vu de vérification que l'établissement demandé fait partie des `outlets` du jeton.

**R-06 · Fuseau horaire.** La date de la numérotation `CMD-AAAAMMJJ-NNNN` utilise `new Date()` côté serveur (UTC par défaut). À Douala (UTC+1), les commandes entre 00 h et 01 h portent la date de la veille ; idem pour tout « jour comptable ». Utiliser `Africa/Douala`.

**R-07 · Archive et hygiène.** L'archive contient `functions/node_modules` (190 paquets), `functions/lib` (code compilé) et `dist/`. À exclure ; vérifier aussi qu'aucun secret ne figure dans l'historique Git.

---

## 5. Critiques produit et ergonomie (regard d'un promoteur)

1. **Cockpit surchargé.** 25 « applications », 113 interrupteurs, un vocabulaire de numéros de sections. Un gérant n'a pas à décider de `pos_table_merge` ni de `event_hall`. Il faut des **profils prêts à l'emploi** (café, restaurant, hôtel, chaîne) et masquer le reste sous « Avancé ».
2. **Promesses non tenues.** « 100 % hors ligne », « Journal d'audit immuable », « Connecté » : tant que ce n'est pas vrai, c'est un risque commercial. Une interface qui annonce une protection inactive (clôture obligatoire) est pire qu'une interface sans protection.
3. **Lisibilité en service.** 681 occurrences de texte de 9 à 11 px, 710 boutons pour seulement 61 attributs d'accessibilité (`aria-label` ou `role`), aucune bibliothèque de traduction. En salle, sur tablette, sous la lumière de la terrasse, c'est trop petit.
4. **Fonctions affichées mais non branchées.** Transfert, fusion et division de table (réglages inactifs), service en temps, options payantes, Mobile Money automatique : à ne montrer qu'une fois réellement livrés.
5. **Dette technique visible.** `RestaurantContext.tsx` passe de \~3 000 à **4 023 lignes** ; `PosView.tsx` 1 965 ; 150 `any` ; 31 `catch` silencieux ; **aucun test** ; seulement 2 fichiers protégés par `ModuleErrorBoundary`. Chaque nouvelle fonction rend la suivante plus risquée.
6. **Gestion des échecs.** Plusieurs écritures de plan (`batchSaveTables`, `batchSaveDecor`) avalent l'erreur avec un `console.warn` : l'écran dit « enregistré » même si Firestore a refusé.

---

## 6. Plan d'action

| Priorité | Travail | Effort indicatif |
| :-- | :-- | :-- |
| P0 (cette semaine) | Plan de table : P-01, P-05, P-06, P-07, D-01, D-02, D-03 | 2 à 4 jours |
| P0 | Règles `orders` : interdire création et modification directes des champs financiers ; retirer `setDoc/updateDoc` sur les commandes | 1 à 2 jours |
| P0 | Configuration : supprimer routes mortes, `SettingsView.tsx`, faux statuts « Connecté », réglages sans effet | 1 jour |
| P1 | Plan de table : tactile (pincement, panoramique), aimant optionnel, champs X/Y, clavier, verrou d'édition, D-04 à D-07 | 3 à 5 jours |
| P1 | Repli hors-ligne certifié (R-02, R-03) ; un seul calcul de taxe (R-04) ; fuseau Douala (R-06) | 1 à 2 semaines |
| P2 | Sélection multiple, alignement, plan de fond, étages ; profils de configuration | 1 à 3 semaines |
| P2 | Tests (règles Firestore, fonctions, calculs, glisser du plan), découpe du contexte | continu |

**Recette du plan de table à exiger après correction :**

1. Glisser une table de 100 px à l'écran : elle suit le doigt au pixel près sur téléphone, tablette et ordinateur, à tous les niveaux de zoom.
2. Poser une table à x = 60, enregistrer, recharger : elle n'a pas bougé.
3. Supprimer une table et un décor, enregistrer, recharger : ils ont disparu.
4. Ouvrir une table au service pendant une édition, enregistrer le plan : la table reste occupée.
5. Générer 30 tables en lot : aucune superposition.
6. Ctrl+Z après une rotation : la rotation est annulée.
7. Pincer, zoomer, déplacer le cadrage au doigt, sans que la page entière ne bouge.

---

## 7. Conclusion

Le socle sécurité est en bonne voie, mais l'expérience quotidienne reste fragile : un plan de table qui ne se laisse pas placer, qui perd ses suppressions et qui écrase l'état du service, et une configuration qui promet des réglages que le code ignore. Ce sont des défauts **rapides à corriger** (quelques jours) et **très visibles** pour un client. Ils doivent passer avant toute nouvelle fonctionnalité.

Si vous le souhaitez, je peux rédiger un prompt prêt à coller dans Antigravity pour corriger le plan de table et nettoyer la configuration, en suivant exactement les sections 2.4 et 3.3.
