import { OrderStatus, TableStatus, ReservationStatus, UserRole } from '../types/restaurant';

export function formatCurrency(amount: number, currency: string = 'FCFA'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `0 ${currency}`;
  const rounded = Math.round(amount * 100) / 100;
  
  if (currency === 'FCFA') {
    return `${new Intl.NumberFormat('fr-FR').format(Math.round(rounded))} FCFA`;
  }
  if (currency === 'EUR') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(rounded);
  }
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rounded);
  }
  if (currency === 'CAD') {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(rounded);
  }
  return `${new Intl.NumberFormat('fr-FR').format(rounded)} ${currency}`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getMinutesElapsed(isoString: string): number {
  try {
    const created = new Date(isoString).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / (1000 * 60)));
  } catch {
    return 0;
  }
}

export function getMinutesBetween(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    return Math.max(0, Math.floor((e - s) / (1000 * 60)));
  } catch {
    return null;
  }
}

export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `CMD-${dateStr}-${rand}`;
}

export function generatePurchaseOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `BC-${dateStr}-${rand}`;
}

export function generateTransferNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `TRF-${dateStr}-${rand}`;
}

// Convert Number to French Words (Pour la mention légale d'arrêté de facture obligatoire au Cameroun)
export function numberToFrenchWords(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'Zéro';

  const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'];
  const tens = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-Dix', 'Quatre-Vingt', 'Quatre-Vingt-Dix'];

  function convertBelowThousand(val: number): string {
    let str = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0) {
      if (h === 1) {
        str += 'Cent ';
      } else {
        str += units[h] + ' Cent' + (rem === 0 ? 's ' : ' ');
      }
    }

    if (rem > 0) {
      if (rem < 20) {
        str += units[rem] + ' ';
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (t === 7) {
          str += 'Soixante-' + units[10 + u] + ' ';
        } else if (t === 9) {
          str += 'Quatre-Vingt-' + units[10 + u] + ' ';
        } else {
          str += tens[t] + (u === 1 && t !== 8 ? ' et Un ' : u > 0 ? '-' + units[u] + ' ' : ' ');
        }
      }
    }

    return str.trim();
  }

  const chunks: string[] = [];
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (billions > 0) {
    chunks.push(convertBelowThousand(billions) + (billions > 1 ? ' Milliards' : ' Milliard'));
  }
  if (millions > 0) {
    chunks.push(convertBelowThousand(millions) + (millions > 1 ? ' Millions' : ' Million'));
  }
  if (thousands > 0) {
    if (thousands === 1) {
      chunks.push('Mille');
    } else {
      chunks.push(convertBelowThousand(thousands) + ' Mille');
    }
  }
  if (remainder > 0) {
    chunks.push(convertBelowThousand(remainder));
  }

  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

export const numberToWordsFrench = numberToFrenchWords;

// Calcul fiscal Cameroun (TVA 17.5% + 10% CAC = 19.25%)
export function calculateCameroonTaxes(subtotalHt: number, totalRate: number = 19.25) {
  const combinedTax = Math.round((subtotalHt * totalRate) / 100);
  // Base TVA 17.5% et CAC 1.75%
  const tvaBase = Math.round((subtotalHt * 17.5) / 100);
  const cacBase = combinedTax - tvaBase;
  const totalTtc = subtotalHt + combinedTax;

  return {
    subtotalHt,
    tvaBase,
    cacBase,
    combinedTax,
    totalTtc,
  };
}

// Génération du code USSD Orange Money Cameroun
export function getOrangeMoneyUssdCode(
  merchantCode: string,
  phone: string,
  amount: number,
  preferredMode?: 'merchant' | 'direct'
) {
  const roundedAmount = Math.round(amount);
  const cleanMerchant = (merchantCode || '').trim();
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  const useMerchant = preferredMode === 'merchant'
    ? true
    : preferredMode === 'direct'
    ? false
    : Boolean(cleanMerchant);

  if (useMerchant && cleanMerchant) {
    const raw = `#150*14*${cleanMerchant}*${roundedAmount}#`;
    const dialUri = `tel:${encodeURIComponent(raw)}`;
    const dialUriPlain = `tel:${raw}`;
    return { code: raw, dialUri, dialUriPlain, type: 'merchant' as const };
  }
  const targetPhone = cleanPhone || '699887766';
  const raw = `#150*1*1*${targetPhone}*${roundedAmount}#`;
  const dialUri = `tel:${encodeURIComponent(raw)}`;
  const dialUriPlain = `tel:${raw}`;
  return { code: raw, dialUri, dialUriPlain, type: 'direct' as const };
}

// Génération du code USSD MTN MoMo Cameroun
export function getMtnMomoUssdCode(
  merchantCode: string,
  phone: string,
  amount: number,
  preferredMode?: 'merchant' | 'direct'
) {
  const roundedAmount = Math.round(amount);
  const cleanMerchant = (merchantCode || '').trim();
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  const useMerchant = preferredMode === 'merchant'
    ? true
    : preferredMode === 'direct'
    ? false
    : Boolean(cleanMerchant);

  if (useMerchant && cleanMerchant) {
    const raw = `*126*14*${cleanMerchant}*${roundedAmount}#`;
    const dialUri = `tel:${encodeURIComponent(raw)}`;
    const dialUriPlain = `tel:${raw}`;
    return { code: raw, dialUri, dialUriPlain, type: 'merchant' as const };
  }
  const targetPhone = cleanPhone || '677112233';
  const raw = `*126*1*${targetPhone}*${roundedAmount}#`;
  const dialUri = `tel:${encodeURIComponent(raw)}`;
  const dialUriPlain = `tel:${raw}`;
  return { code: raw, dialUri, dialUriPlain, type: 'direct' as const };
}

export const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  direction: { label: 'Direction Générale (PDG)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  manager: { label: 'Responsable Restaurant', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  serveur: { label: 'Service & Salle', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  cuisine: { label: 'Chef & Cuisine', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  bar: { label: 'Barman', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  caisse: { label: 'Caisse & Facturation', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  stock: { label: 'Magasinier / Économe', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  rh: { label: 'RH & Personnel', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  finance: { label: 'Finance & Trésorerie', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  comptable: { label: 'Comptable (SYSCOHADA)', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  auditeur: { label: 'Auditeur / Contrôle', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  tablette: { label: 'Tablette Tactile (Kiosk Client)', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  aucun: { label: 'Aucun accès (Compte en attente)', color: 'bg-slate-100 text-slate-600 border-slate-300' },
};

export const TABLE_STATUS_MAP: Record<TableStatus, { label: string; badgeClass: string; borderClass: string; bgClass: string }> = {
  libre: {
    label: 'Libre',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderClass: 'border-emerald-300 hover:border-emerald-500',
    bgClass: 'bg-emerald-50/50',
  },
  reservee: {
    label: 'Réservée',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    borderClass: 'border-blue-300 hover:border-blue-500',
    bgClass: 'bg-blue-50/50',
  },
  occupee: {
    label: 'Occupée',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    borderClass: 'border-amber-300 hover:border-amber-500',
    bgClass: 'bg-amber-50/50',
  },
  attente_commande: {
    label: 'Attente commande',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    borderClass: 'border-orange-300 hover:border-orange-500',
    bgClass: 'bg-orange-50/50',
  },
  en_service: {
    label: 'En service',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderClass: 'border-indigo-300 hover:border-indigo-500',
    bgClass: 'bg-indigo-50/50',
  },
  attente_paiement: {
    label: 'Attente paiement',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    borderClass: 'border-rose-300 hover:border-rose-500',
    bgClass: 'bg-rose-50/50',
  },
  a_nettoyer: {
    label: 'À nettoyer',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    borderClass: 'border-gray-300 hover:border-gray-400',
    bgClass: 'bg-gray-50/50',
  },
  hors_service: {
    label: 'Hors service',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    borderClass: 'border-red-300 hover:border-red-400',
    bgClass: 'bg-red-50/50',
  },
};

export const ORDER_STATUS_MAP: Record<OrderStatus, { label: string; badgeClass: string }> = {
  nouveau: { label: 'Nouveau', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  envoye: { label: 'Envoyé en prod.', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  en_preparation: { label: 'En préparation', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  pret: { label: 'Prêt à servir', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200 animate-pulse' },
  servi: { label: 'Servi', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  attente_paiement: { label: 'Attente paiement', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  payee: { label: 'Payée', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  annulee: { label: 'Annulée', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
};

export const RESERVATION_STATUS_MAP: Record<ReservationStatus, { label: string; badgeClass: string }> = {
  en_attente: { label: 'En attente', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmee: { label: 'Confirmée', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  arrivee: { label: 'Arrivée', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
  en_cours: { label: 'En cours', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  terminee: { label: 'Terminée', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  annulee: { label: 'Annulée', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  no_show: { label: 'Non présenté', badgeClass: 'bg-gray-200 text-gray-700 border-gray-300' },
};
