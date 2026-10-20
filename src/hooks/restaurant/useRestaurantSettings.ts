import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Hook spécialisé pour la configuration de l'établissement, organisation, matériels et règles opérationnelles
 */
export function useRestaurantSettings() {
  const {
    settings,
    updateSettings,
    organization,
    updateOrganization,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    terminals,
    peripherals,
    features,
    rolePermissions,
    roleLimits,
    isRuleEnabled,
    isFeatureEnabled,
    operationRules,
    updateOperationRules,
    adminDisplayMode,
    setAdminDisplayMode,
  } = useRestaurant();

  return {
    settings,
    updateSettings,
    organization,
    updateOrganization,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    terminals,
    peripherals,
    features,
    rolePermissions,
    roleLimits,
    isRuleEnabled,
    isFeatureEnabled,
    operationRules,
    updateOperationRules,
    adminDisplayMode,
    setAdminDisplayMode,
  };
}
