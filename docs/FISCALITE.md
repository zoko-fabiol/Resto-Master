# RestoMaster OS — Spécifications Fiscales Cameroun (DGI)

> **Norme de Référence** : Code Général des Impôts (CGI) de la République du Cameroun (Loi de Finances en vigueur).  
> **Organisme de Contrôle** : Direction Générale des Impôts (DGI) — Ministère des Finances.  
> **Devise Légale** : Franc CFA d'Afrique Centrale (XAF / FCFA), calculé obligatoirement en entiers stricts.

---

## 1. Moteur de Calcul Fiscal (TVA + CAC)

### Taux Officiels et Équilibrage Légal

Selon les articles 127 et suivants du CGI camerounais :
- **Taux de TVA Normal** : **17,50 %**
- **Centimes Additionnels Communaux (CAC)** : **10 % de la TVA légale**, soit **1,75 %** de la base Hors Taxes.
- **Taux Combiné Effectif** : **19,25 %** de la base Hors Taxes.

### Formules Algorithmiques (Arrondi Entier FCFA)

Pour tout montant Hors Taxes $\text{HT}$ :

$$\text{TVA} = \text{Math.round}(\text{HT} \times 0.175)$$

$$\text{CAC} = \text{Math.round}(\text{TVA} \times 0.10)$$

$$\text{TTC} = \text{HT} + \text{TVA} + \text{CAC}$$

> **Règle Inviolable d'Équilibrage** :  
> Le montant Toutes Taxes Comprises ($\text{TTC}$) est **strictement égal** à la somme $\text{HT} + \text{TVA} + \text{CAC}$. Aucune déperdition de centimes n'est tolérée.

### Extraction du HT depuis un Prix Affiché TTC

Lorsque le restaurant pratique des prix cartes TTC :

$$\text{HT} = \text{Math.round}\left(\frac{\text{TTC}}{1 + 0.175 \times 1.10}\right) = \text{Math.round}\left(\frac{\text{TTC}}{1.1925}\right)$$

La TVA et les CAC sont ensuite déduits pour reconstituer exactement le TTC.

---

## 2. Acomptes d'Impôt sur le Revenu (AIR / Précompte)

Pour les facturations adressées à des entreprises assujetties ou organismes publics :

| Régime Fiscal du Prestataire | Taux de Base | Majoration CAC | Taux Global AIR |
| :--- | :--- | :--- | :--- |
| **Régime Réel (avec attestation de non-redevance DGI)** | 2,00 % | 10 % | **2,20 %** |
| **Régime Simplifié** | 5,00 % | 10 % | **5,50 %** |
| **Opérateur non immatriculé (sans NIU actif)** | 10,00 % | 10 % | **11,00 %** *(ou 15 % selon prestation)* |

$$\text{Retenue AIR} = \text{Math.round}(\text{HT} \times \text{Taux AIR})$$

$$\text{Net à Payer} = \text{TTC} - \text{Retenue AIR}$$

---

## 3. Norme e-Billing DGI & Sceau Cryptographique SHA-256

Toute facture certifiée émise par RestoMaster OS comporte un **QR Code normalisé DGI** et un **sceau d'inviolabilité**.

### Structure Canonique de la Chaîne e-Billing

$$\text{DGI-CMR}|\text{v1}|\text{NIU\_VENDEUR}|\text{RCCM}|\text{NUM\_FACTURE}|\text{DATE\_HEURE}|\text{HT}|\text{TVA}|\text{CAC}|\text{TTC}|\text{NIU\_CLIENT}|\text{SCEAU\_SHA256}$$

Exemple réel :
```text
DGI-CMR|v1|M012012345678A|RC/YAO/2024/B/1894|2026-RESTO-001-000042|2026-03-29 14:30:00|50000|8750|875|59625|M051800098765B|04745B34EA7E177A
```

### Calcul du Sceau Cryptographique
Le sceau est composé des 16 premiers caractères hexadécimaux majuscules du hachage SHA-256 de la chaîne canonique scellée par la clé d'établissement :

$$\text{Sceau} = \text{SHA256}(\text{ChaîneCanonique} + \text{CléSecrète})[0..16]$$

Tout changement d'un seul chiffre (ex: montant modifié de 50 000 à 40 000 FCFA) invalide instantanément la signature lors du scan par l'administration fiscale.

---

## 4. Mentions Légales Obligatoires sur les Factures

Chaque document de facturation (A4 officiel ou ticket thermique 80mm) doit obligatoirement comporter :

1. **Raison Sociale & Forme Juridique** de l'établissement (ex: *RESTOMASTER SARL*).
2. **Numéro d'Identifiant Unique (NIU)** attribué par la DGI (ex: *M012012345678A*).
3. **Registre du Commerce et du Crédit Mobilier (RCCM)** (ex: *RC/YAO/2024/B/1894*).
4. **Centre des Impôts de Rattachement** (CIME Bastos, CDI Akwa, DGE, etc.).
5. **Régime Fiscal** (Réel / Simplifié).
6. **Date et Heure précises** d'émission (`YYYY-MM-DD HH:mm:ss`).
7. **Numérotation Séquentielle Continue** sans trou ni doublon.
8. **Identité et NIU du Client** (obligatoire si client B2B ou montant > 100 000 FCFA).
9. **Formule d'Arrêté Légal en Toutes Lettres Françaises** :
   > *"Arrêtée la présente facture à la somme de [Montant en lettres] Francs CFA TTC."*
10. **QR Code 2D de Vérification e-Billing DGI**.

---

## 5. Télé-déclaration Mensuelle DSF / DGI (Format CSV)

À la fin de chaque mois calendaire, le module *Centre Fiscal Cameroun (DGI)* permet de télécharger le fichier officiel pour téléversement sur le portail de télédéclaration de la DGI :

### Colonnes du Fichier CSV DSF/DGI
1. `numero_facture` : Numéro séquentiel officiel
2. `date_emission` : Date au format `YYYY-MM-DD`
3. `niu_vendeur` : NIU de l'établissement
4. `niu_client` : NIU du client acheteur ou `NEANT`
5. `client_nom` : Nom ou Raison Sociale du client
6. `montant_ht` : Base imposable en FCFA
7. `montant_tva` : TVA 17,50%
8. `montant_cac` : CAC 1,75% (10% de TVA)
9. `montant_ttc` : Total perçu TTC
10. `air_retenu` : Montant précompte AIR éventuel
11. `mode_reglement` : Espèces / Carte / Orange Money / MTN MoMo / Virement
12. `statut` : `VALIDEE` ou `ANNULEE_AVOIR`
13. `sceau_dgi` : Empreinte cryptographique SHA-256
