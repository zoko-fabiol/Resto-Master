import React from 'react';
import { RestaurantTable, Order, RestaurantSettings } from '../../types/restaurant';
import { TABLE_STATUS_MAP, formatCurrency, getMinutesElapsed } from '../../lib/utils';
import {
  CheckCircle,
  CalendarDays,
  CreditCard,
  Utensils,
  AlertCircle,
  Users,
  Clock,
  Lock,
  Bell,
  GitMerge,
  Sparkles,
} from 'lucide-react';

interface TablesGridViewProps {
  tables: RestaurantTable[];
  ordersMap: Map<string, Order>;
  settings: RestaurantSettings;
  isCapacityAllowed: boolean;
  onSelectTable: (table: RestaurantTable) => void;
}

export const TablesGridView: React.FC<TablesGridViewProps> = ({
  tables,
  ordersMap,
  settings,
  isCapacityAllowed,
  onSelectTable,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {tables.map((table) => {
        const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;
        const order = table.currentOrderId ? ordersMap.get(table.currentOrderId) : null;
        const elapsed = table.timeOccupied ? getMinutesElapsed(table.timeOccupied) : 0;

        return (
          <div
            key={table.id}
            onClick={() => onSelectTable(table)}
            className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between min-h-[170px] select-none ${statusConfig.borderClass} ${statusConfig.bgClass}`}
          >
            <div>
              {/* Header: Table Number & Status Pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-slate-900 tracking-tight">{table.number}</span>
                  {table.mergedWithTableId && (
                    <span className="p-0.5 rounded bg-amber-500 text-slate-950" title="Table fusionnée">
                      <GitMerge className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.badgeClass}`}
                >
                  {table.status === 'libre' ? (
                    <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : table.status === 'reservee' ? (
                    <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                  ) : table.status === 'attente_paiement' ? (
                    <CreditCard className="w-3 h-3 text-rose-600 shrink-0" />
                  ) : table.status === 'occupee' || table.status === 'en_service' ? (
                    <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 shrink-0" />
                  )}
                  <span>{statusConfig.label}</span>
                </span>
              </div>

              {/* Sub-label: Zone & Capacity */}
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                {isCapacityAllowed && (
                  <>
                    <span className="flex items-center gap-0.5 font-semibold text-slate-700 tabular-nums">
                      <Users className="w-3 h-3 text-slate-400" />
                      {table.capacity}p
                    </span>
                    <span className="text-slate-300">•</span>
                  </>
                )}
                <span className="truncate font-medium text-slate-600">{table.zone}</span>
              </div>

              {/* Server Name Badge */}
              {table.assignedServerName && (
                <div className="text-xs font-semibold text-amber-800 mt-1 truncate">
                  {table.assignedServerName}
                </div>
              )}

              {/* Tablet Alerts */}
              {table.tabletLocked && (
                <div className="mt-2 py-0.5 px-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="truncate">Tablette Verrouillée</span>
                </div>
              )}
              {table.tabletCallWaiterPending && (
                <div className="mt-2 py-0.5 px-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center gap-1 animate-bounce">
                  <Bell className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Appel Serveur !</span>
                </div>
              )}
            </div>

            {/* Bottom: Active Order & Elapsed Timer */}
            {order ? (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                <div className="text-sm font-black text-slate-900 tabular-nums">
                  {formatCurrency(order.total, settings.currency)}
                </div>
                <div className="text-xs text-slate-600 mt-1 flex items-center justify-between">
                  <span className="font-medium tabular-nums">{order.items.length} art.</span>
                  {elapsed > 0 && (
                    <span
                      className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-md tabular-nums ${
                        elapsed >= 60
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{elapsed} min</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-2 border-t border-slate-200/40 text-xs text-slate-400 italic">
                {table.status === 'libre' ? 'Prête pour accueil' : table.status === 'a_nettoyer' ? 'À nettoyer' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
