import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { FeatureItem, FeatureStatus } from '../../../types/configuration';
import {
  Search,
  Filter,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  Sliders,
  HelpCircle,
  Settings,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';

export const FeatureCatalogSection: React.FC = () => {
  const { features, updateFeatureStatus, updateFeatureConfig } = useRestaurant();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ' | 'recommended' | 'advanced' | 'experimental'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal states
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);
  const [criticalModal, setCriticalModal] = useState<{ feature: FeatureItem; targetStatus: FeatureStatus } | null>(null);

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (q === 'mobile' &&
          (f.name.toLowerCase().includes('mobile') ||
            f.name.toLowerCase().includes('momo') ||
            f.name.toLowerCase().includes('orange') ||
            f.category === 'mobile_money'));

      let matchStatus = true;
      if (statusFilter === 'ACTIVÉ') matchStatus = f.status === 'ACTIVÉ';
      else if (statusFilter === 'SUSPENDU') matchStatus = f.status === 'SUSPENDU';
      else if (statusFilter === 'DÉSACTIVÉ') matchStatus = f.status === 'DÉSACTIVÉ';
      else if (statusFilter === 'recommended') matchStatus = Boolean(f.isRecommended);
      else if (statusFilter === 'advanced') matchStatus = Boolean(f.isAdvanced);
      else if (statusFilter === 'experimental') matchStatus = Boolean(f.isExperimental);

      const matchCategory = categoryFilter === 'all' || f.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [features, searchQuery, statusFilter, categoryFilter]);

  const handleStatusChange = (feature: FeatureItem, newStatus: FeatureStatus) => {
    if (feature.isCritical && newStatus !== 'ACTIVÉ') {
      setCriticalModal({ feature, targetStatus: newStatus });
      return;
    }
    updateFeatureStatus(feature.id, newStatus);
  };

  const confirmCriticalChange = () => {
    if (criticalModal) {
      updateFeatureStatus(criticalModal.feature.id, criticalModal.targetStatus);
      setCriticalModal(null);
    }
  };

  const handleBulkActivate = () => {
    if (confirm('Activer toutes les fonctionnalités compatibles ?')) {
      features.forEach((f) => {
        if (f.status !== 'ACTIVÉ') updateFeatureStatus(f.id, 'ACTIVÉ');
      });
    }
  };

  const handleBulkSuspend = () => {
    if (confirm('Suspendre temporairement les fonctionnalités secondaires ?')) {
      features.forEach((f) => {
        if (!f.isCritical && f.status === 'ACTIVÉ') updateFeatureStatus(f.id, 'SUSPENDU');
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Search box with prompt example "mobile" */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une fonctionnalité (ex: mobile)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Toutes ({features.length})</option>
            <option value="ACTIVÉ">Activées ({features.filter((f) => f.status === 'ACTIVÉ').length})</option>
            <option value="SUSPENDU">Suspendues ({features.filter((f) => f.status === 'SUSPENDU').length})</option>
            <option value="DÉSACTIVÉ">Désactivées ({features.filter((f) => f.status === 'DÉSACTIVÉ').length})</option>
            <option value="recommended">Recommandées</option>
            <option value="advanced">Avancées</option>
            <option value="experimental">Expérimentales</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Toutes catégories</option>
            <option value="operations">Opérations</option>
            <option value="pos">Prise de commande / POS</option>
            <option value="tables">Tables & Plan de salle</option>
            <option value="cuisine">Cuisine KDS</option>
            <option value="bar">Bar & Boissons</option>
            <option value="stock">Stocks & Lots</option>
            <option value="purchases">Achats & Fournisseurs</option>
            <option value="caisse">Caisse & Z</option>
            <option value="fiscalite">Fiscalité Cameroun</option>
            <option value="mobile_money">Mobile Money (MTN / Orange)</option>
            <option value="livraison">Livraisons</option>
            <option value="evenements">Événements</option>
            <option value="fidelite">Fidélité</option>
            <option value="securite">Sécurité & RBAC</option>
            <option value="offline">Mode Offline</option>
          </select>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleBulkActivate}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs"
          >
            Tout activer
          </button>
          <button
            type="button"
            onClick={handleBulkSuspend}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Tout suspendre
          </button>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((feat) => {
          const isEnabled = feat.status === 'ACTIVÉ';
          const isSuspended = feat.status === 'SUSPENDU';
          const isDisabled = feat.status === 'DÉSACTIVÉ';

          return (
            <div
              key={feat.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-3 ${
                isEnabled
                  ? 'border-emerald-300 ring-1 ring-emerald-500/10'
                  : isSuspended
                  ? 'border-amber-300 ring-1 ring-amber-500/10'
                  : 'border-slate-200 opacity-85'
              }`}
            >
              <div>
                {/* Header: Name, Tags & 3-State Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-slate-900">{feat.name}</h3>
                      {feat.isCritical && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 uppercase">
                          Critique
                        </span>
                      )}
                      {feat.isRecommended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 uppercase">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      v{feat.version} • Catégorie : <span className="uppercase">{feat.category}</span>
                    </div>
                  </div>

                  {/* 3-State Badge: ACTIVÉ / SUSPENDU / DÉSACTIVÉ */}
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : isSuspended
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isEnabled ? 'bg-emerald-600' : isSuspended ? 'bg-amber-600' : 'bg-slate-400'
                      }`}
                    />
                    {feat.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed line-clamp-3">
                  {feat.description}
                </p>

                {/* Dependencies info */}
                {feat.dependencies && feat.dependencies.length > 0 && (
                  <div className="mt-2.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      Dépend de :{' '}
                      {feat.dependencies
                        .map((d) => features.find((f) => f.id === d)?.name || d)
                        .join(', ')}
                    </span>
                  </div>
                )}

                {/* Activation Metadata (date & user) */}
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  {feat.activatedAt && (
                    <span>Activé le {feat.activatedAt} {feat.activatedBy ? `par ${feat.activatedBy}` : ''}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons: [Configurer] [Suspendre / Activer / Désactiver] */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFeature(feat)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Configurer
                </button>

                <div className="flex items-center gap-1">
                  {!isEnabled && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(feat, 'ACTIVÉ')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                    >
                      Activer
                    </button>
                  )}

                  {isEnabled && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(feat, 'SUSPENDU')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors"
                      title="Suspendre temporairement en conservant la configuration"
                    >
                      Suspendre
                    </button>
                  )}

                  {!isDisabled && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(feat, 'DÉSACTIVÉ')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors"
                    >
                      Désactiver
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Configurer une fonctionnalité */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Configuration : {selectedFeature.name}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Version {selectedFeature.version} • Statut : {selectedFeature.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {selectedFeature.description}
              </p>

              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">Règles & Paramètres Métier :</label>
                {Object.entries(selectedFeature.configuration).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <span className="font-mono text-slate-700 text-[11px]">{key}</span>
                    {typeof val === 'boolean' ? (
                      <input
                        type="checkbox"
                        defaultChecked={val}
                        onChange={(e) =>
                          updateFeatureConfig(selectedFeature.id, { [key]: e.target.checked })
                        }
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={String(val)}
                        onBlur={(e) =>
                          updateFeatureConfig(selectedFeature.id, { [key]: e.target.value })
                        }
                        className="px-2 py-1 text-xs border border-slate-300 rounded-lg font-bold font-mono w-32 text-right"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Fermer & Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmation Fonctionnalité Critique */}
      {criticalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">
                Action sur Fonctionnalité Critique
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              La désactivation ou suspension de <strong>« {criticalModal.feature.name} »</strong> peut interrompre
              la conformité légale ou le cycle de vente direct. Souhaitez-vous confirmer ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCriticalModal(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCriticalChange}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Confirmer l'opération
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
