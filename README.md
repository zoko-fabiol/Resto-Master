# RestoMaster OS — Système Intégré de Gestion de Restaurant

**RestoMaster OS** est une plateforme SaaS centralisée et temps réel conçue pour la gestion complète et intégrée d’un restaurant, brasserie ou bar lounge moderne.

L'application unifie tous les flux opérationnels dans une **source unique de vérité** :
$$\text{Approvisionnement} \rightarrow \text{Stock} \rightarrow \text{Production} \rightarrow \text{POS} \rightarrow \text{Cuisine/Bar KDS} \rightarrow \text{Service} \rightarrow \text{Paiement} \rightarrow \text{Caisse} \rightarrow \text{Finance} \rightarrow \text{Rapports}$$

---

## 1. Modules Fonctionnels

1. **Tableau de Bord Exécutif (`DashboardView`)** :
   - CA en temps réel, charges d'exploitation, résultat brut estimé, solde de caisse.
   - Commandes actives, taux d'occupation des tables, alertes stocks critiques, réservations du jour.
   - Top 5 des plats et boissons les plus vendus.

2. **Plan de Salle Interactif (`TablesView`)** :
   - Zones modulaires (Salle Principale, Terrasse Panoramique, VIP Lounge, Mezzanine).
   - Statuts visuels : *Libre*, *Occupée*, *En service*, *Attente paiement*, *À nettoyer*.
   - Ouverture directe de commande, consultation de facture et encaissement.

3. **Prise de Commande & Caisse POS (`PosView`)** :
   - Sélection par table, à emporter ou livraison.
   - Filtrage par catégories, recherche rapide, instructions de cuisson et sauces.
   - Calcul automatique du sous-total, de la TVA configurable (ex: 19.25% ou 10%) et des remises.
   - Envoi instantané des bons en Cuisine et au Bar.
   - Déduction automatique des stocks d'ingrédients bruts selon les fiches techniques des recettes.

4. **Écrans de Production KDS (`KitchenKdsView` & `BarKdsView`)** :
   - Tickets numériques de commande avec compteur de temps écoulé.
   - Alertes visuelles : Vert (<15 min), Ambre (15-25 min), Rouge clignotant (>25 min).
   - Passage des statuts en temps réel (*À préparer* $\rightarrow$ *Prêt !* $\rightarrow$ *Servi*).

5. **Paiements & Règlements Multi-moyens (`PaymentModal`)** :
   - Modes : Espèces, Carte bancaire, Mobile Money (Orange Money, MTN MoMo, Wave), Virement.
   - Gestion des paiements partiels et multi-règlements avec solde restant.
   - Calculateur de monnaie rendue pour les espèces.
   - Impression et aperçu du ticket de caisse certifié.
   - Attribution automatique de points de fidélité aux clients identifiés.

6. **Gestion de Caisse Journalière (`CashRegisterView`)** :
   - Session de caisse : ouverture avec fond de caisse initial.
   - Enregistrement des entrées, encaissements ventes et sorties pour achats d'urgence.
   - Clôture journalière avec saisie du comptage physique et calcul automatique des écarts.
   - Alerte en cas d'écart anormal avec justification obligatoire.

7. **Stocks & Inventaires Physiques (`StockView` & `InventoryModal`)** :
   - Suivi des matières premières, boissons et consommables avec seuils d'alerte minimaux.
   - Mouvements tracés : Entrée achat, Consommation vente, Perte/casse, Périmé, Transfert, Correction.
   - Module d'inventaire complet : comparaison Stock Théorique vs Stock Réel, valorisation de l'écart, justification requise et régularisation automatique.
   - Suggestions automatiques de réapprovisionnement basées sur le stock optimal.

8. **Achats & Fournisseurs (`PurchasesView`)** :
   - Répertoire fournisseurs avec historique des commandes et soldes dus.
   - Émission de bons de commande (BC).
   - Réception de marchandises : incrémentation automatique des stocks et génération des dettes fournisseurs.

9. **Réservations de Tables (`ReservationsView`)** :
   - Gestion des réservations avec convives, date, heure, table assignée et demandes particulières.
   - Action rapide "Installer à table" qui occupe automatiquement la table correspondante.

10. **Menu, Tarifs & Fiches Techniques Recettes (`MenuView`)** :
    - Gestion des plats et cocktails avec poste de destination (Cuisine ou Bar).
    - Composition des recettes (ingrédients bruts liés à déduire des stocks).
    - Calcul des marges brutes par produit.
    - Activation / désactivation immédiate en cas de rupture d'ingrédients.

11. **Finances & Dépenses d'Exploitation (`FinanceView`)** :
    - Ventilation des charges : Achats alimentaires, Boissons, Salaires, Loyer, Énergie & eau, Maintenance, Transport.
    - Workflow de validation des dépenses avant paiement.

12. **Fichier Clients & Fidélité (`ClientsView`)** :
    - Fiches clients avec coordonnées, préférences, visites et points fidélité.

13. **Personnel & Pointages (`StaffView`)** :
    - Liste des employés, départements, contrats et salaires.
    - Pointages journaliers des présences, retards et motifs.

14. **GED & Numérisation / Scanner de Documents (`DocumentsView` & `ScannerModal`)** :
    - Scanner documentaire simulant capture caméra ou import de facture.
    - Extraction intelligente OCR des métadonnées (fournisseur, date, numéro de facture, montant).
    - Archivage et aperçu des pièces justificatives.

15. **Rapports & Statistiques (`ReportsView`)** :
    - Ventes, panier moyen, performance des serveurs, ventilation des moyens de paiement.
    - Exportation des données au format CSV et impression de bilan.

16. **Journal d'Audit & Sécurité (`AuditView`)** :
    - Traçabilité complète, horodatée et inviolable de chaque opération sensible.

17. **Paramètres de l'Établissement (`SettingsView`)** :
    - Identité, devise (FCFA, EUR, USD, CAD, GBP), taux de TVA, règles d'automatisation.
    - Bouton de réinitialisation des données de démonstration.

---

## 2. Rôles et Profils Démonstration (RBAC)

L'application intègre un sélecteur de profil instantané dans l'en-tête pour tester tous les rôles métiers :

| Rôle | Utilisateur Démo | Accès & Permissions |
| :--- | :--- | :--- |
| **Direction** | `direction@demo.restaurant` | Accès universel complet (Finances, Audit, Clôtures, Paramètres) |
| **Manager** | `manager@demo.restaurant` | Pilotage salle, commandes, réservations, équipe, stocks |
| **Serveur** | `serveur@demo.restaurant` | Plan de salle, prise de commande POS, statut service |
| **Cuisine (Chef)** | `cuisine@demo.restaurant` | Écran Cuisine KDS, temps de préparation, plats prêts |
| **Bar (Barman)** | `bar@demo.restaurant` | Écran Bar KDS, cocktails, vins, boissons |
| **Caisse** | `caisse@demo.restaurant` | Encaissements, tiroir-caisse, règlements, clôture |
| **Magasinier** | `stock@demo.restaurant` | Entrées/sorties stocks, inventaires réels, réceptions achats |
| **Finance** | `finance@demo.restaurant` | Dépenses, validation des charges, états financiers |

---

## 3. Architecture Technique

- **Frontend** : React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion + Lucide Icons + Canvas Confetti.
- **Backend-as-a-Service** : Google Firebase (Firestore Database avec base dédiée `ai-studio-0a9895d2-41bf-4ea7-b389-bf80a7febeaf`, Firebase Auth, Firebase Storage).
- **Règles de Sécurité** : `firestore.rules` déployées et validées.
- **Résilience** : Persistance locale et synchronisation continue pour garantir le fonctionnement même en cas de coupure réseau temporaire.
