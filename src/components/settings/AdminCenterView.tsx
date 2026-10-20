import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Sliders,
  Building,
  Monitor,
  Search,
  AlertTriangle,
  Settings,
  ShoppingBag,
  Coins,
  Utensils,
  ChefHat,
  Wine,
  Package,
  Truck,
  Users,
  Award,
  Bike,
  Calendar,
  Sparkles,
  Receipt,
  CreditCard,
  Smartphone,
  FileSpreadsheet,
  UserCheck,
  Bell,
  Printer,
  Share2,
  Lock,
  ShieldCheck,
  History,
  WifiOff,
  Layers,
  ChevronRight,
  Building2,
  LayoutGrid,
  ArrowLeft,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  X,
  Compass,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { ConfigurationProfileType } from '../../types/configuration';

import { GeneralAndOutletsSection } from './sections/GeneralAndOutletsSection';
import { FeatureCatalogSection } from './sections/FeatureCatalogSection';
import { OperationsOptionsSection } from './sections/OperationsOptionsSection';
import { StockAndPurchasesSection } from './sections/StockAndPurchasesSection';
import { ClientsAndLoyaltySection } from './sections/ClientsAndLoyaltySection';
import { FiscalBillingPaymentsSection } from './sections/FiscalBillingPaymentsSection';
import { HardwareAndSecuritySection } from './sections/HardwareAndSecuritySection';
import { OrganizationSection } from './sections/OrganizationSection';

export type SubMenuKey =
  | 'library'
  // Sec. 1 à 4 : Base & Système
  | 'general'
  | 'etablissement'
  | 'features'
  | 'modules'
  // Sec. 7 à 10 : Vente, Salle & Cuisine
  | 'pos'
  | 'tables'
  | 'cuisine'
  | 'bar'
  // Sec. 11 à 14 : Stocks, Achats & Fidélité
  | 'stock'
  | 'achats'
  | 'clients'
  | 'fidelite'
  // Sec. 15 à 17 : Services & Banquets
  | 'livraison'
  | 'reservations'
  | 'evenements'
  // Sec. 18 à 22 : Finance, Fiscalité & Caisse
  | 'facturation'
  | 'fiscalite'
  | 'paiements'
  | 'mobile_money'
  | 'comptabilite'
  | 'caisse'
  // Sec. 23 à 25 : Personnel & Permissions
  | 'notifications'
  | 'personnel'
  | 'permissions'
  // Sec. 26 à 31 : Matériel, Audit & PWA
  | 'impression'
  | 'terminaux'
  | 'integrations'
  | 'securite'
  | 'audit'
  | 'offline'
  | 'avance'
  // Groupe
  | 'organisation';

export type AppCategory =
  | 'all'
  | 'system'
  | 'operations'
  | 'stocks'
  | 'services'
  | 'finance'
  | 'hardware_security'
  | 'group';

export interface AppMetadata {
  key: SubMenuKey;
  orderNumber: number;
  sectionCode: string;
  sectionNumber: string;
  title: string;
  category: AppCategory;
  categoryLabel: string;
  description: string;
  icon: any;
  gradient: string;
  badge?: string;
  tags: string[];
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
    features,
    cashRegisters,
    tables,
    settings,
    activeRestaurant,
    applyConfigProfile,
  } = useRestaurant();

  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const isSuperAdmin = currentUser?.role === 'direction';

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

  // 25 Applications Métier Consolidées
  const appLibrary: AppMetadata[] = [
    // =========================================================================
    // SYSTÈME, ÉTABLISSEMENTS & BASE
    // =========================================================================
    {
      key: 'general',
      orderNumber: 1,
      sectionCode: '01',
      sectionNumber: 'Section 1',
      title: 'Identité, Devises & Établissements',
      category: 'system',
      categoryLabel: 'Système & Établissements',
      description: 'Devise principale FCFA (XAF), identité légale, NIU, RCCM, fuseau horaire et gestion des succursales.',
      icon: Building,
      gradient: 'from-slate-700 to-slate-900',
      badge: 'Devise & Multi-Sites',
      tags: ['general', 'etablissement', 'devise', 'fcfa', 'succursale', 'adresse', 'niu', 'rccm'],
    },
    {
      key: 'features',
      orderNumber: 2,
      sectionCode: '02',
      sectionNumber: 'Section 2',
      title: 'Catalogue des Fonctionnalités',
      category: 'system',
      categoryLabel: 'Système & Établissements',
      description: 'Gouvernance globale et activation granulaire des 17 packs fonctionnels modulaires.',
      icon: Sliders,
      gradient: 'from-violet-600 to-indigo-700',
      badge: '17 Packs',
      tags: ['fonctionnalites', 'catalogue', 'packs', 'activation', 'licence'],
    },
    {
      key: 'modules',
      orderNumber: 3,
      sectionCode: '03',
      sectionNumber: 'Section 3',
      title: 'Activation des Modules Latéraux',
      category: 'system',
      categoryLabel: 'Système & Établissements',
      description: 'Afficher ou masquer les onglets du menu de navigation gauche selon votre type d’établissement.',
      icon: Layers,
      gradient: 'from-slate-700 to-zinc-800',
      badge: 'Menu Latéral',
      tags: ['modules', 'menu', 'sidebar', 'visibilite', 'masquer'],
    },

    // =========================================================================
    // VENTE, SALLE & CUISINE
    // =========================================================================
    {
      key: 'pos',
      orderNumber: 4,
      sectionCode: '04',
      sectionNumber: 'Section 4',
      title: 'POS & Prise de Commande',
      category: 'operations',
      categoryLabel: 'Vente, Salle & Cuisine',
      description: 'Saisie rapide, annulations avec motif obligatoire, remises autorisées et division d’addition.',
      icon: ShoppingBag,
      gradient: 'from-amber-500 to-amber-600',
      badge: 'Règles POS',
      tags: ['pos', 'commande', 'ticket', 'addition', 'remise', 'annulation', 'vente'],
    },
    {
      key: 'tables',
      orderNumber: 5,
      sectionCode: '05',
      sectionNumber: 'Section 5',
      title: 'Tables & Plan de Salle 2D',
      category: 'operations',
      categoryLabel: 'Vente, Salle & Cuisine',
      description: 'Plan interactif 2D, gestion des zones (Terrasse, VIP), statut ménage, couverts et fusions.',
      icon: Utensils,
      gradient: 'from-blue-500 to-indigo-600',
      badge: 'Plan 2D & Zones',
      tags: ['table', 'salle', 'terrasse', 'vip', 'plan', 'couverts', 'fusion'],
    },
    {
      key: 'cuisine',
      orderNumber: 6,
      sectionCode: '06',
      sectionNumber: 'Section 6',
      title: 'Cuisine KDS & Préparation',
      category: 'operations',
      categoryLabel: 'Vente, Salle & Cuisine',
      description: 'Écrans de production cuisine (Chaud / Froid), chrono préparation, alerte retard (>20 min) et tickets 80mm.',
      icon: ChefHat,
      gradient: 'from-rose-500 to-red-600',
      badge: 'KDS Chaud/Froid',
      tags: ['cuisine', 'kds', 'production', 'chaud', 'froid', 'ticket', 'preparation', 'retard'],
    },
    {
      key: 'bar',
      orderNumber: 7,
      sectionCode: '07',
      sectionNumber: 'Section 7',
      title: 'Bar, Cave & Boissons',
      category: 'operations',
      categoryLabel: 'Vente, Salle & Cuisine',
      description: 'Fiches recettes cocktails, gestion des doses et verres, déclaration casse et coulage bar.',
      icon: Wine,
      gradient: 'from-purple-500 to-pink-600',
      badge: 'Doses & Coulage',
      tags: ['bar', 'cocktail', 'boisson', 'vin', 'biere', 'casse', 'coulage', 'doses'],
    },

    // =========================================================================
    // STOCKS & ACHATS
    // =========================================================================
    {
      key: 'stock',
      orderNumber: 8,
      sectionCode: '08',
      sectionNumber: 'Section 8',
      title: 'Stocks, Lots & FEFO',
      category: 'stocks',
      categoryLabel: 'Stocks & Achats',
      description: 'Méthode FEFO (Premier Expiré, Premier Sorti), blocage de stock négatif et alertes DLC.',
      icon: Package,
      gradient: 'from-amber-600 to-orange-600',
      badge: 'FEFO Strict',
      tags: ['stock', 'fefo', 'lots', 'dlc', 'expiration', 'inventaire', 'magasin', 'negatif'],
    },
    {
      key: 'achats',
      orderNumber: 9,
      sectionCode: '09',
      sectionNumber: 'Section 9',
      title: 'Achats & Fournisseurs',
      category: 'stocks',
      categoryLabel: 'Stocks & Achats',
      description: 'Bons de commande, seuil d’approbation Direction (>100k FCFA), réceptions magasin et factures.',
      icon: Truck,
      gradient: 'from-teal-600 to-emerald-700',
      badge: 'Cycle Achat',
      tags: ['achat', 'fournisseur', 'bon de commande', 'reception', 'facture', 'approbation'],
    },

    // =========================================================================
    // SERVICES, CLIENTS & BANQUETS
    // =========================================================================
    {
      key: 'clients',
      orderNumber: 10,
      sectionCode: '10',
      sectionNumber: 'Section 10',
      title: 'Clients, CRM & Programme Fidélité',
      category: 'services',
      categoryLabel: 'Clients & Services',
      description: 'Fiches clients complètes avec NIU contribuable, plafonds d’encours crédit et barème fidélité VIP.',
      icon: Users,
      gradient: 'from-sky-500 to-indigo-600',
      badge: 'CRM & Club VIP',
      tags: ['client', 'crm', 'credit', 'compte', 'niu', 'historique', 'fidelite', 'vip', 'points'],
    },
    {
      key: 'reservations',
      orderNumber: 11,
      sectionCode: '11',
      sectionNumber: 'Section 11',
      title: 'Réservations & Disponibilités',
      category: 'services',
      categoryLabel: 'Clients & Services',
      description: 'Réservations en ligne, liste d’attente, acompte obligatoire ≥ 6 couverts et gestion du No-Show.',
      icon: Calendar,
      gradient: 'from-violet-500 to-indigo-600',
      badge: 'Couverts & No-Show',
      tags: ['reservation', 'couverts', 'acompte', 'noshow', 'attente', 'sms'],
    },
    {
      key: 'livraison',
      orderNumber: 12,
      sectionCode: '12',
      sectionNumber: 'Section 12',
      title: 'Livraison & Courses Moto',
      category: 'services',
      categoryLabel: 'Clients & Services',
      description: 'Frais par quartier (Akwa, Bonapriso, Bastos...), assignation livreurs moto et suivi WhatsApp.',
      icon: Bike,
      gradient: 'from-cyan-500 to-blue-600',
      badge: 'Moto & Zones',
      tags: ['livraison', 'coursier', 'moto', 'quartier', 'whatsapp', 'frais', 'momo'],
    },
    {
      key: 'evenements',
      orderNumber: 13,
      sectionCode: '13',
      sectionNumber: 'Section 13',
      title: 'Événements & Banquets',
      category: 'services',
      categoryLabel: 'Clients & Services',
      description: 'Devis officiels traiteur, acompte préalable 30%, blocage de salle et menus spéciaux banquets.',
      icon: Sparkles,
      gradient: 'from-fuchsia-500 to-rose-600',
      badge: 'Devis & Traiteur',
      tags: ['evenement', 'banquet', 'traiteur', 'devis', 'acompte', 'salle', 'reception'],
    },

    // =========================================================================
    // FINANCE, FISCALITÉ & CAISSE
    // =========================================================================
    {
      key: 'facturation',
      orderNumber: 14,
      sectionCode: '14',
      sectionNumber: 'Section 14',
      title: 'Facturation Officielle & SYSCOHADA',
      category: 'finance',
      categoryLabel: 'Finance & Caisses',
      description: 'Factures déductibles Laser A5, mentions DGI, avoirs et plan comptable OHADA (701100, 443100, 571100).',
      icon: Receipt,
      gradient: 'from-emerald-600 to-green-700',
      badge: 'A5 & SYSCOHADA',
      tags: ['facture', 'facturation', 'a5', 'toutes lettres', 'avoir', 'proforma', 'syscohada', 'ohada', 'comptabilite'],
    },
    {
      key: 'fiscalite',
      orderNumber: 15,
      sectionCode: '15',
      sectionNumber: 'Section 15',
      title: 'Fiscalité Cameroun (CGI 2026)',
      category: 'finance',
      categoryLabel: 'Finance & Caisses',
      description: 'TVA 17,5% + CAC 1,75% = 19,25%, acomptes AIR (2,2% / 5,5%), droit de timbre et télétransmission DGI.',
      icon: ShieldCheck,
      gradient: 'from-red-600 to-rose-700',
      badge: 'CGI 2026 Conforme',
      tags: ['fiscalite', 'tva', 'cac', 'air', 'dgi', 'cameroun', 'impots', 'timbre', 'reel'],
    },
    {
      key: 'paiements',
      orderNumber: 16,
      sectionCode: '16',
      sectionNumber: 'Section 16',
      title: 'Moyens d’Encaissement & Mobile Money',
      category: 'finance',
      categoryLabel: 'Finance & Caisses',
      description: 'Espèces FCFA, cartes bancaires GIMAC/Visa, et comptes marchands MTN MoMo & Orange Money Cameroun.',
      icon: CreditCard,
      gradient: 'from-indigo-600 to-purple-700',
      badge: 'Multi-Paiement & MoMo',
      tags: ['paiement', 'encaissement', 'cb', 'especes', 'cheque', 'virement', 'gimac', 'momo', 'orange money', 'mtn'],
    },
    {
      key: 'caisse',
      orderNumber: 17,
      sectionCode: '17',
      sectionNumber: 'Section 17',
      title: 'Caisse & Clôture Z',
      category: 'finance',
      categoryLabel: 'Finance & Caisses',
      description: 'Fonds de caisse obligatoire, comptage aveugle (blind count), sorties d’espèces et clôtures Z immuables.',
      icon: Coins,
      gradient: 'from-emerald-500 to-teal-600',
      badge: 'Sécurité Z',
      tags: ['caisse', 'fond', 'cloture', 'rapport z', 'especes', 'ecart', 'blind count'],
    },

    // =========================================================================
    // MATÉRIEL, SÉCURITÉ, PERSONNEL & PWA
    // =========================================================================
    {
      key: 'personnel',
      orderNumber: 18,
      sectionCode: '18',
      sectionNumber: 'Section 18',
      title: 'Personnel & Gestion des Rôles',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Fiches employés, matricules, fonctions en salle/cuisine et assignation des postes de travail.',
      icon: UserCheck,
      gradient: 'from-blue-600 to-cyan-700',
      badge: 'Équipes & Rôles',
      tags: ['personnel', 'employe', 'serveur', 'cuisinier', 'role', 'poste', 'matricule'],
    },
    {
      key: 'permissions',
      orderNumber: 19,
      sectionCode: '19',
      sectionNumber: 'Section 19',
      title: 'Permissions RBAC & Plafonds Financiers',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Sécurité anti-fraude, autorisations d’accès par module et plafonds stricts de remises/remboursements par rôle.',
      icon: ShieldCheck,
      gradient: 'from-rose-600 to-red-700',
      badge: 'Anti-Fraude RBAC',
      tags: ['permission', 'rbac', 'securite', 'pin', 'autorisation', 'superviseur', 'remise', 'remboursement', 'plafond'],
    },
    {
      key: 'impression',
      orderNumber: 20,
      sectionCode: '20',
      sectionNumber: 'Section 20',
      title: 'Matériel d’Impression ESC/POS',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Imprimantes thermiques 80mm/58mm caisse, cuisine, bar, réseau IP et tiroir-caisse RJ11.',
      icon: Printer,
      gradient: 'from-zinc-700 to-slate-900',
      badge: 'ESC/POS & Réseau',
      tags: ['impression', 'imprimante', 'thermique', '80mm', '58mm', 'tiroir', 'reseau', 'escpos'],
    },
    {
      key: 'terminaux',
      orderNumber: 21,
      sectionCode: '21',
      sectionNumber: 'Section 21',
      title: 'Terminaux & Caisses Enregistreuses',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Affectation des caisses fixes, tablettes serveurs, afficheur client et écrans tactiles.',
      icon: Monitor,
      gradient: 'from-cyan-700 to-blue-800',
      badge: 'Caisses & Tablettes',
      tags: ['terminal', 'tablette', 'caisse', 'pos', 'tactile', 'kds'],
    },
    {
      key: 'notifications',
      orderNumber: 22,
      sectionCode: '22',
      sectionNumber: 'Section 22',
      title: 'Notifications & Alertes SMS/WhatsApp',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Modèles de SMS clients, confirmations WhatsApp pour réservations et bips sonores KDS.',
      icon: Bell,
      gradient: 'from-amber-600 to-orange-700',
      badge: 'SMS & WhatsApp',
      tags: ['notification', 'sms', 'whatsapp', 'alerte', 'sonore'],
    },
    {
      key: 'audit',
      orderNumber: 23,
      sectionCode: '23',
      sectionNumber: 'Section 23',
      title: 'Journal d’Audit Immuable',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Historique inaltérable de toutes les modifications de configuration et opérations sensibles.',
      icon: History,
      gradient: 'from-slate-800 to-slate-950',
      badge: 'Traçabilité Totale',
      tags: ['audit', 'journal', 'log', 'tracabilite', 'historique'],
    },
    {
      key: 'offline',
      orderNumber: 24,
      sectionCode: '24',
      sectionNumber: 'Section 24',
      title: 'Mode Hors Ligne & PWA',
      category: 'hardware_security',
      categoryLabel: 'Matériel, Sécurité & Audit',
      description: 'Fonctionnement garanti 100% hors connexion Internet, synchronisation différée et stockage local.',
      icon: WifiOff,
      gradient: 'from-emerald-700 to-teal-800',
      badge: '100% Hors Ligne',
      tags: ['offline', 'hors ligne', 'pwa', 'sync', 'stockage local'],
    },

    // =========================================================================
    // MULTI-ÉTABLISSEMENTS & GROUPE
    // =========================================================================
    {
      key: 'organisation',
      orderNumber: 25,
      sectionCode: 'GRP',
      sectionNumber: 'Groupe',
      title: 'Organisation & Groupe Multi-Sites',
      category: 'group',
      categoryLabel: 'Multi-Établissements & Siège',
      description: 'Consolidation de chaîne de restaurants, enseignes, succursales et transferts multi-établissements.',
      icon: Building2,
      gradient: 'from-slate-700 to-slate-900',
      badge: 'Multi-Établissements',
      tags: ['organisation', 'groupe', 'chaine', 'succursale', 'reseau', 'multi-sites', 'groupe'],
    },
  ];;

  // Inconsistency Alerts
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
    if (!hasTables) {
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
        targetMenu: 'etablissement',
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

  // Filtering and Sorting for the App Library (Ordre numérique ascendant strict 1 à 31 puis Groupe)
  const filteredApps = useMemo(() => {
    return appLibrary
      .filter((app) => {
        const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
        if (!matchCategory) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = app.title.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        const matchSection = app.sectionNumber.toLowerCase().includes(q);
        const matchCode = app.sectionCode.toLowerCase().includes(q);
        const matchCatLabel = app.categoryLabel.toLowerCase().includes(q);
        const matchTags = app.tags.some((t) => t.toLowerCase().includes(q));

        return matchTitle || matchDesc || matchSection || matchCode || matchCatLabel || matchTags;
      })
      .sort((a, b) => a.orderNumber - b.orderNumber);
  }, [appLibrary, selectedCategory, searchQuery]);

  const activeAppMeta = appLibrary.find((a) => a.key === activeSubMenu);

  // Render the Selected Section Component
  const renderActiveSection = () => {
    switch (activeSubMenu) {
      case 'organisation':
        return <OrganizationSection />;
      case 'general':
      case 'etablissement':
        return <GeneralAndOutletsSection subTab={activeSubMenu === 'etablissement' ? 'etablissement' : 'general'} />;
      case 'features':
        return <FeatureCatalogSection />;
      case 'modules':
      case 'pos':
      case 'caisse':
      case 'tables':
      case 'cuisine':
      case 'bar':
      case 'livraison':
      case 'reservations':
      case 'evenements':
        return <OperationsOptionsSection subTab={activeSubMenu} />;
      case 'stock':
      case 'achats':
        return <StockAndPurchasesSection subTab={activeSubMenu} />;
      case 'clients':
      case 'fidelite':
        return <ClientsAndLoyaltySection subTab={activeSubMenu === 'fidelite' ? 'fidelite' : 'clients'} />;
      case 'facturation':
      case 'fiscalite':
      case 'paiements':
      case 'mobile_money':
      case 'comptabilite':
        return <FiscalBillingPaymentsSection subTab={activeSubMenu} />;
      case 'personnel':
      case 'notifications':
      case 'impression':
      case 'terminaux':
      case 'integrations':
      case 'securite':
      case 'permissions':
      case 'audit':
      case 'offline':
      case 'avance':
        return <HardwareAndSecuritySection subTab={activeSubMenu} />;
      default:
        return null;
    }
  };

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
                Bibliothèque d'Applications
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Centre de pilotage modulaire : 32 applications de gouvernance opérationnelle, fiscale (CGI 2026) et matérielle.
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
                : 'Connectez-vous avec le rôle Direction pour modifier les modules et déployer des profils.'}
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
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Profil Essentiel (12 Modules)</span>
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
                  className="px-3.5 py-1.5 rounded-xl bg-white shadow-xs font-bold text-[11px] text-slate-800 hover:bg-slate-100 transition-colors shrink-0 border border-slate-200"
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
                  {filteredApps.length} application{filteredApps.length > 1 ? 's' : ''} disponible
                  {filteredApps.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pt-1 pb-1">
              {[
                { key: 'all', label: 'Toutes les Applications', count: appLibrary.length, icon: LayoutGrid },
                {
                  key: 'system',
                  label: 'Système & Établissements',
                  count: appLibrary.filter((a) => a.category === 'system').length,
                  icon: Building2,
                },
                {
                  key: 'operations',
                  label: 'Vente, Salle & Cuisine',
                  count: appLibrary.filter((a) => a.category === 'operations').length,
                  icon: Utensils,
                },
                {
                  key: 'stocks',
                  label: 'Stocks & Achats',
                  count: appLibrary.filter((a) => a.category === 'stocks').length,
                  icon: Package,
                },
                {
                  key: 'services',
                  label: 'Clients & Services',
                  count: appLibrary.filter((a) => a.category === 'services').length,
                  icon: Users,
                },
                {
                  key: 'finance',
                  label: 'Finance & Caisses',
                  count: appLibrary.filter((a) => a.category === 'finance').length,
                  icon: Coins,
                },
                {
                  key: 'hardware_security',
                  label: 'Matériel & Sécurité',
                  count: appLibrary.filter((a) => a.category === 'hardware_security').length,
                  icon: ShieldCheck,
                },
                {
                  key: 'group',
                  label: 'Multi-Sites',
                  count: appLibrary.filter((a) => a.category === 'group').length,
                  icon: Layers,
                },
              ].map((cat) => {
                const isSelected = selectedCategory === cat.key;
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key as AppCategory)}
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

          {/* Grid of Applications (Style App Store / Launchpad) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const Icon = app.icon;

              return (
                <div
                  key={app.key}
                  onClick={() => setActiveSubMenu(app.key)}
                  className="group bg-white rounded-3xl border border-slate-200/90 hover:border-amber-400 p-5 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle top corner gradient highlight */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-300"></div>

                  <div>
                    {/* Top Row: Icon + Section Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${app.gradient} text-white flex items-center justify-center shadow-md shadow-slate-200 group-hover:scale-105 transition-transform duration-200 shrink-0`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-amber-50 group-hover:text-amber-900 transition-colors">
                          {app.sectionNumber}
                        </span>
                        {app.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200/60">
                            {app.badge}
                          </span>
                        )}
                      </div>
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
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
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
          {/* Top Bar with Prominent Back Button and Breadcrumbs */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Le bouton retour demandé par l'utilisateur */}
              <button
                type="button"
                onClick={() => setActiveSubMenu('library')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all hover:-translate-x-0.5 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Bibliothèque d'Applications</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              {/* Breadcrumb & App Identity */}
              {activeAppMeta && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{activeAppMeta.categoryLabel}</span>
                    <span>•</span>
                    <span className="text-amber-800 font-black">{activeAppMeta.sectionNumber}</span>
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
                    {app.sectionNumber} — {app.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Configuration Workspace Component */}
          <div>{renderActiveSection()}</div>
        </div>
      )}
    </div>
  );
};
