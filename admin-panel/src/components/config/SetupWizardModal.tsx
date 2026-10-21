import React, { useState, useMemo } from 'react';
import {
  Wand2,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Store,
  Utensils,
  Wine,
  Truck,
  Smartphone,
  Printer,
  Building,
  Check,
} from 'lucide-react';
import {
  CONFIGURATION_PROFILES,
  ConfigurationProfileDefinition,
  TenantEntitlements,
  FEATURE_CATALOG,
} from '../../../../shared/types';
import { adminPlatformService } from '../../services/adminPlatformService';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  restaurantName: string;
  currentEntitlements: TenantEntitlements | null;
  onApplied?: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  orgId,
  restaurantName,
  currentEntitlements,
  onApplied,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  // Réponses au questionnaire
  const [establishmentType, setEstablishmentType] = useState<string>('restaurant_classique');
  const [tablesCount, setTablesCount] = useState<number>(10);
  const [hasBar, setHasBar] = useState<boolean>(true);
  const [hasDelivery, setHasDelivery] = useState<boolean>(false);
  const [hasMobileMoney, setHasMobileMoney] = useState<boolean>(true);
  const [hasPrinters, setHasPrinters] = useState<boolean>(true);
  const [isMultiSite, setIsMultiSite] = useState<boolean>(false);

  const [reason, setReason] = useState<string>('Configuration initiale via Assistant Métier');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Moteur d'inférence de profil et de fonctionnalités recommandés
  const recommendation = useMemo(() => {
    let targetProfileId = 'restaurant_classique';

    if (establishmentType === 'fast_food' || tablesCount === 0) {
      targetProfileId = 'fast_food';
    } else if (establishmentType === 'bar_lounge' || (!hasDelivery && hasBar && tablesCount < 15)) {
      targetProfileId = 'bar_lounge';
    } else if (establishmentType === 'hotel_complexe' || isMultiSite) {
      targetProfileId = 'hotel_complexe';
    } else {
      targetProfileId = 'restaurant_classique';
    }

    const profile =
      CONFIGURATION_PROFILES.find((p) => p.id === targetProfileId) || CONFIGURATION_PROFILES[0];

    // Modules dynamiquement ajustés selon les réponses
    const customizedModules: Record<string, boolean> = {};
    for (const modId of profile.includedModules) {
      customizedModules[modId] = true;
    }
    customizedModules['mod_tables'] = tablesCount > 0;
    customizedModules['mod_bar'] = hasBar;
    customizedModules['mod_bar_pos'] = hasBar;
    customizedModules['mod_delivery'] = hasDelivery;

    // Features dynamiquement ajustées
    const customizedFeatures: Record<string, { status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ' }> = {};
    for (const featId of profile.enabledFeatures) {
      customizedFeatures[featId] = { status: 'ACTIVÉ' };
    }
    for (const featId of profile.disabledFeatures) {
      customizedFeatures[featId] = { status: 'DÉSACTIVÉ' };
    }

    if (tablesCount === 0) {
      customizedFeatures['tables_management'] = { status: 'DÉSACTIVÉ' };
    }
    if (hasDelivery) {
      customizedFeatures['delivery_orders'] = { status: 'ACTIVÉ' };
      customizedFeatures['takeaway_orders'] = { status: 'ACTIVÉ' };
    }
    if (!hasBar) {
      customizedFeatures['bar_pos_exclusive'] = { status: 'DÉSACTIVÉ' };
      customizedFeatures['kds_bar'] = { status: 'DÉSACTIVÉ' };
    }

    // Calcul du DIFF prédictif par rapport à l'état actif actuel
    const currentFeatures = currentEntitlements?.features || {};
    const toEnable: string[] = [];
    const toDisable: string[] = [];

    for (const [featId, val] of Object.entries(customizedFeatures)) {
      const current = currentFeatures[featId]?.status;
      if (val.status === 'ACTIVÉ' && current !== 'ACTIVÉ') {
        toEnable.push(featId);
      } else if (val.status === 'DÉSACTIVÉ' && current === 'ACTIVÉ') {
        toDisable.push(featId);
      }
    }

    return {
      profile,
      customizedModules,
      customizedFeatures,
      toEnable,
      toDisable,
    };
  }, [
    establishmentType,
    tablesCount,
    hasBar,
    hasDelivery,
    hasMobileMoney,
    hasPrinters,
    isMultiSite,
    currentEntitlements,
  ]);

  if (!isOpen) return null;

  const handleApplyConfiguration = async () => {
    setError(null);
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Un motif explicite (min. 5 caractères) est requis pour enregistrer ce paramétrage.');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminPlatformService.updateTenantEntitlements({
        orgId,
        features: recommendation.customizedFeatures,
        modules: recommendation.customizedModules,
        reason: reason.trim(),
      });

      if (onApplied) onApplied();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’application de la configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeatureName = (id: string) => {
    return FEATURE_CATALOG.find((f) => f.id === id)?.name || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Assistant de Configuration Guidé</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Étape {step}/2
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Paramétrage intelligent pour <strong className="text-white">{restaurantName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* STEP 1 : Questionnaire Métier */}
        {step === 1 && (
          <div className="space-y-5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-2">
                1. Quel est le type d'activité principal ?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'restaurant_classique', label: 'Restaurant Traditionnel & Grill', icon: Utensils },
                  { id: 'fast_food', label: 'Snack, Fast-Food & Vente Rapide', icon: Store },
                  { id: 'bar_lounge', label: 'Bar, Lounge & Club Nocturne', icon: Wine },
                  { id: 'hotel_complexe', label: 'Complexe Hôtelier & Multi-Services', icon: Building },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = establishmentType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEstablishmentType(type.id)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="font-semibold">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  2. Nombre de tables de salle
                </label>
                <select
                  value={tablesCount}
                  onChange={(e) => setTablesCount(Number(e.target.value))}
                  aria-label="Nombre de tables de salle"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value={0}>0 table (Comptoir / Emporter pur)</option>
                  <option value={8}>Petite salle (1 à 10 tables)</option>
                  <option value={20}>Moyenne salle (11 à 25 tables)</option>
                  <option value={50}>Grande salle (26 à 60 tables)</option>
                  <option value={100}>Grand complexe (60+ tables)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  3. Activité Bar dédiée
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasBar(true)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      hasBar ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Oui (Bar dédié)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasBar(false)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      !hasBar ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  4. Livraison & Vente à Emporter
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasDelivery(true)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      hasDelivery ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Oui (Livreurs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasDelivery(false)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      !hasDelivery ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  5. Mobile Money (Orange / MTN)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasMobileMoney(true)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      hasMobileMoney ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Activé
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasMobileMoney(false)}
                    className={`flex-1 py-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                      !hasMobileMoney ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Espèces / CB seul
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                <span>Calculer la recommandation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 : Recommandation & Diff Preview */}
        {step === 2 && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase">Profil Recommandé</div>
                  <div className="text-base font-black text-white">{recommendation.profile.name}</div>
                </div>
              </div>

              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                {recommendation.profile.id}
              </span>
            </div>

            {/* Visual DIFF */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Aperçu des Modifications Appliquées (DIFF Prédictif)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* To Enable */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fonctionnalités à Activer ({recommendation.toEnable.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {recommendation.toEnable.map((featId) => (
                      <div key={featId} className="flex items-center gap-2 text-slate-200 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{getFeatureName(featId)}</span>
                      </div>
                    ))}
                    {recommendation.toEnable.length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">Déjà conformes à la recommandation.</div>
                    )}
                  </div>
                </div>

                {/* To Disable */}
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                  <div className="font-bold text-orange-400 flex items-center gap-1.5 pb-2 border-b border-orange-500/20">
                    <X className="w-4 h-4" />
                    <span>Fonctionnalités à Désactiver ({recommendation.toDisable.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {recommendation.toDisable.map((featId) => (
                      <div key={featId} className="flex items-center gap-2 text-slate-300 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span>{getFeatureName(featId)}</span>
                      </div>
                    ))}
                    {recommendation.toDisable.length === 0 && (
                      <div className="text-slate-500 italic text-[11px]">Aucun retrait nécessaire.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Motif d'audit */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Motif officiel obligatoire pour la piste d'audit SHA-256 :
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Paramétrage initial suite à l'entretien de cadrage..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modifier les réponses</span>
              </button>

              <button
                type="button"
                onClick={handleApplyConfiguration}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Application en cours...' : 'Appliquer la configuration en 1 clic'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
