import React, { useState, useMemo } from 'react';
import { Layers, X, Check, ArrowRight, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import {
  CONFIGURATION_PROFILES,
  ConfigurationProfileDefinition,
  TenantEntitlements,
  FEATURE_CATALOG,
} from '../../../../shared/types';
import { adminPlatformService } from '../../services/adminPlatformService';

interface ProfileApplicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentEntitlements: TenantEntitlements | null;
  onApplied?: () => void;
}

export const ProfileApplicatorModal: React.FC<ProfileApplicatorModalProps> = ({
  isOpen,
  onClose,
  orgId,
  currentEntitlements,
  onApplied,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('restaurant_classique');
  const [reason, setReason] = useState<string>('');
  const [ticketNumber, setTicketNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProfile = useMemo(() => {
    return CONFIGURATION_PROFILES.find((p) => p.id === selectedProfileId) || CONFIGURATION_PROFILES[0];
  }, [selectedProfileId]);

  // Calcul du DIFF prédictif avant application
  const diff = useMemo(() => {
    const toEnable: string[] = [];
    const toDisable: string[] = [];

    const currentFeatures = currentEntitlements?.features || {};

    for (const featId of selectedProfile.enabledFeatures) {
      const current = currentFeatures[featId]?.status;
      if (current !== 'ACTIVÉ') {
        toEnable.push(featId);
      }
    }

    for (const featId of selectedProfile.disabledFeatures) {
      const current = currentFeatures[featId]?.status;
      if (current === 'ACTIVÉ') {
        toDisable.push(featId);
      }
    }

    return { toEnable, toDisable };
  }, [selectedProfile, currentEntitlements]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setError(null);
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Un motif explicite (min. 5 caractères) est obligatoire pour auditer ce changement.');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminPlatformService.applyProfileToTenant({
        orgId,
        profileId: selectedProfile.id,
        reason: reason.trim(),
        ticketNumber: ticketNumber.trim() || undefined,
      });

      if (onApplied) onApplied();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’application du profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeatureName = (id: string) => {
    return FEATURE_CATALOG.find((f) => f.id === id)?.name || id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Appliquer un Profil Métier Prédéfini</h2>
              <p className="text-xs text-slate-400">
                Prévisualisez le différentiel avant d’activer le profil sur le restaurant.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Sélection du Profil */}
        <div className="space-y-2 text-xs">
          <label className="block text-slate-300 font-semibold">Choisissez le profil cible :</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CONFIGURATION_PROFILES.map((prof) => {
              const isSelected = selectedProfileId === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => setSelectedProfileId(prof.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {prof.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-semibold">
                      {prof.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{prof.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prévisualisation du Différentiel (Diff Preview) */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Différentiel Prévisionnel (Modifications Réseau)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              +{diff.toEnable.length} activée(s) • -{diff.toDisable.length} désactivée(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            {/* À Activer */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span>Fonctionnalités activées :</span>
                <span className="tabular-nums">({diff.toEnable.length})</span>
              </div>
              {diff.toEnable.map((id) => (
                <div key={id} className="text-slate-300 flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-400 font-bold">+</span>
                  <span>{getFeatureName(id)}</span>
                </div>
              ))}
              {diff.toEnable.length === 0 && (
                <div className="text-slate-500 italic">Aucune nouvelle activation</div>
              )}
            </div>

            {/* À Désactiver */}
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <span>Fonctionnalités désactivées :</span>
                <span className="tabular-nums">({diff.toDisable.length})</span>
              </div>
              {diff.toDisable.map((id) => (
                <div key={id} className="text-slate-300 flex items-center gap-1.5 font-medium">
                  <span className="text-rose-400 font-bold">-</span>
                  <span>{getFeatureName(id)}</span>
                </div>
              ))}
              {diff.toDisable.length === 0 && (
                <div className="text-slate-500 italic">Aucune désactivation</div>
              )}
            </div>
          </div>
        </div>

        {/* Motif Obligatoire & Ticket */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-semibold mb-1">Motif obligatoire du changement *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Demande client pour mise en place du KDS cuisine suite à agrandissement"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Numéro de ticket support</label>
            <input
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="TICK-2026-0042"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting || !reason.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Application en cours...' : 'Appliquer et Synchroniser'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
