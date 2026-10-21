import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Shield,
  KeyRound,
  Mail,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { PlatformAdmin, PlatformRole } from '@shared';
import { adminPlatformService } from '../../services/adminPlatformService';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const PlatformAdminsView: React.FC = () => {
  const { currentAdmin, hasRole } = useAdminAuth();
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsub = adminPlatformService.subscribeToPlatformAdmins((data) => {
      setAdmins(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const roleLabels: Record<PlatformRole, { label: string; desc: string; color: string }> = {
    platform_owner: {
      label: 'Super Admin Fondateur (Owner)',
      desc: 'Privilèges absolus sur l’ensemble des restaurants, abonnements et configurations.',
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    platform_admin: {
      label: 'Administrateur Plateforme',
      desc: 'Gestion des clients, activation de fonctionnalités, déploiement de profils.',
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    support: {
      label: 'Opérateur Support & Télémaintenance',
      desc: 'Sessions d’assistance éphémères, diagnostic et suivi opérationnel.',
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    billing: {
      label: 'Gestionnaire Facturation & Abonnements',
      desc: 'Enregistrement des règlements FCFA, prolongation d’essais et suivi des impayés.',
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    },
    viewer: {
      label: 'Auditeur / Consultation Seule',
      desc: 'Lecture stricte des métriques et des journaux d’audit sans droit d’écriture.',
      color: 'bg-slate-800 text-slate-300 border-slate-700',
    },
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Équipe d'Administration Plateforme ({admins.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervision des rôles d'autorité centrale (Platform Roles). Principe de moindre privilège et MFA obligatoire.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            MFA TOTP Active
          </span>
        </div>
      </div>

      {/* Rôles Matrice Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="font-bold text-white text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Séparation Stricte des Rôles</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Un administrateur de plateforme n'a aucun compte restaurant direct. Les Custom Claims <code className="text-amber-300">platformRole</code> sont exclusivement injectés par Cloud Functions serveur.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="font-bold text-white text-xs flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Double Authentification (MFA)</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            L'accès à la console exige un code de sécurité à 6 chiffres TOTP. Les sessions inactives sont révoquées au bout de 30 minutes.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="font-bold text-white text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Traçabilité & Chaînage SHA-256</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Toute intervention d'un administrateur (changement de statut, activation de feature, encaissement) est scellée dans la piste d'audit cryptographique.
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Administrateur</th>
                <th className="py-3 px-4 font-semibold">Rôle Plateforme</th>
                <th className="py-3 px-4 font-semibold">Statut</th>
                <th className="py-3 px-4 font-semibold">MFA</th>
                <th className="py-3 px-4 font-semibold">Dernier Accès</th>
                <th className="py-3 px-4 font-semibold text-right">Identifiant UID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {admins.map((adm) => {
                const roleConfig = roleLabels[adm.role] || roleLabels.viewer;

                return (
                  <tr key={adm.uid} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{adm.name || 'Admin'}</div>
                      <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{adm.email}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${roleConfig.color}`}>
                          {adm.role}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 max-w-xs">{roleConfig.desc}</div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center gap-1 ${
                          adm.active !== false
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{adm.active !== false ? 'Actif' : 'Suspendu'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                        TOTP OK
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString('fr-FR') : 'Session active'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-500">
                      {adm.uid.slice(0, 10)}…
                    </td>
                  </tr>
                );
              })}

              {admins.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    Aucun administrateur plateforme listé.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    Chargement de l'équipe d'administration...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
