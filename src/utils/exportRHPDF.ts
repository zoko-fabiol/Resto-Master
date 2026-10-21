// ============================================================
// src/utils/exportRHPDF.ts
// Fonctions d'export PDF pour le module RH (Personnel, Pointage, Bulletins, Historique)
// ============================================================

import jsPDF from 'jspdf';
import 'jspdf-autotable';

import {
  RH_GREEN,
  addPdfHeaderRH,
  removeAccents,
  formatMoney,
  getDateSuffix,
  getExportFileSuffix,
  MONTHS_FR,
} from './exportRHHelpers';

import { showToast } from '../components/ui/Toast';
import { platform } from '../platform';

import type { RhEmployee } from '../types/restaurant';

// ----------------------------------------------------------------
// Types locaux
// ----------------------------------------------------------------
interface PayrollExtras {
  prime: number;
  dette: number;
  retenue: number;
}

export interface PayrollEntry {
  emp: RhEmployee;
  salaireBase?: number;
  baseSalary?: number;
  absentDays: number;
  retenueAbsence: number;
  extras: PayrollExtras;
  net: number;
}

// ----------------------------------------------------------------
// Helper : obtenir le logo depuis le store RH ou localStorage
// ----------------------------------------------------------------
const getLogo = (): string | null =>
  localStorage.getItem('stock_expert_logo');

async function savePdf(doc: jsPDF, filename: string): Promise<boolean> {
  try {
    const data = doc.output('arraybuffer');
    await platform.files.save({
      filename,
      mimeType: 'application/pdf',
      data: new Uint8Array(data),
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(`Échec de l'export PDF : ${message}`, 'error');
    return false;
  }
}

// ----------------------------------------------------------------
// 1. EXPORT PERSONNEL PDF (avec sélection de colonnes)
// ----------------------------------------------------------------
type PersonnelColumn = 'nomComplet' | 'type' | 'statut' | 'site' | 'contact' | 'salaire';

interface PersonnelPDFOptions {
  exportColumns?: PersonnelColumn[];
  customColumns?: string[];
  filters?: {
    site?: string;
    statut?: string;
    type?: string;
  };
}

export const exportPersonnelPDF = async (
  employees: RhEmployee[],
  options: PersonnelPDFOptions = {}
): Promise<void> => {
  const { exportColumns = ['nomComplet', 'type', 'statut', 'site', 'contact', 'salaire'], customColumns = [], filters = {} } = options;

  const isDismissedFilter = filters.statut === 'renvoye';

  // Par défaut, seuls les employés actifs apparaissent sauf si 'renvoye' est explicitement demandé
  let list = employees.filter(e => e.statut !== 'renvoye');
  if (isDismissedFilter) {
    list = employees.filter(e => e.statut === 'renvoye');
  } else if (filters.statut && filters.statut !== 'all') {
    list = employees.filter(e => e.statut === filters.statut);
  }

  if (filters.site && filters.site !== 'all') list = list.filter(e => e.site === filters.site);
  if (filters.type && filters.type !== 'all') list = list.filter(e => e.type === filters.type);

  list.sort((a, b) => {
    const siteComp = a.site.localeCompare(b.site, 'fr');
    if (siteComp !== 0) return siteComp;
    return a.nom.localeCompare(b.nom, 'fr');
  });

  if (list.length === 0) {
    showToast(isDismissedFilter ? 'Aucun employé licencié à exporter.' : 'Aucun employé actif à exporter.', 'warning');
    return;
  }

  const colDefs: Record<PersonnelColumn, { label: string; getValue: (e: RhEmployee) => string }> = {
    nomComplet: { label: 'Nom & Prenom', getValue: e => removeAccents(`${e.nom} ${e.prenom}`) },
    type:       { label: 'Type',         getValue: e => e.type === 'temporaire' ? 'TEMP' : 'CDI/CDD' },
    statut:     { label: 'Statut',       getValue: e => e.statut === 'renvoye' ? 'FIN CONTRAT' : 'ACTIF' },
    site:       { label: 'Site',         getValue: e => removeAccents(e.site) },
    contact:    { label: 'Contact',      getValue: e => e.contact || '' },
    salaire:    { label: 'Salaire',      getValue: e => formatMoney(e.salaireBase) },
  };

  const activeCols = exportColumns.filter(c => colDefs[c]);
  const allColLabels = ['N°', ...activeCols.map(c => colDefs[c].label), ...customColumns];

  const totalCols = allColLabels.length;
  const orientation = totalCols > 7 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation }) as any;
  const docTitle = isDismissedFilter ? 'REGISTRE DU PERSONNEL - LICENCIES & ANCIENS' : 'REGISTRE DU PERSONNEL';

  const startY = addPdfHeaderRH(doc, docTitle, getLogo());

  const body = list.map((e, i) => {
    const row: any[] = [i + 1, ...activeCols.map(c => colDefs[c].getValue(e))];
    customColumns.forEach(() => row.push(''));
    return row;
  });

  doc.autoTable({
    startY,
    head: [allColLabels],
    body,
    theme: 'grid',
    headStyles: { fillColor: RH_GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    styles: { fontSize: 9, minCellHeight: 12 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data: any) => {
      const statIdx = activeCols.indexOf('statut') + 1; // offset +1 pour N°
      if (
        data.section === 'body' &&
        statIdx > 0 &&
        data.column.index === statIdx &&
        data.cell.raw === 'RENVOYE'
      ) {
        data.cell.styles.textColor = [220, 53, 69];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  await savePdf(doc, `echos_personnel_${getExportFileSuffix()}.pdf`);
  showToast('Liste du personnel exportée en PDF !', 'success');
};

// ----------------------------------------------------------------
// 2. EXPORT POINTAGE MENSUEL PDF
// ----------------------------------------------------------------
interface AttendanceFilters {
  year: number;
  month: number; // 0-indexed
  site?: string;
}

export const exportAttendancePDF = async (
  employees: RhEmployee[],
  attendance: Record<string, number>,
  filters: AttendanceFilters,
  attendanceDetails?: Record<string, any>,
  dailyNotes?: Record<string, string>
): Promise<void> => {
  const { year, month, site } = filters;

  // Filtrer uniquement les employés actifs
  let activeEmployees = employees.filter(e => e.statut !== 'renvoye');
  if (site && site !== 'Tous') {
    const siteEmps = activeEmployees.filter(e => e.site === site);
    if (siteEmps.length > 0) {
      activeEmployees = siteEmps;
    }
  }

  if (activeEmployees.length === 0) {
    showToast('Aucun employé actif à exporter.', 'warning');
    return;
  }

  const monthName = removeAccents(MONTHS_FR[month]);
  const doc = new jsPDF({ orientation: 'landscape' }) as any;
  const siteHeader = site && site !== 'Tous' ? ` - SITE ${removeAccents(site.toUpperCase())}` : '';
  const startY = addPdfHeaderRH(doc, `POINTAGE MENSUEL: ${monthName.toUpperCase()} ${year}${siteHeader}`, getLogo());

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Jours ouvrables (hors dimanche)
  const workDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() !== 0) workDays.push(d);
  }

  const headers = [
    'Employe',
    ...workDays.map(d => String(d)),
    'Pres.',
    'Abs.',
    '1/2 J.',
    'Just.',
  ];

  const monthNotes: { date: string; employee: string; statusText: string; note: string }[] = [];

  const body = activeEmployees.map(emp => {
    let totalPres = 0;
    let totalAbs = 0;
    let totalHalf = 0;
    let totalJust = 0;

    const cells: any[] = [removeAccents(`${emp.nom} ${emp.prenom}`)];

    workDays.forEach(d => {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);

      // Après renvoi
      if (emp.statut === 'renvoye' && emp.dateRenvoi) {
        const dismissal = new Date(emp.dateRenvoi);
        dismissal.setHours(0, 0, 0, 0);
        if (dateObj > dismissal) { cells.push('-'); return; }
      }
      // Avant embauche
      if (emp.dateEmbauche) {
        const start = new Date(emp.dateEmbauche);
        start.setHours(0, 0, 0, 0);
        if (dateObj < start) { cells.push('-'); return; }
      }

      const key = `${emp.id}_${year}-${month}-${d}`;
      let status = attendance[key];
      if (status === undefined) status = emp.type === 'temporaire' ? 3 : 1;

      const detail = attendanceDetails?.[key];
      if (status === 2) {
        totalAbs++;
        cells.push('ABS');
        const reason = detail?.absenceReason || detail?.justification;
        if (reason && reason.trim()) {
          monthNotes.push({
            date: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            employee: `${emp.nom} ${emp.prenom}`,
            statusText: 'Absent',
            note: reason.trim()
          });
        }
      } else if (status === 4) {
        totalHalf++;
        cells.push('1/2');
        const p = detail?.halfDayPeriod === 'afternoon' ? 'Apres-midi' : 'Matin';
        const arr = detail?.arrivalTime ? `Heure : ${detail.arrivalTime}` : '';
        const just = detail?.justification ? `Note : ${detail.justification}` : '';
        const parts = [`Periode : ${p}`, arr, just].filter(Boolean);
        if (detail?.justification || detail?.arrivalTime || detail?.halfDayPeriod) {
          monthNotes.push({
            date: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            employee: `${emp.nom} ${emp.prenom}`,
            statusText: `Demi-journee (${p})`,
            note: parts.join(' | ')
          });
        }
      } else if (status === 3) {
        totalJust++;
        cells.push('J');
        if (detail?.justification && detail.justification.trim()) {
          monthNotes.push({
            date: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            employee: `${emp.nom} ${emp.prenom}`,
            statusText: 'Justifie',
            note: detail.justification.trim()
          });
        }
      } else {
        totalPres++;
        cells.push('P');
        if (detail?.arrivalTime || detail?.justification) {
          const arr = detail.arrivalTime ? `Arrivee : ${detail.arrivalTime}` : '';
          const just = detail.justification ? `Note : ${detail.justification}` : '';
          const parts = [arr, just].filter(Boolean);
          if (parts.length > 0) {
            monthNotes.push({
              date: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
              employee: `${emp.nom} ${emp.prenom}`,
              statusText: 'Present',
              note: parts.join(' | ')
            });
          }
        }
      }
    });

    cells.push(totalPres);
    cells.push(totalAbs);
    cells.push(totalHalf);
    cells.push(totalJust);
    return cells;
  });

  const totalCols = workDays.length + 5;

  doc.autoTable({
    startY,
    head: [headers],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: RH_GREEN,
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 38, halign: 'left', fontStyle: 'bold' },
      [totalCols - 4]: { fillColor: [240, 253, 244], textColor: [22, 101, 52], fontStyle: 'bold' },
      [totalCols - 3]: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontStyle: 'bold' },
      [totalCols - 2]: { fillColor: [238, 242, 255], textColor: [67, 56, 202], fontStyle: 'bold' },
      [totalCols - 1]: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index > 0 && data.column.index <= workDays.length) {
        const val = String(data.cell.raw);
        if (val === 'ABS') {
          data.cell.styles.textColor = [220, 53, 69];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === '1/2') {
          data.cell.styles.textColor = [79, 70, 229]; // Indigo
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'J') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'P') {
          data.cell.styles.textColor = [34, 197, 94];
        }
      }
    },
  });

  // Section 1 : Récapitulative des Justificatifs, Heures et Remarques des employés
  if (monthNotes.length > 0) {
    let finalY = (doc as any).lastAutoTable.finalY + 8;
    if (finalY > 165) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RH_GREEN);
    doc.text('JUSTIFICATIFS, HEURES ET REMARQUES DES EMPLOYES CE MOIS', 15, finalY);
    finalY += 4;

    const notesBody = monthNotes.map(n => [
      n.date,
      removeAccents(n.employee),
      removeAccents(n.statusText),
      removeAccents(n.note)
    ]);

    doc.autoTable({
      startY: finalY,
      head: [['Date', 'Employe', 'Statut', 'Heure / Motif / Justificatif']],
      body: notesBody,
      theme: 'grid',
      headStyles: { fillColor: RH_GREEN, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 48, fontStyle: 'bold' },
        2: { cellWidth: 32, halign: 'center' },
        3: { halign: 'left' }
      }
    });
  }

  // Section 2 : Récapitulative des Notes Journalières du mois
  const monthDailyNotes: { date: string; site: string; note: string }[] = [];
  if (dailyNotes) {
    Object.entries(dailyNotes).forEach(([key, note]) => {
      const lastUnderscore = key.lastIndexOf('_');
      const noteSite = lastUnderscore !== -1 ? key.substring(0, lastUnderscore) : 'General';
      const datePart = lastUnderscore !== -1 ? key.substring(lastUnderscore + 1) : key;
      const [y, m, d] = datePart.split('-').map(Number);
      if (y === year && m === month && note && note.trim()) {
        if (!site || site === 'Tous' || noteSite === site) {
          monthDailyNotes.push({
            date: `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
            site: noteSite,
            note: note.trim()
          });
        }
      }
    });
    monthDailyNotes.sort((a, b) => a.date.localeCompare(b.date));
  }

  if (monthDailyNotes.length > 0) {
    let dailyFinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 20;
    if (dailyFinalY > 165) {
      doc.addPage();
      dailyFinalY = 20;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // Amber
    doc.text('OBSERVATIONS ET NOTES JOURNALIERES DU SITE CE MOIS', 15, dailyFinalY);
    dailyFinalY += 4;

    const dailyBody = monthDailyNotes.map(n => [
      n.date,
      removeAccents(n.site),
      removeAccents(n.note)
    ]);

    doc.autoTable({
      startY: dailyFinalY,
      head: [['Date', 'Site', 'Observation / Remarque']],
      body: dailyBody,
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { halign: 'left' }
      }
    });
  }

  const monthNum = String(month + 1).padStart(2, '0');
  await savePdf(doc, `echos_pointage_${year}-${monthNum}_${getExportFileSuffix()}.pdf`);
  showToast('Fiche de pointage exportée en PDF !', 'success');
};

// ----------------------------------------------------------------
// 3. PRÉSENCE DU JOUR PDF (DESIGN MODERNE AVEC KPI & DÉTAILS)
// ----------------------------------------------------------------
export const exportAttendanceTodayPDF = async (
  employees: RhEmployee[],
  attendance: Record<string, number>,
  attendanceDetails?: Record<string, any>,
  dailyNotes?: Record<string, string>,
  options?: { site?: string; day?: number; month?: number; year?: number }
): Promise<void> => {
  const now = new Date();
  const year = options?.year ?? now.getFullYear();
  const month = options?.month ?? now.getMonth();
  const day = options?.day ?? now.getDate();
  const siteFilter = options?.site;

  const targetDate = new Date(year, month, day);
  const titleDate = removeAccents(
    targetDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );

  const doc = new jsPDF() as any;
  const siteHeader = siteFilter && siteFilter !== 'Tous' ? ` - SITE ${removeAccents(siteFilter.toUpperCase())}` : '';
  const startY = addPdfHeaderRH(doc, `PRESENCE DU JOUR - ${titleDate.toUpperCase()}${siteHeader}`, getLogo());

  const todayObj = new Date(year, month, day);
  todayObj.setHours(0, 0, 0, 0);

  // Filtrer uniquement les employés actifs (et par site si spécifié)
  let activeEmployees = employees.filter(e => e.statut !== 'renvoye');
  if (siteFilter && siteFilter !== 'Tous') {
    const siteEmps = activeEmployees.filter(e => e.site === siteFilter);
    if (siteEmps.length > 0) {
      activeEmployees = siteEmps;
    }
  }

  if (activeEmployees.length === 0) {
    showToast('Aucun employé actif à exporter pour cette sélection.', 'warning');
    return;
  }

  // Calcul des statistiques de synthèse pour les KPI
  let countPresent = 0;
  let countAbsent = 0;
  let countHalfDay = 0;
  let countJustified = 0;

  const body = activeEmployees.map(emp => {
    const nomComplet = removeAccents(`${emp.nom} ${emp.prenom}`);
    const siteContrat = `${emp.site || 'Site Principal'} (${emp.type === 'permanent' ? 'Permanent' : 'Temporaire'})`;

    if (emp.statut === 'renvoye' && emp.dateRenvoi) {
      const dismissal = new Date(emp.dateRenvoi);
      dismissal.setHours(0, 0, 0, 0);
      if (todayObj > dismissal) return [nomComplet, siteContrat, 'Fin Contrat', '—', '—'];
    }

    if (emp.dateEmbauche) {
      const start = new Date(emp.dateEmbauche);
      start.setHours(0, 0, 0, 0);
      if (todayObj < start) return [nomComplet, siteContrat, 'Pas encore embauche', '—', '—'];
    }

    const key = `${emp.id}_${year}-${month}-${day}`;
    let status = attendance[key];
    if (status === undefined) status = emp.type === 'temporaire' ? 3 : 1;

    const detail = attendanceDetails?.[key];

    let label = 'Present';
    let heureArrivee = detail?.arrivalTime ? `${detail.arrivalTime}` : '—';
    let motif = '—';

    if (status === 1) {
      label = 'Present';
      countPresent++;
      motif = detail?.justification || '—';
    } else if (status === 2) {
      label = 'Absent';
      countAbsent++;
      motif = detail?.absenceReason || detail?.justification || 'Non specifie';
    } else if (status === 4) {
      label = 'Demi-journee';
      countHalfDay++;
      const p = detail?.halfDayPeriod === 'afternoon' ? 'Apres-midi' : 'Matin';
      const arr = detail?.arrivalTime ? `Heure: ${detail.arrivalTime}` : '';
      const not = detail?.justification ? `Note: ${detail.justification}` : '';
      motif = [p ? `[${p}]` : '', arr, not].filter(Boolean).join(' - ') || `Tranche : ${p}`;
      if (detail?.arrivalTime) heureArrivee = detail.arrivalTime;
    } else if (status === 3) {
      label = 'Justifie';
      countJustified++;
      motif = detail?.justification || 'Absence justifiee';
    }

    return [
      nomComplet,
      siteContrat,
      label,
      heureArrivee,
      removeAccents(motif)
    ];
  });

  const totalActifs = activeEmployees.length;
  const tauxPresence = totalActifs > 0 ? Math.round(((countPresent + countHalfDay * 0.5) / totalActifs) * 100) : 0;

  // --- CARTE DE SYNTHÈSE KPI EN HAUT DU RAPPORT ---
  let kpiY = startY;
  const cardW = 34;
  const cardH = 14;
  const gap = 3.5;
  const leftStart = 15;

  const kpis = [
    { label: 'EFFECTIF TOTAL', val: `${totalActifs}`, color: [70, 80, 95] },
    { label: 'PRESENTS', val: `${countPresent}`, color: [34, 197, 94] },
    { label: 'DEMI-JOURNEES', val: `${countHalfDay}`, color: [99, 102, 241] },
    { label: 'ABSENTS', val: `${countAbsent}`, color: [220, 53, 69] },
    { label: 'JUSTIFIES', val: `${countJustified}`, color: [217, 119, 6] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = leftStart + idx * (cardW + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...(kpi.color as [number, number, number]));
    doc.setLineWidth(0.5);
    doc.roundedRect(x, kpiY, cardW, cardH, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 130, 140);
    doc.text(kpi.label, x + cardW / 2, kpiY + 4.5, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(kpi.color as [number, number, number]));
    doc.text(kpi.val, x + cardW / 2, kpiY + 11, { align: 'center' });
  });

  const tableStartY = kpiY + cardH + 7;

  // Styles par statut
  const statusColors: Record<string, [number, number, number]> = {
    Present: [34, 197, 94],
    Absent: [220, 53, 69],
    'Demi-journee': [99, 102, 241],
    Justifie: [217, 119, 6],
    'Fin Contrat': [156, 163, 175],
    'Pas encore embauche': [156, 163, 175],
  };

  doc.autoTable({
    startY: tableStartY,
    head: [['Employe', 'Site & Type', 'Statut', 'Heure Arrivee', 'Motif / Justificatif / Note']],
    body,
    theme: 'grid',
    headStyles: { fillColor: RH_GREEN, textColor: 255, fontSize: 9, cellPadding: 3.5, fontStyle: 'bold' },
    bodyStyles: { cellPadding: 3, fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 42, fontSize: 7.5, textColor: [100, 110, 120] },
      2: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      4: { halign: 'left', fontSize: 8 },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 2) {
        const val = String(data.cell.raw);
        const col = statusColors[val];
        if (col) {
          data.cell.styles.textColor = col;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Section Note Journalière éventuelle pour ce jour
  const dateKey = `${year}-${month}-${day}`;
  const foundNotes: { site: string; note: string }[] = [];

  if (dailyNotes) {
    Object.entries(dailyNotes).forEach(([k, text]) => {
      if (k.endsWith(`_${dateKey}`) && text && text.trim()) {
        const lastUnderscore = k.lastIndexOf('_');
        const noteSite = lastUnderscore !== -1 ? k.substring(0, lastUnderscore) : 'General';
        if (!siteFilter || siteFilter === 'Tous' || noteSite === siteFilter) {
          foundNotes.push({ site: noteSite, note: text.trim() });
        }
      }
    });
  }

  if (foundNotes.length > 0) {
    let noteY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 220;
    
    // Assembler le texte des observations
    const fullNoteText = foundNotes.map(n => 
      foundNotes.length > 1 ? `[${n.site}] ${n.note}` : n.note
    ).join('\n');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const splitLines = doc.splitTextToSize(removeAccents(fullNoteText), 170);
    const boxHeight = Math.max(16, splitLines.length * 4.5 + 9);

    if (noteY + boxHeight > 280) {
      doc.addPage();
      noteY = 20;
    }

    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11);  // Amber 500
    doc.setLineWidth(0.3);
    doc.roundedRect(15, noteY, 180, boxHeight, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Amber 700
    doc.text('OBSERVATION / NOTE JOURNALIERE DU JOUR :', 19, noteY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(splitLines, 19, noteY + 10.5);
  }

  await savePdf(doc, `echos_presence_${getExportFileSuffix()}.pdf`);
  showToast('Feuille de présence du jour exportée en PDF !', 'success');
};

// ----------------------------------------------------------------
// 4. BULLETINS DE PAIE PDF
// ----------------------------------------------------------------
export const exportPayrollPDF = async (
  payrollData: PayrollEntry[]
): Promise<void> => {
  // Filtrer uniquement les employés actifs
  const activePayroll = payrollData.filter(p => p.emp.statut !== 'renvoye');

  if (activePayroll.length === 0) {
    showToast('Aucune donnée de paie pour les employés actifs à exporter.', 'warning');
    return;
  }

  const doc = new jsPDF() as any;
  let y = addPdfHeaderRH(doc, 'BULLETINS DE PAIE', getLogo());

  activePayroll.forEach(p => {
    // Nouvelle page si débordement
    if (y > 220) {
      doc.addPage();
      y = addPdfHeaderRH(doc, 'BULLETINS DE PAIE (Suite)', getLogo());
    }

    // Bordure du bulletin
    doc.setDrawColor(...RH_GREEN);
    doc.setLineWidth(0.5);
    doc.rect(10, y, 190, 60);

    // Fond en-tête du bulletin
    doc.setFillColor(240, 253, 244);
    doc.rect(10, y, 190, 10, 'F');

    // Nom & Site
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RH_GREEN);
    const nomSite = removeAccents(`${p.emp.nom} ${p.emp.prenom}  |  ${p.emp.site}`);
    doc.text(nomSite, 15, y + 7);

    // Badges type / statut
    if (p.emp.type === 'temporaire') {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('(Temporaire)', 150, y + 7);
    }
    if (p.emp.statut === 'renvoye') {
      doc.setFontSize(8);
      doc.setTextColor(220, 53, 69);
      doc.text('(FIN CONTRAT)', 165, y + 7);
    }

    let ly = y + 18;

    // Ligne 1 : Salaire de base | Primes
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text('Salaire de Base:', 15, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RH_GREEN);
    doc.text(formatMoney(p.salaireBase ?? p.baseSalary ?? p.emp.salaireBase), 90, ly, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('Primes:', 140, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`+ ${formatMoney(p.extras.prime)}`, 195, ly, { align: 'right' });

    ly += 6;

    // Ligne 2 : Absences & Retenues | Dettes
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(`Absences (${p.absentDays}j) & Retenues:`, 15, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text(`- ${formatMoney(p.extras.retenue + p.retenueAbsence)}`, 90, ly, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('Dettes / Avances:', 140, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69);
    doc.text(`- ${formatMoney(p.extras.dette)}`, 195, ly, { align: 'right' });

    // Séparateur
    ly += 12;
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(15, ly, 195, ly);

    // NET À PAYER
    ly += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('NET A PAYER', 15, ly);

    doc.setTextColor(...RH_GREEN);
    doc.text(formatMoney(p.net), 195, ly, { align: 'right' });

    y += 65;
  });

  await savePdf(doc, `echos_bulletins_${getExportFileSuffix()}.pdf`);
  showToast('Bulletins de paie exportés en PDF !', 'success');
};

// ----------------------------------------------------------------
// 5. HISTORIQUE ANNUEL D'UN EMPLOYÉ PDF
// ----------------------------------------------------------------
interface HistoryItem {
  monthName: string;
  presentDays: number;
  absentDays: number;
  netPay: number;
}

export const exportRHHistoryPDF = async (
  employee: RhEmployee,
  historyItems: HistoryItem[],
  year: number
): Promise<void> => {
  if (historyItems.length === 0) {
    showToast("Aucune donnée d'historique disponible.", 'warning');
    return;
  }

  const doc = new jsPDF() as any;
  const title = removeAccents(`HISTORIQUE: ${employee.nom} ${employee.prenom} (${year})`);
  const startY = addPdfHeaderRH(doc, title, getLogo());

  const body = historyItems.map(h => [
    removeAccents(h.monthName),
    h.presentDays,
    h.absentDays,
    formatMoney(h.netPay),
  ]);

  doc.autoTable({
    startY,
    head: [['Mois', 'Jours Travailles', 'Absences (J)', 'Net Estime']],
    body,
    theme: 'grid',
    headStyles: { fillColor: RH_GREEN, textColor: 255 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      1: { halign: 'center' },
      2: { textColor: [220, 53, 69], halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    removeAccents('Ce document est un recapitulatif annuel genere automatiquement.'),
    15,
    finalY
  );

  const fname = removeAccents(`historique_${employee.nom}_${employee.prenom}_${year}_${getExportFileSuffix()}`).replace(/\s/g, '_');
  await savePdf(doc, `${fname}.pdf`);
  showToast('Historique exporté en PDF !', 'success');
};

// ----------------------------------------------------------------
// Helper exporté : calcul d'historique annuel (à appeler depuis le composant)
// ----------------------------------------------------------------
const JOURS_OUVRABLES = 22;

export const buildRHHistory = (
  emp: RhEmployee,
  year: number,
  attendance: Record<string, number>,
  payrollExtras: Record<string, PayrollExtras>
): HistoryItem[] => {
  const items: HistoryItem[] = [];
  const now = new Date();

  for (let m = 0; m < 12; m++) {
    const daysInM = new Date(year, m + 1, 0).getDate();
    let absentCount = 0;
    let presentCount = 0;
    let hasData = false;

    const extrasKey = `${emp.id}_${year}-${m}`;
    const extras = payrollExtras[extrasKey] || { prime: 0, dette: 0, retenue: 0 };

    for (let d = 1; d <= daysInM; d++) {
      const dateObj = new Date(year, m, d);
      dateObj.setHours(0, 0, 0, 0);

      if (emp.statut === 'renvoye' && emp.dateRenvoi) {
        const dismissal = new Date(emp.dateRenvoi);
        dismissal.setHours(0, 0, 0, 0);
        if (dateObj > dismissal) continue;
      }
      if (emp.dateEmbauche) {
        const start = new Date(emp.dateEmbauche);
        start.setHours(0, 0, 0, 0);
        if (dateObj < start) continue;
      }

      const dateKey = `${emp.id}_${year}-${m}-${d}`;
      let status = attendance[dateKey];
      if (status !== undefined) hasData = true;
      if (status === undefined) status = emp.type === 'temporaire' ? 3 : 1;

      if (status === 2 && new Date(year, m, d).getDay() !== 0) absentCount++;
      if (status !== 2) presentCount++;
    }

    if (hasData || m <= now.getMonth()) {
      const retenueAbsence = Math.round((emp.salaireBase / JOURS_OUVRABLES) * absentCount);
      const net = Math.round(
        emp.salaireBase + (extras.prime || 0) - (extras.dette || 0) - (extras.retenue || 0) - retenueAbsence
      );
      items.push({
        monthName: MONTHS_FR[m],
        presentDays: presentCount,
        absentDays: absentCount,
        netPay: net > 0 ? net : 0,
      });
    }
  }

  return items;
};
