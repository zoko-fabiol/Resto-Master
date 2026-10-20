import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Hook spécialisé pour la gestion de l'inventaire, stocks, fiches techniques et lots
 */
export function useStock() {
  const {
    stockItems,
    stockMovements,
    stockLots,
    categories,
    products,
    addStockMovement,
    createProduct,
    updateProduct,
    toggleProductAvailability,
    toggleProduct86,
    submitInventoryAudit,
    addStockLot,
    quickReceiveStock,
  } = useRestaurant();

  return {
    stockItems,
    stockMovements,
    stockLots,
    categories,
    products,
    addStockMovement,
    createProduct,
    updateProduct,
    toggleProductAvailability,
    toggleProduct86,
    submitInventoryAudit,
    addStockLot,
    quickReceiveStock,
  };
}
