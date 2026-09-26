import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Attendance } from '../../types/restaurant';
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
} from 'lucide-react';

export const StaffView: React.FC = () => {
  const { employees, attendances, addAttendanceRecord, settings } = useRestaurant();
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('attendance');
  const [clockInModalOpen, setClockInModalOpen] = useState(false);

  // Clock in form
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [status, setStatus] = useState<Attendance['status']>('present');
  const [justification, setJustification] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendances = attendances.filter((a) => a.date === todayStr);

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAttendanceRecord(selectedEmpId, status, justification || undefined);
    setClockInModalOpen(false);
    setJustification('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pointages du Jour ({todayAttendances.length})
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'employees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Équipe & Salariés ({employees.length})
          </button>
        </div>

        <button
          onClick={() => setClockInModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
        >
          <Clock className="w-4 h-4" />
          <span>Pointer Arrivée / Départ</span>
        </button>
      </div>

      {/* Tab 1: Today Attendances */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
            Registre des Présences — {todayStr}
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
                {todayAttendances.map((att) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Employees Directory */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const roleInfo = ROLE_LABELS[emp.role] || { label: emp.role, color: 'bg-gray-100 text-gray-800' };
            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between"
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

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Rémunération :</span>
                  <span className="font-black text-slate-900">
                    {formatCurrency(emp.salary, settings.currency)} / mois
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clock in Modal */}
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
