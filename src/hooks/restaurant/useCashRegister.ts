import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Hook spécialisé pour la caisse, clôtures Z, fonds de caisse et mouvements d'espèces
 */
export function useCashRegister() {
  const {
    cashSession,
    cashMovements,
    cashRegisters,
    allCashRegisters,
    activeCashRegisterId,
    setActiveCashRegisterId,
    openCashRegister,
    closeCashRegister,
    recordCashMovement,
  } = useRestaurant();

  return {
    cashSession,
    cashMovements,
    cashRegisters,
    allCashRegisters,
    activeCashRegisterId,
    setActiveCashRegisterId,
    openCashRegister,
    closeCashRegister,
    recordCashMovement,
  };
}
