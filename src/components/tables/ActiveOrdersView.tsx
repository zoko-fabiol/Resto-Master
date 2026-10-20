import React from 'react';
import { RestaurantTable, Order, RestaurantSettings } from '../../types/restaurant';
import { formatCurrency, getMinutesElapsed } from '../../lib/utils';
import { ShoppingBag, Sparkles, Send, CreditCard, Clock, Utensils } from 'lucide-react';

interface ActiveOrdersViewProps {
  tables: RestaurantTable[];
  orders: Order[];
  settings: RestaurantSettings;
  currentUserRole?: string;
  onOpenOrder: (tableId: string) => void;
  onPayOrder: (orderId: string) => void;
  onSendOrderToCashier: (orderId: string, tableId: string) => void;
  onMarkOrderServed: (orderId: string, tableId: string) => void;
  onBackToPlan: () => void;
}

export const ActiveOrdersView: React.FC<ActiveOrdersViewProps> = ({
  tables,
  orders,
  settings,
  currentUserRole,
  onOpenOrder,
  onPayOrder,
  onSendOrderToCashier,
  onMarkOrderServed,
  onBackToPlan,
}) => {
  const activeTablesWithOrders = tables.filter((t) => t.currentOrderId);

  const canCashout =
    currentUserRole === 'direction' ||
    currentUserRole === 'manager' ||
    currentUserRole === 'caisse' ||
    currentUserRole === 'superadmin';

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Gestion des Commandes Actives Multi-Tables</h3>
            <p className="text-xs text-slate-600">
              Passez d'une table à l'autre librement. Suivez la préparation en direct et envoyez l'addition à la caisse.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-amber-600 text-white rounded-xl shadow-xs tabular-nums">
          {activeTablesWithOrders.length} tables actives
        </span>
      </div>

      {activeTablesWithOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">Aucune commande active en cours</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Toutes les tables sont actuellement libres ou en attente d'accueil.
          </p>
          <button
            onClick={onBackToPlan}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Retour au Plan de Salle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeTablesWithOrders.map((table) => {
            const ord = orders.find((o) => o.id === table.currentOrderId);
            if (!ord) return null;
            const elapsed = ord.createdAt ? getMinutesElapsed(ord.createdAt) : 0;
            const isReady = ord.status === 'pret' || ord.items.some((i) => i.status === 'pret');
            const isAllServi = ord.items.every((i) => i.status === 'servi');
            const isAwaitingPayment = table.status === 'attente_paiement' || ord.status === 'attente_paiement';

            return (
              <div
                key={table.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Table card header */}
                  <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {table.number}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          Table {table.number} ({table.zone})
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums">
                          <span>{table.guestsCount || table.capacity} convives</span>
                          <span>•</span>
                          <span>{ord.serverName || table.assignedServerName || 'Serveur'}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        isAwaitingPayment
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse'
                          : isAllServi
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isAwaitingPayment
                        ? 'Attente Caisse'
                        : isReady
                        ? 'Plat Prêt !'
                        : isAllServi
                        ? 'Servi'
                        : 'En préparation'}
                    </span>
                  </div>

                  {/* Order info */}
                  <div className="flex items-center justify-between text-xs mb-3 bg-slate-50 p-2.5 rounded-xl">
                    <span className="font-mono text-slate-600 text-xs">{ord.orderNumber}</span>
                    <span className="font-black text-slate-900 tabular-nums">
                      {formatCurrency(ord.total, settings.currency)}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1 mb-3 max-h-36 overflow-y-auto">
                    {ord.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-slate-800">
                          <strong className="text-slate-900 tabular-nums">{item.quantity}x</strong> {item.productName}
                        </span>
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            item.status === 'pret'
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : item.status === 'servi'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'pret' ? 'Prêt' : item.status === 'servi' ? 'Servi' : 'Cuisine'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => onOpenOrder(table.id)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ajouter plats</span>
                  </button>

                  {!isAllServi && (
                    <button
                      onClick={() => onMarkOrderServed(ord.id, table.id)}
                      className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Servie</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSendOrderToCashier(ord.id, table.id)}
                    className="py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>À la Caisse</span>
                  </button>

                  {canCashout && (
                    <button
                      onClick={() => onPayOrder(ord.id)}
                      className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Encaisser</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
