# RestoMaster Admin Panel — Guide Officiel d'Exploitation & d'Administration

> **Version de la plateforme** : 1.0.0  
> **Environnement cible** : Production SaaS Multi-Tenant (Firebase europe-west1, Hosting Multi-Sites)  
> **Public cible** : Super-administrateurs plateforme, directeurs techniques, équipes support et facturation.

---

## 1. Vue d'Ensemble & Mission

Le **RestoMaster Admin Panel** est la console d'administration centrale et découplée permettant aux opérateurs de la plateforme RestoMaster de superviser, configurer et dépanner à distance l'ensemble des restaurants clients sans intervention physique sur site.

### Objectifs Clés
- **Gestion à Distance** : Activation et désactivation instantanée de fonctionnalités et modules métier (POS, KDS Cuisine, KDS Bar, Tables, Stocks, Fiscalité, Livraison).
- **Isolation Stricte (Multi-Tenant)** : Étanchéité cryptographique et logique absolue entre les restaurants clients. Aucune fuite d'informations inter-organisations.
- **Sécurité Zero-Trust** : Aucun mot de passe ni code PIN superviseur n'est exposé en clair dans l'interface, les collections Firestore ou les journaux système.
- **Imputabilité & Scellement Cryptographique** : Chaque action administrative critique émet un log d'audit scellé par chaînage SHA-256.
- **Cycle de Vie Protégé** : Suppression de restaurant soumise à la règle inviolable des deux administrateurs (*2-Man Rule*) avec rétention légale de 30 jours.

---

## 2. Architecture Technique & Hébergement Multi-Sites

La plateforme RestoMaster repose sur un découpage strict en deux bundles d'application web indépendants, servis par un même projet Firebase via le multi-hosting :

```
                  ┌──────────────────────────────────────────────┐
                  │          Projet Firebase RestoMaster         │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
         Target Hosting: "app"          Target Hosting: "admin"
                          │                              │
             ┌────────────▼───────────┐    ┌─────────────▼───────────┐
             │    RestoMaster OS      │    │  RestoMaster Admin      │
             │ (Application Restaurant│    │         Panel           │
             │  POS / KDS / Stocks)   │    │  (Console Plateforme)   │
             ├────────────────────────┤    ├─────────────────────────┤
             │ Build: dist/           │    │ Build: dist-admin/      │
             │ Port local: 5173       │    │ Port local: 3001        │
             │ Accès: Personnel resto │    │ Accès: Super-Admins     │
             └────────────────────────┘    └─────────────────────────┘
```

### Configuration dans `firebase.json`
```json
{
  "hosting": [
    {
      "target": "app",
      "public": "dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "admin",
      "public": "dist-admin",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ]
}
```

### Scripts de Compilation & Démarrage
| Commande | Rôle |
| :--- | :--- |
| `npm run dev:admin` | Lance la console Admin Panel en local sur le port `3001`. |
| `npm run build:admin` | Compile l'Admin Panel dans le répertoire `dist-admin/`. |
| `firebase deploy --only hosting:admin` | Déploie la console plateforme sur le domaine réservé aux super-administrateurs. |

---

## 3. Matrice des Rôles Plateforme (RBAC)

L'accès à l'Admin Panel requiert une authentification forte MFA/TOTP et la présence d'un jeton personnalisé `platformRole` validé par le serveur :

| Rôle Plateforme | Description | Permissions Clés |
| :--- | :--- | :--- |
| `platform_owner` | Propriétaire fondateur de la plateforme. | Tous les droits : création d'admins, modifications tarifaires, résiliations, télémaintenance, audits. |
| `platform_admin` | Administrateur senior d'exploitation. | Gestion des restaurants, validation des inscriptions, configuration des modules, déconnexion forcée. |
| `support` | Technicien support client niveau 2. | Télémaintenance en lecture seule, diagnostic en direct, consultation d'assistance. |
| `billing` | Responsable administratif et comptable. | Gestion des formules d'abonnement, enregistrement des règlements en FCFA, suivi des impayés. |
| `viewer` | Observateur ou auditeur interne. | Lecture seule stricte sur les statistiques et tableaux de bord. |

---

## 4. Guide des Fonctionnalités de la Console

### 4.1. Tableau de Bord Global (`PlatformDashboardView`)
- **KPIs en Temps Réel** : Nombre total d'établissements, ventilation des statuts (Actif, Essai, Impayé, Suspendu, Résilié).
- **MRR Récurrent Estimé (FCFA)** : Calcul automatique du revenu mensuel récurrent basé sur la grille tarifaire officielle en Francs CFA (Starter: 25 000 FCFA, Pro: 50 000 FCFA, Enterprise: 95 000 FCFA).
- **Alertes Opérationnelles** : Compteur d'inscriptions en attente et bannière des suppressions en attente de second signataire (*2-Man Rule*).

### 4.2. Répertoire des Restaurants Clients (`TenantListView`)
- Recherche instantanée par nom d'enseigne, ville, adresse email propriétaire ou identifiant tenant.
- Filtres combinés par statut et formule contractuelle.
- Suspension rapide en lecture seule (`read_only`) ou blocage total (`full_block`).

### 4.3. Fiche Établissement — Les 10 Onglets Experts
1. **Matrice des Droits & Modules (`FeaturesTab`)** : Activation chirurgicale des fonctionnalités avec sélection de la source (`plan`, `profil`, `override`).
2. **Fiche Société & Contacts (`OverviewTab`)** : Raison sociale, forme juridique (SARL, SA...), NIU fiscal, RCCM, adresse du siège, coordonnées du gérant.
3. **Comptes Collaborateurs (`UsersTab`)** : Liste des utilisateurs avec rôles métier, statut d'activation du PIN (masqué, non stocké en clair).
4. **Succursales & Points de Vente (`OutletsTab`)** : Suivi des établissements rattachés (salle principale, terrasse, bar annexe).
5. **Limites Contractuelles (`LimitsTab`)** : Plafonds de terminaux, collaborateurs, points de vente et volume mensuel de commandes.
6. **Abonnement & Règlements (`BillingTab`)** : Suivi des échéances, historique des encaissements en FCFA, passage en statut impayé.
7. **Santé & Diagnostics (`DiagnosticsTab`)** : Inspection automatique côté serveur de l'intégrité de l'établissement (conformité fiscale CGI 2026, caisses ouvertes, cohérence des données).
8. **Journal d'Audit Crypté (`AuditTab`)** : Historique inaltérable des actions administratives avec horodatage UTC et signature SHA-256 chaînée.
9. **Télémaintenance Support (`SupportTab`)** : Génération d'une session temporaire en lecture seule avec affichage d'un bandeau actif côté restaurant.
10. **Zone Critique & Cycle de Vie (`DangerZoneTab`)** : Révocation forcée des sessions (`forceSignOut`), réinitialisation de mot de passe sans secret en clair, export des données, et déclenchement de la suppression à double validation.

### 4.4. Assistant Guidé Interactif (`SetupWizardModal`)
Permet de configurer un restaurant en 3 questions simples :
1. *Nombre de tables en salle ?* (0 table $\rightarrow$ Fast Food / Vente à emporter, $>0$ table $\rightarrow$ Restaurant avec service en salle).
2. *Bar ou comptoir boisson dédié ?* (Active le KDS Bar et le module caisse bar).
3. *Service de livraison à domicile ?* (Active les commandes en livraison et l'assignation de livreurs).
L'assistant calcule automatiquement le profil le plus adapté et propose un DIFF prédictif avant application.

### 4.5. Applicateur de Profils Types (`ProfileApplicatorModal`)
Fournit un moteur de prévisualisation DIFF comparant état actuel et cible :
- Profils prêts à l'emploi : `fast_food`, `restaurant_classique`, `bar_lounge`, `boulangerie_patisserie`, `hotel_restaurant`.
- Possibilité d'instantané automatique avant modification pour permettre un **retour arrière immédiat (Rollback)** en un clic.
