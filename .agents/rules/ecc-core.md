# Règle ECC : Principes Fondamentaux de Développement (Core Engineering)

## 1. Démarche Analytique D'abord (Research-First)
- Ne jamais deviner la structure d'une collection ou d'un composant existant.
- Toujours inspecter les fichiers de référence avant de modifier le code (`src/types/restaurant.ts`, `src/services/firestore/`).
- En cas de doute fonctionnel, privilégier une vérification ciblée plutôt qu'une hypothèse non vérifiée.

## 2. Développement Minimal et Non-Destructif
- N'apporter que les modifications nécessaires à la résolution du problème ou à l'implémentation de la fonctionnalité demandée.
- Conserver l'ensemble des commentaires existants, docstrings et logiques transversales non concernées.
- Éviter les réécritures complètes de fichiers volumineux. Privilégier les modifications ciblées.

## 3. Typage Strict & Pas de Type `any`
- Le projet est configuré en mode TypeScript strict (`tsconfig.json`).
- Tout nouveau modèle, propriété ou argument de fonction doit être explicitement typé.
- Si une structure de données est réutilisée, la déclarer dans `src/types/restaurant.ts` ou dans un fichier de types dédié.

## 4. Clôture de Tâche avec Vérification
- Après chaque cycle de modifications, lancer la vérification de conformité : `npm run lint`.
- Aucune régression de type ne doit subsister avant de clore un échange avec l'utilisateur.
