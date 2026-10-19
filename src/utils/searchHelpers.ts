// ============================================================
// src/utils/searchHelpers.ts
// Fonctions utilitaires de filtrage et recherche textuelle
// ============================================================

/**
 * Vérifie si une chaîne contient le terme recherché (insensible à la casse, aux accents et aux espaces superflus)
 */
export const matchesSearch = (text?: string | null, query?: string | null): boolean => {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  return normalize(text).includes(normalize(query));
};
