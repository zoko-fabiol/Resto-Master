import React, { useState } from 'react';
import {
  AlertTriangle,
  LogOut,
  KeyRound,
  Download,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Lock,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';
import { useAdminAuth } from '../../../context/AdminAuthContext';

interface DangerZoneTabProps {
  tenant: Tenant;
  onRefresh?: () => void;
}

export const DangerZoneTab: React.FC<DangerZoneTabProps> = ({ tenant, onRefresh }) => {
  const { currentAdmin } = useAdminAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletionScheduledDate, setDeletionScheduledDate] = useState<string | null>(null);

  // 1. Déconnexion forcée de toutes les sessions
  const handleForceSignOut = async () => {
    const reason = prompt(
      `Motif obligatoire de la déconnexion forcée pour "${tenant.company?.name || tenant.id}" :`,
      'Révocation de sécurité ou impayé'
    );
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite (min. 5 caractères) est requis.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminPlatformService.forceSignOut({
        orgId: tenant.id,
        reason: reason.trim(),
      });
      alert(`Succès : ${res.revokedCount} session(s) révoquée(s) immédiatement.`);
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec de révocation'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Réinitialisation mot de passe propriétaire sans affichage
  const handleResetPassword = async () => {
    const reason = prompt(
      `Confirmer la génération du lien sécurisé de mot de passe pour ${tenant.owner?.email} :`,
      'Demande d\'assistance du propriétaire'
    );
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite est requis.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminPlatformService.resetOwnerPassword({
        orgId: tenant.id,
        reason: reason.trim(),
      });
      alert(`Lien officiel généré avec succès pour "${res.email}".\n\nConformément à la politique Zero-Trust, aucun mot de passe n'est affiché.`);
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Export des données
  const handleExportData = async () => {
    const reason = prompt(
      `Motif de l'export des données (sauvegarde / portabilité légale) :`,
      'Demande de sauvegarde client'
    );
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite est requis.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminPlatformService.exportTenantData({
        orgId: tenant.id,
        reason: reason.trim(),
      });
      alert(`Archive de données préparée avec succès (Réf: ${res.exportId}).\nL'export est consigné dans le journal d'audit.`);
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec de génération'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Demande de suppression avec Règle des deux administrateurs (2-Man Rule)
  const handleRequestDeletion = async () => {
    const reason = prompt(
      `ATTENTION : Vous êtes sur le point d'initier la SUPPRESSION du restaurant "${tenant.company?.name || tenant.id}".\n\nCette action exige la validation d'un SECOND administrateur distinct.\n\nSaisissez le motif de résiliation/suppression :`
    );
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite est obligatoire pour lancer la procédure de résiliation.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminPlatformService.requestTenantDeletion({
        orgId: tenant.id,
        reason: reason.trim(),
      });

      setDeletionScheduledDate(res.purgeScheduledAt);
      alert(
        `Demande de suppression enregistrée (Réf: ${res.deletionRequestId}).\n\nLe compte est immédiatement verrouillé.\nPurge automatique planifiée pour le ${new Date(res.purgeScheduledAt).toLocaleDateString('fr-FR')}.\n\nUn second administrateur doit maintenant valider la demande.`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Action impossible'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
        <div className="font-bold text-sm text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Zone Dangereuse & Opérations Critiques</span>
        </div>
        <p className="text-xs text-rose-200/80 mt-1">
          Toutes les opérations déclenchées ci-dessous sont irréversibles ou impactent directement l'accès des utilisateurs. Chaque action fait l'objet d'un scellement cryptographique SHA-256 dans la piste d'audit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Révocation des sessions */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-white text-xs flex items-center gap-2">
              <LogOut className="w-4 h-4 text-orange-400" />
              <span>Révocation Forcée des Sessions (forceSignOut)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Déconnecte immédiatement l'ensemble des terminaux et utilisateurs du restaurant en invalidant leurs jetons Firebase Auth.
            </p>
          </div>

          <button
            onClick={handleForceSignOut}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-slate-950 font-bold transition-all border border-orange-500/30 cursor-pointer disabled:opacity-50"
          >
            Déconnecter tous les postes
          </button>
        </div>

        {/* Réinitialisation de mot de passe */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-white text-xs flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Réinitialisation MDP Propriétaire</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Génère et transmet un lien sécurisé au propriétaire ({tenant.owner?.email}) sans jamais afficher d'identifiant en clair.
            </p>
          </div>

          <button
            onClick={handleResetPassword}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-slate-950 font-bold transition-all border border-blue-500/30 cursor-pointer disabled:opacity-50"
          >
            Transmettre un lien de réinitialisation
          </button>
        </div>

        {/* Exportation complète des données */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-white text-xs flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportation Complète des Données (Portabilité)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Télécharge l'archive JSON/CSV de toutes les données du restaurant (menus, ventes, caisses, clients, stocks).
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold transition-all border border-emerald-500/30 cursor-pointer disabled:opacity-50"
          >
            Générer l'archive des données
          </button>
        </div>

        {/* Suppression avec règle des deux administrateurs */}
        <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30 space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="font-bold text-rose-400 text-xs flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>Suppression Définitive (Règle des 2 Administrateurs)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Rétention légale obligatoire de 30 jours avant purge. Requiert la signature de deux administrateurs distincts.
            </p>
          </div>

          <button
            onClick={handleRequestDeletion}
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-600/20"
          >
            Initier la suppression du restaurant
          </button>
        </div>
      </div>
    </div>
  );
};
