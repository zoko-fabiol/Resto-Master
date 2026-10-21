import React, { useMemo } from 'react';
import {
  Store,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building2,
} from 'lucide-react';
import { Tenant, TenantSignupRequest, PlatformAuditLog, DEFAULT_PLANS, Plan } from '@shared';
import { PendingDeletionsBanner } from '../tenants/PendingDeletionsBanner';

interface PlatformDashboardViewProps {
  tenants: Tenant[];
  signups: TenantSignupRequest[];
  auditLogs: PlatformAuditLog[];
  onSelectTenant: (orgId: string) => void;
  onNavigateToSignups: () => void;
  onOpenCreateTenantModal: () => void;
}

export const PlatformDashboardView: React.FC<PlatformDashboardViewProps> = ({
  tenants,
  signups,
  auditLogs,
  onSelectTenant,
  onNavigateToSignups,
  onOpenCreateTenantModal,
}) => {
  // Calcul des métriques globales
  const totalTenants = tenants.length;
  const activeCount = tenants.filter((t) => t.status === 'actif').length;
  const trialCount = tenants.filter((t) => t.status === 'essai').length;
  const unpaidCount = tenants.filter((t) => t.status === 'impaye').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspendu').length;
  const pendingSignups = signups.filter((s) => s.status === 'en_attente');

  // Estimation du MRR (Monthly Recurring Revenue) en FCFA
  const estimatedMrr = useMemo(() => {
    return tenants
      .filter((t) => t.status === 'actif' || t.status === 'essai')
      .reduce((sum, t) => {
        const plan = DEFAULT_PLANS.find((p: Plan) => p.id === t.planId);
        return sum + (plan?.priceFcfaMonthly || 50000);
      }, 0);
  }, [tenants]);

  // Répartition par plan
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      plan_starter: 0,
      plan_pro: 0,
      plan_enterprise: 0,
    };
    for (const t of tenants) {
      if (counts[t.planId] !== undefined) {
        counts[t.planId]++;
      } else {
        counts.plan_pro++;
      }
    }
    return counts;
  }, [tenants]);

  const kpis = [
    {
      label: 'Total Établissements',
      value: totalTenants,
      subtext: `${activeCount} en exploitation active`,
      icon: Store,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'MRR Récurrent Estimé',
      value: `${estimatedMrr.toLocaleString('fr-FR')} FCFA`,
      subtext: 'Revenus mensuels souscriptions',
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-600',
    },
    {
      label: 'Périodes d’Essai',
      value: trialCount,
      subtext: 'Prospects en phase de test',
      icon: Clock,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Impayés & Suspendus',
      value: unpaidCount + suspendedCount,
      subtext: `${unpaidCount} impayés, ${suspendedCount} suspendus`,
      icon: AlertTriangle,
      color: unpaidCount + suspendedCount > 0 ? 'from-rose-600 to-red-600' : 'from-slate-700 to-slate-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Vue d’Ensemble de la Plateforme
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervision temps réel du parc de restaurants clients et des flux SaaS.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {pendingSignups.length > 0 && (
            <button
              onClick={onNavigateToSignups}
              className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>{pendingSignups.length} Inscription(s) en attente</span>
            </button>
          )}

          <button
            onClick={onOpenCreateTenantModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Nouveau Restaurant Client</span>
          </button>
        </div>
      </div>

      {/* Bannière Règle des 2 Administrateurs (Suppressions en attente) */}
      <PendingDeletionsBanner />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-400">{kpi.label}</div>
                  <div className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">
                    {kpi.value}
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-3">{kpi.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* Grid: Plan Distribution & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans Distribution Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              Répartition des Formules d’Abonnement
            </h2>
            <p className="text-xs text-slate-400 mt-1">Parc actif et en période d’évaluation.</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Starter (25 000 FCFA/mois)</span>
                <span className="font-bold tabular-nums text-white">{planDistribution.plan_starter}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${totalTenants ? (planDistribution.plan_starter / totalTenants) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Pro — Tables & KDS (50 000 FCFA/mois)</span>
                <span className="font-bold tabular-nums text-white">{planDistribution.plan_pro}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${totalTenants ? (planDistribution.plan_pro / totalTenants) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Entreprise Multi-Sites (95 000 FCFA/mois)</span>
                <span className="font-bold tabular-nums text-white">{planDistribution.plan_enterprise}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${totalTenants ? (planDistribution.plan_enterprise / totalTenants) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Taux de conversion estimé</span>
            <span className="font-bold tabular-nums text-emerald-400">
              {trialCount + activeCount > 0
                ? `${Math.round((activeCount / (trialCount + activeCount)) * 100)}%`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Dernières Actions d'Audit SHA-256 */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Piste d’Audit Plateforme Récente
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Chaque opération d'administration est scellée par empreinte cryptographique.
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SHA-256 Chained
            </span>
          </div>

          <div className="space-y-2.5 overflow-hidden">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.action}</span>
                    {log.targetOrgId && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-800 text-amber-400">
                        {log.targetOrgId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{log.detail}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Par <span className="text-slate-300 font-medium">{log.actorEmail}</span> • Motif : {log.reason}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 shrink-0 text-right">
                  <div>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('fr-FR') : ''}</div>
                  <div className="text-[9px] text-emerald-500/80 truncate max-w-[80px]" title={log.sha256Hash}>
                    {log.sha256Hash.slice(0, 8)}…
                  </div>
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                Aucune entrée d'audit enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Liste des Établissements Récents */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            Établissements Récemment Enregistrés
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Affichage des {Math.min(5, tenants.length)} derniers restaurants
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Restaurant</th>
                <th className="pb-3 font-semibold">Localisation</th>
                <th className="pb-3 font-semibold">Formule</th>
                <th className="pb-3 font-semibold">Statut</th>
                <th className="pb-3 font-semibold">Contact Propriétaire</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tenants.slice(0, 5).map((tenant) => {
                const plan = DEFAULT_PLANS.find((p: Plan) => p.id === tenant.planId);
                const statusBadge: Record<string, { label: string; color: string }> = {
                  actif: { label: 'Actif', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                  essai: { label: 'En Essai', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
                  impaye: { label: 'Impayé', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
                  suspendu: { label: 'Suspendu', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
                  resilie: { label: 'Résilié', color: 'bg-slate-800 text-slate-400 border-slate-700' },
                };
                const badge = statusBadge[tenant.status] || { label: tenant.status, color: 'bg-slate-800 text-slate-400' };

                return (
                  <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-white">{tenant.company?.name || tenant.id}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tenant.id}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {tenant.company?.city || 'Douala'}, {tenant.company?.country || 'Cameroun'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-200">{plan?.name || tenant.planId}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-slate-200 font-medium">{tenant.owner?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tenant.owner?.email}</div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onSelectTenant(tenant.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Gérer</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
