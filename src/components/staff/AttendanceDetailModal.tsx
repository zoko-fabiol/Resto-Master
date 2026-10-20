import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { RhEmployee, AttendanceDetail } from '../../types/restaurant';
import { Check, X, Clock, AlertTriangle, Clock3, FileText, Calendar, AlertCircle, Plus } from 'lucide-react';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: RhEmployee | null;
  day: number;
  month: number;
  year: number;
  initialStatus: number; // 1: Présent, 2: Absent, 4: Demi-journée, 3: Justifié
  initialDetail?: AttendanceDetail;
  isMandatoryJustification?: boolean; // Si true, l'utilisateur a cliqué pour passer en Justifié
  onSave: (status: number, detail: AttendanceDetail) => void;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  employee,
  day,
  month,
  year,
  initialStatus,
  initialDetail,
  isMandatoryJustification = false,
  onSave,
}) => {
  const [status, setStatus] = useState<number>(initialStatus || 1);
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [halfDayPeriod, setHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [error, setError] = useState<string | null>(null);

  // Synchroniser les valeurs à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const currentTargetStatus = isMandatoryJustification ? 3 : (initialStatus || 1);
      setStatus(currentTargetStatus);
      setArrivalTime(initialDetail?.arrivalTime || (currentTargetStatus === 1 ? getDefaultArrivalTime() : ''));
      setJustification(initialDetail?.justification || '');
      setAbsenceReason(initialDetail?.absenceReason || '');
      setHalfDayPeriod(initialDetail?.halfDayPeriod || 'morning');
      setError(null);
    }
  }, [isOpen, initialStatus, initialDetail, isMandatoryJustification]);

  function getDefaultArrivalTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const handleSetCurrentTime = () => {
    setArrivalTime(getDefaultArrivalTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // RÈGLE OBLIGATOIRE : Si Justifié (status 3), le justificatif est strictement obligatoire
    if (status === 3 && !justification.trim()) {
      setError("Le justificatif est obligatoire pour enregistrer une absence justifiée.");
      return;
    }

    const detail: AttendanceDetail = {
      updatedAt: Date.now()
    };

    if (status === 1) {
      if (arrivalTime.trim()) detail.arrivalTime = arrivalTime.trim();
      if (justification.trim()) detail.justification = justification.trim();
    } else if (status === 2) {
      if (absenceReason.trim()) detail.absenceReason = absenceReason.trim();
    } else if (status === 4) {
      detail.halfDayPeriod = halfDayPeriod;
      if (arrivalTime.trim()) detail.arrivalTime = arrivalTime.trim();
      if (justification.trim()) detail.justification = justification.trim();
    } else if (status === 3) {
      detail.justification = justification.trim();
    }

    onSave(status, detail);
    onClose();
  };

  if (!employee) return null;

  const dateObj = new Date(year, month, day);
  const dateFormatted = `${day} ${MONTHS_FR[month]} ${year}`;
  const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand" />
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Pointage détaillé
            </div>
            <div className="text-3xs font-medium text-slate-500 capitalize">
              {dayName} {dateFormatted}
            </div>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identité Employé */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {employee.nom} {employee.prenom}
            </div>
            <div className="text-3xs text-slate-500 font-medium">
              Site : <span className="text-brand font-semibold">{employee.site}</span> • Contrat : <span className="capitalize">{employee.type}</span>
            </div>
          </div>
          <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            ID #{employee.id}
          </span>
        </div>

        {/* Sélecteur de statut (4 boutons) */}
        <div>
          <label className="block text-3xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Statut du jour
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {/* 1. Présent */}
            <button
              type="button"
              onClick={() => { setStatus(1); setError(null); }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 1
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Présent</span>
            </button>

            {/* 2. Absent */}
            <button
              type="button"
              onClick={() => { setStatus(2); setError(null); }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 2
                  ? 'bg-red-500 text-white border-red-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Absent</span>
            </button>

            {/* 4. Demi-journée */}
            <button
              type="button"
              onClick={() => { setStatus(4); setError(null); }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 4
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>½ Journée</span>
            </button>

            {/* 3. Justifié */}
            <button
              type="button"
              onClick={() => { setStatus(3); setError(null); }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                status === 3
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/20'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Justifié</span>
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire dynamique selon statut */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/80 rounded-xl space-y-3">
          
          {/* CAS 1 : PRÉSENT */}
          {status === 1 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
                    Heure d'arrivée (optionnel)
                  </label>
                  <button
                    type="button"
                    onClick={handleSetCurrentTime}
                    className="text-4xs font-bold text-brand hover:underline flex items-center gap-1"
                  >
                    <Clock3 className="w-2.5 h-2.5" />
                    Heure actuelle
                  </button>
                </div>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Justificatif ou note (optionnel)
                </label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Ex : Retard justifié pour mission, circulation..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand"
                />
              </div>
            </>
          )}

          {/* CAS 2 : ABSENT */}
          {status === 2 && (
            <div>
              <label className="block text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Motif de l'absence (optionnel)
              </label>
              <textarea
                value={absenceReason}
                onChange={e => setAbsenceReason(e.target.value)}
                placeholder="Ex : Raison personnelle, injoignable, déplacement imprévu..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Injoignable', 'Raison personnelle', 'Urgence familiale', 'Panne de transport'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAbsenceReason(chip)}
                    className="text-4xs px-2 py-1 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CAS 4 : DEMI-JOURNÉE */}
          {status === 4 && (
            <>
              <div>
                <label className="block text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Tranche horaire de la demi-journée
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod('morning')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      halfDayPeriod === 'morning'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Matinée (08h - 12h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod('afternoon')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      halfDayPeriod === 'afternoon'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Après-midi (13h - 17h)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Heure de présence / départ (optionnel)
                </label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Motif ou note (optionnel)
                </label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Ex : Autorisé à quitter à 12h pour démarche administrative..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </>
          )}

          {/* CAS 3 : JUSTIFIÉ (OBLIGATOIRE) */}
          {status === 3 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-3xs font-extrabold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Justificatif de l'absence <span className="text-red-500 text-xs">* (Obligatoire)</span>
                </label>
              </div>
              <textarea
                value={justification}
                onChange={e => { setJustification(e.target.value); setError(null); }}
                placeholder="Ex : Certificat médical Dr. N'Guessan, Ordre de mission n°42, Événement familial autorisé..."
                rows={3}
                required
                className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none ${
                  !justification.trim() && error
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-amber-300 dark:border-amber-700/60 focus:border-amber-500'
                }`}
              />
              <p className="text-4xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>Une absence ne peut pas être marquée comme « Justifiée » sans motif ou document officiel.</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Certificat médical', 'Ordre de mission', 'Événement familial', 'Dispense direction', 'Congé de maternité/paternité'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => { setJustification(chip); setError(null); }}
                    className="inline-flex items-center gap-1 text-4xs px-2 py-1 rounded-md bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-800/80 text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 transition-colors"
                  >
                    <Plus className="w-2.5 h-2.5 text-amber-500" />
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold text-white bg-brand hover:opacity-90 rounded-xl shadow-sm transition-all"
          >
            Enregistrer le pointage
          </button>
        </div>
      </form>
    </Modal>
  );
};
