import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Lock,
  Unlock,
  Sparkles,
  Layers,
  Save,
  HelpCircle,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  Tenant,
  TenantEntitlements,
  FEATURE_CATALOG,
  FeatureDefinition,
  FeatureCategory,
} from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface FeaturesTabProps {
  tenant: Tenant;
  entitlements: TenantEntitlements | null;
  onOpenProfileApplicator: () => void;
}

export const FeaturesTab: React.FC<FeaturesTabProps> = ({
  tenant,
  entitlements,
  onOpenProfileApplicator,
}) => {
  // État local modifiable des fonctionnalités et des clés verrouillées
  const [localFeatures, setLocalFeatures] = useState<
    Record<string, { status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ'; source?: string }>
  >({});
  const [lockedKeys, setLockedKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Synchronisation avec les entitlements Firestore
  useEffect(() => {
    const initialFeatures: Record<string, { status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ'; source?: string }> = {};

    for (const feat of FEATURE_CATALOG) {
      if (entitlements?.features && entitlements.features[feat.id]) {
        initialFeatures[feat.id] = {
          status: entitlements.features[feat.id].status,
          source: entitlements.features[feat.id].source,
        };
      } else {
        initialFeatures[feat.id] = {
          status: feat.defaultEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ',
          source: 'plan',
        };
      }
    }

    setLocalFeatures(initialFeatures);
    setLockedKeys(entitlements?.lockedConfigKeys || []);
    setHasChanges(false);
  }, [entitlements]);

  const handleToggleStatus = (featureId: string, targetStatus: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ') => {
    setLocalFeatures((prev) => ({
      ...prev,
      [featureId]: {
        status: targetStatus,
        source: 'override',
      },
    }));
    setHasChanges(true);
  };

  const handleToggleLock = (featureId: string) => {
    setLockedKeys((prev) => {
      const exists = prev.includes(featureId);
      if (exists) {
        return prev.filter((k) => k !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    const reason = prompt('Motif obligatoire de la modification des fonctionnalités :');
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite (minimum 5 caractères) est obligatoire pour enregistrer les modifications.');
      return;
    }

    try {
      setIsSaving(true);
      await adminPlatformService.updateTenantEntitlements({
        orgId: tenant.id,
        features: localFeatures,
        lockedConfigKeys: lockedKeys,
        reason: reason.trim(),
      });
      setHasChanges(false);
      alert('Fonctionnalités mises à jour avec succès dans le cloud.');
    } catch (err: any) {
      alert(`Erreur de sauvegarde : ${err?.message || 'Échec de communication'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const categories: Array<{ id: FeatureCategory | 'all'; label: string }> = [
    { id: 'all', label: 'Toutes les catégories' },
    { id: 'vente_service', label: 'Vente & Service' },
    { id: 'production', label: 'Production (Cuisine / Bar)' },
    { id: 'stock_achats', label: 'Stocks & Achats' },
    { id: 'gestion_finance', label: 'Gestion & Finance' },
    { id: 'hygiene_evenements', label: 'Hygiène & Événements' },
    { id: 'systeme_securite', label: 'Système & Sécurité' },
  ];

  const filteredFeatures = FEATURE_CATALOG.filter((f: FeatureDefinition) => {
    const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchQuery =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar Actions & Notifications */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Matrice des Droits & Fonctionnalités à Distance
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Activer ou désactiver des fonctionnalités pour cet établissement sans vous déplacer.
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenProfileApplicator}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Appliquer un Profil Type</span>
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              hasChanges
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
          </button>
        </div>
      </div>

      {/* Barre de Recherche & Filtre Catégorie */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une fonctionnalité par nom, module ou description..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid des Fonctionnalités */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map((feat: FeatureDefinition) => {
          const current = localFeatures[feat.id] || { status: 'DÉSACTIVÉ', source: 'plan' };
          const isEnabled = current.status === 'ACTIVÉ';
          const isSuspended = current.status === 'SUSPENDU';
          const isDisabled = current.status === 'DÉSACTIVÉ';
          const isLocked = lockedKeys.includes(feat.id);

          const riskBadgeColor: Record<string, string> = {
            faible: 'bg-slate-800 text-slate-400',
            moyen: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            eleve: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
            critique: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          };

          return (
            <div
              key={feat.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isEnabled
                  ? 'bg-slate-900/60 border-slate-800'
                  : isSuspended
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-slate-950/40 border-slate-900 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      <span>{feat.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-semibold uppercase ${riskBadgeColor[feat.riskLevel]}`}>
                        {feat.riskLevel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{feat.id}</div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isEnabled
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isSuspended
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {current.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{feat.description}</p>
              </div>

              {/* Action Controls & Lock Switch */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                {/* Padlock button */}
                <button
                  type="button"
                  onClick={() => handleToggleLock(feat.id)}
                  title={
                    isLocked
                      ? 'Verrouillé : le restaurant ne peut pas modifier ce réglage'
                      : 'Déverrouillé : modifiable par l’administrateur restaurant'
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    isLocked
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {isLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  <span>{isLocked ? 'Verrouillé fournisseur' : 'Modifiable'}</span>
                </button>

                {/* 3-State Toggle Button Group */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(feat.id, 'ACTIVÉ')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isEnabled
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Activer
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(feat.id, 'SUSPENDU')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isSuspended
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Suspendre
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(feat.id, 'DÉSACTIVÉ')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      isDisabled
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Désactiver
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
