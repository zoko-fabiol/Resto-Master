import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { ROLE_LABELS } from '../../lib/utils';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  ChefHat,
  Wine,
  CalendarDays,
  MenuSquare,
  Package,
  Truck,
  Coins,
  TrendingUp,
  Users,
  UserCheck,
  FolderLock,
  BarChart3,
  ShieldAlert,
  Settings,
  X,
  FileSpreadsheet,
  Bike,
  PartyPopper,
  Thermometer,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

interface NavSection {
  id: string;
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    badgeColor?: string;
    featureKey?: string;
  }>;
}

export const ITEM_RULE_MAP: Record<string, string> = {
  dashboard: 'mod_dashboard',
  pos: 'mod_pos',
  bar_pos: 'mod_bar_pos',
  tables: 'mod_tables',
  kitchen_kds: 'mod_cuisine',
  bar_kds: 'mod_bar',
  menu: 'mod_menu',
  caisse: 'mod_caisse',
  stock: 'mod_stock',
  purchases: 'mod_purchases',
  hygiene: 'mod_hygiene',
  main_courante: 'mod_main_courante',
  fiscal: 'mod_fiscal',
  finance: 'mod_finance',
  clients: 'mod_clients',
  delivery: 'mod_delivery',
  events: 'mod_events',
  staff: 'mod_staff',
  documents: 'mod_documents',
  reports: 'mod_reports',
  audit: 'mod_audit',
  reservations: 'res_management',
  settings: 'mod_settings',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
}) => {
  const { currentUser, canAccess, logout } = useAuth();
  const confirm = useConfirm();
  const {
    orders,
    tables,
    stockItems,
    expenses,
    unreadNotifsCount,
    isFeatureEnabled,
    isRuleEnabled,
    isModuleEntitled,
    activeRestaurant,
  } = useRestaurant();

  // Badges calculation
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'envoye' || o.status === 'en_preparation'
  ).length;

  const kitchenOrdersCount = orders.filter((o) =>
    o.items.some(
      (i) => i.destination === 'cuisine' && (i.status === 'en_attente' || i.status === 'en_preparation')
    )
  ).length;

  const barOrdersCount = orders.filter((o) =>
    o.items.some(
      (i) => i.destination === 'bar' && (i.status === 'en_attente' || i.status === 'en_preparation')
    )
  ).length;

  const occupiedTablesCount = tables.filter((t) => t.status !== 'libre').length;
  const lowStockCount = stockItems.filter((s) => s.currentQuantity <= s.minThreshold).length;
  const pendingExpensesCount = expenses.filter((e) => e.status === 'en_attente').length;

  const navSections: NavSection[] = [
    {
      id: 'overview',
      title: 'Vue d’Ensemble',
      items: [
        {
          id: 'dashboard',
          label: 'Tableau de bord',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      id: 'service',
      title: 'Salle & Service',
      items: [
        {
          id: 'tables',
          label: 'Plan des Tables',
          icon: Utensils,
          badge: occupiedTablesCount > 0 ? `${occupiedTablesCount}/${tables.length}` : null,
          badgeColor: 'bg-indigo-100 text-indigo-700',
          featureKey: 'tables_management',
        },
        {
          id: 'pos',
          label: 'Prise de Commande / POS',
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
          badgeColor: 'bg-amber-100 text-amber-800',
          featureKey: 'pos_core',
        },
        {
          id: 'bar_pos',
          label: 'Espace Bar (100% Boissons)',
          icon: Wine,
          badge: 'Comptoir',
          badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
          featureKey: 'bar_pos_exclusive',
        },
        {
          id: 'reservations',
          label: 'Réservations',
          icon: CalendarDays,
          featureKey: 'table_reservations',
        },
        {
          id: 'delivery',
          label: 'Courses & Livraisons',
          icon: Bike,
          featureKey: 'delivery_orders',
        },
        {
          id: 'events',
          label: 'Banquets & Traiteur',
          icon: PartyPopper,
          badge: 'Catering',
          badgeColor: 'bg-purple-500/20 text-purple-400 font-bold',
          featureKey: 'events_banquets',
        },
      ],
    },
    {
      id: 'production',
      title: 'Cuisine & Bar',
      items: [
        {
          id: 'kitchen_kds',
          label: 'Cuisine KDS',
          icon: ChefHat,
          badge: kitchenOrdersCount > 0 ? kitchenOrdersCount : null,
          badgeColor: 'bg-rose-500 text-white animate-pulse',
          featureKey: 'kds_kitchen',
        },
        {
          id: 'bar_kds',
          label: 'Bar & Boissons',
          icon: Wine,
          badge: barOrdersCount > 0 ? barOrdersCount : null,
          badgeColor: 'bg-emerald-500 text-white',
          featureKey: 'kds_bar',
        },
        {
          id: 'menu',
          label: 'Carte & Recettes',
          icon: MenuSquare,
          featureKey: 'recipes_bom_yield',
        },
        {
          id: 'hygiene',
          label: 'Hygiène & HACCP',
          icon: Thermometer,
          featureKey: 'haccp_hygiene',
        },
      ],
    },
    {
      id: 'stocks',
      title: 'Stocks & Achats',
      items: [
        {
          id: 'stock',
          label: 'Stocks & Lots (FEFO)',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount}` : null,
          badgeColor: 'bg-red-500 text-white font-bold',
          featureKey: 'stock_lots_fefo',
        },
        {
          id: 'purchases',
          label: 'Achats & Fournisseurs',
          icon: Truck,
          featureKey: 'purchases_suppliers',
        },
      ],
    },
    {
      id: 'section_finances',
      title: 'Caisse & Finances',
      items: [
        {
          id: 'caisse',
          label: 'Caisse & Z Journalier',
          icon: Coins,
          featureKey: 'cash_register_z',
        },
        {
          id: 'finance',
          label: 'Finances & Dépenses',
          icon: TrendingUp,
          badge: pendingExpensesCount > 0 ? `${pendingExpensesCount}` : null,
          badgeColor: 'bg-amber-100 text-amber-800',
        },
        {
          id: 'main_courante',
          label: 'Main Courante (HotelPro)',
          icon: FileSpreadsheet,
          badge: 'Cameroun',
          badgeColor: 'bg-amber-500/20 text-amber-400 font-bold',
          featureKey: 'hotelpro_maincourante',
        },
        {
          id: 'fiscal',
          label: 'Fiscalité & DGI E-Billing',
          icon: ShieldCheck,
          badge: 'CGI 2026',
          badgeColor: 'bg-blue-500/20 text-blue-400 font-bold',
          featureKey: 'cameroon_fiscal_framework',
        },
      ],
    },
    {
      id: 'administration',
      title: 'Pilotage & Administration',
      items: [
        {
          id: 'staff',
          label: 'Personnel & Plannings',
          icon: UserCheck,
        },
        {
          id: 'clients',
          label: 'Clients & Fidélité',
          icon: Users,
          featureKey: 'clients_crm',
        },
        {
          id: 'reports',
          label: 'Rapports & Stats',
          icon: BarChart3,
        },
        {
          id: 'documents',
          label: 'Documents & Scanner GED',
          icon: FolderLock,
          featureKey: 'documents_scanner_ged',
        },
        {
          id: 'audit',
          label: 'Journal d’Audit',
          icon: ShieldAlert,
          featureKey: 'audit_trail_immutable',
        },
        {
          id: 'settings',
          label: currentUser.role === 'superadmin' ? 'Configuration Système' : 'Paramètres Restaurant',
          icon: Settings,
          badge: currentUser.role === 'superadmin' ? 'Superadmin' : 'Direction',
          badgeColor:
            currentUser.role === 'superadmin'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-700 text-slate-200 font-bold',
        },
      ],
    },
  ];

  const roleInfo = ROLE_LABELS[currentUser.role] || { label: currentUser.role, color: 'bg-gray-100 text-gray-800' };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-all duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[76px]' : 'w-72'}`}
      >
        {/* Brand Header */}
        <div className={`h-16 px-4 border-b border-slate-800/80 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-amber-900/30 font-bold text-lg tracking-tight shrink-0">
              RM
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="font-bold text-white text-base tracking-tight leading-tight flex items-center gap-1.5">
                  RestoMaster <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">OS</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
                  {activeRestaurant?.name || 'RestoMaster'}
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Replier la barre latérale"
                aria-label="Replier la barre latérale"
              >
                <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                aria-label="Fermer la barre latérale"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className={`p-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40 shrink-0"
              title={`${currentUser.name} (${roleInfo.label})`}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-amber-500/40 shrink-0"
              title={`${currentUser.name} (${roleInfo.label})`}
            >
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RM'}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
              <div className="inline-block mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsed expand toggle button */}
        {collapsed && (
          <div className="hidden lg:flex justify-center p-2 border-b border-slate-800/60">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Agrandir la barre latérale"
              aria-label="Agrandir la barre latérale"
            >
              <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
          {navSections.map((section) => {
            // Filter visible items in section
            const visibleItems = section.items.filter((item) => {
              if (!canAccess(item.id)) return false;
              if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
              const ruleKey = ITEM_RULE_MAP[item.id];
              if (ruleKey && !isRuleEnabled(ruleKey, true)) return false;
              if (ruleKey && !isModuleEntitled(ruleKey)) return false;

              // Raccordement des règles d'opération fonctionnelles
              if (item.id === 'pos' && !isRuleEnabled('pos_active', true)) return false;
              if (item.id === 'kitchen_kds' && !isRuleEnabled('cuisine_kds', true)) return false;
              if (item.id === 'bar_kds' && !isRuleEnabled('bar_module', true)) return false;
              if (item.id === 'delivery' && !isRuleEnabled('delivery_active', true)) return false;

              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="space-y-1">
                {/* Section title (only when expanded) */}
                {!collapsed ? (
                  <div className="px-3 pt-1 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                ) : (
                  <div className="w-8 h-[1px] bg-slate-800 mx-auto my-2" />
                )}

                {/* Items */}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileOpen(false);
                      }}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center ${
                        collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                      } rounded-xl text-xs font-medium transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive ? 'text-slate-950 scale-110' : 'text-slate-400 group-hover:text-amber-400'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-slate-950 text-amber-400' : item.badgeColor || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Small badge dot in collapsed mode */}
                      {collapsed && item.badge && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Realtime Indicator & Déconnexion */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 space-y-2.5">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {!collapsed && <span className="text-slate-300 font-medium">Cloud Connecté</span>}
            </div>
            {!collapsed && unreadNotifsCount > 0 && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                {unreadNotifsCount} alertes
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              const ok = await confirm({
                title: 'Déconnexion du compte',
                message: 'Voulez-vous vraiment vous déconnecter de RestoMaster OS ?',
                confirmText: 'Se déconnecter',
                cancelText: 'Rester connecté',
                variant: 'danger',
              });
              if (ok) {
                setMobileOpen(false);
                await logout();
              }
            }}
            title={collapsed ? 'Se déconnecter' : undefined}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer group`}
          >
            <LogOut className="w-4 h-4 text-rose-400/80 group-hover:text-rose-400 shrink-0" />
            {!collapsed && <span className="text-xs font-semibold">Se déconnecter</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
