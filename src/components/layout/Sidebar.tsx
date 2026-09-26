import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
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
  Sparkles,
  Thermometer,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen,
}) => {
  const { currentUser, canAccess } = useAuth();
  const { orders, tables, stockItems, expenses, unreadNotifsCount, isFeatureEnabled, activeRestaurant } = useRestaurant();

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

  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: null,
      color: 'text-amber-500',
    },
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
      id: 'reservations',
      label: 'Réservations',
      icon: CalendarDays,
      badge: null,
      featureKey: 'table_reservations',
    },
    {
      id: 'events',
      label: 'Événements & Banquets',
      icon: Sparkles,
      badge: 'Catering',
      badgeColor: 'bg-purple-500/20 text-purple-400 font-bold',
      featureKey: 'events_banquets',
    },
    {
      id: 'delivery',
      label: 'Courses & Livraisons',
      icon: Bike,
      badge: null,
      featureKey: 'delivery_orders',
    },
    {
      id: 'menu',
      label: 'Menu & Recettes',
      icon: MenuSquare,
      badge: null,
    },
    {
      id: 'stock',
      label: 'Stocks & Lots (FEFO)',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} alertes` : null,
      badgeColor: 'bg-red-500 text-white font-bold',
      featureKey: 'stock_lots_fefo',
    },
    {
      id: 'purchases',
      label: 'Achats & Fournisseurs',
      icon: Truck,
      badge: null,
      featureKey: 'purchases_suppliers',
    },
    {
      id: 'hygiene',
      label: 'Hygiène & Contrôles HACCP',
      icon: Thermometer,
      badge: null,
      featureKey: 'haccp_hygiene',
    },
    {
      id: 'caisse',
      label: 'Caisse & Z Journalier',
      icon: Coins,
      badge: null,
      featureKey: 'cash_register_z',
    },
    {
      id: 'main_courante',
      label: 'Main Courante (Cameroun)',
      icon: FileSpreadsheet,
      badge: 'HotelPro',
      badgeColor: 'bg-amber-500/20 text-amber-400 font-bold',
      featureKey: 'hotelpro_maincourante',
    },
    {
      id: 'fiscal',
      label: 'Fiscalité & E-Billing (DGI)',
      icon: ShieldCheck,
      badge: 'CGI 2026',
      badgeColor: 'bg-blue-500/20 text-blue-400 font-bold',
      featureKey: 'cameroon_fiscal_framework',
    },
    {
      id: 'finance',
      label: 'Finances & Dépenses',
      icon: TrendingUp,
      badge: pendingExpensesCount > 0 ? `${pendingExpensesCount} à valider` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'clients',
      label: 'Clients & Fidélité',
      icon: Users,
      badge: null,
      featureKey: 'clients_crm',
    },
    {
      id: 'staff',
      label: 'Personnel & Présences',
      icon: UserCheck,
      badge: null,
    },
    {
      id: 'documents',
      label: 'Documents & Scanner',
      icon: FolderLock,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Rapports & Stats',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'audit',
      label: 'Journal d’Audit',
      icon: ShieldAlert,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Configuration',
      icon: Settings,
      badge: 'Pro',
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-18 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-amber-900/30 font-bold text-lg tracking-tight">
              RM
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight leading-tight flex items-center gap-1.5">
                RestoMaster <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">OS</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
                {activeRestaurant?.name || 'RestoMaster'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Profile Banner */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center gap-3">
          <img
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
            <div className="inline-block mt-0.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const accessible = canAccess(item.id);
            if (!accessible) return null;
            if (item.featureKey && !isFeatureEnabled(item.featureKey)) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-slate-950 text-amber-400' : item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Stats & Realtime Indicator */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">Connecté Cloud Firestore</span>
          </div>
          {unreadNotifsCount > 0 && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
              {unreadNotifsCount} alertes
            </span>
          )}
        </div>
      </aside>
    </>
  );
};
