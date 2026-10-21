import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Store,
  Plus,
  ArrowUpRight,
  MoreVertical,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  CreditCard,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Tenant, TenantStatus, DEFAULT_PLANS, Plan } from '@shared';
import { adminPlatformService } from '../../services/adminPlatformService';

interface TenantListViewProps {
  tenants: Tenant[];
  onSelectTenant: (orgId: string) => void;
  onOpenCreateTenantModal: () => void;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  tenants,
  onSelectTenant,
  onOpenCreateTenantModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [suspendingTenant, setSuspendingTenant] = useState<Tenant | null>(null);
  const [suspensionMode, setSuspensionMode] = useState<'read_only' | 'full_block'>('read_only');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrage dynamique
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Recherche texte
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.company?.name?.toLowerCase().includes(q) ||
        t.company?.city?.toLowerCase().includes(q) ||
        t.owner?.name?.toLowerCase().includes(q) ||
        t.owner?.email?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q);

      // Filtre statut
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;

      // Filtre formule
      const matchPlan = planFilter === 'all' || t.planId === planFilter;

      return matchSearch && matchStatus && matchPlan;
    });
  }, [tenants, search, statusFilter, planFilter]);

  const handleConfirmSuspension = async () => {
    if (!suspendingTenant || !suspensionReason.trim()) return;

    try {
      setIsSubmitting(true);
      await adminPlatformService.setTenantStatus({
        orgId: suspendingTenant.id,
        status: 'suspendu',
        suspensionMode,
        reason: suspensionReason.trim(),
      });
      setSuspendingTenant(null);
      setSuspensionReason('');
    } catch (err: any) {
      alert(`Erreur de suspension : ${err?.message || 'Action impossible'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (tenant: Tenant) => {
    const reason = prompt(`Motif de la réactivation pour "${tenant.company?.name || tenant.id}" :`);
    if (!reason || reason.trim().length < 3) return;

    try {
      await adminPlatformService.setTenantStatus({
        orgId: tenant.id,
        status: 'actif',
        reason: reason.trim(),
      });
    } catch (err: any) {
      alert(`Erreur de réactivation : ${err?.message || 'Action impossible'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Gestion des Restaurants Clients ({filteredTenants.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configuration à distance, activation des fonctionnalités et suivi contractuel.
          </p>
        </div>

        <button
          onClick={onOpenCreateTenantModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Inscrire un Restaurant</span>
        </button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, ville, email du propriétaire ou identifiant tenant..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtre Statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="essai">En essai gratuit</option>
            <option value="impaye">Impayé</option>
            <option value="suspendu">Suspendu</option>
            <option value="resilie">Résilié</option>
          </select>

          {/* Filtre Formule */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
          >
            <option value="all">Toutes les formules</option>
            <option value="plan_starter">Starter (25 000 FCFA)</option>
            <option value="plan_pro">Pro (50 000 FCFA)</option>
            <option value="plan_enterprise">Entreprise (95 000 FCFA)</option>
          </select>
        </div>
      </div>

      {/* Tableau des Restaurants */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Établissement</th>
                <th className="py-3 px-4 font-semibold">Localisation</th>
                <th className="py-3 px-4 font-semibold">Formule Souscrite</th>
                <th className="py-3 px-4 font-semibold">Statut SaaS</th>
                <th className="py-3 px-4 font-semibold">Propriétaire</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.map((tenant) => {
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
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{tenant.company?.name || tenant.id}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{tenant.id}</span>
                        {tenant.channel === 'beta' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-400 font-bold">
                            BETA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{tenant.company?.city || 'Douala'}</div>
                      <div className="text-[11px] text-slate-500">{tenant.company?.headquartersAddress || tenant.company?.country || 'Cameroun'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{plan?.name || tenant.planId}</div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {plan?.priceFcfaMonthly ? `${plan.priceFcfaMonthly.toLocaleString('fr-FR')} FCFA/m` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        {tenant.status === 'suspendu' && tenant.suspensionMode && (
                          <span className="text-[10px] font-mono text-rose-400">
                            {tenant.suspensionMode === 'read_only' ? 'Lecture seule' : 'Blocage total'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{tenant.owner?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tenant.owner?.email}</div>
                      {tenant.owner?.phone && (
                        <div className="text-[10px] text-slate-500">{tenant.owner.phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectTenant(tenant.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Fiche & Droits</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        {tenant.status === 'suspendu' ? (
                          <button
                            onClick={() => handleReactivate(tenant)}
                            title="Réactiver le restaurant"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendingTenant(tenant)}
                            title="Suspendre le restaurant (impayé ou blocage)"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Aucun restaurant client ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmation de Suspension */}
      {suspendingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Suspendre l'Établissement</h3>
                <p className="text-xs text-slate-400">{suspendingTenant.company?.name || suspendingTenant.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Mode de suspension</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSuspensionMode('read_only')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      suspensionMode === 'read_only'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Consultation Seule</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Lecture autorisée, écritures bloquées</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSuspensionMode('full_block')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      suspensionMode === 'full_block'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Blocage Total</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Révocation des tokens et accès refusé</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Motif obligatoire de la suspension</label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="Ex: Facture d'abonnement non réglée après relance du 20/10/2026..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingTenant(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmSuspension}
                disabled={isSubmitting || !suspensionReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Application...' : 'Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
