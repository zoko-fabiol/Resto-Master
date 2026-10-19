import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Attendance,
  WeeklySchedule,
  WeeklyDaySchedule,
  ShiftType,
} from '../../types/restaurant';
import { ROLE_LABELS } from '../../lib/utils';
import {
  Clock,
  Calendar,
  X,
  ShieldCheck,
  Users,
  Sun,
  Moon,
  Coffee,
  Check,
  Zap,
  Palmtree,
  LayoutDashboard,
  Coins,
} from 'lucide-react';
import { UserAccountsSection } from './UserAccountsSection';
import { DashboardRH } from './DashboardRH';
import { Employees } from './Employees';
import { Attendance as AttendanceComponent } from './Attendance';
import { Salaires } from './Salaires';

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
  const { currentUser } = useAuth();
  const {
    employees,
    addAttendanceRecord,
    updateEmployeeWeeklySchedule,
    userAccounts,
  } = useRestaurant();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'attendance' | 'plannings' | 'salaires' | 'accounts'>('dashboard');
  const [clockInModalOpen, setClockInModalOpen] = useState(false);

  // Shift Edit Modal State
  const [editingShift, setEditingShift] = useState<{
    employeeId: string;
    employeeName: string;
    dayKey: keyof WeeklySchedule;
    dayLabel: string;
    currentSchedule: WeeklyDaySchedule;
  } | null>(null);

  // Clock in form
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [status, setStatus] = useState<Attendance['status']>('present');
  const [justification, setJustification] = useState('');

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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-600" />
            <span>Tableau de Bord</span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'employees' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Personnel & Registre ({employees.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'attendance' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pointages & Présences</span>
          </button>
          <button
            onClick={() => setActiveTab('plannings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'plannings' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-600" />
            <span>Planning Hebdo</span>
          </button>
          <button
            onClick={() => setActiveTab('salaires')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'salaires' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            <span>Salaires & Paie</span>
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'accounts' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Comptes & Droits ({userAccounts.length})</span>
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

      {/* TAB: TABLEAU DE BORD RH */}
      {activeTab === 'dashboard' && (
        <DashboardRH onNavigateToTransactions={() => setActiveTab('salaires')} />
      )}

      {/* TAB: PERSONNEL & REGISTRE COMPLET */}
      {activeTab === 'employees' && (
        <Employees />
      )}

      {/* TAB: POINTAGES & PRÉSENCES AVANCÉ */}
      {activeTab === 'attendance' && (
        <AttendanceComponent />
      )}

      {/* TAB: SALAIRES, PRIMES & BULLETINS */}
      {activeTab === 'salaires' && (
        <Salaires />
      )}

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
