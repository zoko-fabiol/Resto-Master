import React, { useState, useEffect } from 'react';
import { AlertOctagon, CheckCircle2, ShieldAlert, Clock, UserCheck } from 'lucide-react';
import { PendingDeletion } from '@shared';
import { adminPlatformService } from '../../services/adminPlatformService';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const PendingDeletionsBanner: React.FC = () => {
  const { currentAdmin } = useAdminAuth();
  const [deletions, setDeletions] = useState<PendingDeletion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsub = adminPlatformService.subscribeToPendingDeletions((list) => {
      setDeletions(list.filter((d) => d.status === 'en_attente_approbation'));
    });
    return () => unsub();
  }, []);

  if (deletions.length === 0) return null;

  const handleApprove = async (del: PendingDeletion) => {
    if (del.requestedByUid === currentAdmin?.uid) {
      alert('Règle de sécurité violée : vous êtes le demandeur initial. Un second administrateur distinct doit obligatoirement valider cette action.');
      return;
    }

    const reason = prompt(
      `Confirmation Règle des 2 Administrateurs pour la suppression de "${del.companyName}" :\n\nSaisissez votre motif de validation en tant que second signataire :`,
      'Validation de la résiliation contractuelle'
    );
    if (!reason || reason.trim().length < 5) {
      alert('Un motif d\'approbation explicite est obligatoire.');
      return;
    }

    try {
      setIsProcessing(true);
      await adminPlatformService.approveTenantDeletion({
        deletionRequestId: del.id,
        reason: reason.trim(),
      });
      alert(`Suppression validée par le second administrateur avec succès. La purge aura lieu le ${new Date(del.purgeScheduledAt).toLocaleDateString('fr-FR')}.`);
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec de la validation'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-200 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-bold text-sm text-rose-400">
          <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
          <span>Procédure de Suppression en Attente — Règle des 2 Administrateurs (2-Man Rule)</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 font-mono text-[11px] font-bold border border-rose-500/30">
          {deletions.length} demande(s) en attente
        </span>
      </div>

      <div className="space-y-2.5">
        {deletions.map((del) => {
          const isSameAdmin = del.requestedByUid === currentAdmin?.uid;

          return (
            <div
              key={del.id}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/30 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{del.companyName}</span>
                  <span className="font-mono text-slate-400 text-[10px]">({del.orgId})</span>
                </div>
                <div className="text-slate-300">
                  Motif : <em className="text-slate-200">« {del.reason} »</em>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                  <span>Demandé par : <strong className="text-white">{del.requestedByEmail}</strong></span>
                  <span>•</span>
                  <span>Purge prévue le : <strong className="text-rose-400">{new Date(del.purgeScheduledAt).toLocaleDateString('fr-FR')}</strong> (30j rétention)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSameAdmin ? (
                  <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Attente validation Admin B</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleApprove(del)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/30"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Approuver en tant que Second Admin</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
