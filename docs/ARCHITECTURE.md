# RestoMaster OS — Architecture Technique & Sécurité

> **Version** : 2.0.0 (Production-Ready Cameroun)  
> **Technologies** : React 19, TypeScript 5.8 (Strict), Tailwind CSS v4, Firebase v12 (Modular SDK, Cloud Functions v2, Firestore with Native Persistent Cache, Storage, App Check).

---

## 1. Vue d'Ensemble du Système

RestoMaster OS est un système d'exploitation de gestion intégrée pour la restauration, les bars, les lounges et l'hôtellerie, conçu selon les exigences fiscales (DGI Cameroun) et opérationnelles d'Afrique centrale.

### Principes Architecturaux Directeurs

1. **Autorité Déplacée vers le Serveur (Server-Side Authority)**  
   Le client navigateur ne fait qu'émettre des intentions d'actions (articles demandés, quantité, modalité de règlement, demande de remise). Le calcul des taxes (TVA, CAC, AIR), l'application des plafonds de remise, la vérification des tokens de supervision, la numérotation séquentielle et la signature cryptographique sont strictement orchestrés ou garantis par les règles et transactions serveur.
2. **Intégrité Financière Integer Stricte (FCFA)**  
   Tous les montants monétaires en FCFA sont représentés et calculés sous forme d'entiers stricts (`Math.round`), éliminant définitivement les erreurs d'arrondis flottants de JavaScript (`0.1 + 0.2 !== 0.3`).
3. **Résilience Opérationnelle Hors-Ligne (Offline-First)**  
   En cas d'interruption du réseau Internet, le système continue à fonctionner sans interruption grâce au cache persistant natif multi-onglets Firestore (`persistentLocalCache` en IndexedDB) et à la file d'attente d'actions idempotentes (`OfflineSyncService`).

---

## 2. Modèle de Données Firestore

Les collections principales de Firestore sont structurées et cloisonnées par permissions RBAC :

```
firestore/
├── orders/                     # Commandes en cours et historiques
│   └── {orderId}               # Document commande certifié
├── invoices/                   # Factures certifiées conformes DGI
│   └── {invoiceId}             # Document facture avec sceau SHA-256
├── fiscal_journal/             # Lignes immuables du journal fiscal des ventes
│   └── {journalId}             # Hash chaîné chronologique
├── cash_sessions/              # Sessions de caisse journalières
│   └── {sessionId}             # Mouvements de caisse, fond, clôture Z
├── stock_items/                # Articles du catalogue d'ingrédients / stock
│   └── {stockItemId}           # Quantité en stock déductible par increment()
├── stock_movements/            # Mouvements d'inventaire et consommations
│   └── {movementId}            # Traçabilité immuable des flux physiques
├── stock_lots/                 # Lots de matières premières (FIFO / FEFO)
│   └── {lotId}                 # Numéro de lot, DLUO/DLC, quantité restante
├── employees/                  # Référentiel du personnel
│   └── {employeeId}            # Informations contractuelles et profil
├── rh_attendances/             # Pointages découpés par mois (ex: 2026-03)
│   └── {monthKey}              # Présences et retards sans limite 1 Mo
├── rh_payroll/                 # Extras de salaires par mois (avances, primes)
│   └── {monthKey}              # Éléments variables de paie
├── rh_notes/                   # Notes quotidiennes de service
│   └── {monthKey}              # Journal interne de quart
├── audit_logs/                 # Piste d'audit inviolable des actions sensibles
│   └── {logId}                 # Enregistrement append-only
└── terminals/                  # Terminaux et tablettes autorisés
    └── {terminalId}            # Appairage par code CSPRNG 8 caractères
```

---

## 3. Gestion des Stocks Atomique & FEFO

### Déduction Transactionnelle par `increment()`
Lors de l'envoi en cuisine ou de l'encaissement d'une commande (selon le réglage `stockDeductionTiming`), chaque produit décompose ses fiches techniques (`recipeIngredients`).
La déduction s'effectue via une transaction atomique Firestore utilisant `increment(-consumedQty)` :
- **Préservation des négatifs réels** : Si le stock passe sous zéro (rupture physique non saisie), la valeur négative réelle est conservée afin de ne pas masquer le déficit d'inventaire.
- **Alerte immédiate** : Dès qu'une quantité devient négative, une notification critique est émise aux superviseurs.
- **Déstockage FEFO** : Les lots physiques (`stock_lots`) sont épuisés par ordre de péremption la plus proche (`expiryDate asc`).
- **Restock sur Annulation** : Si une commande annulée avait déjà été déstockée, la fonction `cancelOrderWithAudit` restaure immédiatement les quantités exactes avec création d'un mouvement d'inventaire correctif.

---

## 4. Idempotence & Résilience Réseau

### Clé d'Idempotence des Paiements
Chaque tentative d'encaissement génère une clé unique au format :
$$\text{idempotencyKey} = \text{pay\_}[orderId]\_[timestamp]\_[nonce]$$
Si le caissier double-clique ou subit un ralentissement réseau, les requêtes redondantes portant la même clé sont détectées et renvoient le reçu initial sans débiter une seconde fois.

### Cache Multi-Onglets & File d'Attente
1. `firebase.ts` initialise Firestore avec `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
2. `offlineSyncService.ts` écoute les événements `online`/`offline` et gère une file de rejeu persistant.
3. Un badge visuel d'état réseau dans le `Header` informe en temps réel :
   - Vert : *En Ligne* (synchronisé au Cloud).
   - Bleu avec spinner : *Synchro (X)* (retransmission des opérations en attente).
   - Ambre clignotant : *Hors Ligne (X)* (mode autonome actif).

---

## 5. Sécurité RBAC & Appairage Matériel

### Rôles Applicatifs (Claims Firebase Auth)
- `direction` : Accès intégral, audits financiers, clôtures exceptionnelles.
- `manager` : Supervision du service, validation des remises > 5%, autorisations d'annulation.
- `caissier` : Encaissements, gestion de sa session de caisse personnelle.
- `serveur` : Prise de commande POS, plan de table, tempo des plats.
- `cuisine` / `bar` : Affichage KDS, avancement des timbres de préparation.
- `rh` : Gestion du personnel, pointages, salaires (ségrégué des données financières).
- `finance` / `comptable` : Journaux fiscaux, télé-déclarations DGI, bilans SYSCOHADA.
- `auditeur` : Consultation en lecture seule des pistes d'audit et journaux fiscaux.

### Appairage Matériel CSPRNG
Les terminaux (tablettes, bornes, TPE) sont enregistrés via des tokens aléatoires cryptographiques de 8 caractères générés par l'API Web Cryptography (`window.crypto.getRandomValues`) :
$$\text{Code} = \text{TRM-}[XXXX]-[XXXX]$$
Les codes expirent automatiquement après 24 heures et ne peuvent être devinés par énumération.
