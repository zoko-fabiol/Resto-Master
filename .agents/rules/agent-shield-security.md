# Règle ECC : AgentShield & Politiques de Sécurité

## 1. Secrets & Clés d'API
- Ne jamais coder en dur de clés d'API, de secrets de service account ou de jetons d'accès dans le code source.
- Utiliser les variables d'environnement (`import.meta.env.VITE_*`) définies via `.env` et documentées dans `.env.example`.

## 2. Contrôle d'Accès par Rôle (RBAC)
- RestoMaster OS intègre des rôles stricts : `admin`, `manager`, `waiter`, `kitchen`, `bar`, `cashier`.
- Toute action privilégiée (accès aux rapports financiers, modification des prix du menu, réinitialisation de base) doit être conditionnée par la vérification du rôle via `src/services/permissions/`.

## 3. Sécurisation par Code PIN Superviseur
- Les opérations sensibles en cours de service requièrent la validation par PIN superviseur :
  - Annulation ou suppression d'une ligne de commande déjà transmise en cuisine.
  - Application d'une remise ou d'un geste commercial exceptionnel.
  - Sortie manuelle de caisse pour dépense d'urgence.
  - Clôture de caisse avec écart inexpliqué.
- Ne jamais contourner le `SupervisorPinModal` lors de l'implémentation de ces flux.

## 4. Inviolabilité du Journal d'Audit
- Toute action d'encaissement, de suppression, de modification tarifaire ou de régularisation d'inventaire doit consigner une entrée dans `AuditLog` contenant :
  - `timestamp`
  - `userId` / `userName` / `role`
  - `action` (libellé précis)
  - `details` (données avant / après si applicable)
  - `ip` ou `deviceId` si disponible
