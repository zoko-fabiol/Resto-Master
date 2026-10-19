---
name: restaurant-flow-qa
description: >-
  Protocole de test et scénarios de validation des flux opérationnels de bout en bout
  dans RestoMaster OS (Commande POS -> KDS Cuisine/Bar -> Paiement -> Caisse -> Stock -> Audit).
---

# Skill : Validation des Flux Opérationnels Restaurant

Ce skill décrit les scénarios de test end-to-end indispensables pour s'assurer que la chaîne opérationnelle du restaurant n'est pas rompue.

## Scénarios de Test Principaux

### Scénario 1 : Prise de Commande & KDS
1. Sélectionner une table libre dans le plan de salle.
2. Ajouter 1 plat (destination Cuisine) et 1 boisson (destination Bar).
3. Transmettre la commande :
   - Vérifier que la table passe en statut **Occupée / En service**.
   - Vérifier que le ticket apparaît dans `KitchenKdsView` avec le bon chrono.
   - Vérifier que le ticket boisson apparaît dans `BarKdsView`.

### Scénario 2 : Paiement Multi-moyens & Caisse
1. Ouvrir le panneau de règlement (`PaymentModal`).
2. Tester un règlement fractionné (ex: une part en carte bancaire, une part en espèces).
3. Valider le solde :
   - Vérifier le calcul de la monnaie rendue.
   - Vérifier la génération du ticket de caisse certifié.
   - Vérifier l'incrémentation du tiroir de caisse (`CashRegisterView`).
   - Vérifier que la table revient au statut **Libre** ou **À nettoyer**.

### Scénario 3 : Déduction & Alerte de Stock
1. Noter le niveau d'un ingrédient clé dans `StockView` (ex: viande, pain, sirop).
2. Valider une commande comprenant une recette utilisant cet ingrédient.
3. Vérifier que le stock physique/théorique a diminué de la quantité exacte définie dans la fiche technique.
4. Si le stock passe sous le seuil d'alerte, vérifier l'apparition du badge critique.

### Scénario 4 : Sécurité & Audit Trail
1. Tenter une action restreinte (ex: annuler une commande après envoi en cuisine).
2. Vérifier que la modale `SupervisorPinModal` bloque l'action sans PIN valide.
3. Après validation avec le bon PIN, inspecter `AuditView` pour confirmer l'enregistrement de l'action avec l'horodatage et l'auteur.
