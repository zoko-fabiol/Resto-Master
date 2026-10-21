import React from 'react';
import {
  LayoutDashboard,
  Store,
  UserPlus,
  Megaphone,
  Headphones,
  Menu,
} from 'lucide-react';

interface AdminBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingSignupsCount?: number;
  activeSupportSessionsCount?: number;
  onOpenMobileMenu: () => void;
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  pendingSignupsCount = 0,
  activeSupportSessionsCount = 0,
  onOpenMobileMenu,
}) => {
  const items = [
    {
      id: 'dashboard',
      label: 'Accueil',
      icon: LayoutDashboard,
    },
    {
      id: 'tenants',
      label: 'Clients',
      icon: Store,
    },
    {
      id: 'signups',
      label: 'Inscriptions',
      icon: UserPlus,
      badge: pendingSignupsCount > 0 ? pendingSignupsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'support',
      label: 'Support',
      icon: Headphones,
      badge: activeSupportSessionsCount > 0 ? activeSupportSessionsCount : null,
      badgeColor: 'bg-emerald-500 text-slate-950',
    },
    {
      id: 'announcements',
      label: 'Annonces',
      icon: Megaphone,
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile d'administration"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 shadow-2xl pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              aria-label={item.label}
              className={`
                relative flex-1 flex flex-col items-center justify-center h-full py-1 px-1 transition-[color,transform] duration-150 ease-out select-none cursor-pointer touch-manipulation
                ${isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'scale-100'
                  }`}
                  aria-hidden="true"
                />
                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2.5 px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none shadow-xs tabular-nums ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[68px]">
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-6 h-1 bg-amber-400 rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

        {/* Bouton pour ouvrir le tiroir complet (Menu) */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Menu complet"
          className="relative flex-1 flex flex-col items-center justify-center h-full py-1 px-1 text-slate-400 hover:text-slate-200 font-medium select-none cursor-pointer touch-manipulation"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] mt-1 tracking-tight truncate">Menu</span>
        </button>
      </div>
    </nav>
  );
};
