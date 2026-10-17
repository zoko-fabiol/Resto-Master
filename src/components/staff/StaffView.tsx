import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Attendance,
  Employee,
  WeeklySchedule,
  WeeklyDaySchedule,
  ShiftType,
} from '../../types/restaurant';
import { formatCurrency, ROLE_LABELS } from '../../lib/utils';
import {
  UserCheck,
  Clock,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  X,
  ShieldCheck,
  Users,
  Download,
  Key,
  Edit2,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  Check,
  Zap,
  Palmtree,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserAccountsSection } from './UserAccountsSection';

const DAYS_OF_WEEK: { key: keyof WeeklySchedule; label: string; short: string }[] = [
  { key: 'lundi', label: 'Lundi', short: 'Lun' },
  { key: 'mardi', label: 'Mardi', short: 'Mar' },
  { key: 'mercredi', label: 'Mercredi', short: 'Mer' },
  { key: 'jeudi', label: 'Jeudi', short: 'Jeu' },
  { key: 'vendredi', label: 'Vendredi', short: 'Ven' },
  { key: 'samedi', label: 'Samedi', short: 'Sam' },
  { key: 'dimanche', label: 'Dimanche', short: 'Dim' },
];

const SHIFT_PRESETS: Record<
  ShiftType,
  { label: string; start: string; end: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  midi: {
    label: 'Midi (10h30 - 15h30)',
    start: '10:30',
    end: '15:30',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: Sun,
  },
  soir: {
    label: 'Soir (18h00 - 23h30)',
    start: '18:00',
    end: '23:30',
    color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    icon: Moon,
  },
  journee_continue: {
    label: 'Journée Continue (10h30 - 23h00)',
    start: '10:30',
    end: '23:00',
    color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: Zap,
  },
  repos: {
    label: 'Repos Hebdomadaire',
    start: '',
    end: '',
    color: 'bg-slate-100 text-slate-500 border-slate-200',
    icon: Coffee,
  },
  conge: {
    label: 'Congé Payé / Absence',
    start: '',
    end: '',
    color: 'bg-purple-100 text-purple-900 border-purple-300',
    icon: Palmtree,
  },
};

export const StaffView: React.FC = () => {
  const { currentUser, updateCurrentUserPin } = useAuth();
  const {
    employees,
    attendances,
    addAttendanceRecord,
    updateEmployeeWeeklySchedule,
    settings,
    userAccounts,
    updateUserAccount,
  } = useRestaurant();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'accounts' | 'plannings' | 'attendance' | 'employees'>('plannings');
  const [clockInModalOpen, setClockInModalOpen] = useState(false);

  // Shift Edit Modal State
  const [editingShift, setEditingShift] = useState<{
    employeeId: string;
    employeeName: string;
    dayKey: keyof WeeklySchedule;
    dayLabel: string;
    currentSchedule: WeeklyDaySchedule;
  } | null>(null);

  // PIN Reset Modal State
  const [pinResetModalOpen, setPinResetModalOpen] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<{ id: string; name: string } | null>(null);
  const [newPinCode, setNewPinCode] = useState('');

  // Générateur de PIN unique aléatoire
  const generateUniquePin = (excludeUserId?: string): string => {
    const existingPins = new Set(
      userAccounts
        .filter((a) => a.id !== excludeUserId)
        .map((a) => a.pinCode)
    );
    for (let attempts = 0; attempts < 1000; attempts++) {
      const candidate = Math.floor(1000 + Math.random() * 9000).toString();
      if (!existingPins.has(candidate)) {
        return candidate;
      }
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Détection de collision de PIN
  const pinCollision = useMemo(() => {
    if (!newPinCode || newPinCode.length < 4) return null;
    return userAccounts.find(
      (a) => a.id !== selectedUserForPin?.id && a.pinCode === newPinCode
    );
  }, [newPinCode, userAccounts, selectedUserForPin]);

  // Clock in form
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [status, setStatus] = useState<Attendance['status']>('present');
  const [justification, setJustification] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendances = attendances.filter((a) => a.date === todayStr);

  // Current logged in employee
  const currentLoggedInEmployee = useMemo(() => {
    if (!currentUser) return null;
    return employees.find(
      (e) =>
        e.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
        e.fullName.toLowerCase() === currentUser.name?.toLowerCase()
    );
  }, [currentUser, employees]);

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAttendanceRecord(selectedEmpId, status, justification || undefined);
    setClockInModalOpen(false);
    setJustification('');
    showToast({
      type: 'success',
      title: 'Pointage Enregistré',
      message: 'La présence a été enregistrée avec succès.',
    });
  };

  const handleSaveShift = async (shiftType: ShiftType) => {
    if (!editingShift) return;
    const preset = SHIFT_PRESETS[shiftType];
    const emp = employees.find((e) => e.id === editingShift.employeeId);
    if (!emp) return;

    const currentFullSchedule: WeeklySchedule = emp.weeklySchedule || {
      lundi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
      mardi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
      mercredi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
      jeudi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
      vendredi: { active: true, shift: 'soir', startTime: '18:00', endTime: '23:30' },
      samedi: { active: true, shift: 'soir', startTime: '18:00', endTime: '23:30' },
      dimanche: { active: false, shift: 'repos' },
    };

    const updatedSchedule: WeeklySchedule = {
      ...currentFullSchedule,
      [editingShift.dayKey]: {
        active: shiftType !== 'repos' && shiftType !== 'conge',
        shift: shiftType,
        startTime: preset.start || undefined,
        endTime: preset.end || undefined,
      },
    };

    await updateEmployeeWeeklySchedule(emp.id, updatedSchedule);
    setEditingShift(null);
    showToast({
      type: 'success',
      title: 'Planning Mis à Jour',
      message: `${emp.fullName} • ${editingShift.dayLabel} : ${preset.label}`,
    });
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPin || !newPinCode || newPinCode.length !== 4) {
      showToast({
        type: 'warning',
        title: 'Code PIN invalide',
        message: 'Le code PIN doit comporter exactement 4 chiffres.',
      });
      return;
    }

    if (pinCollision) {
      showToast({
        type: 'warning',
        title: 'Code PIN déjà attribué',
        message: `Ce code PIN est déjà utilisé par ${pinCollision.name}. Choisissez un code unique.`,
      });
      return;
    }

    await updateUserAccount(selectedUserForPin.id, { pinCode: newPinCode });

    if (
      currentUser.id === selectedUserForPin.id ||
      currentUser.name.toLowerCase() === selectedUserForPin.name.toLowerCase()
    ) {
      await updateCurrentUserPin(newPinCode);
    }

    setPinResetModalOpen(false);
    setNewPinCode('');
    showToast({
      type: 'success',
      title: 'Code PIN Réinitialisé',
      message: `Le code PIN de ${selectedUserForPin.name} a été mis à jour avec succès.`,
    });
  };

  // Export payroll summary to CSV
  const handleExportPayrollCsv = () => {
    const headers = ['Matricule', 'Nom & Prénom', 'Rôle', 'Département', 'Salaire de Base', 'Jours Présents', 'Retards'];
    const rows = employees.map((emp) => {
      const empAttendances = attendances.filter((a) => a.employeeId === emp.id);
      const presentCount = empAttendances.filter((a) => a.status === 'present').length;
      const retardCount = empAttendances.filter((a) => a.status === 'retard').length;

      return [
        emp.id,
        `"${emp.fullName}"`,
        emp.role,
        emp.department,
        emp.salary,
        presentCount,
        retardCount,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `recapitulatif_paie_restomaster_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Export Réussi',
      message: 'Fichier récapitulatif de la paie téléchargé en CSV.',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('plannings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'plannings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Plannings Hebdomadaires</span>
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Comptes & Droits ({userAccounts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pointages & Paie ({todayAttendances.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'employees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Fiches Salariés ({employees.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setClockInModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Clock className="w-4 h-4" />
            <span>Pointer Arrivée / Départ</span>
          </button>
        </div>
      </div>

      {/* TAB: PLANNINGS HEBDOMADAIRES (Section 9 du Guide) */}
      {activeTab === 'plannings' && (
        <div className="space-y-4">
          {/* Personalized "Mon Planning" banner if user is matched */}
          {currentLoggedInEmployee && currentLoggedInEmployee.weeklySchedule && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4.5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-200" />
                  <h3 className="font-black text-sm">
                    Mon Planning Hebdomadaire • {currentLoggedInEmployee.fullName} ({ROLE_LABELS[currentLoggedInEmployee.role]?.label})
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">
                  Mon Compte
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((d) => {
                  const daySched = (currentLoggedInEmployee.weeklySchedule as Record<string, WeeklyDaySchedule>)?.[d.key];
                  const preset = daySched ? SHIFT_PRESETS[daySched.shift as ShiftType] || SHIFT_PRESETS.repos : SHIFT_PRESETS.repos;
                  return (
                    <div key={d.key} className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100">{d.label}</div>
                      <div className="mt-1 font-black text-xs flex items-center justify-center gap-1.5">
                        {React.createElement(preset.icon, { className: 'w-3.5 h-3.5 text-amber-200' })}
                        <span className="capitalize">{daySched?.shift.replace('_', ' ') || 'Repos'}</span>
                      </div>
                      {daySched?.startTime && (
                        <div className="text-[10px] font-mono text-amber-100 mt-0.5">
                          {daySched.startTime} - {daySched.endTime}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Team Planning Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Planning Général de la Semaine (Lundi au Dimanche)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cliquez sur n'importe quel créneau pour affecter les services (Midi, Soir, Journée Continue ou Repos).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Midi
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Soir
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Continue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Repos
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4 min-w-[180px]">Salarié & Rôle</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} className="py-3 px-3 text-center min-w-[110px]">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const sched = emp.weeklySchedule || {
                      lundi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
                      mardi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
                      mercredi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
                      jeudi: { active: true, shift: 'midi', startTime: '10:30', endTime: '15:30' },
                      vendredi: { active: true, shift: 'soir', startTime: '18:00', endTime: '23:30' },
                      samedi: { active: true, shift: 'soir', startTime: '18:00', endTime: '23:30' },
                      dimanche: { active: false, shift: 'repos' },
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{emp.fullName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{ROLE_LABELS[emp.role]?.label || emp.role}</span>
                            <span>•</span>
                            <span className="text-slate-400">{emp.department}</span>
                          </div>
                        </td>

                        {DAYS_OF_WEEK.map((d) => {
                          const dayData = (sched as Record<string, WeeklyDaySchedule>)[d.key] || { active: false, shift: 'repos' };
                          const preset = SHIFT_PRESETS[dayData.shift as ShiftType] || SHIFT_PRESETS.repos;

                          return (
                            <td key={d.key} className="py-2.5 px-2 text-center">
                              <button
                                onClick={() =>
                                  setEditingShift({
                                    employeeId: emp.id,
                                    employeeName: emp.fullName,
                                    dayKey: d.key,
                                    dayLabel: d.label,
                                    currentSchedule: dayData,
                                  })
                                }
                                className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${preset.color}`}
                                title={`Cliquer pour modifier le créneau de ${emp.fullName} le ${d.label}`}
                              >
                                <span className="flex items-center gap-1.5 font-semibold">
                                  {React.createElement(preset.icon, { className: 'w-3 h-3' })}
                                  <span className="capitalize text-[10px]">
                                    {dayData.shift === 'journee_continue' ? 'Continue' : dayData.shift}
                                  </span>
                                </span>
                                {dayData.startTime && (
                                  <span className="text-[9px] font-mono opacity-80">
                                    {dayData.startTime}-{dayData.endTime}
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMPTES & DROITS GRANULAIRES */}
      {activeTab === 'accounts' && <UserAccountsSection />}

      {/* TAB: POINTAGES DU JOUR & SUIVI PAIE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Payroll KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Masse Salariale Mensuelle
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {formatCurrency(
                  employees.reduce((acc, e) => acc + (e.salary || 0), 0),
                  settings.currency
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Salaires de base du personnel actif</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Présents Aujourd'hui
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {todayAttendances.filter((a) => a.status === 'present').length} / {employees.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Équipe en salle, cuisine et caisse</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Retards Constatés
              </span>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {todayAttendances.filter((a) => a.status === 'retard').length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Justifications enregistrées</div>
            </div>
          </div>

          {/* Today Attendance Table with CSV Export */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Registre des Pointages — {todayStr}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pointages réels par code PIN pour le calcul de la paie et des heures supplémentaires.
                </p>
              </div>

              <button
                onClick={handleExportPayrollCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
                title="Télécharger le fichier récapitulatif pour la comptabilité"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter Paie (CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Salarié</th>
                    <th className="py-3 px-4">Heure Arrivée</th>
                    <th className="py-3 px-4">Heure Départ</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Aucun pointage enregistré pour cette journée.
                      </td>
                    </tr>
                  ) : (
                    todayAttendances.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{att.employeeName}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{att.checkIn}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{att.checkOut || 'En service'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              att.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'retard'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{att.justification || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FICHES SALARIÉS & RÉINITIALISATION PIN */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const roleInfo = ROLE_LABELS[emp.role] || { label: emp.role, color: 'bg-gray-100 text-gray-800' };
            const linkedAccount = userAccounts.find(
              (u) =>
                u.email?.toLowerCase() === emp.email?.toLowerCase() ||
                u.phone === emp.phone ||
                u.name?.toLowerCase() === emp.fullName.toLowerCase()
            );

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{emp.fullName}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {emp.department}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contrat : {emp.contractType}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Rémunération :</span>
                    <span className="font-black text-slate-900">
                      {formatCurrency(emp.salary, settings.currency)} / mois
                    </span>
                  </div>

                  {/* Reset PIN in 1 click (Section 9 du Guide) */}
                  {linkedAccount && (
                    <button
                      onClick={() => {
                        setSelectedUserForPin({ id: linkedAccount.id, name: emp.fullName });
                        setNewPinCode('');
                        setPinResetModalOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-600" />
                      <span>Réinitialiser Mot de passe / PIN</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SHIFT SELECTION MODAL */}
      {editingShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Définir le service : {editingShift.dayLabel}
                </h3>
                <p className="text-xs text-slate-500">{editingShift.employeeName}</p>
              </div>
              <button onClick={() => setEditingShift(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(SHIFT_PRESETS) as ShiftType[]).map((st) => {
                const preset = SHIFT_PRESETS[st];
                const isSelected = editingShift.currentSchedule.shift === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleSaveShift(st)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                        {React.createElement(preset.icon, { className: 'w-4 h-4' })}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{preset.label}</div>
                        {preset.start && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {preset.start} à {preset.end}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PIN RESET MODAL */}
      {pinResetModalOpen && selectedUserForPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Nouveau PIN : {selectedUserForPin.name}</span>
              </h3>
              <button onClick={() => setPinResetModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPin} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nouveau code PIN à 4 chiffres *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPinCode(generateUniquePin(selectedUserForPin.id))}
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Générer un PIN</span>
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Ex: 1234"
                  required
                  value={newPinCode}
                  onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3 py-2 text-center text-lg font-black tracking-widest rounded-xl border outline-hidden transition-colors ${
                    pinCollision ? 'border-red-400 bg-red-50/20 text-red-900' : 'border-slate-300 focus:border-amber-500'
                  }`}
                />
                {pinCollision ? (
                  <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium leading-tight">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    <span>
                      Déjà utilisé par <strong>{pinCollision.name}</strong>.
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ce code permettra à l'employé de pointer et de déverrouiller son écran.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={newPinCode.length !== 4 || !!pinCollision}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all ${
                    newPinCode.length !== 4 || !!pinCollision
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Mettre à jour le PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOCK IN MODAL */}
      {clockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Enregistrer un Pointage
              </h3>
              <button onClick={() => setClockInModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordAttendance} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Employé *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} ({e.department} - {ROLE_LABELS[e.role]?.label})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Statut de présence *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Attendance['status'])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  <option value="present">Présent à l'heure</option>
                  <option value="retard">En retard</option>
                  <option value="absent">Absent</option>
                  <option value="conge">En congé / repos</option>
                </select>
              </div>

              {status === 'retard' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Motif du retard</label>
                  <input
                    type="text"
                    placeholder="Embouteillages, urgence familiale..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClockInModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Valider Pointage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
