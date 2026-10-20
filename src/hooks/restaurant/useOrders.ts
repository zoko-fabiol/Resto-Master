import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Hook spécialisé pour la prise de commande, statut des plats et encaissement
 */
export function useOrders() {
  const {
    orders,
    createOrder,
    updateOrderStatus,
    updateOrderItemStatus,
    recordOrderPayment,
    addItemsToOrder,
    cancelOrderWithAudit,
    generateInvoiceForOrder,
    sendOrderToCashier,
  } = useRestaurant();

  return {
    orders,
    createOrder,
    updateOrderStatus,
    updateOrderItemStatus,
    recordOrderPayment,
    addItemsToOrder,
    cancelOrderWithAudit,
    generateInvoiceForOrder,
    sendOrderToCashier,
  };
}
