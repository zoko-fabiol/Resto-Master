# RestoMaster OS — Cahier de Recette Opérationnelle & Déploiement

> **Objectif** : Guide de validation pas à pas des fonctionnalités opérationnelles de RestoMaster OS avant mise en exploitation dans un restaurant / bar / hôtel au Cameroun.

---

## Scénario 1 : Prise de Commande & Rythme de Service (POS)

1. **Ouverture de session** : Se connecter avec un compte ayant le rôle `serveur` ou `manager`.
2. **Attribution de Table** : Sélectionner une table libre sur le plan de salle (ex: Table 4). Saisir 2 couverts.
3. **Sélection des Plats** :
   - Ajouter une entrée (ex: *Salade Avocat Crevettes*).
   - Cliquer sur le bouton **Options** de la ligne du panier :
     - Sélectionner le rythme : **🥗 Entrée**.
   - Ajouter un plat de grillade (ex: *Poisson Braisé Bar 800g*).
   - Dans le menu **Options** :
     - Sélectionner le rythme : **🍲 Plat**.
     - Choisir la cuisson : **Bien cuit**.
     - Choisir l'accompagnement : **Bâtons de Manioc (Miondo)**.
     - Choisir l'assaisonnement : **Piment fort à part**.
   - Ajouter un dessert (ex: *Carpaccio d'Ananas Flambé*).
   - Sélectionner le rythme : **🍰 Dessert**.
4. **Validation du Bon** :
   - Vérifier l'apparition des badges de couvert (`C1`, `C2`) et des tempos (`Entrée`, `Plat`, `Dessert`) sur chaque ligne du panier.
   - Cliquer sur **Envoyer en Cuisine**.
   - Le statut de la Table 4 passe immédiatement à `occupee` (orange) sur le plan de salle.

---

## Scénario 2 : KDS Cuisine & Bar (Gestion de Production)

1. **Écran KDS Cuisine** :
   - Basculer sur l'écran **Cuisine KDS**.
   - Un signal sonore retentit et le bon de commande de la Table 4 s'affiche avec la mention des couverts et des tempos de service.
2. **Préparation progressive** :
   - Le cuisinier clique sur l'entrée pour la passer en `en_preparation` (jaune).
   - Une fois dressée, un clic passe l'entrée à `pret` (vert). Le serveur en salle reçoit une notification instantanée : *"Commande prête pour la Table 4"*.
   - Le cuisinier prépare ensuite le plat principal, puis le dessert.
3. **Service à table** :
   - Le serveur apporte les plats et clique sur **Servi à table**.
   - Le bon reste visible avec le badge vert *"Servi à table"* jusqu'au règlement final au POS.

---

## Scénario 3 : Déstockage Atomique & Contrôle FEFO

1. **Vérification du Stock Initial** :
   - Dans le module **Stocks**, noter la quantité disponible du *Bar entier* (ex: 25 kg) et le lot le plus proche de la péremption (ex: Lot `LOT-2026-BAR-01`).
2. **Consommation Automatique** :
   - Lors de la validation de la commande de *Poisson Braisé*, Firestore déduit exactement 0,8 kg via `increment(-0.8)`.
   - Le lot `LOT-2026-BAR-01` voit sa quantité restante réduite de 0,8 kg en FEFO.
3. **Mouvement de Stock Tracé** :
   - Consulter l'onglet **Mouvements** : une ligne `sortie_consommation` est consignée avec le numéro de commande, le nom du serveur et l'horodatage précis.
4. **Test d'Annulation avec Restock** :
   - Annuler une commande test avec validation superviseur.
   - Constater que le stock est immédiatement recrédité avec création d'une ligne d'inventaire corrective automatique.

---

## Scénario 4 : Encaissement Sécurisé & Idempotence

1. **Règlement de la Commande** :
   - Ouvrir la commande de la Table 4 dans le panneau de paiement POS.
2. **Ventilation Fiscale Cameroun (DGI)** :
   - Vérifier la ligne de détail :
     - Montant HT : 20 000 FCFA
     - TVA (17,50 %) : 3 500 FCFA
     - CAC (10 % de la TVA = 1,75 %) : 350 FCFA
     - Total TTC : 23 850 FCFA (vérifier l'équilibre strict $20000 + 3500 + 350 = 23850$).
3. **Paiement Mobile Money (Orange Money / MTN MoMo)** :
   - Sélectionner **Orange Money**.
   - Le QR Code de paiement s'affiche avec le numéro marchand et le montant exact.
   - Saisir la référence de transaction.
4. **Contrôle d'Idempotence** :
   - Effectuer un double-clic rapide sur le bouton d'encaissement.
   - Le système neutralise le second clic grâce à la clé d'idempotence unique et n'enregistre qu'un seul débit.
   - La table repasse automatiquement à l'état `libre` (vert).

---

## Scénario 5 : Impression & Facture Certifiée DGI

1. **Ticket Thermique 80mm** :
   - L'aperçu thermique s'affiche avec la Raison Sociale, le NIU, le RCCM et le QR Code DGI 2D.
   - Si une imprimante réseau port 9100 ou WebUSB est configurée, le flux binaire ESC/POS est transmis directement.
2. **Facture A4 Officielle Téléchargeable** :
   - Cliquer sur **Facture A4 DGI (PDF)**.
   - Le PDF officiel est généré avec la formule d'arrêté légal :
     > *"Arrêtée la présente facture à la somme de vingt-trois mille huit cent cinquante Francs CFA TTC."*
   - Scanner le QR Code avec un lecteur de QR Code standard pour vérifier la présence du payload canonique `DGI-CMR|v1|...` et du sceau SHA-256 inviolable.

---

## Scénario 6 : Clôture de Caisse Journalière (Rapport Z)

1. **Accès Caisse** : Ouvrir le module **Gestion de Caisse**.
2. **Comptage des Espèces** :
   - Saisir le décompte des billets (10 000, 5 000, 2 000, 1 000, 500) et pièces.
3. **Validation de Clôture** :
   - Le système compare le montant physique saisi et le solde théorique calculé depuis les encaissements et retraits.
   - En cas d'écart, une justification textuelle est obligatoirement demandée.
   - Après validation par code PIN superviseur, la session passe au statut `fermee` et le ticket Z officiel est archivé de manière immuable.

---

## Scénario 7 : Centre Fiscal & Télé-déclaration DGI

1. **Accès Centre Fiscal** : Naviguer dans **Centre Fiscal Cameroun (DGI)**.
2. **Tableau de Bord Mensuel** :
   - Visualiser les agrégats du mois sélectionné : Total HT, TVA collectée, CAC collectés, Précomptes AIR, Chiffre d'Affaires TTC.
3. **Export CSV Officiel** :
   - Cliquer sur **Télé-déclaration DGI (CSV)**.
   - Ouvrir le fichier téléchargé dans Excel ou un éditeur texte : vérifier que chaque facture comporte le NIU client, le montant HT, la TVA, le CAC et le sceau SHA-256.

---

## Scénario 8 : Résilience Hors-Ligne (Test Coupure Réseau)

1. **Simulation Coupure** :
   - Dans le panneau Outils de Développement du navigateur (F12 $\rightarrow$ Réseau), passer en mode **Hors ligne** (Offline).
2. **Constat Visuel** :
   - Le badge du Header passe immédiatement en **Hors Ligne** (ambre clignotant).
3. **Opérations en Mode Hors-Ligne** :
   - Enregistrer une vente et un encaissement.
   - La vente est immédiatement enregistrée dans le cache persistant IndexedDB de Firestore.
   - Le badge du Header affiche : **Hors Ligne (1)** pour signaler l'opération en attente.
4. **Rétablissement du Réseau** :
   - Repasser en mode **En ligne** dans le panneau réseau.
   - Le badge affiche brièvement **Synchro (1)** avec spinner bleu avant de redevenir **En Ligne** (vert).
   - Les données sont répercutées sans perte ni altération sur Firestore.
