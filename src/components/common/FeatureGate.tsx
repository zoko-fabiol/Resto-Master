import React, { useState } from 'react';
import { Lock, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';

interface FeatureGateProps {
  featureKey?: string;
  moduleKey?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  showUpgradePrompt?: boolean;
  title?: string;
  description?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureKey,
  moduleKey,
  fallback,
  children,
  showUpgradePrompt = true,
  title,
  description,
}) => {
  const { isFeatureEntitled, isModuleEntitled, requestFeatureUnlock } = useRestaurant();
  const { currentUser } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  // Vérification de l'accès
  const featureAllowed = featureKey ? isFeatureEntitled(featureKey) : true;
  const moduleAllowed = moduleKey ? isModuleEntitled(moduleKey) : true;
  const isAllowed = featureAllowed && moduleAllowed;

  if (isAllowed) {
    return <>{children}</>;
  }

  // Règle stricte d'invisibilité : si non disponible dans l'abonnement, masquer totalement sans polluer l'interface
  return null;

  const handleSendRequest = async () => {
    if (!featureKey && !moduleKey) return;
    const targetKey = featureKey || moduleKey || '';

    try {
      setIsRequesting(true);
      await requestFeatureUnlock(targetKey, requestReason);
      setRequestSent(true);
      setShowReasonInput(false);
    } catch (err) {
      console.error('Erreur lors de la demande de déblocage:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-3xl m-4 shadow-2xl">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 shadow-inner">
        <Lock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        Fonctionnalité RestoMaster OS
      </div>

      <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-2">
        {title || 'Fonctionnalité Verrouillée'}
      </h2>

      <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-6">
        {description ||
          'Ce module n’est pas inclus dans votre formule actuelle ou a été désactivé par l’administrateur de la plateforme.'}
      </p>

      {requestSent ? (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Demande transmise avec succès à l’administrateur RestoMaster.</span>
        </div>
      ) : showReasonInput ? (
        <div className="w-full max-w-md flex flex-col gap-3">
          <textarea
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder="Précisez votre besoin (ex: passage à un service en terrasse, nouveau poste bar...)"
            rows={3}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowReasonInput(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={handleSendRequest}
              disabled={isRequesting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isRequesting ? 'Envoi...' : 'Confirmer la demande'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReasonInput(true)}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Demander l’activation à l’administrateur
        </button>
      )}

      <div className="text-[11px] text-slate-500 mt-6">
        Contact support dédié : <span className="text-slate-400 font-medium">support@restomaster.os</span>
      </div>
    </div>
  );
};
