/**
 * Utilitaires de Fuseau Horaire Métier — Africa/Douala (UTC+1)
 * Pour Cloud Functions RestoMaster OS
 */

export const DOUALA_TIMEZONE = 'Africa/Douala';

export function getDoualaDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat('fr-CM', {
    timeZone: DOUALA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  return {
    year: parseInt(partMap.year || '2026', 10),
    month: parseInt(partMap.month || '01', 10),
    day: parseInt(partMap.day || '01', 10),
    hour: parseInt(partMap.hour || '00', 10),
    minute: parseInt(partMap.minute || '00', 10),
    second: parseInt(partMap.second || '00', 10),
  };
}

export function getDoualaDateKey(date: Date = new Date()): string {
  const { year, month, day } = getDoualaDateParts(date);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}${mm}${dd}`;
}

export function getDoualaDayString(date: Date = new Date()): string {
  const { year, month, day } = getDoualaDateParts(date);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function getDoualaIsoDate(date: Date = new Date()): string {
  const { year, month, day, hour, minute, second } = getDoualaDateParts(date);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');
  return `${year}-${mm}-${dd}T${hh}:${min}:${ss}+01:00`;
}
