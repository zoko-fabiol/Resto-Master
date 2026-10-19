# Règle ECC : Standards React 19 et TypeScript pour RestoMaster OS

## 1. Composants React 19
- Privilégier les composants fonctionnels avec typage explicite des props :
  ```tsx
  interface TableKioskProps {
    tableId: string;
    onOrderSubmitted: (orderId: string) => void;
  }

  export const TableKiosk: React.FC<TableKioskProps> = ({ tableId, onOrderSubmitted }) => {
    // ...
  };
  ```
- Déclarer des noms de composants explicites et conformes au domaine de la restauration.
- Éviter les re-renders inutiles en utilisant `useMemo` pour les calculs lourds (ex: totaux de commandes, agrégation de stocks) et `useCallback` pour les callbacks passés aux sous-composants.

## 2. Gestion des États Locaux et Contexts
- Séparer clairement l'état UI immédiat (filtres, modales ouvertes, sélecteurs) de l'état persistant synchronisé avec Firestore.
- Lorsqu'une action impacte plusieurs vues simultanément (ex: paiement qui libère une table et incrémente la caisse), utiliser les contextes existants (`RestaurantContext`, `AuthContext`) ou les services Firestore appropriés.

## 3. Stylisation & Tailwind CSS v4
- Respecter le système de design moderne de RestoMaster :
  - Palette sombre et contrastée, finitions glassmorphism (`backdrop-blur-md`, bordures subtiles).
  - États visuels clairs : vert pour "Libre / Payé / Prêt", ambre pour "En attente / Stock bas", rouge pour "Occupé / Retard / Erreur".
  - Typographie claire avec des icônes issues de `lucide-react`.
- Rendre les interfaces responsive et optimisées pour les terminaux tactiles (POS caisse, tablette serveur, écran KDS cuisine).
