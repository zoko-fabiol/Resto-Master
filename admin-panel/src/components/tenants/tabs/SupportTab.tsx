import React, { useState, useEffect } from 'react';
import { Headphones, ShieldCheck, Play, CheckCircle2, Clock, AlertTriangle, StopCircle } from 'lucide-react';
import { SupportSession, Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';
import { db } from '../../../../../src/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface SupportTabProps {
  tenant: Tenant;
}

export const SupportTab: React.FC<SupportTabProps> = ({ tenant }) => {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [mode, setMode] = useState<'read_only' | 'read_write'>('read_only');
  const [reason, setReason] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isStarting, setIsStarting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    const collRef = collection(db, 'support_sessions');
    const q = query(
      collRef,
      where('orgId', '==', tenant.id),
      orderBy('startedAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupportSession)));
      },
      (err) => {
        console.warn('Erreur écoute support_sessions:', err);
      }
    );

    return () => unsub();
  }, [tenant.id]);

  const activeSession = sessions.find((s) => s.active);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      alert('Un motif explicite est requis.');
      return;
    }

    try {
      setIsStarting(true);
      await adminPlatformService.startSupportSession({
        orgId: tenant.id,
        mode,
        reason: reason.trim(),
        durationMinutes,
      });
      setShowStartModal(false);
      setReason('');
      alert('Session de support ouverte avec succès.');
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Action impossible'}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    const summary = prompt('Résumé des actions effectuées lors de l’intervention :');
    try {
      await adminPlatformService.closeSupportSession({
        sessionId,
        summary: summary || undefined,
      });
      alert('Session de support clôturée.');
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Action impossible'}`);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Session Active Banner */}
      {activeSession ? (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>Session de Télémaintenance Active</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {activeSession.mode === 'read_write' ? 'Lecture / Écriture' : 'Consultation Seule'}
                </span>
              </div>
              <div className="text-slate-400 text-xs mt-0.5">
                Ouverte par <span className="text-white font-medium">{activeSession.adminEmail}</span> • Expire le{' '}
                {new Date(activeSession.expiresAt).toLocaleTimeString('fr-FR')}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCloseSession(activeSession.id)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <StopCircle className="w-4 h-4" />
            <span>Clôturer la Session</span>
          </button>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Headphones className="w-4 h-4 text-amber-400" />
              Télémaintenance & Prise en Main à Distance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Accès temporaire audité pour dépanner ou assister le gérant du restaurant.
            </p>
          </div>

          <button
            onClick={() => setShowStartModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Play className="w-4 h-4" />
            <span>Ouvrir une Session Support</span>
          </button>
        </div>
      )}

      {/* Historique des Sessions de Support */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h4 className="font-bold text-white text-xs">Historique des Interventions Support ({sessions.length})</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Date & Heure</th>
                <th className="pb-3 font-semibold">Intervenant</th>
                <th className="pb-3 font-semibold">Mode</th>
                <th className="pb-3 font-semibold">Motif</th>
                <th className="pb-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 text-slate-300 font-mono text-[11px]">
                    {new Date(sess.startedAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3 text-white font-medium">{sess.adminEmail}</td>
                  <td className="py-3">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-slate-800 text-slate-300">
                      {sess.mode}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400 italic max-w-xs truncate" title={sess.reason}>
                    "{sess.reason}"
                  </td>
                  <td className="py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        sess.active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sess.active ? 'En cours' : 'Clôturée'}
                    </span>
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    Aucune session de télémaintenance enregistrée pour ce restaurant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'Ouverture de Session */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Démarrer une Session Support</h3>
              <button onClick={() => setShowStartModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleStartSession} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mode d'accès</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('read_only')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mode === 'read_only'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Consultation Seule</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Audit et diagnostic sans modification</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('read_write')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      mode === 'read_write'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Lecture / Écriture</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Modification et correction directe</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Durée maximale autorisée</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Heure (Standard)</option>
                  <option value={120}>2 Heures</option>
                  <option value={240}>4 Heures (Intervention lourde)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motif obligatoire de l'intervention *</label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Correction bug clôture de caisse suite à appel téléphonique du gérant..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isStarting || !reason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isStarting ? 'Ouverture...' : 'Confirmer et Ouvrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
