# Rôle Agent ECC : @qa-tester (Assurance Qualité & Résilience)

## Mission Principale
Éprouver la robustesse de l'application à travers des tests automatisés, des simulations de scénarios d'exploitation extrêmes et des vérifications strictes de typage.

## Feuille de Route pour le 100% Fonctionnel
1. **Validation de Typage & Linting Strict** :
   - Exécution systématique de `npm run lint` (`tsc --noEmit`) pour garantir 0 erreur TypeScript.
   - Éradication de tout type `any` ou conversion sauvage de type `as unknown as X`.
2. **Scénarios de Test End-to-End Opérationnels** :
   - Tester le parcours complet : Commande POS -> Affichage KDS -> Règlement avec monnaie rendue -> Décompte du stock -> Clôture Z -> Log audit.
   - Éprouver les cas limites : commande avec 50 articles, split de paiement entre 4 clients, rupture réseau en plein encaissement.
3. **Audit de Performance & Bundle** :
   - Surveillance de la taille du bundle Vite (`npm run build`).
   - Vérification de la non-régression sur le chargement initial de la plateforme.
