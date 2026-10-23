import React from 'react';
import {
  LayoutDashboard,
  Store,
  Package,
  UserPlus,
  CreditCard,
  Megaphone,
  ShieldAlert,
  Headphones,
  Settings,
  UserCheck,
  X,
  Mail,
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingSignupsCount?: number;
  pendingPaymentsCount?: number;
  activeSupportSessionsCount?: number;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isDesktopOpen?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingSignupsCount = 0,
  pendingPaymentsCount = 0,
  activeSupportSessionsCount = 0,
  mobileOpen = false,
  setMobileOpen,
  isMobileOpen,
  onCloseMobile,
  isDesktopOpen = true,
}) => {
  const isDrawerOpen = isMobileOpen ?? mobileOpen;
  const handleClose = () => {
    if (onCloseMobile) onCloseMobile();
    if (setMobileOpen) setMobileOpen(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
    },
    {
      id: 'tenants',
      label: 'Restaurants Clients',
      icon: Store,
    },
    {
      id: 'catalog',
      label: 'Catalogue & Tarifs',
      icon: Package,
    },
    {
      id: 'signups',
      label: 'Demandes d’Inscription',
      icon: UserPlus,
      badge: pendingSignupsCount > 0 ? pendingSignupsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'subscriptions',
      label: 'Paiements à Valider',
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null,
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
    },
    {
      id: 'announcements',
      label: 'Annonces & Maintenance',
      icon: Megaphone,
    },
    {
      id: 'support',
      label: 'Sessions Support',
      icon: Headphones,
      badge: activeSupportSessionsCount > 0 ? activeSupportSessionsCount : null,
      badgeColor: 'bg-emerald-500 text-slate-950 font-bold',
    },
    {
      id: 'audit',
      label: 'Journal d’Audit Crypté',
      icon: ShieldAlert,
    },
    {
      id: 'emails',
      label: 'E-mails & Modèles',
      icon: Mail,
    },
    {
      id: 'admins',
      label: 'Équipe Plateforme',
      icon: UserCheck,
    },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20 shrink-0">
            RM
          </div>
          <div>
            <div className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
              RestoMaster <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">Admin</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Console Super Admin SaaS</div>
          </div>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer le menu"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Supervision Multi-Tenant
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                if (isMobile) handleClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/60 text-[11px] text-slate-500 flex flex-col gap-1 pb-safe">
        <div className="flex items-center justify-between text-slate-400">
          <span>Architecture</span>
          <span className="font-mono text-[10px] text-amber-400/80">SaaS Multi-Tenant</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Sécurité</span>
          <span className="font-mono text-[10px] text-emerald-400">SHA-256 / RBAC</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Permanent / Collapsible Sidebar */}
      {isDesktopOpen && (
        <aside className="hidden lg:flex w-64 bg-slate-950 border-r border-slate-800 flex-col shrink-0 min-h-screen sticky top-0 h-screen transition-all">
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* 2. Mobile Drawer & Backdrop */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal d'administration"
            className="relative z-50 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl h-full animate-in slide-in-from-left duration-200"
          >
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
