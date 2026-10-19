import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRhAppData } from '../../hooks/useFirestore';
import { RhEmployee, RhAppDataPayload, AttendanceDetail } from '../../types/restaurant';
import { saveRhAppData } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { SearchInput } from '../ui/SearchInput';
import { matchesSearch } from '../../utils/searchHelpers';
import { 
  CalendarDays, Check, X, AlertTriangle, ChevronLeft, 
  ChevronRight, MapPin, Calendar, UserPlus, Plus, FileText, FileSpreadsheet, Clock, Pencil,
  StickyNote, Save, ChevronDown, ChevronUp, CloudRain, Zap, Bus, Users, Package, CheckCircle2
} from 'lucide-react';
import { SITES, MONTHS } from '../../config/constants';
import { showToast } from '../ui/Toast';
import { useExports } from '../../hooks/useExports';
import { ExportButton } from '../ExportButton';
import { logAction } from '../../services/logService';
import { AttendanceDetailModal } from './AttendanceDetailModal';

export const Attendance: React.FC = () => {
  const { hasAccess } = useAuth();
  const rhData = useRhAppData();
  
  const employees = rhData?.employees || [];
  const attendance = rhData?.attendance || {};
  const attendanceDetails = rhData?.attendanceDetails || {};
  const dailyNotes = rhData?.dailyNotes || {};
  const payrollExtras = rhData?.payrollExtras || {};
  const visibleSundays = rhData?.visibleSundays || [];

  // Filters State
  const [selectedSite, setSelectedSite] = useState(SITES[0] || '');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showSundays, setShowSundays] = useState(false);
  
  // Unified Day Selector State (Synchronisation totale entre le pointage journalier et la note journalière)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date();
    return (today.getFullYear() === new Date().getFullYear() && today.getMonth() === new Date().getMonth()) ? today.getDate() : 1;
  });
  const selectedDayMobile = selectedDay;
  const setSelectedDayMobile = setSelectedDay;
  const noteDay = selectedDay;
  const setNoteDay = setSelectedDay;

  const [mobileDisplayMode, setMobileDisplayMode] = useState<'daily' | 'grid'>('daily');

  // Modal State for Detailed Attendance Entry
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    employee: RhEmployee | null;
    day: number;
    initialStatus: number;
    initialDetail?: AttendanceDetail;
    isMandatoryJustification?: boolean;
  }>({
    isOpen: false,
    employee: null,
    day: 1,
    initialStatus: 1,
    isMandatoryJustification: false,
  });

  // Long press refs to distinguish hold from short click
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  // --- NOTE JOURNALIÈRE STATE (OPTIONNELLE) ---
  const [isNoteExpanded, setIsNoteExpanded] = useState<boolean>(false);
  const currentNoteKey = `${selectedSite}_${selectedYear}-${selectedMonth}-${noteDay}`;
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [hasUnsavedNote, setHasUnsavedNote] = useState(false);

  // --- DERIVED VALUES ---

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.site === selectedSite && emp.statut !== 'renvoye');
  }, [employees, selectedSite]);

  // Search Filter State for Employees
  const [searchTerm, setSearchTerm] = useState('');

  const displayedEmployees = useMemo(() => {
    if (!searchTerm.trim()) return activeEmployees;
    return activeEmployees.filter(emp => 
      matchesSearch(`${emp.prenom} ${emp.nom}`, searchTerm) ||
      matchesSearch(emp.type, searchTerm) ||
      matchesSearch(emp.contact, searchTerm)
    );
  }, [activeEmployees, searchTerm]);

  // Adjust Selected Day if out of bounds
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  // Sync draft when noteKey or dailyNotes updates
  useEffect(() => {
    const saved = dailyNotes[currentNoteKey] || '';
    setNoteDraft(saved);
    setHasUnsavedNote(false);
  }, [currentNoteKey, dailyNotes]);

  const handleSaveDailyNote = async (contentToSave?: string) => {
    if (!hasAccess('pointage', 'edit')) {
      showToast('Accès en lecture seule : modification non autorisée.', 'error');
      return;
    }
    const text = (contentToSave !== undefined ? contentToSave : noteDraft).trim();
    setIsNoteSaving(true);
    const updatedDailyNotes = { ...dailyNotes };
    if (text) {
      updatedDailyNotes[currentNoteKey] = text;
    } else {
      delete updatedDailyNotes[currentNoteKey];
    }
    const payload: RhAppDataPayload = {
      employees,
      attendance,
      attendanceDetails,
      dailyNotes: updatedDailyNotes,
      payrollExtras,
      visibleSundays
    };
    await saveRhAppData(payload);
    setIsNoteSaving(false);
    setHasUnsavedNote(false);
    await logAction(
      'update',
      'pointage',
      `Note journalière du ${noteDay}/${selectedMonth + 1}/${selectedYear} (${selectedSite}) : ${text ? text.slice(0, 30) + '...' : 'supprimée'}`
    );
    showToast(text ? 'Note journalière enregistrée.' : 'Note journalière supprimée.', 'success');
  };

  // --- HELPERS ---

  const isBeforeStart = (emp: RhEmployee, day: number) => {
    if (!emp.dateEmbauche) return false;
    const targetDate = new Date(selectedYear, selectedMonth, day);
    const startDate = new Date(emp.dateEmbauche);
    startDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() < startDate.getTime();
  };

  const isDismissed = (emp: RhEmployee, day: number) => {
    if (emp.statut !== 'renvoye' || !emp.dateRenvoi) return false;
    const targetDate = new Date(selectedYear, selectedMonth, day);
    const dismissalDate = new Date(emp.dateRenvoi);
    dismissalDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() > dismissalDate.getTime();
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      selectedMonth === now.getMonth() &&
      selectedYear === now.getFullYear()
    );
  };

  const resolveStatus = (emp: RhEmployee, day: number) => {
    const key = `${emp.id}_${selectedYear}-${selectedMonth}-${day}`;
    const status = attendance[key];
    if (status !== undefined) return status;

    // Defaults: Raw/Temporaires default Absent/Justified (3), CDI/Permanent default Present (1)
    return emp.type === 'temporaire' ? 3 : 1;
  };

  // Monthly employee stats map (Presences, Absences, HalfDays, Justifies, Rate)
  const employeeStatsMap = useMemo(() => {
    const map: Record<string, { presences: number; absences: number; halfDays: number; justifies: number; rate: number }> = {};
    displayedEmployees.forEach(emp => {
      let presences = 0;
      let absences = 0;
      let halfDays = 0;
      let justifies = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const isSunday = new Date(selectedYear, selectedMonth, d).getDay() === 0;
        const isSundayVisible = showSundays || visibleSundays.includes(`${selectedYear}-${selectedMonth}-${d}`);
        if (isSunday && !isSundayVisible) continue;
        if (isBeforeStart(emp, d) || isDismissed(emp, d)) continue;

        const status = resolveStatus(emp, d);
        if (status === 1) presences++;
        else if (status === 2) absences++;
        else if (status === 4) halfDays++;
        else if (status === 3) justifies++;
      }

      const totalDays = presences + absences + halfDays + justifies;
      const rate = totalDays > 0 ? Math.round(((presences + halfDays * 0.5) / totalDays) * 100) : 0;
      map[emp.id] = { presences, absences, halfDays, justifies, rate };
    });
    return map;
  }, [displayedEmployees, daysInMonth, selectedYear, selectedMonth, showSundays, visibleSundays, attendance]);

  // Daily totals per column
  const dailyTotals = useMemo(() => {
    const totals: Record<number, { presents: number; absents: number; halfDays: number; justifies: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      let p = 0, a = 0, h = 0, j = 0;
      displayedEmployees.forEach(emp => {
        if (isBeforeStart(emp, d) || isDismissed(emp, d)) return;
        const status = resolveStatus(emp, d);
        if (status === 1) p++;
        else if (status === 2) a++;
        else if (status === 4) h++;
        else if (status === 3) j++;
      });
      totals[d] = { presents: p, absents: a, halfDays: h, justifies: j };
    }
    return totals;
  }, [displayedEmployees, daysInMonth, selectedYear, selectedMonth, attendance]);

  // --- SAVE RECORD ACTION ---

  const updateAttendanceRecord = async (
    emp: RhEmployee,
    day: number,
    nextStatus: number,
    nextDetail?: AttendanceDetail
  ) => {
    const key = `${emp.id}_${selectedYear}-${selectedMonth}-${day}`;
    const updatedAttendance = { ...attendance, [key]: nextStatus };
    const updatedDetails = { ...attendanceDetails };

    if (nextDetail && Object.keys(nextDetail).length > 0) {
      updatedDetails[key] = nextDetail;
    }

    const value: RhAppDataPayload = {
      employees,
      attendance: updatedAttendance,
      attendanceDetails: updatedDetails,
      dailyNotes,
      payrollExtras,
      visibleSundays
    };

    await saveRhAppData(value);
    await logAction(
      'update',
      'pointage',
      `Pointage de ${emp.nom} ${emp.prenom} pour le ${day}/${selectedMonth + 1}/${selectedYear} : ${getStatusText(nextStatus)}`,
      emp.id
    );
  };

  // --- LONG PRESS & MODAL OPENERS ---

  const openDetailModal = (emp: RhEmployee, day: number) => {
    if (!hasAccess('pointage', 'edit')) {
      showToast('Accès en lecture seule : modification du pointage non autorisée.', 'error');
      return;
    }
    const currentStatus = resolveStatus(emp, day);
    const key = `${emp.id}_${selectedYear}-${selectedMonth}-${day}`;
    setModalState({
      isOpen: true,
      employee: emp,
      day,
      initialStatus: currentStatus,
      initialDetail: attendanceDetails[key],
      isMandatoryJustification: false,
    });
  };

  const handlePressStart = (emp: RhEmployee, day: number) => {
    if (isBeforeStart(emp, day) || isDismissed(emp, day)) return;
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      openDetailModal(emp, day);
    }, 450);
  };

  const handlePressEnd = (emp: RhEmployee, day: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressActiveRef.current) {
      handleCellClick(emp, day);
    }
  };

  const handlePressCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // --- CLICK & CYCLE ACTION ---

  const handleCellClick = async (emp: RhEmployee, day: number) => {
    if (!hasAccess('pointage', 'edit')) {
      showToast('Accès en lecture seule : modification du pointage non autorisée.', 'error');
      return;
    }
    if (isBeforeStart(emp, day) || isDismissed(emp, day)) return;

    const currentStatus = resolveStatus(emp, day);
    const key = `${emp.id}_${selectedYear}-${selectedMonth}-${day}`;
    const currentDetail = attendanceDetails[key];

    // Cycle demandé : Présent (1) -> Absent (2) -> Demi-journée (4) -> Justifié (3) -> Présent (1)
    if (currentStatus === 1) {
      // Présent (1) -> Absent (2)
      await updateAttendanceRecord(emp, day, 2, currentDetail);
    } else if (currentStatus === 2) {
      // Absent (2) -> Demi-journée (4)
      await updateAttendanceRecord(emp, day, 4, currentDetail);
    } else if (currentStatus === 4) {
      // Demi-journée (4) -> Justifié (3) : JUSTIFICATIF OBLIGATOIRE DIRECTEMENT !
      // Impossible de passer en Justifié sans saisir le justificatif
      setModalState({
        isOpen: true,
        employee: emp,
        day,
        initialStatus: 3,
        initialDetail: currentDetail,
        isMandatoryJustification: true,
      });
    } else {
      // Justifié (3) -> Présent (1)
      await updateAttendanceRecord(emp, day, 1, currentDetail);
    }
  };

  const toggleSundayVisibility = async (day: number) => {
    if (!hasAccess('pointage', 'edit')) {
      showToast('Accès en lecture seule : modification non autorisée.', 'error');
      return;
    }
    const sundayKey = `${selectedYear}-${selectedMonth}-${day}`;
    let updatedVisibleSundays = [...visibleSundays];
    const updatedAttendance = { ...attendance };

    if (visibleSundays.includes(sundayKey)) {
      updatedVisibleSundays = updatedVisibleSundays.filter(k => k !== sundayKey);
    } else {
      updatedVisibleSundays.push(sundayKey);
      // Auto-initialize all employees to 3 (Justified) on this newly visible Sunday if undefined
      employees.forEach(emp => {
        const key = `${emp.id}_${selectedYear}-${selectedMonth}-${day}`;
        if (updatedAttendance[key] === undefined) {
          updatedAttendance[key] = 3;
        }
      });
    }

    const value: RhAppDataPayload = {
      employees,
      attendance: updatedAttendance,
      attendanceDetails,
      dailyNotes,
      payrollExtras,
      visibleSundays: updatedVisibleSundays
    };
    await saveRhAppData(value);
    await logAction('update', 'pointage', `Visibilité du dimanche ${day}/${selectedMonth + 1}/${selectedYear} modifiée`);
  };

  // --- RENDERING HELPERS ---

  const getCellBgColor = (status: number, isInactive: boolean, isSunday: boolean) => {
    if (isInactive) return 'bg-slate-100/50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-transparent';
    if (isSunday && status === 2) return 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-300/40 dark:border-red-800/40 shadow-2xs';
    if (isSunday && status === 3) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300/40 dark:border-amber-800/40 shadow-2xs';
    if (isSunday && status !== 1) return 'bg-slate-100/60 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 border border-transparent';
    
    switch (status) {
      case 1: return 'bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 shadow-2xs';
      case 2: return 'bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-600 dark:text-red-300 border border-red-500/30 dark:border-red-500/40 shadow-2xs';
      case 4: return 'bg-indigo-500/15 hover:bg-indigo-500/25 active:scale-95 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 dark:border-indigo-500/40 shadow-2xs';
      case 3: return 'bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 shadow-2xs';
      default: return 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800';
    }
  };

  const getCellIcon = (status: number) => {
    switch (status) {
      case 1: return <Check className="w-3.5 h-3.5 stroke-[2.5]" />;
      case 2: return <X className="w-3.5 h-3.5 stroke-[2.5]" />;
      case 4: return <span className="font-black text-xs font-sans">½</span>;
      case 3: return <span className="font-black text-xs font-sans">J</span>;
      default: return null;
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1: return 'Présent';
      case 2: return 'Absent';
      case 4: return 'Demi-journée';
      case 3: return 'Justifié';
      default: return 'Présent';
    }
  };

  const getCellTooltip = (emp: RhEmployee, day: number, status: number, isInactive: boolean) => {
    if (isInactive) return 'Hors contrat';
    const detail = attendanceDetails[`${emp.id}_${selectedYear}-${selectedMonth}-${day}`];
    let text = `${emp.nom} ${emp.prenom} : ${getStatusText(status)}`;
    if (status === 1 && detail?.arrivalTime) text += ` • Arrivée : ${detail.arrivalTime}`;
    if (status === 2 && detail?.absenceReason) text += ` • Motif : ${detail.absenceReason}`;
    if (status === 4) {
      const p = detail?.halfDayPeriod === 'afternoon' ? 'Après-midi' : 'Matin';
      text += ` • Tranche : ${p}${detail?.arrivalTime ? ' (' + detail.arrivalTime + ')' : ''}`;
      if (detail?.justification) text += ` • Note : ${detail.justification}`;
    }
    if (status === 3 && detail?.justification) text += ` • Justifié : ${detail.justification}`;
    if (detail?.justification && status !== 3 && status !== 4) text += ` • Note : ${detail.justification}`;
    text += ' (Maintenir pour modifier les détails)';
    return text;
  };

  const { exportAttendancePDF, exportAttendanceXLSX, exportAttendanceTodayPDF } = useExports();

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      
      {/* Modern Unified Toolbar: Context, Filters & Exports */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col gap-3.5">
        {/* Top Row: Primary Context (Site, Month, Year) & Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          {/* Context selectors (Site + Period) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Site selector badge */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
              <MapPin className="w-4 h-4 text-brand shrink-0" />
              <select
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {SITES.map(site => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>

            {/* Month & Year combo selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
              <Calendar className="w-4 h-4 text-brand shrink-0" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {MONTHS.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
              </select>
              <span className="text-slate-300 dark:text-slate-700 font-bold">/</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Actions: Clean Horizontal Row */}
          {activeEmployees.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportAttendanceTodayPDF({ 
                  site: selectedSite, 
                  day: noteDay, 
                  month: selectedMonth, 
                  year: selectedYear 
                })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                title="Exporter la feuille de présence du jour sélectionné"
              >
                <Calendar className="w-4 h-4 text-brand shrink-0" />
                <span>Présence Jour (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => exportAttendancePDF({ 
                  year: selectedYear, 
                  month: selectedMonth, 
                  site: selectedSite 
                })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                title="Exporter la grille mensuelle complète en PDF"
              >
                <FileText className="w-4 h-4 text-red-500 shrink-0" />
                <span>Rapport Mois (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => exportAttendanceXLSX({ year: selectedYear, month: selectedMonth })}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                title="Exporter la grille mensuelle en tableur Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rapport Mois (Excel)</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Row: Search, Options & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick employee search */}
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Filtrer un employé..."
              size="sm"
              className="w-full sm:w-64"
            />

            {/* Toggle Sundays */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold shadow-sm text-slate-700 dark:text-slate-200 select-none">
              <span>Dimanches</span>
              <button
                type="button"
                onClick={() => setShowSundays(!showSundays)}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  showSundays ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-800'
                }`}
                title={showSundays ? "Masquer les dimanches non travaillés" : "Afficher les dimanches"}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  showSundays ? 'translate-x-3.5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Mobile Display Mode Selector */}
          <div className="flex lg:hidden self-start sm:self-auto bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border dark:border-slate-850">
            <button
              type="button"
              onClick={() => setMobileDisplayMode('daily')}
              className={`py-1.5 px-3 text-3xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileDisplayMode === 'daily'
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
              }`}
            >
              Jour par Jour
            </button>
            <button
              type="button"
              onClick={() => setMobileDisplayMode('grid')}
              className={`py-1.5 px-3 text-3xs font-bold rounded-lg transition-all cursor-pointer ${
                mobileDisplayMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-300'
              }`}
            >
              Vue Complète
            </button>
          </div>
        </div>
      </div>

      {/* SECTION NOTE JOURNALIÈRE (OPTIONNELLE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Titre & informations du jour sélectionné */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <StickyNote className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Note journalière
                  <span className="text-3xs font-medium text-slate-400 font-normal">(Optionnelle)</span>
                </h3>
                {dailyNotes[currentNoteKey] && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-950/60" title="Note enregistrée pour cette journée" />
                )}
              </div>
              <p className="text-3xs text-slate-400">
                Observation générale pour le site <strong className="text-slate-600 dark:text-slate-300">{selectedSite}</strong>
              </p>
            </div>
          </div>

          {/* Sélecteur de date pour la note & bouton développer */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={noteDay}
                onChange={(e) => setNoteDay(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const k = `${selectedSite}_${selectedYear}-${selectedMonth}-${d}`;
                  const hasNote = !!dailyNotes[k];
                  const isDToday = isToday(d);
                  return (
                    <option key={d} value={d}>
                      {d} {MONTHS[selectedMonth]} {isDToday ? '(Aujourd’hui)' : ''} {hasNote ? '• Note' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {noteDay !== new Date().getDate() && selectedMonth === new Date().getMonth() && selectedYear === new Date().getFullYear() && (
              <button
                type="button"
                onClick={() => setNoteDay(new Date().getDate())}
                className="px-2.5 py-1.5 text-3xs font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-xl transition-all"
              >
                Aujourd'hui
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsNoteExpanded(!isNoteExpanded)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>{isNoteExpanded ? 'Réduire' : dailyNotes[currentNoteKey] ? 'Consulter / Modifier' : 'Ajouter une note'}</span>
              {isNoteExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Aperçu compact si non déployé mais qu'une note existe */}
        {!isNoteExpanded && dailyNotes[currentNoteKey] && (
          <div 
            onClick={() => setIsNoteExpanded(true)}
            className="mt-3 p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 cursor-pointer hover:border-amber-300 transition-all flex items-center justify-between"
          >
            <p className="truncate text-3xs sm:text-xs font-medium italic">
              « {dailyNotes[currentNoteKey]} »
            </p>
            <span className="text-3xs font-bold text-amber-700 dark:text-amber-400 shrink-0 ml-2">Modifier</span>
          </div>
        )}

        {/* Éditeur déployé */}
        {isNoteExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 animate-fadeIn">
            <div className="relative">
              <textarea
                value={noteDraft}
                onChange={(e) => {
                  setNoteDraft(e.target.value);
                  setHasUnsavedNote(true);
                }}
                placeholder={`Observation ou remarque pour le ${noteDay} ${MONTHS[selectedMonth]} ${selectedYear} (ex: météo pluvieuse, retard général des transports, coupure d'électricité de 14h à 16h, visite de contrôle, événement particulier...)...`}
                rows={2}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all resize-y"
              />
            </div>

            {/* Suggestions rapides en puces cliquables */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-3xs text-slate-400 font-medium">Suggestions :</span>
              {[
                { label: 'Intempéries / Pluie', icon: CloudRain },
                { label: "Coupure d'électricité", icon: Zap },
                { label: 'Retard transports', icon: Bus },
                { label: "Réunion d'équipe", icon: Users },
                { label: 'Inventaire ponctuel', icon: Package },
                { label: 'Incident technique', icon: AlertTriangle },
                { label: 'Journée normale sans incident', icon: CheckCircle2 }
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const next = noteDraft ? `${noteDraft} • ${label}` : label;
                    setNoteDraft(next);
                    setHasUnsavedNote(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-3xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all"
                >
                  <Icon className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Pied de l'éditeur avec feedback et bouton sauvegarder */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-3xs text-slate-400">
                {hasUnsavedNote ? (
                  <span className="text-amber-500 font-medium inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Modifications non enregistrées</span>
                  </span>
                ) : dailyNotes[currentNoteKey] ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Note enregistrée pour ce jour</span>
                  </span>
                ) : (
                  <span>Aucune note saisie pour ce jour</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {dailyNotes[currentNoteKey] && (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteDraft('');
                      handleSaveDailyNote('');
                    }}
                    disabled={isNoteSaving}
                    className="px-3 py-1.5 text-3xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                  >
                    Supprimer la note
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveDailyNote()}
                  disabled={isNoteSaving || (!hasUnsavedNote && !noteDraft && !dailyNotes[currentNoteKey])}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-brand hover:brightness-110 rounded-xl shadow-sm transition-all disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isNoteSaving ? 'Enregistrement...' : 'Enregistrer la note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pointage display */}
      {activeEmployees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-8 text-center shadow-sm">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">Aucun employé actif</h3>
          <p className="text-xs text-slate-400">Il n'y a aucun employé actif affecté à ce site pour le moment.</p>
        </div>
      ) : (
        <>
          {/* GRID DISPLAY (Visible on large screen, or on small screen if display mode is 'grid') */}
          <div className={`${mobileDisplayMode === 'grid' ? 'block' : 'hidden lg:block'} bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden`}>
            
            {/* Table Subheader & Legend */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-brand flex items-center justify-center font-bold">
                  <CalendarDays className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span>Grille Mensuelle</span>
                    <span className="text-slate-400 font-normal">•</span>
                    <span className="text-brand font-extrabold">{MONTHS[selectedMonth]} {selectedYear}</span>
                  </h4>
                  <span className="text-4xs text-slate-400 font-medium">
                    {displayedEmployees.length} employé{displayedEmployees.length > 1 ? 's' : ''} sur le site {selectedSite}
                  </span>
                </div>
              </div>

              {/* Status Chips Legend */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-3xs font-bold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Présent (1)</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/25">
                  <X className="w-3 h-3 stroke-[3]" />
                  <span>Absent (2)</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                  <span className="font-black text-3xs">½</span>
                  <span>Demi-j. (4)</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                  <span className="font-black text-3xs">J</span>
                  <span>Justifié (3)</span>
                </span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="overflow-x-auto max-w-full scrollbar-thin">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                    <th className="px-3.5 pt-4 pb-2 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 w-48 sm:w-56 border-b border-r border-slate-200/80 dark:border-slate-800 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center justify-between">
                        <span>Employé</span>
                        <span className="text-4xs font-mono font-bold text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {displayedEmployees.length}
                        </span>
                      </div>
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dateObj = new Date(selectedYear, selectedMonth, day);
                      const isSunday = dateObj.getDay() === 0;
                      const isSaturday = dateObj.getDay() === 6;
                      const isSundayVisible = showSundays || visibleSundays.includes(`${selectedYear}-${selectedMonth}-${day}`);
                      if (isSunday && !isSundayVisible) return null;

                      // Check if the next day (Sunday) is already visible
                      const nextSundayKey = `${selectedYear}-${selectedMonth}-${day + 1}`;
                      const isNextSundayVisible = visibleSundays.includes(nextSundayKey);
                      const isDayToday = isToday(day);
                      const isSelected = day === selectedDay;
                      const dayNoteKey = `${selectedSite}_${selectedYear}-${selectedMonth}-${day}`;
                      const hasDayNote = !!dailyNotes[dayNoteKey];

                      return (
                        <th 
                          key={day} 
                          onClick={() => {
                            setSelectedDay(day);
                            setIsNoteExpanded(true);
                          }}
                          className={`w-9 min-w-[36px] max-w-[40px] px-0.5 py-2 text-center text-xs font-bold border-b border-r border-slate-200/60 dark:border-slate-800/80 relative group cursor-pointer transition-colors select-none ${
                            isSelected 
                              ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-b-2 border-b-amber-500 font-extrabold z-10' 
                              : isSunday ? 'text-red-500 bg-red-50/30 dark:bg-red-950/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                          }`}
                          title={hasDayNote ? `Jour ${day} • Note : ${dailyNotes[dayNoteKey]} (Cliquer pour ouvrir)` : `Jour ${day} (Cliquer pour ouvrir la note journalière)`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            {/* 1. Day number at top - Never covered */}
                            {isDayToday ? (
                              <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-extrabold flex items-center justify-center text-3xs shadow-xs">
                                {day}
                              </span>
                            ) : (
                              <span className={`text-xs font-bold leading-tight ${isSunday ? 'text-red-500' : ''}`}>
                                {day}
                              </span>
                            )}

                            {/* 2. Weekday abbreviation */}
                            <span className={`text-[9px] uppercase font-bold tracking-tight mt-0.5 ${
                              isDayToday ? 'text-amber-700 dark:text-amber-300 font-extrabold' : isSunday ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              {dateObj.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2)}
                            </span>

                            {/* 3. Action / Note Row below Weekday */}
                            <div className="min-h-[16px] flex items-center justify-center gap-1 mt-0.5">
                              {/* Plus button on Saturdays to add adjacent Sunday */}
                              {isSaturday && !showSundays && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSundayVisibility(day + 1);
                                  }}
                                  className={`w-3.5 h-3.5 rounded-full shadow-xs border transition-all flex items-center justify-center cursor-pointer ${
                                    isNextSundayVisible 
                                      ? 'bg-red-500 hover:bg-red-600 border-red-600 text-white hover:scale-110' 
                                      : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-700 text-white hover:scale-110'
                                  }`}
                                  title={isNextSundayVisible ? "Masquer le dimanche" : "Afficher le dimanche suivant"}
                                >
                                  {isNextSundayVisible ? (
                                    <X className="w-2 h-2 stroke-[3]" />
                                  ) : (
                                    <Plus className="w-2.5 h-2.5 stroke-[3]" />
                                  )}
                                </button>
                              )}

                              {/* Close button on visible Sundays header to hide it */}
                              {isSunday && !showSundays && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSundayVisibility(day);
                                  }}
                                  className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 border border-red-600 text-white shadow-xs hover:scale-110 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                                  title="Masquer ce dimanche"
                                >
                                  <X className="w-2 h-2 stroke-[3]" />
                                </button>
                              )}

                              {/* Day Note indicator */}
                              {hasDayNote && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-900 shadow-xs" title={`Note: ${dailyNotes[dayNoteKey]}`} />
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}

                    {/* Summary Columns in Header */}
                    <th className="w-11 min-w-[44px] px-1 pt-4.5 pb-2 text-center text-3xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border-b border-r border-slate-200/80 dark:border-slate-800" title="Total Présences">
                      Pres.
                    </th>
                    <th className="w-11 min-w-[44px] px-1 pt-4.5 pb-2 text-center text-3xs font-extrabold uppercase text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/30 border-b border-r border-slate-200/80 dark:border-slate-800" title="Total Absences">
                      Abs.
                    </th>
                    <th className="w-11 min-w-[44px] px-1 pt-4.5 pb-2 text-center text-3xs font-extrabold uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-r border-slate-200/80 dark:border-slate-800" title="Total Demi-journées">
                      ½ J.
                    </th>
                    <th className="w-11 min-w-[44px] px-1 pt-4.5 pb-2 text-center text-3xs font-extrabold uppercase text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 border-b border-r border-slate-200/80 dark:border-slate-800" title="Total Justifiés">
                      Just.
                    </th>
                    <th className="w-14 min-w-[56px] px-1 pt-4.5 pb-2 text-center text-3xs font-extrabold uppercase text-slate-700 dark:text-slate-300 bg-slate-100/50 dark:bg-slate-800/40 border-b border-r border-slate-200/80 dark:border-slate-800" title="Taux de présence">
                      Taux
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 6} className="py-12 text-center text-slate-400">
                        <p className="text-sm font-semibold">Aucun employé trouvé pour « {searchTerm} »</p>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="mt-2 text-xs text-brand hover:underline font-bold"
                        >
                          Effacer le filtre
                        </button>
                      </td>
                    </tr>
                  ) : (
                    displayedEmployees.map(emp => {
                      const empStats = employeeStatsMap[emp.id] || { presences: 0, absences: 0, halfDays: 0, justifies: 0, rate: 0 };
                      return (
                        <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors group">
                          {/* Sticky Employee Column */}
                          <td className="px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-850 z-20 border-b border-r border-slate-200/80 dark:border-slate-800 w-48 sm:w-56 truncate shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.35)] transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6.5 h-6.5 rounded-lg bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold text-3xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                                {emp.prenom?.charAt(0)}{emp.nom?.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="truncate block font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand transition-colors" title={`${emp.nom} ${emp.prenom}`}>
                                  {emp.nom} {emp.prenom}
                                </span>
                                <span className={`text-[9px] font-semibold px-1 py-0.2 rounded uppercase tracking-tight inline-block ${
                                  emp.type === 'permanent' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}>
                                  {emp.type === 'permanent' ? 'CDI' : 'Temp.'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Day Cells */}
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const isSunday = new Date(selectedYear, selectedMonth, day).getDay() === 0;
                            const isSundayVisible = showSundays || visibleSundays.includes(`${selectedYear}-${selectedMonth}-${day}`);
                            if (isSunday && !isSundayVisible) return null;

                            const isInactive = isBeforeStart(emp, day) || isDismissed(emp, day);
                            const status = resolveStatus(emp, day);
                            const isSelected = day === selectedDay;
                            const cellDetail = attendanceDetails[`${emp.id}_${selectedYear}-${selectedMonth}-${day}`];
                            const hasDetail = !!(cellDetail?.arrivalTime || cellDetail?.justification || cellDetail?.absenceReason);

                            return (
                              <td 
                                key={day} 
                                className={`p-0.5 text-center border-b border-r border-slate-100 dark:border-slate-800/80 ${
                                  isSelected ? 'bg-amber-500/[0.05] dark:bg-amber-500/[0.08] border-x border-amber-300/60 dark:border-amber-700/50' : isSunday ? 'bg-red-500/[0.02] dark:bg-red-950/[0.04]' : ''
                                }`}
                              >
                                <button
                                  disabled={isInactive}
                                  onMouseDown={(e) => { if (e.button === 0) handlePressStart(emp, day); }}
                                  onMouseUp={(e) => { if (e.button === 0) handlePressEnd(emp, day); }}
                                  onMouseLeave={() => handlePressCancel()}
                                  onTouchStart={() => handlePressStart(emp, day)}
                                  onTouchEnd={() => handlePressEnd(emp, day)}
                                  onTouchCancel={() => handlePressCancel()}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (!isInactive) openDetailModal(emp, day);
                                  }}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl flex items-center justify-center transition-all duration-150 relative select-none cursor-pointer ${
                                    getCellBgColor(status, isInactive, isSunday)
                                  }`}
                                  title={getCellTooltip(emp, day, status, isInactive)}
                                >
                                  {!isInactive && getCellIcon(status)}
                                  {isInactive && <span className="text-2xs text-slate-300 dark:text-slate-600 font-mono">—</span>}
                                  {!isInactive && hasDetail && (
                                    <span 
                                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" 
                                      title="Détails saisis (heure/motif)"
                                    />
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          {/* Summary Cells */}
                          <td className="px-1 py-2 text-center font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10 border-b border-r border-slate-100 dark:border-slate-800/80">
                            {empStats.presences}
                          </td>
                          <td className="px-1 py-2 text-center font-mono font-bold text-xs text-red-600 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10 border-b border-r border-slate-100 dark:border-slate-800/80">
                            {empStats.absences}
                          </td>
                          <td className="px-1 py-2 text-center font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10 border-b border-r border-slate-100 dark:border-slate-800/80">
                            {empStats.halfDays > 0 ? empStats.halfDays : '-'}
                          </td>
                          <td className="px-1 py-2 text-center font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-b border-r border-slate-100 dark:border-slate-800/80">
                            {empStats.justifies > 0 ? empStats.justifies : '-'}
                          </td>
                          <td className="px-1 py-2 text-center border-b border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30">
                            <span className={`font-mono font-extrabold text-xs px-1.5 py-0.5 rounded ${
                              empStats.rate >= 90 ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40' :
                              empStats.rate >= 75 ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40' :
                              'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40'
                            }`}>
                              {empStats.rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {displayedEmployees.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50/90 dark:bg-slate-950/80 font-bold border-t border-slate-200 dark:border-slate-800">
                      <td className="px-3 py-2.5 text-left text-2xs uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-950 z-20 border-r border-slate-200/80 dark:border-slate-800 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.35)]">
                        Total Présents
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const isSunday = new Date(selectedYear, selectedMonth, day).getDay() === 0;
                        const isSundayVisible = showSundays || visibleSundays.includes(`${selectedYear}-${selectedMonth}-${day}`);
                        if (isSunday && !isSundayVisible) return null;
                        const isSelected = day === selectedDay;
                        const dayTot = dailyTotals[day] || { presents: 0, absents: 0, halfDays: 0, justifies: 0 };
                        return (
                          <td 
                            key={day} 
                            className={`px-0.5 py-2 text-center font-mono font-extrabold text-2xs border-r border-slate-100 dark:border-slate-800/80 ${
                              isSelected ? 'bg-amber-500/10 text-amber-900 dark:text-amber-300' : isSunday ? 'text-slate-400' : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {dayTot.presents + (dayTot.halfDays * 0.5) > 0 ? (dayTot.presents + (dayTot.halfDays * 0.5)) : '-'}
                          </td>
                        );
                      })}
                      <td colSpan={5} className="px-2 py-2 text-center text-4xs font-mono font-semibold text-slate-400">
                        Synthèse
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* DAILY LIST CONTROLLER (Visible on mobile/tablet ONLY when mode is 'daily') */}
          <div className={`${mobileDisplayMode === 'daily' ? 'flex lg:hidden' : 'hidden'} flex-col gap-4 max-w-md w-full mx-auto`}>
            
            {/* Day Selector bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 p-3 rounded-2xl shadow-sm flex items-center justify-between">
              <button
                disabled={selectedDayMobile <= 1}
                onClick={() => setSelectedDayMobile(d => d - 1)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>

              <div className="text-center">
                <span className="text-4xs font-extrabold text-slate-400 uppercase tracking-widest block">Jour Sélectionné</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white font-sans">
                  {selectedDayMobile} {MONTHS[selectedMonth]} {selectedYear}
                </span>
                <span className={`text-4xs font-bold block uppercase mt-0.5 ${
                  new Date(selectedYear, selectedMonth, selectedDayMobile).getDay() === 0 ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {new Date(selectedYear, selectedMonth, selectedDayMobile).toLocaleDateString('fr-FR', { weekday: 'long' })}
                </span>
              </div>

              <button
                disabled={selectedDayMobile >= daysInMonth}
                onClick={() => setSelectedDayMobile(d => d + 1)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* List of Employees for selected day */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm p-3.5 flex flex-col gap-2">
              {displayedEmployees.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Aucun employé correspondant
                </div>
              ) : (
                displayedEmployees.map(emp => {
                  const isInactive = isBeforeStart(emp, selectedDayMobile) || isDismissed(emp, selectedDayMobile);
                  const status = resolveStatus(emp, selectedDayMobile);
                  const isSunday = new Date(selectedYear, selectedMonth, selectedDayMobile).getDay() === 0;
                  const mobileDetail = attendanceDetails[`${emp.id}_${selectedYear}-${selectedMonth}-${selectedDayMobile}`];
                  const hasDetail = !!(mobileDetail?.arrivalTime || mobileDetail?.justification || mobileDetail?.absenceReason);

                  return (
                    <div 
                      key={emp.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40"
                    >
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {emp.nom} {emp.prenom}
                      </h4>
                      <p className="text-4xs text-slate-400 font-medium capitalize mt-0.5">
                        {emp.type === 'permanent' ? 'Permanent' : 'Temporaire'}
                      </p>
                      {hasDetail && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-3xs font-medium">
                          {mobileDetail?.arrivalTime && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-4xs font-bold">
                              <Clock className="w-2.5 h-2.5" />
                              {mobileDetail.arrivalTime}
                            </span>
                          )}
                          {status === 4 && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-4xs font-bold">
                              {mobileDetail?.halfDayPeriod === 'afternoon' ? 'Après-midi' : 'Matin'}
                            </span>
                          )}
                          {(mobileDetail?.justification || mobileDetail?.absenceReason) && (
                            <span className="truncate max-w-[160px] italic text-slate-500 dark:text-slate-400 text-4xs">
                              « {mobileDetail.justification || mobileDetail.absenceReason} »
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isInactive ? (
                        <span className="text-4xs italic text-slate-400">Contrat inactif</span>
                      ) : (
                        <>
                          <button
                            onMouseDown={(e) => { if (e.button === 0) handlePressStart(emp, selectedDayMobile); }}
                            onMouseUp={(e) => { if (e.button === 0) handlePressEnd(emp, selectedDayMobile); }}
                            onMouseLeave={() => handlePressCancel()}
                            onTouchStart={() => handlePressStart(emp, selectedDayMobile)}
                            onTouchEnd={() => handlePressEnd(emp, selectedDayMobile)}
                            onTouchCancel={() => handlePressCancel()}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              openDetailModal(emp, selectedDayMobile);
                            }}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-3xs font-extrabold shadow-sm transition-all select-none ${
                              getCellBgColor(status, false, isSunday)
                            }`}
                            title="Appuyez pour changer, maintenez pour détailler"
                          >
                            {getCellIcon(status)}
                            {getStatusText(status)}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDetailModal(emp, selectedDayMobile)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-brand transition-all"
                            title="Modifier les détails (heure / motif)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </>
      )}

      {/* Attendance Detail Modal (Popup on hold or Justified requirement) */}
      <AttendanceDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onSave={async (newStatus, detail) => {
          if (modalState.employee && modalState.day) {
            await updateAttendanceRecord(modalState.employee, modalState.day, newStatus, detail);
          }
        }}
        employee={modalState.employee}
        day={modalState.day}
        month={selectedMonth}
        year={selectedYear}
        initialStatus={modalState.initialStatus}
        initialDetail={modalState.initialDetail}
        isMandatoryJustification={modalState.isMandatoryJustification}
      />

    </div>
  );
};
