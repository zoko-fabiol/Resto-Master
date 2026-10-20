import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../ui/ConfirmDialog';
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
  RefreshCw,
  X,
  Shield,
  Lock,
  Crown,
} from 'lucide-react';

export const CONFIG_LABELS: Record<string, { label: string; desc: string }> = {
  // Paiements
  enableCash: { label: 'Règlements en Espèces (Cash)', desc: 'Autoriser les encaissements en billets et pièces' },
  enableBankTransfer: { label: 'Virements Bancaires', desc: 'Accepter les virements de compte bancaire' },
  enableCard: { label: 'Cartes Bancaires (TPE)', desc: 'Cartes Visa, Mastercard et terminaux bancaires' },
  allowMultiPaymentPerBill: { label: 'Multi-Paiements / Paiements Mixtes', desc: 'Combiner plusieurs modes de paiement sur la même addition' },
  allowPartialPayment: { label: 'Paiements Partiels / Acomptes', desc: 'Encaisser une partie de la note et laisser un solde dû' },
  enableCheck: { label: 'Paiements par Chèque', desc: 'Accepter les chèques certifiés ou d’entreprise' },

  // POS & Commandes
  allowQuickOrders: { label: 'Commandes Rapides au Comptoir', desc: 'Saisie express sans sélection de table obligatoire' },
  allowDirectSaleWithoutTable: { label: 'Vente directe sans table', desc: 'Idéal pour le bar, vente à emporter et snacks' },
  allowLineItemDelete: { label: 'Suppression d’articles saisis', desc: 'Retrait d’une ligne avant envoi en production' },
  requireCancelReason: { label: 'Motif obligatoire d’annulation', desc: 'Justification exigée lors de l’annulation d’une commande' },
  allowDiscounts: { label: 'Autoriser les remises commerciales', desc: 'Application de remises en pourcentage ou en montant' },
  requireDiscountApproval: { label: 'Validation PIN Superviseur pour remise', desc: 'Nécessite le code PIN d’un manager pour appliquer une remise' },
  allowSplitBill: { label: 'Division de note / Split addition', desc: 'Séparation égale ou par couvert de l’addition' },
  allowItemComping: { label: 'Offerts & Dégustations (Comps)', desc: 'Possibilité d’offrir un article (geste commercial)' },
  showTicketTimer: { label: 'Chronomètre sur tickets', desc: 'Afficher le temps écoulé depuis la prise de commande' },
  showServerName: { label: 'Nom du serveur sur le ticket', desc: 'Imprimer le nom du serveur responsable' },

  // Tables
  enableVisualFloorPlan: { label: 'Plan de salle interactif 2D', desc: 'Disposition graphique dynamique des tables et salles' },
  autoStatusUpdate: { label: 'Mise à jour automatique du statut', desc: 'Passe en occupée dès la première commande' },
  allowTableMerging: { label: 'Fusion & Regroupement de tables', desc: 'Joindre plusieurs tables pour les grands groupes' },
  allowTableTransfer: { label: 'Transfert de table', desc: 'Déplacer une commande en cours vers une autre table' },
  requireCleaningStep: { label: 'Étape de nettoyage obligatoire', desc: 'Statut « à nettoyer » avant libération' },

  // Cuisine & KDS
  kitchenAudioChime: { label: 'Carillon sonore KDS Cuisine', desc: 'Alerte sonore 2-tons Web Audio à chaque commande' },
  barAudioChime: { label: 'Carillon sonore KDS Bar', desc: 'Alerte sonore 2-tons Web Audio au comptoir bar' },
  allowMuteToggle: { label: 'Bouton Muet / Mute audio', desc: 'Permet à l’équipe de couper le carillon' },

  // Bar
  onlyDrinksInBar: { label: 'Mode 100% Boissons au Bar', desc: 'Filtre exclusif sur vins, bières, cocktails et softs' },
  quickAddDrinkModal: { label: 'Ajout Express de boisson en service', desc: 'Bouton pour créer une boisson à la volée' },
  routeToBarKds: { label: 'Routage automatique vers le KDS Bar', desc: 'Envoi instantané des boissons vers l’écran barman' },
  showBeverageCategoriesOnly: { label: 'Catégories Boissons Uniquement', desc: 'Masquer les catégories culinaires au bar' },

  // Stocks & Recettes BOM
  trackCoversToday: { label: 'Compteur de couverts réalisés ce jour', desc: 'Suivi dynamique des portions vendues' },
  highlightLimitingIngredient: { label: 'Détection du facteur limitant', desc: 'Signale l’ingrédient qui bloque le rendement' },
  autoDeductOnOrder: { label: 'Déduction automatique du stock', desc: 'Déduit les ingrédients selon la recette dès la commande' },
  alertTensionUnder5Covers: { label: 'Alerte de tension (< 5 couverts)', desc: 'Badge d’alerte jaune quand le stock est critique' },
  foodCostAlertThresholdPercent: { label: 'Seuil d’alerte Food Cost (%)', desc: 'Alerte si le ratio coût matière dépasse ce seuil' },
  fefoEnforcement: { label: 'Règle FEFO stricte', desc: 'Sortie prioritaire des premiers lots périmés' },
  expiryAlertDays: { label: 'Délai d’alerte avant péremption', desc: 'Nombre de jours pour alerte DLC en cuisine' },
  disallowNegativeStock: { label: 'Blocage du stock négatif', desc: 'Empêche la validation si la quantité est insuffisante' },

  // GED & Audit
  allowCameraCapture: { label: 'Capture photo / Caméra mobile', desc: 'Numérisation directe via la webcam ou smartphone' },
  autoTagInvoices: { label: 'Indexation automatique des factures', desc: 'Classement automatique dans les dossiers comptables' },
  archivePdfExport: { label: 'Export PDF certifié', desc: 'Téléchargement direct des liasses numérisées' },
  logAllPayments: { label: 'Audit complet des encaissements', desc: 'Journalise chaque paiement et mode de règlement' },
  logStockMovements: { label: 'Audit des sorties de stock', desc: 'Historique des réceptions et déductions' },
  logConfigChanges: { label: 'Audit des changements de paramètres', desc: 'Traçabilité des activations / désactivations' },
  requireSupervisorPinForLogExport: { label: 'PIN Superviseur pour export audit', desc: 'Protection anti-fraude' },

  // Mobile Money
  merchantCode: { label: 'Code Marchand officiel', desc: 'Identifiant marchand Mobile Money / Orange' },
  receiverPhone: { label: 'Numéro de téléphone récepteur', desc: 'Ligne mobile liée aux encaissements' },
  manualVerificationRequired: { label: 'Vérification manuelle obligatoire', desc: 'Contrôle du SMS avant validation de la note' },
  autoConfirmationApi: { label: 'Confirmation automatique par API', desc: 'Validation webhook en temps réel' },
  mode: { label: 'Environnement de paiement', desc: 'Production réelle ou Sandbox de test' },
  includeAmountInQr: { label: 'Montant inclus dans le QR Code', desc: 'Pré-remplit la somme sur le téléphone client' },
  supportMaxItQr: { label: 'Support QR Code Orange Max it', desc: 'Format standard Orange Money' },
};

export const FeatureCatalogSection: React.FC = () => {
  const { features, updateFeatureStatus, updateFeatureConfig } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const isSuperAdmin = currentUser?.role === 'direction';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ' | 'recommended' | 'advanced' | 'experimental'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal states with live optimistic binding
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [criticalModal, setCriticalModal] = useState<{ feature: FeatureItem; targetStatus: FeatureStatus } | null>(null);

  const selectedFeature = useMemo(() => {
    if (!selectedFeatureId) return null;
    return features.find((f) => f.id === selectedFeatureId) || null;
  }, [features, selectedFeatureId]);

  const handleOpenFeatureModal = (feature: FeatureItem) => {
    setSelectedFeatureId(feature.id);
    setLocalConfig({ ...feature.configuration });
  };

  const handleToggleConfigKey = async (key: string, currentVal: boolean) => {
    if (!selectedFeature) return;

    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) est autorisé à modifier les options système.',
      });
      return;
    }

    const newVal = !currentVal;
    // 1. Optimistic update
    setLocalConfig((prev) => ({ ...prev, [key]: newVal }));

    // 2. Persist to Context, localStorage, and Firestore
    await updateFeatureConfig(selectedFeature.id, { [key]: newVal });

    const friendlyName = CONFIG_LABELS[key]?.label || key;
    showToast({
      type: 'success',
      title: 'Paramètre mis à jour',
      message: `${friendlyName} est désormais ${newVal ? 'ACTIVÉ' : 'DÉSACTIVÉ'}.`,
    });
  };

  const handleTextConfigBlur = async (key: string, value: string) => {
    if (!selectedFeature) return;

    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) est autorisé à modifier les options système.',
      });
      return;
    }

    setLocalConfig((prev) => ({ ...prev, [key]: value }));
    await updateFeatureConfig(selectedFeature.id, { [key]: value });
  };

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
    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) peut modifier le statut d’une fonctionnalité.',
      });
      return;
    }

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

  const handleBulkActivate = async () => {
    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) peut exécuter des activations globales.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Activation globale des fonctionnalités',
      message: 'Voulez-vous activer toutes les fonctionnalités compatibles du catalogue ?',
      confirmText: 'Activer tout',
    });
    if (ok) {
      features.forEach((f) => {
        if (f.status !== 'ACTIVÉ') updateFeatureStatus(f.id, 'ACTIVÉ');
      });
    }
  };

  const handleBulkSuspend = async () => {
    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) peut exécuter des suspensions globales.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Suspension des fonctionnalités secondaires',
      message: 'Voulez-vous suspendre temporairement toutes les fonctionnalités secondaires non critiques ?',
      confirmText: 'Suspendre',
      variant: 'danger',
    });
    if (ok) {
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
                  onClick={() => handleOpenFeatureModal(feat)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configurer</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Configuration : {selectedFeature.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">
                      Version {selectedFeature.version}
                    </span>
                    <span>•</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.2 rounded-full ${
                        selectedFeature.status === 'ACTIVÉ'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedFeature.status === 'SUSPENDU'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Statut : {selectedFeature.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeatureId(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {selectedFeature.description}
              </p>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span>Règles & Paramètres Métier :</span>
                  </label>
                  {!isSuperAdmin ? (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Super Admin requis
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-500" />
                      Mode Super Admin
                    </span>
                  )}
                </div>

                {Object.entries(selectedFeature.configuration).map(([key, defaultVal]) => {
                  const currentVal = localConfig[key] !== undefined ? localConfig[key] : defaultVal;
                  const labelInfo = CONFIG_LABELS[key] || {
                    label: key,
                    desc: 'Option de configuration système avancée',
                  };

                  return (
                    <div
                      key={key}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {labelInfo.label}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold">
                            {key}
                          </span>
                        </div>
                        {labelInfo.desc && (
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {labelInfo.desc}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {typeof defaultVal === 'boolean' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleConfigKey(key, Boolean(currentVal))}
                            disabled={!isSuperAdmin}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-xs ${
                              currentVal ? 'bg-amber-500' : 'bg-slate-300'
                            } ${!isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title={isSuperAdmin ? 'Cliquer pour basculer' : 'Super Admin requis'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                currentVal ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        ) : (
                          <input
                            type="text"
                            disabled={!isSuperAdmin}
                            defaultValue={String(currentVal)}
                            onBlur={(e) => handleTextConfigBlur(key, e.target.value)}
                            className="px-2.5 py-1 text-xs border border-slate-300 rounded-xl font-bold font-mono w-36 text-right bg-white focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Modifications enregistrées automatiquement
              </span>
              <button
                type="button"
                onClick={() => setSelectedFeatureId(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Fermer & Enregistrer</span>
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
