import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Building,
  Monitor,
  Search,
  AlertTriangle,
  ShoppingBag,
  Coins,
  Utensils,
  ChefHat,
  Wine,
  Package,
  Truck,
  Zap,
  Rocket,
  Receipt,
  CreditCard,
  Bell,
  Mail,
  Printer,
  Lock,
  ShieldCheck,
  History,
  WifiOff,
  Layers,
  ChevronRight,
  Building2,
  LayoutGrid,
  ArrowLeft,
  X,
  Crown,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { ConfigurationProfileType } from '../../types/configuration';

import { GeneralAndOutletsSection } from './sections/GeneralAndOutletsSection';
import { OperationsOptionsSection } from './sections/OperationsOptionsSection';
import { StockAndPurchasesSection } from './sections/StockAndPurchasesSection';
import { FiscalBillingPaymentsSection } from './sections/FiscalBillingPaymentsSection';
import { HardwareAndSecuritySection } from './sections/HardwareAndSecuritySection';
import { RestaurantSubscriptionSection } from './sections/RestaurantSubscriptionSection';
import { OnboardingWizard } from '../admin/OnboardingWizard';

export type SubMenuKey =
  | 'library'
  | 'subscription'
  // Parcours 1 : Identité & Fiscalité
  | 'general'
  | 'fiscalite'
  | 'facturation'
  // Parcours 2 : Salle & Ventes
  | 'pos'
  | 'tables'
  | 'caisse'
  | 'paiements'
  // Parcours 3 : Cuisine & Bar
  | 'cuisine'
  | 'bar'
  // Parcours 4 : Stock & Achats
  | 'stock'
  | 'achats'
  // Parcours 5 : Équipe & Accès
  | 'notifications'
  | 'audit'
  // Parcours 6 : Matériel & Système
  | 'impression'
  | 'terminaux'
  | 'offline';

export type AppCategory =
  | 'all'
  | 'identity_fiscal'
  | 'sales_floor'
  | 'kitchen_bar'
  | 'stock_purchases'
  | 'team_access'
  | 'hardware'
  | 'group';

export interface AppMetadata {
  key: SubMenuKey;
  orderNumber: number;
  title: string;
  category: AppCategory;
  categoryLabel: string;
  description: string;
  icon: any;
  gradient: string;
  badge?: string;
  tags: string[];
  featureKey?: string;
  moduleKey?: string;
}

export const AdminCenterView: React.FC = () => {
  const {
    outlets,
    terminals,
    selectedOutletId,
    setSelectedOutletId,
    selectedTerminalId,
    setSelectedTerminalId,
    adminDisplayMode,
    setAdminDisplayMode,
    cashRegisters,
    tables,
    settings,
    updateSettings,
    activeRestaurant,
    applyConfigProfile,
    isFeatureEntitled,
    isModuleEntitled,
  } = useRestaurant();

  const { currentUser, isSuperadmin } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const isSuperAdmin = isSuperadmin || currentUser?.role === 'direction';
  const isTrueSuperAdmin = isSuperadmin;

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const handleToggleConfigLock = async () => {
    if (!isTrueSuperAdmin) {
      showToast({
        title: 'Action Réservée',
        message: 'Seul le Super-Administrateur peut modifier le verrouillage de la plateforme.',
        type: 'warning',
      });
      return;
    }
    const currentLock = Boolean(settings.configurationVerrouillee);
    const ok = await confirm({
      title: currentLock ? 'Déverrouiller la configuration' : 'Verrouiller la configuration',
      message: currentLock
        ? 'Déverrouiller temporairement la configuration structurelle ?'
        : 'Verrouiller la configuration pour exploitation client ?',
      confirmText: currentLock ? 'Déverrouiller' : 'Verrouiller',
    });
    if (ok) {
      await updateSettings({ configurationVerrouillee: !currentLock });
      showToast({
        title: !currentLock ? 'Configuration Verrouillée' : 'Configuration Déverrouillée',
        message: !currentLock
          ? 'La plateforme est verrouillée pour livraison client.'
          : 'La plateforme est temporairement déverrouillée.',
        type: 'info',
      });
    }
  };

  const handleQuickApplyProfile = async (profileId: ConfigurationProfileType, title: string) => {
    if (!isSuperAdmin) {
      showToast({
        title: 'Action Réservée',
        message: 'Seul le Super Administrateur (Direction) peut appliquer un profil d’exploitation.',
        type: 'warning',
      });
      return;
    }
    const ok = await confirm({
      title: 'Application du profil d\'exploitation',
      message: `Appliquer le profil "${title}" ? Cette configuration mettra à jour l'activation des modules et du menu latéral.`,
      confirmText: 'Appliquer',
    });
    if (ok) {
      await applyConfigProfile(profileId);
      showToast({
        title: 'Profil Déployé',
        message: `Le profil "${title}" a été appliqué avec succès.`,
        type: 'success',
      });
    }
  };

  // 'library' is the default view: Bibliothèque d'Applications
  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuKey>('library');
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bibliothèque structurée selon les 6 parcours logiques (+ Groupe conditionnel si multi-sites)
  const appLibrary: AppMetadata[] = useMemo(() => {
    const list: AppMetadata[] = [
      // =========================================================================
      // 0. ABONNEMENT & LICENCE
      // =========================================================================
      {
        key: 'subscription',
        orderNumber: 0,
        title: 'Mon Abonnement & Boutique',
        category: 'identity_fiscal',
        categoryLabel: 'Abonnement & Licence',
        description: 'Formule active, options à la carte, quotas en direct, renouvellement et devis certifié serveur.',
        icon: Sparkles,
        gradient: 'from-amber-500 to-amber-600',
        badge: 'Formule Active',
        tags: ['abonnement', 'licence', 'pack', 'options', 'boutique', 'paiement', 'renouvellement', 'tarifs'],
      },
      // =========================================================================
      // 1. IDENTITÉ ET FISCALITÉ
      // =========================================================================
      {
        key: 'general',
        orderNumber: 1,
        title: 'Identité, Devises & Établissements',
        category: 'identity_fiscal',
        categoryLabel: 'Identité & Fiscalité',
        description: 'Devise principale FCFA (XAF), identité légale, NIU, RCCM, fuseau horaire et succursales.',
        icon: Building,
        gradient: 'from-slate-700 to-slate-900',
        badge: 'Devise & Multi-Sites',
        tags: ['general', 'etablissement', 'devise', 'fcfa', 'succursale', 'adresse', 'niu', 'rccm'],
      },
      {
        key: 'fiscalite',
        orderNumber: 2,
        title: 'Fiscalité Cameroun (CGI 2026)',
        category: 'identity_fiscal',
        categoryLabel: 'Identité & Fiscalité',
        description: 'TVA 17,5% + CAC 1,75% = 19,25%, acomptes AIR (2,2% / 5,5%), droit de timbre et télétransmission DGI.',
        icon: ShieldCheck,
        gradient: 'from-red-600 to-rose-700',
        badge: 'CGI 2026 Conforme',
        tags: ['fiscalite', 'tva', 'cac', 'air', 'dgi', 'cameroun', 'impots', 'timbre', 'reel'],
        featureKey: 'cameroon_fiscal_framework',
        moduleKey: 'mod_fiscal',
      },
      {
        key: 'facturation',
        orderNumber: 3,
        title: 'Facturation Officielle & SYSCOHADA',
        category: 'identity_fiscal',
        categoryLabel: 'Identité & Fiscalité',
        description: 'Factures déductibles Laser A5, mentions DGI, avoirs et plan comptable OHADA (701100, 443100, 571100).',
        icon: Receipt,
        gradient: 'from-emerald-600 to-green-700',
        badge: 'A5 & SYSCOHADA',
        tags: ['facture', 'facturation', 'a5', 'toutes lettres', 'avoir', 'proforma', 'syscohada', 'ohada', 'comptabilite'],
        moduleKey: 'mod_fiscal',
      },

      // =========================================================================
      // 2. SALLE ET VENTES
      // =========================================================================
      {
        key: 'pos',
        orderNumber: 4,
        title: 'POS & Prise de Commande',
        category: 'sales_floor',
        categoryLabel: 'Salle & Ventes',
        description: 'Saisie rapide, annulations avec motif obligatoire, remises autorisées et division d’addition.',
        icon: ShoppingBag,
        gradient: 'from-amber-500 to-amber-600',
        badge: 'Règles POS',
        tags: ['pos', 'commande', 'ticket', 'addition', 'remise', 'annulation', 'vente'],
        moduleKey: 'mod_pos',
      },
      {
        key: 'tables',
        orderNumber: 5,
        title: 'Tables & Plan de Salle 2D',
        category: 'sales_floor',
        categoryLabel: 'Salle & Ventes',
        description: 'Plan interactif 2D vectoriel, gestion des zones (Terrasse, VIP), fusions, séparations et statut ménage.',
        icon: Utensils,
        gradient: 'from-blue-500 to-indigo-600',
        badge: 'Plan 2D & Zones',
        tags: ['table', 'salle', 'terrasse', 'vip', 'plan', 'couverts', 'fusion', 'split'],
        featureKey: 'tables_management',
        moduleKey: 'mod_tables',
      },
      {
        key: 'caisse',
        orderNumber: 6,
        title: 'Caisse & Clôture Z',
        category: 'sales_floor',
        categoryLabel: 'Salle & Ventes',
        description: 'Fonds de caisse obligatoire, comptage aveugle (blind count), sorties d’espèces et clôtures Z immuables.',
        icon: Coins,
        gradient: 'from-emerald-500 to-teal-600',
        badge: 'Sécurité Z',
        tags: ['caisse', 'fond', 'cloture', 'rapport z', 'especes', 'ecart', 'blind count'],
        featureKey: 'cash_register_z',
        moduleKey: 'mod_caisse',
      },
      {
        key: 'paiements',
        orderNumber: 7,
        title: 'Moyens d’Encaissement & Mobile Money',
        category: 'sales_floor',
        categoryLabel: 'Salle & Ventes',
        description: 'Espèces FCFA, cartes bancaires GIMAC/Visa, et comptes marchands MTN MoMo & Orange Money Cameroun.',
        icon: CreditCard,
        gradient: 'from-indigo-600 to-purple-700',
        badge: 'Multi-Paiement & MoMo',
        tags: ['paiement', 'encaissement', 'cb', 'especes', 'cheque', 'virement', 'gimac', 'momo', 'orange money', 'mtn'],
      },

      // =========================================================================
      // 3. CUISINE ET BAR
      // =========================================================================
      {
        key: 'cuisine',
        orderNumber: 9,
        title: 'Cuisine KDS & Préparation',
        category: 'kitchen_bar',
        categoryLabel: 'Cuisine & Bar',
        description: 'Écrans de production cuisine (Chaud / Froid), chrono préparation, alerte retard (>20 min) et tickets 80mm.',
        icon: ChefHat,
        gradient: 'from-rose-500 to-red-600',
        badge: 'KDS Chaud/Froid',
        tags: ['cuisine', 'kds', 'production', 'chaud', 'froid', 'ticket', 'preparation', 'retard'],
        featureKey: 'kds_kitchen',
        moduleKey: 'mod_cuisine',
      },
      {
        key: 'bar',
        orderNumber: 10,
        title: 'Bar, Cave & Boissons',
        category: 'kitchen_bar',
        categoryLabel: 'Cuisine & Bar',
        description: 'Fiches recettes cocktails, gestion des doses et verres, déclaration casse et coulage bar.',
        icon: Wine,
        gradient: 'from-purple-500 to-pink-600',
        badge: 'Doses & Coulage',
        tags: ['bar', 'cocktail', 'boisson', 'vin', 'biere', 'casse', 'coulage', 'doses'],
        featureKey: 'kds_bar',
        moduleKey: 'mod_bar',
      },

      // =========================================================================
      // 4. STOCK ET ACHATS
      // =========================================================================
      {
        key: 'stock',
        orderNumber: 11,
        title: 'Stocks, Lots & FEFO',
        category: 'stock_purchases',
        categoryLabel: 'Stock & Achats',
        description: 'Méthode FEFO (Premier Expiré, Premier Sorti), blocage de stock négatif et alertes DLC.',
        icon: Package,
        gradient: 'from-amber-600 to-orange-600',
        badge: 'FEFO Strict',
        tags: ['stock', 'fefo', 'lots', 'dlc', 'expiration', 'inventaire', 'magasin', 'negatif'],
        featureKey: 'stock_lots_fefo',
        moduleKey: 'mod_stock',
      },
      {
        key: 'achats',
        orderNumber: 12,
        title: 'Achats & Fournisseurs',
        category: 'stock_purchases',
        categoryLabel: 'Stock & Achats',
        description: 'Bons de commande, seuil d’approbation Direction (>100k FCFA), réceptions magasin et factures.',
        icon: Truck,
        gradient: 'from-teal-600 to-emerald-700',
        badge: 'Cycle Achat',
        tags: ['achat', 'fournisseur', 'bon de commande', 'reception', 'facture', 'approbation'],
        featureKey: 'purchases_suppliers',
        moduleKey: 'mod_purchases',
      },

      // =========================================================================
      // 5. ÉQUIPE ET ACCÈS
      // =========================================================================

      {
        key: 'notifications',
        orderNumber: 14,
        title: 'E-mails, Alertes & Passerelle GAS',
        category: 'team_access',
        categoryLabel: 'Équipe & Accès',
        description: 'Passerelle e-mails Google Apps Script (100/j gratuits), alertes rupture de stock, réservations, reçus numériques et rapports Z.',
        icon: Mail,
        gradient: 'from-amber-600 to-orange-700',
        badge: 'Google Apps Script',
        tags: ['email', 'mail', 'gas', 'webhook', 'notification', 'alerte', 'sms', 'sonore', 'stock', 'caisse', 'reservation', 'ticket', 'z_report'],
      },
      {
        key: 'audit',
        orderNumber: 15,
        title: 'Journal d’Audit Immuable',
        category: 'team_access',
        categoryLabel: 'Équipe & Accès',
        description: 'Historique inaltérable de toutes les modifications de configuration et opérations sensibles.',
        icon: History,
        gradient: 'from-slate-800 to-slate-950',
        badge: 'Traçabilité Totale',
        tags: ['audit', 'journal', 'log', 'tracabilite', 'historique'],
        featureKey: 'audit_trail_immutable',
        moduleKey: 'mod_audit',
      },

      // =========================================================================
      // 6. MATÉRIEL & SYSTÈME
      // =========================================================================
      {
        key: 'impression',
        orderNumber: 16,
        title: 'Matériel d’Impression ESC/POS',
        category: 'hardware',
        categoryLabel: 'Matériel',
        description: 'Imprimantes thermiques 80mm/58mm caisse, cuisine, bar, réseau IP et tiroir-caisse RJ11.',
        icon: Printer,
        gradient: 'from-zinc-700 to-slate-900',
        badge: 'ESC/POS & Réseau',
        tags: ['impression', 'imprimante', 'thermique', '80mm', '58mm', 'tiroir', 'reseau', 'escpos'],
      },
      {
        key: 'terminaux',
        orderNumber: 17,
        title: 'Terminaux & Caisses Enregistreuses',
        category: 'hardware',
        categoryLabel: 'Matériel',
        description: 'Affectation des caisses fixes, tablettes serveurs, afficheur client et écrans tactiles.',
        icon: Monitor,
        gradient: 'from-cyan-700 to-blue-800',
        badge: 'Caisses & Tablettes',
        tags: ['terminal', 'tablette', 'caisse', 'pos', 'tactile', 'kds'],
      },
      {
        key: 'offline',
        orderNumber: 18,
        title: 'Mode Hors Ligne & PWA',
        category: 'hardware',
        categoryLabel: 'Matériel',
        description: 'Fonctionnement garanti 100% hors connexion Internet, synchronisation différée et stockage local.',
        icon: WifiOff,
        gradient: 'from-emerald-700 to-teal-800',
        badge: '100% Hors Ligne',
        tags: ['offline', 'hors ligne', 'pwa', 'sync', 'stockage local'],
      },
    ];

    // Filtrage strict : seules les applications autorisées par l'administrateur de plateforme s'affichent
    const isAppEntitled = (app: AppMetadata): boolean => {
      if (app.moduleKey && !isModuleEntitled(app.moduleKey)) return false;
      if (app.featureKey && !isFeatureEntitled(app.featureKey)) return false;
      return true;
    };

    return list.filter(isAppEntitled);
  }, [outlets.length, isFeatureEntitled, isModuleEntitled]);

  // Repli automatique si l'application active n'est plus autorisée par l'abonnement
  useEffect(() => {
    if (activeSubMenu !== 'library') {
      const isStillAvailable = appLibrary.some((a) => a.key === activeSubMenu);
      if (!isStillAvailable) {
        setActiveSubMenu('library');
        showToast({
          title: 'Rubrique Non Autorisée',
          message: 'Cette rubrique de configuration n’est pas activée pour cet établissement.',
          type: 'info',
        });
      }
    }
  }, [activeSubMenu, appLibrary, showToast]);

  // Alertes de cohérence opérationnelle
  const computedAlerts = useMemo(() => {
    const list: {
      id: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
      actionLabel: string;
      targetMenu: SubMenuKey;
    }[] = [];

    const hasActiveRegister = cashRegisters.some((r) => r.restaurantId === selectedOutletId && r.active);
    if (!hasActiveRegister) {
      list.push({
        id: 'no-active-cash-register',
        severity: 'error',
        message: `Aucune caisse active configurée pour "${activeRestaurant?.name || 'cet établissement'}". Les encaissements seront bloqués.`,
        actionLabel: 'Configurer Caisse',
        targetMenu: 'caisse',
      });
    }

    const hasTables = tables.length > 0;
    if (isModuleEntitled('mod_tables') && !hasTables) {
      list.push({
        id: 'no-tables',
        severity: 'warning',
        message: `Aucune table n'est actuellement créée dans les salles de "${activeRestaurant?.name || 'cet établissement'}".`,
        actionLabel: 'Créer Tables',
        targetMenu: 'tables',
      });
    }

    if (!activeRestaurant?.niu || activeRestaurant.niu === 'À renseigner') {
      list.push({
        id: 'missing-niu',
        severity: 'warning',
        message: `Numéro d'Identifiant Unique (NIU) manquant pour "${activeRestaurant?.name}". Requis pour facturation conforme DGI.`,
        actionLabel: 'Renseigner NIU',
        targetMenu: 'general',
      });
    }

    if (!settings.taxRate || settings.taxRate === 0) {
      list.push({
        id: 'vat-unconfigured',
        severity: 'warning',
        message: 'Taux de TVA non paramétré. Le barème standard Cameroun CGI 2026 est de 19,25% (17,5% TVA + 10% CAC).',
        actionLabel: 'Ajuster Fiscalité',
        targetMenu: 'fiscalite',
      });
    }

    const hasTerminal = terminals.some((t) => t.outletId === selectedOutletId && t.active);
    if (!hasTerminal) {
      list.push({
        id: 'no-terminal',
        severity: 'info',
        message: `Aucun terminal POS assigné au site "${activeRestaurant?.name}". Utilisez la gestion des terminaux pour connecter une tablette ou caisse fixe.`,
        actionLabel: 'Ajouter Terminal',
        targetMenu: 'terminaux',
      });
    }

    return list;
  }, [cashRegisters, tables, activeRestaurant, settings, terminals, selectedOutletId]);

  // Filtrage et recherche instantanée
  const filteredApps = useMemo(() => {
    return appLibrary
      .filter((app) => {
        const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
        if (!matchCategory) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = app.title.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        const matchCatLabel = app.categoryLabel.toLowerCase().includes(q);
        const matchTags = app.tags.some((t) => t.toLowerCase().includes(q));

        return matchTitle || matchDesc || matchCatLabel || matchTags;
      })
      .sort((a, b) => a.orderNumber - b.orderNumber);
  }, [appLibrary, selectedCategory, searchQuery]);

  const activeAppMeta = appLibrary.find((a) => a.key === activeSubMenu);

  // Rendu de la section active
  const renderActiveSection = () => {
    switch (activeSubMenu) {
      case 'subscription':
        return <RestaurantSubscriptionSection />;
      case 'general':
        return <GeneralAndOutletsSection subTab="general" />;
      case 'pos':
      case 'tables':
      case 'caisse':
      case 'cuisine':
      case 'bar':
        return <OperationsOptionsSection subTab={activeSubMenu} />;
      case 'stock':
      case 'achats':
        return <StockAndPurchasesSection subTab={activeSubMenu} />;
      case 'facturation':
      case 'fiscalite':
      case 'paiements':
        return <FiscalBillingPaymentsSection subTab={activeSubMenu} />;
      case 'notifications':
      case 'impression':
      case 'terminaux':
      case 'offline':
        return <HardwareAndSecuritySection subTab={activeSubMenu} />;
      case 'audit':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
              <History className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Journal d'Audit & Sécurité</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                La traçabilité immuable SHA-256 et l'historique complet des opérations sensibles sont accessibles dans le module dédié.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/audit';
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <span>Accéder au Module Audit</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Liste dynamique des catégories pour les filtres
  const availableCategories = useMemo(() => {
    const cats: { key: AppCategory; label: string; count: number; icon: any }[] = [
      { key: 'all', label: 'Toutes les Applications', count: appLibrary.length, icon: LayoutGrid },
      {
        key: 'identity_fiscal',
        label: 'Identité & Fiscalité',
        count: appLibrary.filter((a) => a.category === 'identity_fiscal').length,
        icon: Building,
      },
      {
        key: 'sales_floor',
        label: 'Salle & Ventes',
        count: appLibrary.filter((a) => a.category === 'sales_floor').length,
        icon: ShoppingBag,
      },
      {
        key: 'kitchen_bar',
        label: 'Cuisine & Bar',
        count: appLibrary.filter((a) => a.category === 'kitchen_bar').length,
        icon: ChefHat,
      },
      {
        key: 'stock_purchases',
        label: 'Stock & Achats',
        count: appLibrary.filter((a) => a.category === 'stock_purchases').length,
        icon: Package,
      },
      {
        key: 'team_access',
        label: 'Équipe & Accès',
        count: appLibrary.filter((a) => a.category === 'team_access').length,
        icon: ShieldCheck,
      },
      {
        key: 'hardware',
        label: 'Matériel',
        count: appLibrary.filter((a) => a.category === 'hardware').length,
        icon: Printer,
      },
    ];

    if (outlets.length > 1) {
      cats.push({
        key: 'group',
        label: 'Groupe Multi-Sites',
        count: appLibrary.filter((a) => a.category === 'group').length,
        icon: Building2,
      });
    }

    return cats;
  }, [appLibrary, outlets.length]);

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Global Header: Scopes & Mode */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight">Configuration RestoMaster OS</h1>
              <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Centre de Pilotage
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Plateforme modulaire : {appLibrary.length} applications de gouvernance opérationnelle, fiscale (CGI 2026) et matérielle.
            </p>
          </div>
        </div>

        {/* Global Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto text-xs">
          {/* Outlet Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700/80 transition-colors">
            <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Site :</span>
            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Terminal Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700/80 transition-colors">
            <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Caisse :</span>
            <select
              value={selectedTerminalId}
              onChange={(e) => setSelectedTerminalId(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              {terminals.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Simple vs Avancé Mode */}
          <div className="bg-slate-800/90 p-1 rounded-xl flex items-center border border-slate-700/80">
            <button
              type="button"
              onClick={() => setAdminDisplayMode('simple')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                adminDisplayMode === 'simple'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setAdminDisplayMode('avance')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                adminDisplayMode === 'avance'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Avancé
            </button>
          </div>
        </div>
      </div>

      {/* Profils d'Exploitation & Super Admin Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 p-4 rounded-3xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                {isSuperAdmin ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Super-Administrateur (Direction)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Mode Consultation</span>
                  </>
                )}
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-bold border border-slate-700">
                Gouvernance Modulaire
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin
                ? 'Activez/désactivez à volonté tous les modules du système et déployez le profil type de votre restaurant en 1 clic.'
                : 'Connectez-vous avec le rôle Direction ou Superadmin pour modifier les modules et déployer des profils.'}
            </p>
          </div>
        </div>

        {/* Quick 1-Click Profile Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            disabled={!isSuperAdmin}
            onClick={() => handleQuickApplyProfile('depart_essentiel', 'Profil Essentiel Restaurant (Resto #1)')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all ${
              isSuperAdmin
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 ring-2 ring-amber-400/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Active uniquement les 12 modules essentiels pour votre restaurant de départ"
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Profil Essentiel (12 Modules)</span>
          </button>

          <button
            type="button"
            disabled={!isTrueSuperAdmin}
            onClick={() => isTrueSuperAdmin && setIsOnboardingOpen(true)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all shadow-xs ${isTrueSuperAdmin ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-pointer' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`}
            title="Ouvrir l'assistant de premier lancement ou revoir l'audit de livraison"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Assistant & Audit de Livraison</span>
          </button>

          <select
            disabled={!isSuperAdmin}
            onChange={(e) => {
              const val = e.target.value as ConfigurationProfileType;
              if (val) {
                const labelMap: Record<ConfigurationProfileType, string> = {
                  depart_essentiel: 'Profil Essentiel (Resto #1)',
                  restaurant_classique: 'Restaurant Classique & Grillades',
                  bar_lounge: 'Bar Lounge & Cave à Vins',
                  fast_food: 'Fast-Food & Vente à Emporter',
                  evenementiel_traiteur: 'Traiteur & Banquets',
                  hotel_restaurant: 'Hôtel-Restaurant & Room Service',
                  restaurant_livraison: 'Dark Kitchen & Livraisons',
                };
                handleQuickApplyProfile(val, labelMap[val] || val);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isSuperAdmin
                ? 'bg-slate-800/90 hover:bg-slate-800 text-white border-slate-700'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            <option value="" disabled>Changer de profil métier...</option>
            <option value="depart_essentiel">Profil Essentiel Restaurant (Resto #1)</option>
            <option value="restaurant_classique">Restaurant Classique & Grillades</option>
            <option value="bar_lounge">Bar Lounge & Cave à Vins</option>
            <option value="fast_food">Fast-Food & Vente à Emporter</option>
            <option value="evenementiel_traiteur">Traiteur & Événementiel</option>
            <option value="hotel_restaurant">Hôtel-Restaurant & Room Service</option>
            <option value="restaurant_livraison">Dark Kitchen & Livraisons</option>
          </select>
        </div>
      </div>

      {/* 2. Handover & Delivery Status Banner */}
      {settings.certifiedReadyForHandover ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Plateforme Certifiée & Prête pour Livraison Client
                </span>
                {settings.configurationVerrouillee && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Configuration Verrouillée</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Audit « Prêt à livrer » validé avec succès
                {settings.certifiedAt ? ` le ${new Date(settings.certifiedAt).toLocaleString('fr-FR')}` : ''}
                {settings.certifiedBy ? ` par ${settings.certifiedBy}` : ''}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!isTrueSuperAdmin}
              onClick={() => isTrueSuperAdmin && setIsOnboardingOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-bold text-xs transition cursor-pointer shadow-2xs"
            >
              Revoir l'Audit & Fiche de Mise en Service
            </button>

            {isTrueSuperAdmin && (
              <button
                type="button"
                onClick={handleToggleConfigLock}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>{settings.configurationVerrouillee ? 'Déverrouiller' : 'Verrouiller'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-md shadow-amber-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Premier Lancement : Plateforme non encore certifiée
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  9 Étapes Obligatoires
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Vérifiez la conformité fiscale CGI 2026, l'identité légale, les caisses, les tables et téléchargez le gabarit CSV avant livraison.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!isTrueSuperAdmin}
            onClick={() => isTrueSuperAdmin && setIsOnboardingOpen(true)}
            className={`px-4 py-2.5 rounded-xl text-white font-black text-xs transition flex items-center gap-2 shrink-0 shadow-md active:scale-98 ${isTrueSuperAdmin ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer' : 'bg-slate-400 cursor-not-allowed'}`}
          >
            <Rocket className="w-4 h-4 text-amber-400" />
            <span>Lancer l'Assistant (9 étapes)</span>
          </button>
        </div>
      )}

      {/* 2. Inconsistency Alerts Banner */}
      {computedAlerts.length > 0 && (
        <div className="space-y-2">
          {computedAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
                alt.severity === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : alt.severity === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    alt.severity === 'error'
                      ? 'text-rose-600'
                      : alt.severity === 'warning'
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                />
                <span className="font-semibold truncate">{alt.message}</span>
              </div>
              {alt.actionLabel && (
                <button
                  onClick={() => setActiveSubMenu(alt.targetMenu)}
                  className="px-3.5 py-1.5 rounded-xl bg-white shadow-xs font-bold text-[11px] text-slate-800 hover:bg-slate-100 transition-colors shrink-0 border border-slate-200 cursor-pointer"
                >
                  {alt.actionLabel} →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. CONDITIONAL VIEW: App Library vs Focused App Interface */}
      {activeSubMenu === 'library' ? (
        /* ========================================================================= */
        /* MODE A : LA BIBLIOTHÈQUE D'APPLICATIONS DE CONFIGURATION                  */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Quick Filters Bar & Instant Search */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une application (ex: caisse, moMo, fefo, dlc, tva)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Stats Counter */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-end md:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {filteredApps.length} application{filteredApps.length > 1 ? 's' : ''} disponible{filteredApps.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Category Navigation Pills (6 parcours logiques + Groupe) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pt-1 pb-1">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`group flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 ring-1 ring-slate-800'
                        : 'bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <CatIcon
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] tabular-nums px-2 py-0.5 rounded-full font-black transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid of Applications (Launchpad) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const Icon = app.icon;

              return (
                <div
                  key={app.key}
                  onClick={() => setActiveSubMenu(app.key)}
                  className="group bg-white rounded-3xl border border-slate-200/90 hover:border-amber-400 p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-300"></div>

                  <div>
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${app.gradient} text-white flex items-center justify-center shadow-md shadow-slate-200 group-hover:scale-105 transition-transform duration-200 shrink-0`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      {app.badge && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-200/60">
                          {app.badge}
                        </span>
                      )}
                    </div>

                    {/* Title & Category */}
                    <div className="mt-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {app.categoryLabel}
                      </div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-950 transition-colors mt-0.5 line-clamp-1">
                        {app.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom: Action Link */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-amber-800 transition-colors">
                      Ouvrir la configuration
                    </span>
                    <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-amber-400 flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredApps.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Aucune application correspondante</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Aucun module ne correspond à votre recherche "{searchQuery}". Essayez un autre terme comme "caisse", "momo", "fefo" ou réinitialisez les filtres.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Réinitialiser la recherche
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MODE B : INTERFACE DIRECTE DE CONFIGURATION (AVEC BOUTON RETOUR)          */
        /* ========================================================================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubMenu('library')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all hover:-translate-x-0.5 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Bibliothèque d'Applications</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              {activeAppMeta && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{activeAppMeta.categoryLabel}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {activeAppMeta.title}
                  </h2>
                </div>
              )}
            </div>

            {/* Quick Switcher Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400 font-semibold hidden md:inline">Changer d'application :</span>
              <select
                value={activeSubMenu}
                onChange={(e) => setActiveSubMenu(e.target.value as SubMenuKey)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                {appLibrary.map((app) => (
                  <option key={app.key} value={app.key}>
                    {app.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Configuration Workspace Component */}
          <div>{renderActiveSection()}</div>
        </div>
      )}

      {/* Assistant de Premier Lancement & Certification */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};
