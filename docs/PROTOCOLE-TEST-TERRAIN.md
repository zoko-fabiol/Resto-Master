# RestoMaster OS — Protocole de Test Terrain sur Tablettes & Terminaux Tactiles

> **Document de Référence Opérationnelle** : Procédure de validation sur le terrain (in situ) avant et pendant le service en restaurant, bar et lounge.
> Conçu pour valider l'ergonomie tactile, la visibilité en ambiance réelle, la persistance d'affichage et la fluidité des rôles.

---

## 1. Matériel & Environnements de Test Cibles

| Poste Opérationnel | Équipement Recommandé | Résolution Minimale | Rôle Associé |
| :--- | :--- | :--- | :--- |
| **Prise de Commande Mobile** | Tablette 10" ou Smartphone Android/iOS | $800 \times 1280$ px | `serveur` |
| **Poste d'Encaissement Central** | Terminal POS tactile fixe + Tiroir-caisse | $1920 \times 1080$ px | `caissier`, `manager` |
| **KDS Cuisine** | Écran tactile mural 15" à 21" ou tablette durcie | $1920 \times 1080$ px | `cuisinier` |
| **KDS Bar** | Tablette comptoir 10" à 15" étanche | $1280 \times 800$ px | `barman` |

---

## 2. Checklist d'Installation & Configuration PWA

- [ ] **Installation PWA Standalone** :
  - Sur Chrome/Edge (Android/Windows) : Cliquer sur l'icône d'installation dans la barre d'adresse ou menu *"Installer RestoMaster OS"*.
  - Sur Safari (iPadOS/iOS) : Menu Partager $\rightarrow$ *"Sur l'écran d'accueil"*.
  - **Critère de succès** : L'application s'ouvre en plein écran sans barre d'adresse navigateur (`display: standalone`), avec fond ardoise sombre `#0f172a`.
- [ ] **Raccordement Réseau Local & Firebase** :
  - Connexion Wi-Fi 5 GHz dédiée au restaurant.
  - Vérifier la synchronisation temps réel des statuts de tables et des tickets.

---

## 3. Protocole par Poste Opérationnel

### A. Serveur en Salle (Tablette Mobile / POS)
1. **Plan de salle interactif (`/tables`)** :
   - Tester le tap sur chaque table avec le pouce ou l'index : la cible tactile doit s'activer immédiatement ($\ge 44 \times 44$ px).
   - Constater le code couleur strict :
     - **Vert émeraude** : Table libre.
     - **Orange ambré** : Table occupée en service (avec horodatage lisible).
     - **Rouge / Rose** : Table avec commande en retard ou critique.
     - **Violet** : Table réservée.
2. **Prise de commande (`/pos`)** :
   - Sélectionner une catégorie : tester la fluidité du carrousel horizontal des catégories.
   - Ajouter 3 articles au panier : vérifier que les prix sont strictement alignés en chiffres tabulaires (`tabular-nums`) et sans décimales inutiles en FCFA.
   - Sur tablette verticale ou smartphone : vérifier que le bouton flottant du panier affiche le badge de quantité et que le tiroir coulissant s'ouvre d'un seul geste.
3. **Transmission en production** :
   - Appuyer sur **Envoyer en Cuisine** : confirmation instantanée par toast vert et retour au plan de salle sans latence.

---

### B. Cuisine & Bar (KDS Écrans Muraux)
1. **Écran Actif & Veille Automatique (Screen Wake Lock)** :
   - Laisser l'écran KDS ouvert sans interaction pendant 15 minutes pendant le coup de feu.
   - **Critère de succès** : L'écran ne s'éteint jamais et ne passe pas en veille automatique grâce à l'API Wake Lock intégrée (`Screen Wake Lock actif`).
2. **Lisibilité à Distance (2 mètres)** :
   - Prendre un recul de 2 mètres face à l'écran de cuisine.
   - **Critère de succès** :
     - Les quantités et libellés des plats (`text-xl font-bold`) sont parfaitement déchiffrables malgré les fumées ou la vapeur.
     - Le chronomètre d'attente (en chiffres tabulaires) clignote ou change de couleur après dépassement du seuil de préparation sans déformer la carte du ticket.
3. **Validation Tactile en Cuisine** :
   - Appuyer sur une ligne de préparation : passage de *En attente* à *En cours* puis à *Prêt* d'un simple tap direct sur la carte.

---

### C. Caisse & Clôture Journalière (`/cash`, `/pos`)
1. **Session de caisse active** :
   - Ouvrir la caisse avec le fond initial en FCFA.
   - Vérifier que tous les calculs (encaissements, écarts, fond de caisse) s'affichent en alignement parfait vertical grâce aux polices tabulaires.
2. **Encaissement fractionné** :
   - Régler une commande avec 2 modes de paiement (ex : Espèces + Mobile Money Orange/MTN).
   - Constater que la monnaie à rendre est mise en valeur en grand format sans ambiguïté.
3. **Sécurité Superviseur (Code PIN)** :
   - Déclencher une remise exceptionnelle ou une annulation de bon : la modale `SupervisorPinModal` doit bloquer immédiatement.
   - Saisir le code PIN sur le pavé numérique géant : boutons $\ge 56$ px faciles à manipuler sur écran tactile.
   - Vérifier que l'annulation est tracée dans l'audit (`/audit`).

---

## 4. Grille de Notation & Critères de Rejet

| Test d'Acceptation | Condition de Rejet Immédiat (KO) |
| :--- | :--- |
| **Mise en veille KDS** | L'écran s'éteint ou se verrouille pendant le service. |
| **Cible tactile trop petite** | Nécessite plus d'une tentative pour toucher un bouton sur tablette. |
| **Micro-police illisible** | Présence d'un texte $< 12$ px ou description de plat $< 14$ px. |
| **Décalage des montants** | Chiffres des colonnes de prix qui oscillent ou ne sont pas alignés à droite (`tabular-nums`). |
| **Ambigüité de statut** | Utilisation de la couleur ambrée pour un statut "succès/actif" au lieu du vert émeraude. |
| **Blocage hors-ligne** | Écran blanc ou crash de l'interface en cas de micro-coupure Wi-Fi. |

---

## 5. Signature & Validation de Recette

- **Établissement** : _____________________________________
- **Responsable de Salle / Maître d'Hôtel** : __________________ (Date : ___ / ___ / 2026)
- **Chef de Cuisine / Chef Barman** : _________________________ (Date : ___ / ___ / 2026)
- **Responsable Informatique / Déploiement** : __________________ (Date : ___ / ___ / 2026)
