# RestoMaster OS — Règles & Directives d'Ingénierie pour Antigravity & Gemini

Ce projet utilise le framework d'ingénierie agentique **ECC (Everything Claude Code / Agentic Engineering Toolkit)**.

Toutes les conventions de développement, rôles d'agents, architecture technique et invariants métier sont consignés dans [AGENTS.md](file:///c:/Users/Claus/Documents/restomaster-os-%E2%80%94-syst%C3%A8me-de-gestion-int%C3%A9gr%C3%A9e-de-restaurant/AGENTS.md).

### Points d'Attention Immédiats pour les Agents :
1. **Cycle ECC obligatoire** : Plan $\rightarrow$ Test $\rightarrow$ Implement $\rightarrow$ Review $\rightarrow$ Verify $\rightarrow$ Remember.
2. **Vérification systématique** : Toujours exécuter `npm run lint` (`tsc --noEmit`) après modification de code TypeScript.
3. **Typage strict** : Aucun `any`, utiliser les types du domaine dans `src/types/restaurant.ts`.
4. **Cohérence Firestore** : Utiliser les services de `src/services/firestore/` pour toute interaction avec la base de données.
5. **UI & Langue** : Utiliser Tailwind CSS v4 et des libellés en français naturel.
