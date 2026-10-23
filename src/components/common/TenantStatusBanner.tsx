import React from 'react';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

interface TenantStatusBannerProps {
  onOpenBillingModal?: () => void;
  onOpenSetupWizard?: () => void;
}

export const TenantStatusBanner: React.FC<TenantStatusBannerProps> = ({
  onOpenBillingModal,
  onOpenSetupWizard,
}) => {
  const { tenant } = useRestaurant();

  if (!tenant) return null;

  const status = tenant.status;

  // Si le tenant est pleinement actif sans alerte imminente, aucun bandeau n'encombre l'écran
  if (status === 'actif') {
    // Vérifier si expiration sous 7 jours
    if (tenant.subscriptionEndsAt) {
      const endsAt = new Date(tenant.subscriptionEndsAt);
      const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysLeft > 0 && daysLeft <= 7) {
        return (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Votre abonnement RestoMaster OS arrive à échéance dans <strong className="font-bold text-amber-300">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong>.
              </span>
            </div>
            {onOpenBillingModal && (
              <button
                type="button"
                onClick={onOpenBillingModal}
                className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-[11px] transition-colors"
              >
                Renouveler
              </button>
            )}
          </div>
        );
      }
    }
    return null;
  }

  // Cas 1 : En phase d'installation initiale
  if (status === 'installation' || status === 'onboarding') {
    return (
      <div className="bg-blue-500/15 border-b border-blue-500/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Mise en route initiale :</strong> Vous êtes en mode configuration. La vente en caisse s'activera dès la validation de votre abonnement.
          </span>
        </div>
        {onOpenSetupWizard && (
          <button
            type="button"
            onClick={onOpenSetupWizard}
            className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-[11px] transition-colors self-start sm:self-auto flex items-center gap-1"
          >
            <span>Poursuivre l'installation</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Cas 2 : Paiement en attente de virement
  if (status === 'paiement_en_attente') {
    return (
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Paiement en attente :</strong> Votre commande d'abonnement est enregistrée. Veuillez effectuer le règlement pour activer l'encaissement.
          </span>
        </div>
        {onOpenBillingModal && (
          <button
            type="button"
            onClick={onOpenBillingModal}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors self-start sm:self-auto"
          >
            Coordonnées de règlement
          </button>
        )}
      </div>
    );
  }

  // Cas 3 : Paiement déclaré en cours de vérification comptable
  if (status === 'paiement_a_verifier') {
    return (
      <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-emerald-200">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Règlement en cours de vérification :</strong> Notre équipe comptable valide votre transaction. Activation immédiate sous 2 heures ouvrées.
          </span>
        </div>
      </div>
    );
  }

  // Cas 4 : Impayé / Période de grâce (vente bloquée, lecture seule)
  if (status === 'impaye') {
    return (
      <div className="bg-orange-500/20 border-b border-orange-500/40 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-orange-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <span>
            <strong>Période de grâce (7 jours) :</strong> Votre abonnement est échu. Vos données restent consultables, mais la caisse est temporairement désactivée.
          </span>
        </div>
        {onOpenBillingModal && (
          <button
            type="button"
            onClick={onOpenBillingModal}
            className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-[11px] transition-colors self-start sm:self-auto"
          >
            Régulariser maintenant
          </button>
        )}
      </div>
    );
  }

  // Cas 5 : Suspendu
  if (status === 'suspendu' || status === 'resilie') {
    return (
      <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2.5 flex items-center justify-between gap-2 text-xs text-rose-200">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Accès suspendu :</strong> Cet espace est verrouillé en lecture seule. Contactez le support RestoMaster pour rétablir vos services.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
