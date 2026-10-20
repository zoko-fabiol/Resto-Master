// ============================================================
// src/components/layout/BottomNav.tsx
// Barre de navigation inférieure mobile adaptée au rôle utilisateur
// ============================================================

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { UserRole } from '../../types/restaurant';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  ChefHat,
  Wine,
  Coins,
  Package,
  BarChart3,
  TrendingUp,
  Truck,
  MenuSquare,
  Thermometer,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

interface NavItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string | null;
}

const ROLE_MOBILE_ITEMS: Record<string, string[]> = {
  serveur: ['tables', 'pos', 'bar_pos', 'kitchen_kds'],
  caisse: ['caisse', 'tables', 'pos', 'finance'],
  cuisine: ['kitchen_kds', 'menu', 'hygiene', 'stock'],
  bar: ['bar_kds', 'bar_pos', 'menu', 'stock'],
  stock: ['stock', 'purchases', 'menu', 'dashboard'],
  finance: ['finance', 'caisse', 'fiscal', 'reports'],
  comptable: ['fiscal', 'finance', 'caisse', 'reports'],
  direction: ['dashboard', 'tables', 'pos', 'caisse', 'reports'],
  manager: ['dashboard', 'tables', 'pos', 'caisse', 'reports'],
};

const ITEM_DETAILS: Record<string, { label: string; icon: LucideIcon }> = {
  dashboard: { label: 'Accueil', icon: LayoutDashboard },
  tables: { label: 'Tables', icon: Utensils },
  pos: { label: 'POS', icon: ShoppingBag },
  bar_pos: { label: 'Bar POS', icon: Wine },
  kitchen_kds: { label: 'Cuisine', icon: ChefHat },
  bar_kds: { label: 'Bar KDS', icon: Wine },
  caisse: { label: 'Caisse', icon: Coins },
  stock: { label: 'Stocks', icon: Package },
  purchases: { label: 'Achats', icon: Truck },
  finance: { label: 'Finance', icon: TrendingUp },
  fiscal: { label: 'Fiscalité', icon: ShieldCheck },
  menu: { label: 'Carte', icon: MenuSquare },
  hygiene: { label: 'HACCP', icon: Thermometer },
  reports: { label: 'Rapports', icon: BarChart3 },
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser, canAccess } = useAuth();
  const { orders, tables, stockItems } = useRestaurant();

  const roleKey = currentUser?.role || 'direction';
  const itemKeys = ROLE_MOBILE_ITEMS[roleKey] || ROLE_MOBILE_ITEMS.direction;

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'envoye' || o.status === 'en_preparation'
  ).length;

  const kitchenOrdersCount = orders.filter((o) =>
    o.items.some((i) => i.status === 'en_attente' || i.status === 'en_preparation')
  ).length;

  const items: NavItemDef[] = itemKeys
    .filter((id) => canAccess(id))
    .map((id) => {
      const details = ITEM_DETAILS[id] || { label: id, icon: LayoutDashboard };
      let badge: number | string | null = null;

      if (id === 'pos' && pendingOrdersCount > 0) badge = pendingOrdersCount;
      if (id === 'kitchen_kds' && kitchenOrdersCount > 0) badge = kitchenOrdersCount;

      return {
        id,
        label: details.label,
        icon: details.icon,
        badge,
      };
    });

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-md border-t border-slate-800/80 shadow-2xl safe-area-pb"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              className={`
                relative flex-1 flex flex-col items-center justify-center h-full py-1 px-1 transition-all select-none cursor-pointer
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
                  <span className="absolute -top-1 -right-2.5 px-1.5 py-0.5 text-xs font-black bg-rose-600 text-white rounded-full leading-none shadow-xs tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 tracking-tight truncate max-w-[72px]">
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-8 h-1 bg-amber-400 rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
