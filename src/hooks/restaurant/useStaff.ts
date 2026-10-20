import { useRestaurant } from '../../context/RestaurantContext';

/**
 * Hook spécialisé pour la gestion du personnel, comptes utilisateurs, rôles et permissions
 */
export function useStaff() {
  const {
    userAccounts,
    employees,
    attendances,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    toggleUserAccountStatus,
    updateUserAccountPermissions,
    addAttendanceRecord,
    updateEmployeePin,
    updateEmployeeWeeklySchedule,
  } = useRestaurant();

  return {
    userAccounts,
    employees,
    attendances,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    toggleUserAccountStatus,
    updateUserAccountPermissions,
    addAttendanceRecord,
    updateEmployeePin,
    updateEmployeeWeeklySchedule,
  };
}
