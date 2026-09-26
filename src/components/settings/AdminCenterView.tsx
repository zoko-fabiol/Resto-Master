import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

import { GeneralAndOutletsSection } from './sections/GeneralAndOutletsSection';
import { FeatureCatalogSection } from './sections/FeatureCatalogSection';
import { OperationsOptionsSection } from './sections/OperationsOptionsSection';
import { StockAndPurchasesSection } from './sections/StockAndPurchasesSection';
import { ClientsAndLoyaltySection } from './sections/ClientsAndLoyaltySection';
import { FiscalBillingPaymentsSection } from './sections/FiscalBillingPaymentsSection';
import { HardwareAndSecuritySection } from './sections/HardwareAndSecuritySection';
import { OrganizationSection } from './sections/OrganizationSection';
import { Building2 } from 'lucide-react';

export type SubMenuKey =
  | 'organisation'
  | 'general'
  | 'etablissement'
  | 'features'
  | 'modules'
  | 'pos'
  | 'caisse'
  | 'tables'
  | 'cuisine'
  | 'bar'
  | 'stock'
  | 'achats'
  | 'clients'
  | 'fidelite'
  | 'livraison'
  | 'reservations'
  | 'evenements'
  | 'facturation'
  | 'fiscalite'
  | 'paiements'
  | 'mobile_money'
  | 'comptabilite'
  | 'personnel'
  | 'notifications'
  | 'impression'
  | 'terminaux'
  | 'integrations'
  | 'securite'
  | 'permissions'
  | 'audit'
  | 'offline'
  | 'avance';

interface SubMenuItem {
  key: SubMenuKey;
  label: string;
  category: 'system' | 'operations' | 'management' | 'finance' | 'technical';
  icon: any;
  badge?: string | number;
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
  } = useRestaurant();

  const [activeSubMenu, setActiveSubMenu] = useState<SubMenuKey>('features');
  const [subSearch, setSubSearch] = useState('');

  // Dynamic real-time configuration inconsistency alerts
  const computedAlerts = useMemo(() => {
    const list: {
      id: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
      actionLabel: string;
      targetMenu: SubMenuKey;
    }[] = [];

    // 1. Caisse active pour cet établissement
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

    // 2. Tables configurées
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

    // 3. NIU Fiscale
    if (!activeRestaurant?.niu || activeRestaurant.niu === 'À renseigner') {
      list.push({
        id: 'missing-niu',
        severity: 'warning',
        message: `Numéro d'Identifiant Unique (NIU) manquant pour "${activeRestaurant?.name}". Requis pour facturation conforme DGI.`,
        actionLabel: 'Renseigner NIU',
        targetMenu: 'etablissement',
      });
    }

    // 4. Fiscalité TVA
    if (!settings.taxRate || settings.taxRate === 0) {
      list.push({
        id: 'vat-unconfigured',
        severity: 'warning',
        message: 'Taux de TVA non paramétré. Le barème standard Cameroun CGI 2026 est de 19,25% (17,5% TVA + 10% CAC).',
        actionLabel: 'Ajuster Fiscalité',
        targetMenu: 'fiscalite',
      });
    }

    // 5. Terminaux
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

  const subMenuItems: SubMenuItem[] = [
    // Système & Établissement
    { key: 'organisation', label: 'Organisation & Groupe', category: 'system', icon: Building2 },
    { key: 'general', label: 'Général', category: 'system', icon: Settings },
    { key: 'etablissement', label: 'Établissement', category: 'system', icon: Building, badge: outlets.length },
    { key: 'features', label: 'Fonctionnalités', category: 'system', icon: Sliders, badge: features.filter((f) => f.status === 'ACTIVÉ').length },
    { key: 'modules', label: 'Modules', category: 'system', icon: Layers },

    // Opérations en Salle & Cuisine
    { key: 'pos', label: 'POS', category: 'operations', icon: ShoppingBag },
    { key: 'caisse', label: 'Caisse', category: 'operations', icon: Coins },
    { key: 'tables', label: 'Tables & Service', category: 'operations', icon: Utensils },
    { key: 'cuisine', label: 'Cuisine', category: 'operations', icon: ChefHat },
    { key: 'bar', label: 'Bar', category: 'operations', icon: Wine },
    { key: 'livraison', label: 'Livraison', category: 'operations', icon: Bike },
    { key: 'reservations', label: 'Réservations', category: 'operations', icon: Calendar },
    { key: 'evenements', label: 'Événements', category: 'operations', icon: Sparkles },

    // Stocks, Achats & Clients
    { key: 'stock', label: 'Stocks', category: 'management', icon: Package },
    { key: 'achats', label: 'Achats', category: 'management', icon: Truck },
    { key: 'clients', label: 'Clients', category: 'management', icon: Users },
    { key: 'fidelite', label: 'Fidélité', category: 'management', icon: Award },
    { key: 'personnel', label: 'Personnel', category: 'management', icon: UserCheck },

    // Facturation & Fiscalité Cameroun
    { key: 'facturation', label: 'Facturation', category: 'finance', icon: Receipt },
    { key: 'fiscalite', label: 'Fiscalité', category: 'finance', icon: ShieldCheck, badge: 'CGI 2026' },
    { key: 'paiements', label: 'Paiements', category: 'finance', icon: CreditCard },
    { key: 'mobile_money', label: 'Mobile Money', category: 'finance', icon: Smartphone, badge: 'MTN/Orange' },
    { key: 'comptabilite', label: 'Comptabilité', category: 'finance', icon: FileSpreadsheet, badge: 'OHADA' },

    // Matériel, Sécurité & Réseau
    { key: 'notifications', label: 'Notifications', category: 'technical', icon: Bell },
    { key: 'impression', label: 'Impression', category: 'technical', icon: Printer },
    { key: 'terminaux', label: 'Terminaux', category: 'technical', icon: Monitor, badge: terminals.length },
    { key: 'integrations', label: 'Intégrations', category: 'technical', icon: Share2 },
    { key: 'securite', label: 'Sécurité', category: 'technical', icon: Lock },
    { key: 'permissions', label: 'Permissions', category: 'technical', icon: ShieldCheck },
    { key: 'audit', label: 'Audit', category: 'technical', icon: History },
    { key: 'offline', label: 'Offline & Synchronisation', category: 'technical', icon: WifiOff },
    { key: 'avance', label: 'Avancé', category: 'technical', icon: Sliders },
  ];

  const filteredSubMenus = useMemo(() => {
    if (!subSearch.trim()) return subMenuItems;
    const q = subSearch.toLowerCase().trim();
    return subMenuItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q)
    );
  }, [subMenuItems, subSearch]);

  const activeItem = subMenuItems.find((i) => i.key === activeSubMenu) || subMenuItems[0];

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Bar: Title, Outlet Selector, Terminal Selector, Simple/Avancé toggle */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-900/40 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold">Configuration — RestoMaster OS</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Hospitality & POS Cameroun
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Centre de configuration professionnel inspiré des standards eZee Optimus (31 sous-menus)
            </p>
          </div>
        </div>

        {/* Global Scope Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto text-xs">
          {/* Outlet Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Établissement:</span>
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
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Caisse / Terminal:</span>
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

          {/* Simple vs Avancé Mode Toggle */}
          <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
            <button
              type="button"
              onClick={() => setAdminDisplayMode('simple')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                adminDisplayMode === 'simple'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setAdminDisplayMode('avance')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                adminDisplayMode === 'avance'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Avancé
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Configuration Inconsistency Alerts */}
      {computedAlerts.length > 0 && (
        <div className="space-y-2">
          {computedAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs ${
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
                  className="px-3 py-1.5 rounded-xl bg-white shadow-xs font-bold text-[11px] text-slate-800 hover:bg-slate-100 transition-colors shrink-0 border border-slate-200"
                >
                  {alt.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. Sub-Navigation: Search Bar + Horizontal Scrollable Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer les 31 sous-menus..."
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            31 modules de paramétrage
          </span>
        </div>

        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {filteredSubMenus.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubMenu === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSubMenu(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Section Rendering */}
      <div>
        {/* Organisation & Groupe */}
        {activeSubMenu === 'organisation' && <OrganizationSection />}

        {/* General & Outlets */}
        {(activeSubMenu === 'general' || activeSubMenu === 'etablissement') && (
          <GeneralAndOutletsSection subTab={activeSubMenu} />
        )}

        {/* Feature Catalog */}
        {activeSubMenu === 'features' && <FeatureCatalogSection />}

        {/* Operations Options */}
        {(activeSubMenu === 'modules' ||
          activeSubMenu === 'pos' ||
          activeSubMenu === 'caisse' ||
          activeSubMenu === 'tables' ||
          activeSubMenu === 'cuisine' ||
          activeSubMenu === 'bar' ||
          activeSubMenu === 'livraison' ||
          activeSubMenu === 'reservations' ||
          activeSubMenu === 'evenements') && (
          <OperationsOptionsSection subTab={activeSubMenu} />
        )}

        {/* Stock & Purchases */}
        {(activeSubMenu === 'stock' || activeSubMenu === 'achats') && (
          <StockAndPurchasesSection subTab={activeSubMenu} />
        )}

        {/* Clients & Loyalty */}
        {(activeSubMenu === 'clients' || activeSubMenu === 'fidelite') && (
          <ClientsAndLoyaltySection subTab={activeSubMenu} />
        )}

        {/* Fiscal, Billing, Payments, Mobile Money, Accounting */}
        {(activeSubMenu === 'facturation' ||
          activeSubMenu === 'fiscalite' ||
          activeSubMenu === 'paiements' ||
          activeSubMenu === 'mobile_money' ||
          activeSubMenu === 'comptabilite') && (
          <FiscalBillingPaymentsSection subTab={activeSubMenu} />
        )}

        {/* Hardware, Security, Permissions, Audit, Offline, Advanced */}
        {(activeSubMenu === 'personnel' ||
          activeSubMenu === 'notifications' ||
          activeSubMenu === 'impression' ||
          activeSubMenu === 'terminaux' ||
          activeSubMenu === 'integrations' ||
          activeSubMenu === 'securite' ||
          activeSubMenu === 'permissions' ||
          activeSubMenu === 'audit' ||
          activeSubMenu === 'offline' ||
          activeSubMenu === 'avance') && (
          <HardwareAndSecuritySection subTab={activeSubMenu} />
        )}
      </div>
    </div>
  );
};
