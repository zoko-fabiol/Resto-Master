// ============================================================
// src/utils/exportRHXLSX.ts
// Export Excel stylisé (xlsx-js-style) – Module RH (Personnel, Pointage)
// ============================================================

import XLSXStyle from 'xlsx-js-style';
const { utils, write } = XLSXStyle;

import { showToast } from '../components/ui/Toast';
import { getDateSuffix, getExportFileSuffix, MONTHS_FR, removeAccents } from './exportRHHelpers';
import { platform } from '../platform';

import type { RhEmployee } from '../types/restaurant';

/** Récupère le nom de l'entreprise depuis le localStorage */
const getCompanyName = (): string => {
  try {
    const c = JSON.parse(localStorage.getItem('stock_expert_company') || '{}');
    return c.name || 'Echo Gestion';
  } catch { return 'Echo Gestion'; }
};

/** Récupère le logo (base64) depuis le localStorage */
const getLogoBase64 = (): string | null => localStorage.getItem('stock_expert_logo');

// ================================================================
// DESIGN SYSTEM
// ================================================================
const BRAND    = '1F7A3E';
const ACCENT   = 'D4EDDA';
const WHITE    = 'FFFFFF';
const DARK     = '1C2833';
const GREY_BG  = 'F2F3F4';
const TOTAL_BG = 'D5F5E3';
const ORANGE   = 'E67E22';
const RED_BG   = 'FDECEA';
const RED_FG   = 'C0392B';
const BLUE_BG  = 'D6EAF8';
const BLUE_FG  = '1A5276';

const colHeaderStyle = (align: 'left' | 'center' | 'right' = 'left') => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 10, name: 'Calibri' },
  fill: { fgColor: { rgb: BRAND } },
  alignment: { horizontal: align, vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin',   color: { rgb: BRAND } },
    bottom: { style: 'medium', color: { rgb: BRAND } },
    left:   { style: 'thin',   color: { rgb: BRAND } },
    right:  { style: 'thin',   color: { rgb: BRAND } },
  },
});

const dataStyle = (even: boolean, align: 'left' | 'center' | 'right' = 'left', bold = false, fg?: string, bg?: string) => ({
  font: { bold, color: { rgb: fg ?? DARK }, sz: 9, name: 'Calibri' },
  fill: { fgColor: { rgb: bg ?? (even ? ACCENT : GREY_BG) } },
  alignment: { horizontal: align, vertical: 'center' },
  border: {
    top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
    bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
    left:   { style: 'thin', color: { rgb: 'D5D8DC' } },
    right:  { style: 'thin', color: { rgb: 'D5D8DC' } },
  },
});

const titleStyle = () => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 13, name: 'Calibri' },
  fill: { fgColor: { rgb: BRAND } },
  alignment: { horizontal: 'left', vertical: 'center' },
});

const subtitleStyle = () => ({
  font: { italic: true, color: { rgb: BRAND }, sz: 9, name: 'Calibri' },
  fill: { fgColor: { rgb: ACCENT } },
  alignment: { horizontal: 'left', vertical: 'center' },
});

/** Style bandeau entreprise (vert foncé RH) */
const companyBannerStyle = () => ({
  font: { bold: true, color: { rgb: WHITE }, sz: 16, name: 'Calibri' },
  fill: { fgColor: { rgb: '0F5132' } },
  alignment: { horizontal: 'left', vertical: 'center' },
});

/** Style sous-bandeau entreprise */
const companySubStyle = () => ({
  font: { italic: true, color: { rgb: WHITE }, sz: 9, name: 'Calibri' },
  fill: { fgColor: { rgb: '0F5132' } },
  alignment: { horizontal: 'left', vertical: 'center' },
});

const totalRowStyle = (align: 'left' | 'center' | 'right' = 'right') => ({
  font: { bold: true, color: { rgb: BRAND }, sz: 10, name: 'Calibri' },
  fill: { fgColor: { rgb: TOTAL_BG } },
  alignment: { horizontal: align, vertical: 'center' },
  border: {
    top:    { style: 'medium', color: { rgb: BRAND } },
    bottom: { style: 'medium', color: { rgb: BRAND } },
    left:   { style: 'thin',   color: { rgb: BRAND } },
    right:  { style: 'thin',   color: { rgb: BRAND } },
  },
});

// ================================================================
// Helper buildStyledSheet (identique à exportXLSX.ts)
// ================================================================
interface ColDef { label: string; width: number; align?: 'left' | 'center' | 'right'; numFmt?: string; }
interface StyledRow {
  values: (string | number | null)[];
  rowType?: 'total' | 'alert' | 'renvoy';
  aligns?: Record<number, 'left' | 'center' | 'right'>;
  colors?: Record<number, string>;
  bgs?: Record<number, string>;
}

async function saveWorkbook(workbook: Parameters<typeof write>[0], filename: string): Promise<boolean> {
  try {
    const bytes = write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    await platform.files.save({
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      data: new Uint8Array(bytes),
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`Échec de l'export Excel : ${message}`, 'error');
    return false;
  }
}

const buildStyledSheet = (title: string, subtitle: string, cols: ColDef[], styledRows: StyledRow[]): any => {
  const ws: any = {};
  const nCols = cols.length;
  let r = 0;

  const companyName = getCompanyName();

  // Bandeau entreprise (ligne 0)
  ws[utils.encode_cell({ r, c: 0 })] = { v: companyName.toUpperCase(), t: 's', s: companyBannerStyle() };
  for (let c = 1; c < nCols; c++) ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: companyBannerStyle() };
  r++;

  // Sous-bandeau (ligne 1)
  ws[utils.encode_cell({ r, c: 0 })] = { v: 'Echo Gestion v2.0  |  Module RH & Paie  |  Document officiel', t: 's', s: companySubStyle() };
  for (let c = 1; c < nCols; c++) ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: companySubStyle() };
  r++;

  // Titre (ligne 2)
  ws[utils.encode_cell({ r, c: 0 })] = { v: title,    t: 's', s: titleStyle() };
  for (let c = 1; c < nCols; c++) ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: titleStyle() };
  r++;

  // Sous-titre (ligne 3)
  ws[utils.encode_cell({ r, c: 0 })] = { v: subtitle, t: 's', s: subtitleStyle() };
  for (let c = 1; c < nCols; c++) ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: subtitleStyle() };
  r++;

  // Ligne vide (ligne 4)
  r++;

  // En-têtes colonnes (ligne 5)
  cols.forEach((col, c) => {
    ws[utils.encode_cell({ r, c })] = { v: col.label, t: 's', s: colHeaderStyle(col.align ?? 'left') };
  });
  r++;

  // Données
  styledRows.forEach((row, rowIdx) => {
    const even = rowIdx % 2 === 0;
    row.values.forEach((val, c) => {
      const col  = cols[c];
      const isNum = typeof val === 'number';
      const align = row.aligns?.[c] ?? col.align ?? (isNum ? 'right' : 'left');

      let style: any;
      if (row.rowType === 'total') {
        style = totalRowStyle(align);
      } else if (row.rowType === 'alert') {
        style = dataStyle(even, align, false, RED_FG, RED_BG);
      } else if (row.rowType === 'renvoy') {
        style = dataStyle(even, align, false, RED_FG, RED_BG);
      } else {
        const fg = row.colors?.[c];
        const bg = row.bgs?.[c] ?? (even ? ACCENT : GREY_BG);
        style = dataStyle(even, align, false, fg, bg);
      }

      const cell: any = { v: val ?? '', s: style };
      if (isNum) { cell.t = 'n'; if (col.numFmt) cell.z = col.numFmt; }
      else cell.t = 's';

      ws[utils.encode_cell({ r, c })] = cell;
    });
    r++;
  });

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: nCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: nCols - 1 } },
  ];
  ws['!cols']  = cols.map(col => ({ wch: col.width }));
  ws['!ref']   = utils.encode_range({ r: 0, c: 0 }, { r: r - 1, c: nCols - 1 });
  ws['!rows']  = [
    { hpt: 28 }, // bandeau entreprise
    { hpt: 16 }, // sous-bandeau
    { hpt: 22 }, // titre rapport
    { hpt: 16 }, // sous-titre
    { hpt: 6  }, // vide
    { hpt: 22 }, // en-têtes
  ];

  // Logo en image OOXML (tentative)
  const logoB64 = getLogoBase64();
  if (logoB64) {
    try {
      const b64Match = logoB64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (b64Match) {
        const imgType = b64Match[1] === 'jpg' ? 'jpeg' : b64Match[1];
        const imgData = b64Match[2];
        if (!ws['!images']) ws['!images'] = [];
        ws['!images'].push({
          '!pos': { r: 0, c: 0, x: 2, y: 2, w: 48, h: 44 },
          '!datatype': 'base64',
          '!data': imgData,
          '!ext': imgType,
        });
      }
    } catch (_e) { /* silently ignore */ }
  }

  return ws;
};

// ================================================================
// 1. EXPORT PERSONNEL EXCEL – Stylisé
// ================================================================
interface PersonnelFilters {
  site?: string;
  statut?: string;
  type?: string;
}

export const exportPersonnelXLSX = async (
  employees: RhEmployee[],
  filters: PersonnelFilters = {}
): Promise<void> => {
  const isDismissedFilter = filters.statut === 'renvoye';

  // Par défaut, seuls les employés actifs apparaissent sauf si 'renvoye' est explicitement demandé
  let list = employees.filter(e => e.statut !== 'renvoye');
  if (isDismissedFilter) {
    list = employees.filter(e => e.statut === 'renvoye');
  } else if (filters.statut && filters.statut !== 'all') {
    list = employees.filter(e => e.statut === filters.statut);
  }

  if (filters.site   && filters.site   !== 'all') list = list.filter(e => e.site    === filters.site);
  if (filters.type   && filters.type   !== 'all') list = list.filter(e => e.type    === filters.type);

  list.sort((a, b) => {
    const sc = a.site.localeCompare(b.site, 'fr');
    return sc !== 0 ? sc : a.nom.localeCompare(b.nom, 'fr');
  });

  if (list.length === 0) {
    showToast(isDismissedFilter ? 'Aucun employé licencié à exporter.' : 'Aucun employé actif à exporter.', 'warning');
    return;
  }

  const cols: ColDef[] = [
    { label: '#',             width: 5,  align: 'center' },
    { label: 'Nom',           width: 18 },
    { label: 'Prénom',        width: 18 },
    { label: 'Type',          width: 14, align: 'center' },
    { label: 'Statut',        width: 12, align: 'center' },
    { label: 'Site',          width: 18 },
    { label: 'Contact',       width: 18 },
    { label: 'Salaire Base',  width: 16, align: 'right', numFmt: '#,##0 "F"' },
  ];

  const rows: StyledRow[] = list.map((e, idx) => ({
    values: [
      idx + 1,
      e.nom,
      e.prenom,
      e.type === 'temporaire' ? 'Temporaire' : 'CDI / CDD',
      e.statut === 'renvoye' ? 'Fin Contrat' : 'Actif',
      e.site,
      e.contact || '—',
      e.salaireBase || 0,
    ],
    colors: {
      4: e.statut === 'renvoye' ? 'E74C3C' : BRAND,
      7: BRAND,
    },
  }));

  // Ligne de total
  const totalSalaires = list.reduce((s, e) => s + (e.salaireBase || 0), 0);
  const activeCount   = list.filter(e => e.statut !== 'renvoye').length;
  const renvoyeCount  = list.filter(e => e.statut === 'renvoye').length;

  rows.push({
    values: [
      'TOTAL', '', '',
      `${list.length} employé(s)`,
      isDismissedFilter ? `${renvoyeCount} licencié(s)` : `${activeCount} actif(s)`,
      '', '',
      totalSalaires,
    ],
    rowType: 'total',
    aligns: { 0: 'center', 7: 'right' },
  });

  const sheetTitle = isDismissedFilter 
    ? 'REGISTRE DU PERSONNEL - LICENCIES & ANCIENS EMPLOYES' 
    : 'REGISTRE OFFICIEL DU PERSONNEL';

  const ws = buildStyledSheet(
    sheetTitle,
    `Effectif : ${list.length} employé(s)  |  Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    cols,
    rows
  );

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, isDismissedFilter ? 'Licencies' : 'Personnel');
  const filePrefix = isDismissedFilter ? 'echos_personnel_licencies' : 'echos_personnel';
  await saveWorkbook(wb, `${filePrefix}_${getExportFileSuffix()}.xlsx`);
  showToast(isDismissedFilter ? 'Liste des licenciés exportée en Excel !' : 'Registre du personnel exporté en Excel !', 'success');
};

// ================================================================
// 2. EXPORT POINTAGE MENSUEL EXCEL – Stylisé avec légende
// ================================================================
export const exportAttendanceXLSX = async (
  employees: RhEmployee[],
  attendance: Record<string, number>,
  filters: { year: number; month: number },
  attendanceDetails?: Record<string, any>
): Promise<void> => {
  const { year, month } = filters;

  // Filtrer uniquement les employés actifs
  const activeEmployees = employees.filter(e => e.statut !== 'renvoye');

  if (activeEmployees.length === 0) {
    showToast('Aucun employé actif à exporter.', 'warning');
    return;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const workDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() !== 0) workDays.push(d);
  }

  const INDIGO_BG = 'E8EAF6';
  const INDIGO_FG = '3949AB';
  const AMBER_BG = 'FEF3C7';
  const AMBER_FG = 'D97706';

  const nCols = workDays.length + 5; // Nom + Jours + 4 colonnes totaux
  const monthName = removeAccents(MONTHS_FR[month]);

  const ws: any = {};
  let r = 0;

  // ── Ligne 0 : titre ──────────────────────────────────────────
  ws[utils.encode_cell({ r, c: 0 })] = {
    v: `POINTAGE MENSUEL – ${monthName.toUpperCase()} ${year}`,
    t: 's',
    s: titleStyle(),
  };
  for (let c = 1; c < nCols; c++) {
    ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: titleStyle() };
  }
  r++;

  // ── Ligne 1 : sous-titre ─────────────────────────────────────
  ws[utils.encode_cell({ r, c: 0 })] = {
    v: `Effectif : ${activeEmployees.length} employé(s)  |  Généré le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    t: 's',
    s: subtitleStyle(),
  };
  for (let c = 1; c < nCols; c++) {
    ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: subtitleStyle() };
  }
  r++;

  // ── Ligne 2 : vide ───────────────────────────────────────────
  r++;

  // ── Ligne 3 : en-têtes colonnes ──────────────────────────────
  ws[utils.encode_cell({ r, c: 0 })] = { v: 'Nom & Prénom', t: 's', s: colHeaderStyle('left') };
  workDays.forEach((d, i) => {
    const dayOfWeek = new Date(year, month, d).getDay();
    const isSat = dayOfWeek === 6;
    ws[utils.encode_cell({ r, c: i + 1 })] = {
      v: d,
      t: 'n',
      s: {
        ...colHeaderStyle('center'),
        font: { bold: true, color: { rgb: WHITE }, sz: 8, name: 'Calibri' },
        fill: { fgColor: { rgb: isSat ? '6D8A6E' : BRAND } },
      },
    };
  });
  // Totaux
  ws[utils.encode_cell({ r, c: workDays.length + 1 })] = {
    v: 'Présences',
    t: 's',
    s: {
      ...colHeaderStyle('center'),
      fill: { fgColor: { rgb: '1E8449' } },
    },
  };
  ws[utils.encode_cell({ r, c: workDays.length + 2 })] = {
    v: 'Absences',
    t: 's',
    s: {
      ...colHeaderStyle('center'),
      fill: { fgColor: { rgb: 'A93226' } },
    },
  };
  ws[utils.encode_cell({ r, c: workDays.length + 3 })] = {
    v: '1/2 Jour.',
    t: 's',
    s: {
      ...colHeaderStyle('center'),
      fill: { fgColor: { rgb: '3949AB' } },
    },
  };
  ws[utils.encode_cell({ r, c: workDays.length + 4 })] = {
    v: 'Justifiés',
    t: 's',
    s: {
      ...colHeaderStyle('center'),
      fill: { fgColor: { rgb: 'D97706' } },
    },
  };
  r++;

  // ── Lignes employés ───────────────────────────────────────────
  activeEmployees.forEach((emp, rowIdx) => {
    const even = rowIdx % 2 === 0;
    let totalAbs = 0;
    let totalPresent = 0;
    let totalHalf = 0;
    let totalJust = 0;

    // Nom
    const isRenvoye = emp.statut === 'renvoye';
    ws[utils.encode_cell({ r, c: 0 })] = {
      v: `${emp.nom} ${emp.prenom}`,
      t: 's',
      s: {
        font: { bold: true, color: { rgb: isRenvoye ? RED_FG : DARK }, sz: 9, name: 'Calibri' },
        fill: { fgColor: { rgb: even ? ACCENT : GREY_BG } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
          bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
          right:  { style: 'thin', color: { rgb: 'D5D8DC' } },
        },
      },
    };

    // Cellule par jour
    workDays.forEach((d, i) => {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      let displayVal = 'P';
      let cellBg  = even ? ACCENT : GREY_BG;
      let cellFg  = BRAND;

      if (isRenvoye && emp.dateRenvoi) {
        const dismissal = new Date(emp.dateRenvoi);
        dismissal.setHours(0, 0, 0, 0);
        if (dateObj > dismissal) {
          displayVal = '–';
          cellBg = GREY_BG;
          cellFg = 'AAAAAA';
        }
      }

      if (emp.dateEmbauche && displayVal !== '–') {
        const start = new Date(emp.dateEmbauche);
        start.setHours(0, 0, 0, 0);
        if (dateObj < start) {
          displayVal = '–';
          cellBg = GREY_BG;
          cellFg = 'AAAAAA';
        }
      }

      if (displayVal !== '–') {
        const key = `${emp.id}_${year}-${month}-${d}`;
        let status = attendance[key];
        if (status === undefined) status = emp.type === 'temporaire' ? 3 : 1;

        if (status === 2) {
          displayVal = 'ABS';
          cellBg = RED_BG;
          cellFg = RED_FG;
          totalAbs++;
        } else if (status === 4) {
          displayVal = '½';
          cellBg = INDIGO_BG;
          cellFg = INDIGO_FG;
          totalHalf++;
        } else if (status === 3) {
          displayVal = 'J';
          cellBg = AMBER_BG;
          cellFg = AMBER_FG;
          totalJust++;
        } else {
          displayVal = 'P';
          cellBg = even ? ACCENT : GREY_BG;
          cellFg = BRAND;
          totalPresent++;
        }
      }

      ws[utils.encode_cell({ r, c: i + 1 })] = {
        v: displayVal,
        t: 's',
        s: {
          font: { bold: displayVal === 'ABS' || displayVal === '½' || displayVal === 'J', color: { rgb: cellFg }, sz: 8, name: 'Calibri' },
          fill: { fgColor: { rgb: cellBg } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
            bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
            left:   { style: 'hair', color: { rgb: 'D5D8DC' } },
            right:  { style: 'hair', color: { rgb: 'D5D8DC' } },
          },
        },
      };
    });

    // Colonne Présences
    ws[utils.encode_cell({ r, c: workDays.length + 1 })] = {
      v: totalPresent,
      t: 'n',
      s: {
        font: { bold: true, color: { rgb: '1E8449' }, sz: 9, name: 'Calibri' },
        fill: { fgColor: { rgb: even ? ACCENT : GREY_BG } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
          bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
          left:   { style: 'medium', color: { rgb: 'D5D8DC' } },
          right:  { style: 'thin',   color: { rgb: 'D5D8DC' } },
        },
      },
    };

    // Colonne Absences
    ws[utils.encode_cell({ r, c: workDays.length + 2 })] = {
      v: totalAbs,
      t: 'n',
      s: {
        font: { bold: totalAbs > 0, color: { rgb: totalAbs > 0 ? RED_FG : DARK }, sz: 9, name: 'Calibri' },
        fill: { fgColor: { rgb: totalAbs > 0 ? RED_BG : (even ? ACCENT : GREY_BG) } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
          bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
          left:   { style: 'thin', color: { rgb: 'D5D8DC' } },
          right:  { style: 'thin', color: { rgb: 'D5D8DC' } },
        },
      },
    };

    // Colonne 1/2 Journées
    ws[utils.encode_cell({ r, c: workDays.length + 3 })] = {
      v: totalHalf,
      t: 'n',
      s: {
        font: { bold: totalHalf > 0, color: { rgb: INDIGO_FG }, sz: 9, name: 'Calibri' },
        fill: { fgColor: { rgb: totalHalf > 0 ? INDIGO_BG : (even ? ACCENT : GREY_BG) } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
          bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
          left:   { style: 'thin', color: { rgb: 'D5D8DC' } },
          right:  { style: 'thin', color: { rgb: 'D5D8DC' } },
        },
      },
    };

    // Colonne Justifiés
    ws[utils.encode_cell({ r, c: workDays.length + 4 })] = {
      v: totalJust,
      t: 'n',
      s: {
        font: { bold: totalJust > 0, color: { rgb: AMBER_FG }, sz: 9, name: 'Calibri' },
        fill: { fgColor: { rgb: totalJust > 0 ? AMBER_BG : (even ? ACCENT : GREY_BG) } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'hair', color: { rgb: 'D5D8DC' } },
          bottom: { style: 'hair', color: { rgb: 'D5D8DC' } },
          left:   { style: 'thin', color: { rgb: 'D5D8DC' } },
          right:  { style: 'thin', color: { rgb: 'D5D8DC' } },
        },
      },
    };

    r++;
  });

  // ── Ligne légende ─────────────────────────────────────────────
  r++;
  ws[utils.encode_cell({ r, c: 0 })] = {
    v: 'Légende : P = Présent   ABS = Absent   ½ = Demi-journée   J = Justifié   – = Non applicable',
    t: 's',
    s: subtitleStyle(),
  };
  for (let c = 1; c < nCols; c++) {
    ws[utils.encode_cell({ r, c })] = { v: '', t: 's', s: subtitleStyle() };
  }

  // ── Merges titre + sous-titre + légende ───────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
    { s: { r: r, c: 0 }, e: { r: r, c: nCols - 1 } },
  ];

  ws['!cols'] = [
    { wch: 28 },
    ...workDays.map(() => ({ wch: 5 })),
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  ws['!ref']  = utils.encode_range({ r: 0, c: 0 }, { r: r, c: nCols - 1 });
  ws['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 6 }, { hpt: 22 }];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Pointage');
  const monthNum = String(month + 1).padStart(2, '0');
  await saveWorkbook(wb, `echos_pointage_${year}_${monthNum}_${getExportFileSuffix()}.xlsx`);
  showToast('Pointage exporté en Excel !', 'success');
};
