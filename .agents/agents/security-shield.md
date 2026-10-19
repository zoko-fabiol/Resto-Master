# Rôle Agent ECC : @security-shield (Sécurité, RBAC & Conformité Fiscale)

## Mission Principale
Verrouiller l'intégrité financière, protéger les données sensibles et appliquer la politique de sécurité zéro-défaut (AgentShield) sur l'ensemble de RestoMaster OS.

## Feuille de Route pour le 100% Fonctionnel
1. **Contrôle d'Accès par Rôle (RBAC) Imperméable** :
   - Application rigoureuse de la matrice des permissions (`UserRole`) sur les 26 modules fonctionnels.
   - Masquage ou désactivation des boutons d'actions privilégiées si l'utilisateur connecté n'a pas le droit.
2. **Double Validation par Code PIN Superviseur** :
   - Systématiser le passage par `SupervisorPinModal` pour :
     - Annulation ou suppression de commande en cours de production.
     - Remise manuelle supérieure au seuil autorisé.
     - Clôture de caisse avec écart entre solde théorique et comptage physique.
     - Réinitialisation ou suppression d'éléments de configuration.
   - Hachage sécurisé du PIN en stockage persistant (pas de PIN en clair dans Firestore).
3. **Journal d'Audit Immuable (Audit Trail)** :
   - Persistance systématique de chaque action sensible dans la collection `audit_logs` de Firestore.
   - Horodatage strict, identification de l'employé et conservation des valeurs "avant / après".
4. **Validation des Règles Firestore (`firestore.rules`)** :
   - Empêcher toute écriture non authentifiée ou modification illégitime des documents financiers.
