import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, CreditCard } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

export const TenantStatusBanner: React.FC = () => {
  const { tenant, tenantStatus, isReadOnlyMode } = useRestaurant();

  if (!tenant || !tenantStatus) return null;

  // Calcul du nombre de jours restants en essai
  const getRemainingTrialDays = (): number | null => {
    if (tenantStatus !== 'essai' || !tenant.trialEndsAt) return null;
    const diffMs = new Date(tenant.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const remainingTrialDays = getRemainingTrialDays();

  if (tenantStatus === 'essai' && remainingTrialDays !== null) {
    return (
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white font-semibold">Période d’essai gratuit :</strong> il vous reste{' '}
            <span className="font-bold tabular-nums text-amber-300">{remainingTrialDays} jour(s)</span> d’accès complet.
          </span>
        </div>
        <span className="hidden md:inline-block text-[11px] text-amber-300/80">
          Formule : <span className="font-medium text-white">{tenant.planId}</span>
        </span>
      </div>
    );
  }

  if (tenantStatus === 'impaye') {
    return (
      <div className="bg-gradient-to-r from-orange-600/20 via-orange-500/15 to-orange-500/10 border-b border-orange-500/40 px-4 py-2 flex items-center justify-between text-xs text-orange-200">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-orange-400 shrink-0" />
          <span>
            <strong className="text-white font-semibold">Abonnement en attente de règlement :</strong> Merci de contacter votre administrateur pour éviter la suspension de vos services.
          </span>
        </div>
      </div>
    );
  }

  if (tenantStatus === 'suspendu') {
    return (
      <div className="bg-gradient-to-r from-red-600/25 via-red-500/20 to-red-500/10 border-b border-red-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-red-200">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            <strong className="text-white font-semibold">
              {isReadOnlyMode ? 'Accès Restreint (Consultation Seule) :' : 'Compte Restaurant Suspendu :'}
            </strong>{' '}
            {tenant.suspensionReason ||
              'Les opérations sont temporairement bloquées par l’administrateur RestoMaster OS.'}
          </span>
        </div>
        <span className="text-[11px] text-red-300/90 font-mono">
          {tenant.suspensionMode === 'read_only' ? 'MODE LECTURE SEULE' : 'BLOCAGE TOTAL'}
        </span>
      </div>
    );
  }

  return null;
};
