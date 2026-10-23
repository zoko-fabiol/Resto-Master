import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../ui/ConfirmDialog';
import { FeatureItem, FeatureStatus } from '../../../types/configuration';
import { ModernRuleToggle } from './ModernRuleToggle';
import {
  Layers,
  Sliders,
  Search,
  Filter,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  X,
  Shield,
  Lock,
  Crown,
  Save,
  ShoppingBag,
  Utensils,
  ChefHat,
  Wine,
  GlassWater,
  BookOpen,
  Calculator,
  Coins,
  Package,
  Truck,
  ShieldCheck,
  Building2,
  Receipt,
  CreditCard,
  Users,
  Calendar,
  Bike,
  PartyPopper,
  UserCheck,
  FileText,
  ShieldAlert,
  BarChart3,
  Sparkles,
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

export const FeaturesAndModulesSection: React.FC = () => {
  const {
    features,
    updateFeatureStatus,
    updateFeatureConfig,
    operationRules,
    updateOperationRules,
    isModuleEntitled,
    isFeatureEntitled,
  } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'direction';

  // Vue active : 'modules' (Menu latéral & navigation) ou 'packs' (Catalogue des fonctionnalités)
  const [activeTab, setActiveTab] = useState<'modules' | 'packs'>('modules');

  // État onglet Modules
  const [options, setOptions] = useState<Record<string, boolean>>(operationRules);
  const [isSavingModules, setIsSavingModules] = useState(false);
  const [modulesSavedSuccess, setModulesSavedSuccess] = useState(false);

  useEffect(() => {
    setOptions(operationRules);
  }, [operationRules]);

  const toggleOption = (key: string) => {
    if (!isSuperAdmin) {
      showToast({
        title: 'Action Restreinte',
        message: 'Seul le Super Administrateur (Direction) peut modifier les modules du système.',
        type: 'warning',
      });
      return;
    }
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveModules = async () => {
    if (!isSuperAdmin) {
      showToast({
        title: 'Accès Refusé',
        message: 'Droits insuffisants pour sauvegarder la visibilité des modules.',
        type: 'error',
      });
      return;
    }
    setIsSavingModules(true);
    try {
      await updateOperationRules(options);
      showToast({
        title: 'Modules Mis à Jour',
        message: 'La visibilité des modules dans la barre latérale a été enregistrée avec succès.',
        type: 'success',
      });
      setModulesSavedSuccess(true);
      setTimeout(() => setModulesSavedSuccess(false), 2500);
    } finally {
      setIsSavingModules(false);
    }
  };

  const dirtyCount = Object.keys(options).filter(
    (k) => (options[k] ?? false) !== (operationRules[k] ?? false)
  ).length;

  const sidebarModulesList = [
    { key: 'mod_dashboard', label: 'Tableau de bord exécutif', description: 'Vue consolidée du chiffre d’affaires, alertes et indicateurs clés en direct', icon: BarChart3 },
    { key: 'mod_pos', label: 'Prise de commande / POS', description: 'Caisse tactile et prise de commandes en salle et comptoir', icon: ShoppingBag },
    { key: 'mod_tables', label: 'Plan des tables & Salles', description: 'Plan visuel, gestion terrasse, salle et salons VIP', icon: Utensils },
    { key: 'mod_cuisine', label: 'Cuisine KDS', description: 'Écran de production cuisine chaud, froid et grillades', icon: ChefHat },
    { key: 'mod_bar', label: 'Bar & Boissons', description: 'Comptoir boissons, fiches cocktails et gestion doses', icon: Wine },
    { key: 'mod_bar_pos', label: 'Espace Bar Dédié (100% Boissons)', description: 'Interface POS ultra-rapide réservée aux barmans et mixologues', icon: GlassWater },
    { key: 'mod_menu', label: 'Carte & Recettes', description: 'Catalogue complet des articles, cocktails, plats et tarifs', icon: BookOpen },
    { key: 'mod_recipes_yield', label: 'Fiches Techniques & Rendement (BOM)', description: 'Coût portion, grammages des recettes et fiches techniques', icon: Calculator },
    { key: 'mod_caisse', label: 'Gestion de caisse & Rapport Z', description: 'Ouverture, clôture, fond de caisse et audit Z', icon: Coins },
    { key: 'mod_stock', label: 'Stocks & Lots (FEFO/FIFO)', description: 'Inventaires, alertes DLC et denrées périssables', icon: Package },
    { key: 'mod_purchases', label: 'Achats & Fournisseurs', description: 'Bons de commande, réceptions et factures fournisseurs', icon: Truck },
    { key: 'mod_hygiene', label: 'Hygiène & Contrôles HACCP', description: 'Relevés de températures et traçabilité sanitaire', icon: ShieldCheck },
    { key: 'mod_main_courante', label: 'Main Courante Restauration', description: 'Rapprochement et conformité hôtelière Cameroun', icon: Building2 },
    { key: 'mod_fiscal', label: 'Fiscalité & E-Billing (CGI 2026)', description: 'TVA 19,25%, retenues AIR et télétransmission DGI', icon: Receipt },
    { key: 'mod_finance', label: 'Finances & Décaissements', description: 'Approbations des charges et suivi de trésorerie', icon: CreditCard },
    { key: 'mod_clients', label: 'Clients & Fidélité CRM', description: 'Fiches NIU, comptes crédit et barème de points', icon: Users },
    { key: 'res_management', label: 'Cahier de Réservations & Tables', description: 'Prise de réservations et gestion du plan d’occupation', icon: Calendar },
    { key: 'mod_delivery', label: 'Courses & Livraisons Moto', description: 'Gestion des zones urbaines et coursiers moto', icon: Bike },
    { key: 'mod_events', label: 'Événements & Banquets', description: 'Devis traiteur, séminaires et mariages avec acomptes', icon: PartyPopper },
    { key: 'mod_staff', label: 'Personnel & Présences', description: 'Pointage, fiches employés et planning de service', icon: UserCheck },
    { key: 'mod_documents', label: 'Documents & Scanner GED', description: 'Classeur numérique et factures scannées', icon: FileText },
    { key: 'mod_audit', label: 'Journal d’Audit & Traçabilité', description: 'Registre inaltérable de tous les événements et annulations', icon: ShieldAlert },
    { key: 'mod_reports', label: 'Rapports & Statistiques', description: 'Chiffre d’affaires, marges et exports SYSCOHADA', icon: BarChart3 },
  ];

  const entitledSidebarModules = useMemo(() => {
    return sidebarModulesList.filter((m) => isModuleEntitled(m.key));
  }, [sidebarModulesList, isModuleEntitled]);

  // État onglet Packs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ' | 'recommended' | 'advanced' | 'experimental'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [criticalModal, setCriticalModal] = useState<{ feature: FeatureItem; targetStatus: FeatureStatus } | null>(null);

  const entitledFeatures = useMemo(() => {
    return features.filter((f) => isFeatureEntitled(f.id));
  }, [features, isFeatureEntitled]);

  const selectedFeature = useMemo(() => {
    if (!selectedFeatureId) return null;
    return entitledFeatures.find((f) => f.id === selectedFeatureId) || null;
  }, [entitledFeatures, selectedFeatureId]);

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
    setLocalConfig((prev) => ({ ...prev, [key]: newVal }));
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
    return entitledFeatures.filter((f) => {
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
  }, [entitledFeatures, searchQuery, statusFilter, categoryFilter]);

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

  return (
    <div className="space-y-6">
      {/* En-tête Unifié avec sélecteur d'onglets */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-slate-900 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">Gouvernance des Modules & Fonctionnalités</h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Source Unique
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Activez ou masquez les sections du menu latéral et contrôlez les packs fonctionnels métier
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 self-stretch md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'modules'
                ? 'bg-white text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Menu Latéral & Modules</span>
            <span className="text-[10px] tabular-nums bg-slate-200 px-1.5 py-0.5 rounded-md font-black">
              {entitledSidebarModules.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'packs'
                ? 'bg-white text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Packs & Licences</span>
            <span className="text-[10px] tabular-nums bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md font-black">
              {entitledFeatures.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : MENU LATÉRAL & VISIBILITÉ DES MODULES                             */}
      {/* ========================================================================= */}
      {activeTab === 'modules' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Visibilité des Onglets de Navigation</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cochez ou décochez les rubriques affichées dans la barre latérale pour l'ensemble du personnel
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {dirtyCount > 0 && (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                  {dirtyCount} modification{dirtyCount > 1 ? 's' : ''} en attente
                </span>
              )}
              {modulesSavedSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Enregistré
                </span>
              )}
              <button
                type="button"
                disabled={!isSuperAdmin || isSavingModules}
                onClick={handleSaveModules}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                  dirtyCount > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black ring-2 ring-amber-400/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingModules ? 'Sauvegarde...' : 'Enregistrer les modules'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {entitledSidebarModules.map((m) => {
              const isChecked = options[m.key] ?? true;
              return (
                <ModernRuleToggle
                  key={m.key}
                  id={m.key}
                  label={m.label}
                  description={m.description}
                  icon={m.icon}
                  checked={isChecked}
                  onChange={() => toggleOption(m.key)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : PACKS FONCTIONNELS MÉTIER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'packs' && (
        <div className="space-y-6">
          {/* Barre de recherche et filtres */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un pack (ex: KDS, FEFO, TVA, DGI)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <option value="all">Tous les statuts ({features.length})</option>
                  <option value="ACTIVÉ">Activés uniquement</option>
                  <option value="SUSPENDU">Suspendus</option>
                  <option value="DÉSACTIVÉ">Désactivés</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grille des packs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => {
              const isEnabled = feature.status === 'ACTIVÉ';
              const hasConfig = feature.configuration && Object.keys(feature.configuration).length > 0;

              return (
                <div
                  key={feature.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isEnabled
                      ? 'border-slate-200/90 hover:border-indigo-400'
                      : 'border-slate-200/50 bg-slate-50/50 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            feature.status === 'ACTIVÉ'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : feature.status === 'SUSPENDU'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {feature.status}
                        </span>
                        {feature.isRecommended && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            Essentiel
                          </span>
                        )}
                        {feature.isCritical && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                            Critique
                          </span>
                        )}
                      </div>

                      {/* Statut Toggle */}
                      <button
                        type="button"
                        disabled={!isSuperAdmin}
                        onClick={() => handleStatusChange(feature, isEnabled ? 'DÉSACTIVÉ' : 'ACTIVÉ')}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed ${
                          isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={isEnabled ? 'Désactiver ce pack' : 'Activer ce pack'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-3">{feature.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {feature.category}
                    </span>
                    {hasConfig && (
                      <button
                        type="button"
                        onClick={() => handleOpenFeatureModal(feature)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Options ({Object.keys(feature.configuration).length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Configuration Fine d'un Pack */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedFeature.name}</h3>
                <p className="text-xs text-slate-500">Réglages fins du pack fonctionnel</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFeatureId(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(localConfig).map(([key, val]) => {
                const meta = CONFIG_LABELS[key] || { label: key, desc: 'Option de configuration' };
                if (typeof val === 'boolean') {
                  return (
                    <ModernRuleToggle
                      key={key}
                      id={key}
                      label={meta.label}
                      description={meta.desc}
                      icon={Sliders}
                      checked={val}
                      onChange={() => handleToggleConfigKey(key, val)}
                    />
                  );
                }
                return (
                  <div key={key} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <label className="text-xs font-bold text-slate-900 block">{meta.label}</label>
                    <p className="text-[11px] text-slate-500">{meta.desc}</p>
                    <input
                      type="text"
                      defaultValue={String(val)}
                      onBlur={(e) => handleTextConfigBlur(key, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 font-medium"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFeatureId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Changement Critique */}
      {criticalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-rose-200 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">Alerte Fonctionnalité Critique</h3>
                <p className="text-xs text-rose-700">{criticalModal.feature.name}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ce pack est marqué comme <strong>critique</strong> pour l’exploitation (ex: facturation, caisse ou stocks). Sa désactivation peut interrompre les flux de vente ou fausser les bilans légaux.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCriticalModal(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmCriticalChange}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirmer la désactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
