import React, { useState } from 'react';
import { UserPlus, CheckCircle2, XCircle, Clock, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';
import { TenantSignupRequest, DEFAULT_PLANS, Plan } from '@shared';
import { adminPlatformService } from '../../services/adminPlatformService';

interface SignupsListViewProps {
  signups: TenantSignupRequest[];
  onRefresh?: () => void;
}

export const SignupsListView: React.FC<SignupsListViewProps> = ({ signups, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'approuvee' | 'rejetee'>('en_attente');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredSignups = signups.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const handleApprove = async (signup: TenantSignupRequest) => {
    const reason = prompt(`Motif d'approbation pour "${signup.companyName}" :`, 'Dossier client complet et vérifié');
    if (!reason) return;

    try {
      setProcessingId(signup.id);
      const res = await adminPlatformService.approveSignup({
        signupId: signup.id,
        planId: signup.desiredPlanId || 'plan_pro',
        reason,
      });

      alert(
        `Inscription approuvée avec succès !\n\nRestaurant ID : ${res.orgId}\nLien de mot de passe : ${res.passwordResetLink}`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur d'approbation : ${err?.message || 'Échec'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (signup: TenantSignupRequest) => {
    const reason = prompt(`Motif du rejet pour "${signup.companyName}" :`);
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite est obligatoire.');
      return;
    }

    try {
      setProcessingId(signup.id);
      await adminPlatformService.rejectSignup({
        signupId: signup.id,
        reason: reason.trim(),
      });
      alert('Demande d’inscription rejetée.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur de rejet : ${err?.message || 'Échec'}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Demandes d’Inscription Publiques ({filteredSignups.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Demandes formulées en libre-service par les restaurants depuis le portail de connexion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
          {(['en_attente', 'approuvee', 'rejetee', 'all'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`flex-1 sm:flex-none text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === st
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'en_attente'
                ? 'En attente'
                : st === 'approuvee'
                ? 'Approuvées'
                : st === 'rejetee'
                ? 'Rejetées'
                : 'Toutes'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid des Demandes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSignups.map((signup) => {
          const plan = DEFAULT_PLANS.find((p: Plan) => p.id === signup.desiredPlanId);
          const isPending = signup.status === 'en_attente';

          return (
            <div
              key={signup.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{signup.companyName}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{signup.city}, {signup.country || 'Cameroun'}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      signup.status === 'en_attente'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : signup.status === 'approuvee'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {signup.status === 'en_attente' ? 'En attente' : signup.status}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Demandeur :</span>
                    <span className="text-white font-medium">{signup.applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email :</span>
                    <span className="font-mono text-slate-300">{signup.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Téléphone :</span>
                    <span className="font-mono text-slate-300">{signup.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Formule souhaitée :</span>
                    <span className="font-bold text-amber-400">{plan?.name || signup.desiredPlanId}</span>
                  </div>
                  {signup.estimatedTables && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tables estimées :</span>
                      <span className="font-mono tabular-nums text-white">{signup.estimatedTables}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[10px] text-slate-500 font-mono">
                  Déposée le {new Date(signup.submittedAt).toLocaleString('fr-FR')}
                </div>

                {isPending && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(signup)}
                      disabled={processingId === signup.id}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/15 text-rose-400 hover:bg-rose-600/25 font-bold transition-all cursor-pointer"
                    >
                      Rejeter
                    </button>

                    <button
                      onClick={() => handleApprove(signup)}
                      disabled={processingId === signup.id}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{processingId === signup.id ? 'Traitement...' : 'Approuver'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredSignups.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-500 italic">
            Aucune demande d'inscription dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};
