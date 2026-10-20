// ============================================================
// src/lib/i18n.ts
// Module d'internationalisation léger, modulaire et sans dépendance lourde
// Français par défaut (standard officiel RestoMaster OS), extensible en Anglais
// ============================================================

export type SupportedLocale = 'fr' | 'en';

export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export const translations: Record<SupportedLocale, Record<string, string>> = {
  fr: {
    // Actions générales
    'action.save': 'Enregistrer',
    'action.cancel': 'Annuler',
    'action.delete': 'Supprimer',
    'action.edit': 'Modifier',
    'action.confirm': 'Confirmer',
    'action.close': 'Fermer',
    'action.search': 'Rechercher...',
    'action.back': 'Retour',
    'action.retry': 'Réessayer',
    'action.print': 'Imprimer',
    'action.export': 'Exporter',

    // Statuts de commande
    'order.status.nouveau': 'Nouveau',
    'order.status.envoye': 'Envoyé',
    'order.status.en_attente': 'En attente',
    'order.status.en_preparation': 'En préparation',
    'order.status.pret': 'Prêt',
    'order.status.servi': 'Servi',
    'order.status.payee': 'Payé',
    'order.status.annulee': 'Annulé',

    // Statuts de table
    'table.status.libre': 'Libre',
    'table.status.occupee': 'Occupée',
    'table.status.reservee': 'Réservée',
    'table.status.addition': 'Addition demandée',
    'table.status.a_nettoyer': 'À nettoyer',

    // Navigation Modules
    'nav.dashboard': 'Tableau de bord',
    'nav.tables': 'Plan de salle',
    'nav.pos': 'Caisse POS',
    'nav.kitchen_kds': 'KDS Cuisine',
    'nav.bar_kds': 'KDS Bar',
    'nav.caisse': 'Caisse & Clôture',
    'nav.stock': 'Stocks & Lots',
    'nav.purchases': 'Achats',
    'nav.finance': 'Finances',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    'nav.staff': 'Personnel',
    'nav.audit': 'Journal d’Audit',

    // Finance & Taxes
    'finance.currency': 'FCFA',
    'finance.total_ttc': 'Total TTC',
    'finance.total_ht': 'Total HT',
    'finance.tax_tva': 'TVA (19,25%)',
    'finance.change': 'Monnaie à rendre',
    'finance.amount_received': 'Montant reçu',

    // Messages système
    'system.online': 'En ligne',
    'system.offline': 'Hors ligne',
    'system.synced': 'Synchronisé',
    'system.error': 'Une erreur est survenue',
  },
  en: {
    // General actions
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.confirm': 'Confirm',
    'action.close': 'Close',
    'action.search': 'Search...',
    'action.back': 'Back',
    'action.retry': 'Retry',
    'action.print': 'Print',
    'action.export': 'Export',

    // Order statuses
    'order.status.nouveau': 'New',
    'order.status.envoye': 'Sent',
    'order.status.en_attente': 'Pending',
    'order.status.en_preparation': 'In preparation',
    'order.status.pret': 'Ready',
    'order.status.servi': 'Served',
    'order.status.payee': 'Paid',
    'order.status.annulee': 'Cancelled',

    // Table statuses
    'table.status.libre': 'Available',
    'table.status.occupee': 'Occupied',
    'table.status.reservee': 'Reserved',
    'table.status.addition': 'Bill requested',
    'table.status.a_nettoyer': 'Needs cleaning',

    // Navigation Modules
    'nav.dashboard': 'Dashboard',
    'nav.tables': 'Floor Plan',
    'nav.pos': 'POS Terminal',
    'nav.kitchen_kds': 'Kitchen KDS',
    'nav.bar_kds': 'Bar KDS',
    'nav.caisse': 'Cash Register',
    'nav.stock': 'Stock & Lots',
    'nav.purchases': 'Purchasing',
    'nav.finance': 'Finance',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.staff': 'Staff',
    'nav.audit': 'Audit Log',

    // Finance & Taxes
    'finance.currency': 'FCFA',
    'finance.total_ttc': 'Total (incl. tax)',
    'finance.total_ht': 'Total (excl. tax)',
    'finance.tax_tva': 'VAT (19.25%)',
    'finance.change': 'Change due',
    'finance.amount_received': 'Amount received',

    // System messages
    'system.online': 'Online',
    'system.offline': 'Offline',
    'system.synced': 'Synced',
    'system.error': 'An error occurred',
  },
};

let currentLocale: SupportedLocale = DEFAULT_LOCALE;

/**
 * Définit la langue active du système
 */
export const setLocale = (locale: SupportedLocale): void => {
  if (translations[locale]) {
    currentLocale = locale;
  }
};

/**
 * Retourne la langue active
 */
export const getLocale = (): SupportedLocale => {
  return currentLocale;
};

/**
 * Fonction de traduction avec injection de paramètres dynamiques
 * Exemple : t('order.status.pret') ou t('common.welcome', { name: 'Alice' })
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
  const dict = translations[currentLocale] || translations.fr;
  let text = dict[key] || translations.fr[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(val));
    });
  }

  return text;
};
