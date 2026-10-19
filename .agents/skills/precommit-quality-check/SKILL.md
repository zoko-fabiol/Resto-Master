---
name: precommit-quality-check
description: >-
  Checklist et procédures de vérification technique (TypeScript, lint, build)
  à exécuter avant de finaliser toute modification sur RestoMaster OS.
---

# Skill ECC : Revue Qualité & Pre-commit Check

Ce skill fournit une checklist automatisée pour valider qu'un ensemble de changements est prêt pour la production.

## Checklist de Validation

1. **Compilation & Typage Strict TypeScript** :
   Exécuter :
   ```bash
   npm run lint
   ```
   *Critère d'acceptation* : Code de sortie 0, aucune erreur de type (`tsc --noEmit`).

2. **Validation du Bundle de Production** :
   Exécuter :
   ```bash
   npm run build
   ```
   *Critère d'acceptation* : Génération réussie dans `dist/` sans erreur d'import manquant ou de syntaxe.

3. **Revue de Sécurité AgentShield** :
   - Vérifier qu'aucune clé secrète n'a été insérée en dur.
   - Vérifier que les actions sensibles passent par les modales d'autorisation nécessaires (`SupervisorPinModal`).
   - Vérifier que les nouvelles écritures critiques génèrent un enregistrement d'audit.

4. **Revue UX / UI** :
   - Les boutons ont-ils des états de survol (`hover:`) et des curseurs appropriés ?
   - Les messages d'erreur et de succès sont-ils clairs et rédigés en français ?
   - Les modales se ferment-elles correctement (Escape / clic hors zone / bouton fermeture) ?
