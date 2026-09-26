import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, OrderItem } from '../../types/restaurant';
import { getMinutesElapsed } from '../../lib/utils';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Flame,
  Check,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const KitchenKdsView: React.FC = () => {
  const { orders, updateOrderStatus, updateOrderItemStatus } = useRestaurant();
  const [filterState, setFilterState] = useState<'active' | 'ready' | 'all'>('active');

  // Filter orders that have items intended for the kitchen
  const kitchenOrders = orders.filter((order) => {
    const hasKitchenItems = order.items.some((i) => i.destination === 'cuisine');
    if (!hasKitchenItems) return false;

    if (filterState === 'active') {
      return order.status !== 'payee' && order.status !== 'annulee' && order.status !== 'servi';
    }
    if (filterState === 'ready') {
      return order.status === 'pret';
    }
    return order.status !== 'annulee';
  });

  const handleMarkItemReady = (orderId: string, itemId: string) => {
    updateOrderItemStatus(orderId, itemId, 'pret');
  };

  const handleMarkAllKitchenReady = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'cuisine' && i.status !== 'pret' && i.status !== 'servi')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'pret');
      });

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });
  };

  const handleMarkOrderServed = (orderId: string) => {
    updateOrderStatus(orderId, 'servi');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Écran Cuisine KDS (Kitchen Display System)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-400">
              {kitchenOrders.length} commandes en cours de production
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setFilterState('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterState === 'active' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            En cours ({orders.filter((o) => o.status === 'envoye' || o.status === 'en_preparation').length})
          </button>
          <button
            onClick={() => setFilterState('ready')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterState === 'ready' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prêtes ({orders.filter((o) => o.status === 'pret').length})
          </button>
          <button
            onClick={() => setFilterState('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterState === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Toutes
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <ChefHat className="w-12 h-12 mx-auto text-slate-300" />
          <div className="text-sm font-bold text-slate-700">Aucun bon de commande en attente</div>
          <p className="text-xs text-slate-500">Toutes les préparations cuisine ont été envoyées et servies !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kitchenOrders.map((order) => {
            const elapsed = getMinutesElapsed(order.createdAt);
            const isLate = elapsed > 25;
            const isMedium = elapsed > 15 && !isLate;
            const kitchenItems = order.items.filter((i) => i.destination === 'cuisine');
            const allReady = kitchenItems.every((i) => i.status === 'pret' || i.status === 'servi');

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border-2 shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                  isLate
                    ? 'border-red-500 ring-2 ring-red-100'
                    : isMedium
                    ? 'border-amber-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    isLate
                      ? 'bg-red-50/80 border-red-200'
                      : isMedium
                      ? 'bg-amber-50/80 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        {order.tableName || 'À emporter'}
                      </span>
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        {order.orderNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Serveur : {order.serverName}
                    </div>
                  </div>

                  {/* Elapsed Timer Badge */}
                  <div
                    className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                      isLate
                        ? 'bg-red-600 text-white border-red-700 animate-pulse'
                        : isMedium
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed} min</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2.5 flex-1 divide-y divide-slate-100">
                  {kitchenItems.map((item) => {
                    const isItemReady = item.status === 'pret' || item.status === 'servi';
                    return (
                      <div
                        key={item.id}
                        className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 ${
                          isItemReady ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {item.quantity}x
                            </span>
                            <span className={`text-xs font-bold ${isItemReady ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                              {item.productName}
                            </span>
                          </div>

                          {/* Notes if any */}
                          {item.notes && (
                            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Item Ready Action Button */}
                        {!isItemReady ? (
                          <button
                            onClick={() => handleMarkItemReady(order.id, item.id)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 border border-slate-200 transition-colors shrink-0"
                          >
                            Prêt
                          </button>
                        ) : (
                          <span className="text-emerald-600 shrink-0">
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                  {!allReady ? (
                    <button
                      onClick={() => handleMarkAllKitchenReady(order)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tout Marquer Prêt !</span>
                    </button>
                  ) : order.status === 'pret' ? (
                    <button
                      onClick={() => handleMarkOrderServed(order.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>Marquer Servi en Salle</span>
                    </button>
                  ) : (
                    <div className="w-full text-center text-xs font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
                      Plats servis aux convives
                    </div>
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
