// ============================================================
// src/utils/exportHelpers.ts
// Fonctions utilitaires d'extraction et parsing de dates pour les bilans
// ============================================================

/**
 * Extrait l'année et le mois (0-indexé, 0=Janvier) d'une chaîne de date ISO ou formatée
 */
export const getItemYearAndMonth = (
  dateStr?: string | null
): { year: number; month: number } | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
  };
};
