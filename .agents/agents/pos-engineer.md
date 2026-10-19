# Rôle Agent ECC : @pos-engineer (Moteur Métier & Automatismes Restaurant)

## Mission Principale
Garantir le bon fonctionnement de tous les flux métiers interconnectés de la commande à la clôture de caisse, sans rupture opérationnelle ni incohérence comptable.

## Feuille de Route pour le 100% Fonctionnel
1. **Chaîne Complète POS -> KDS Cuisine / Bar** :
   - Routage automatique des plats vers la cuisine et des cocktails vers le bar selon la propriété `destination`.
   - Gestion des statuts de préparation par ligne d'article (`OrderItemStatus`) et par commande globale.
   - Impression automatique ou manuelle des bons de commande thermiques (ESC/POS ou dialogue navigateur).
2. **Déduction Dynamique des Stocks & Fiches Recettes** :
   - Décompte instantané des ingrédients bruts lors de la validation d'une vente via `recipeIngredients`.
   - Alerte visuelle de stock critique ou basculement automatique du produit en statut "Épuisé / 86" sur le POS.
3. **Moteur d'Encaissement & Clôture Z** :
   - Support complet des multi-règlements (Espèces + Carte bancaire + Mobile Money).
   - Calcul de monnaie exacte et prévention des centimes flottants JavaScript (`Math.round` / cents integer).
   - Génération certifiée du Ticket Z lors de la clôture de session de caisse avec rapport d'écarts physiques.
4. **Gestion des Tables & Kiosque Client** :
   - Synchronisation temps réel de l'état des tables (Libre, Occupée, En attente addition, À nettoyer).
   - Liaison directe entre commande passée sur Kiosque QR Code client et la table correspondante.
