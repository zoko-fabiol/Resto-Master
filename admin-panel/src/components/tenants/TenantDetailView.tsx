import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  Sliders,
  Gauge,
  CreditCard,
  Activity,
  ShieldCheck,
  Headphones,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Layers,
  Users,
  Store,
  Wand2,
} from 'lucide-react';
import { Tenant, TenantEntitlements, DEFAULT_PLANS, Plan } from '@shared';
import { adminPlatformService } from '../../services/adminPlatformService';
import { OverviewTab } from './tabs/OverviewTab';
import { FeaturesTab } from './tabs/FeaturesTab';
import { UsersTab } from './tabs/UsersTab';
import { OutletsTab } from './tabs/OutletsTab';
import { LimitsTab } from './tabs/LimitsTab';
import { BillingTab } from './tabs/BillingTab';
import { DiagnosticsTab } from './tabs/DiagnosticsTab';
import { AuditTab } from './tabs/AuditTab';
import { SupportTab } from './tabs/SupportTab';
import { ProfileApplicatorModal } from '../config/ProfileApplicatorModal';
import { SetupWizardModal } from '../config/SetupWizardModal';

interface TenantDetailViewProps {
  orgId: string;
  onBack: () => void;
}

export const TenantDetailView: React.FC<TenantDetailViewProps> = ({ orgId, onBack }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [entitlements, setEntitlements] = useState<TenantEntitlements | null>(null);
  const [activeTab, setActiveTab] = useState<string>('features');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Écoute en temps réel du tenant et de ses droits
  useEffect(() => {
    setIsLoading(true);
    const unsubTenant = adminPlatformService.subscribeToTenant(orgId, (t) => {
      setTenant(t);
      setIsLoading(false);
    });

    const unsubEnt = adminPlatformService.subscribeToTenantEntitlements(orgId, (ent) => {
      setEntitlements(ent);
    });

    return () => {
      unsubTenant();
      unsubEnt();
    };
  }, [orgId]);

  if (isLoading && !tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 text-xs gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
        <span>Chargement des informations du restaurant {orgId}...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-rose-400 font-bold text-sm">Établissement introuvable.</div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const plan = DEFAULT_PLANS.find((p: Plan) => p.id === tenant.planId);

  const statusBadge: Record<string, { label: string; color: string }> = {
    actif: { label: 'Actif', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    essai: { label: 'En Essai', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    impaye: { label: 'Impayé', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    suspendu: { label: 'Suspendu', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
    resilie: { label: 'Résilié', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  };
  const badge = statusBadge[tenant.status] || { label: tenant.status, color: 'bg-slate-800 text-slate-400' };

  const tabs = [
    { id: 'features', label: 'Matrice des Droits & Modules', icon: Sliders },
    { id: 'overview', label: 'Fiche Société & Contacts', icon: Building2 },
    { id: 'users', label: 'Comptes Collaborateurs', icon: Users },
    { id: 'outlets', label: 'Succursales & Points de Vente', icon: Store },
    { id: 'limits', label: 'Limites Contractuelles', icon: Gauge },
    { id: 'billing', label: 'Abonnement & Règlements', icon: CreditCard },
    { id: 'diagnostics', label: 'Santé & Diagnostics', icon: Activity },
    { id: 'audit', label: 'Journal d’Audit Crypté', icon: ShieldCheck },
    { id: 'support', label: 'Télémaintenance Support', icon: Headphones },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Fast Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800"
          title="Retour à la liste"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-xs text-slate-400">
          Restaurants Clients / <span className="text-white font-mono">{tenant.id}</span>
        </div>
      </div>

      {/* Main Tenant Card Header */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 shrink-0">
            {tenant.company?.name ? tenant.company.name.slice(0, 2).toUpperCase() : 'RM'}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-tight">
                {tenant.company?.name || tenant.id}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                {badge.label}
              </span>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {plan?.name || tenant.planId}
              </span>
              {tenant.channel === 'beta' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  BETA
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="font-mono text-slate-300">ID: {tenant.id}</span>
              <span>•</span>
              <span>{tenant.company?.city || 'Douala'}, Cameroun</span>
              <span>•</span>
              <span>Propriétaire : <strong className="text-white">{tenant.owner?.name}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-300">{tenant.owner?.email}</span>
            </div>
          </div>
        </div>

        {/* Quick actions buttons in header */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setShowWizardModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Wand2 className="w-4 h-4" />
            <span>Assistant Guidé</span>
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Appliquer un Profil</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="animate-in fade-in duration-150">
        {activeTab === 'features' && (
          <FeaturesTab
            tenant={tenant}
            entitlements={entitlements}
            onOpenProfileApplicator={() => setShowProfileModal(true)}
            onOpenSetupWizard={() => setShowWizardModal(true)}
          />
        )}
        {activeTab === 'overview' && <OverviewTab tenant={tenant} />}
        {activeTab === 'users' && <UsersTab tenant={tenant} />}
        {activeTab === 'outlets' && <OutletsTab tenant={tenant} />}
        {activeTab === 'limits' && <LimitsTab tenant={tenant} />}
        {activeTab === 'billing' && <BillingTab tenant={tenant} />}
        {activeTab === 'diagnostics' && <DiagnosticsTab tenant={tenant} />}
        {activeTab === 'audit' && <AuditTab tenant={tenant} />}
        {activeTab === 'support' && <SupportTab tenant={tenant} />}
      </div>

      {/* Profile Applicator Modal */}
      <ProfileApplicatorModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        orgId={tenant.id}
        currentEntitlements={entitlements}
      />

      {/* Setup Wizard Modal */}
      <SetupWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        orgId={tenant.id}
        restaurantName={tenant.company?.name || tenant.id}
        currentEntitlements={entitlements}
      />
    </div>
  );
};
