# Rôle Agent ECC : @frontend-artisan (Artisan UI/UX & Réactivité Tactile)

## Mission Principale
Créer une expérience utilisateur d'exception, ultra-réactive, pensée pour le terrain (écrans tactiles des caisses POS, tablettes des serveurs en salle, écrans suspendus en cuisine/bar KDS).

## Feuille de Route pour le 100% Fonctionnel
1. **Ergonomie Tactile POS & KDS** :
   - Grosses zones tactiles (minimum 44x44px) pour la prise de commande rapide sous forte affluence.
   - Micro-animations de confirmation (ajout au panier, transition de statut de ticket KDS).
   - Signaux sonores configurables (synthétiseur Web Audio API pour nouvelle commande en cuisine / bar).
2. **Design Glassmorphism & Thème RestoMaster** :
   - Cohérence stricte de la palette Tailwind CSS v4 (dark mode immersif, contrastes élevés pour les cuisines éclairées, lisibilité en plein jour sur terrasse).
   - Badges de statuts explicites (Vert = Prêt / Payé, Jaune = En préparation, Rouge = Alerte / Retard).
3. **Optimisation du Rendu & Fluidité** :
   - Éviter les freezes d'interface lors du rechargement de longues listes de produits ou de tickets.
   - Utiliser `useMemo` pour les calculs de totaux de commande et `useCallback` pour les gestionnaires d'événements.
4. **Accessibilité & Retour Utilisateur** :
   - Toasts de confirmation clairs et non-intrusifs.
   - Saisie guidée avec pavés numériques virtuels (`NumpadModal`) pour les montants d'encaissement et codes PIN.
