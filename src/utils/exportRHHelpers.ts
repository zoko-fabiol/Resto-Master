// ============================================================
// src/utils/exportRHHelpers.ts
// Fonctions et constantes d'exportation RH (PDF, Excel, Word)
// ============================================================

export const RH_GREEN: [number, number, number] = [31, 122, 62];

export const MONTHS_FR: string[] = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Supprime les accents d'une chaîne de caractères pour compatibilité PDF standard
 */
export const removeAccents = (str: string): string => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Formate un montant en devise locale (FCFA)
 */
export const formatMoney = (val: number | string): string => {
  const num = Number(val) || 0;
  return `${num.toLocaleString('fr-FR')} F`;
};

/**
 * Retourne le suffixe de date YYYY-MM-DD
 */
export const getDateSuffix = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Retourne un suffixe d'horodatage pour les noms de fichiers d'export (YYYYMMDD_HHMM)
 */
export const getExportFileSuffix = (): string => {
  const now = new Date();
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const t = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `${d}_${t}`;
};

/**
 * Récupère le logo d'entreprise encodé en base64
 */
export const getLogo = (): string | null => {
  try {
    return localStorage.getItem('stock_expert_logo');
  } catch {
    return null;
  }
};

/**
 * Ajoute un en-tête institutionnel soigné aux documents PDF RH et retourne l'ordonnée Y de démarrage
 */
export const addPdfHeaderRH = (doc: any, title: string, logo?: string | null): number => {
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 16;

    if (logo && typeof logo === 'string' && logo.startsWith('data:image')) {
      try {
        doc.addImage(logo, 'PNG', 14, 10, 22, 22);
      } catch {
        // Ignorer si format d'image non supporté
      }
    }

    doc.setFontSize(15);
    doc.setTextColor(31, 122, 62);
    doc.text('RESTOMASTER OS — GESTION DES RESSOURCES HUMAINES', 42, currentY);

    currentY += 7;
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(removeAccents(title), 42, currentY);

    currentY += 6;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const dateFormatted = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(removeAccents(`Généré le ${dateFormatted}`), 42, currentY);

    // Ligne séparatrice
    currentY += 7;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);

    return currentY + 8;
  } catch {
    return 42;
  }
};
