import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types/restaurant';
import { getMinutesElapsed } from '../../lib/utils';
import {
  Wine,
  Clock,
  CheckCircle2,
  Check,
  GlassWater,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const BarKdsView: React.FC = () => {
  const { orders, updateOrderItemStatus, updateOrderStatus } = useRestaurant();

  const barOrders = orders.filter((order) => {
    const hasBarItems = order.items.some((i) => i.destination === 'bar');
    if (!hasBarItems) return false;
    return order.status !== 'payee' && order.status !== 'annulee';
  });

  const handleMarkItemReady = (orderId: string, itemId: string) => {
    updateOrderItemStatus(orderId, itemId, 'pret');
  };

  const handleMarkAllBarReady = (order: Order) => {
    order.items
      .filter((i) => i.destination === 'bar' && i.status !== 'pret' && i.status !== 'servi')
      .forEach((item) => {
        updateOrderItemStatus(order.id, item.id, 'pret');
      });

    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
            <Wine className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Écran Bar & Lounge KDS</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </h2>
            <p className="text-xs text-slate-400">
              Cocktails signature, vins et boissons fraîches
            </p>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {barOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <GlassWater className="w-12 h-12 mx-auto text-slate-300" />
          <div className="text-sm font-bold text-slate-700">Aucune boisson en attente</div>
          <p className="text-xs text-slate-500">Toutes les boissons et bouteilles ont été servies !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {barOrders.map((order) => {
            const elapsed = getMinutesElapsed(order.createdAt);
            const barItems = order.items.filter((i) => i.destination === 'bar');
            const allReady = barItems.every((i) => i.status === 'pret' || i.status === 'servi');

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-black text-slate-900">
                      {order.tableName || 'Bar Comptoir'}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {order.orderNumber} • Serveur : {order.serverName}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <Clock className="w-3 h-3" />
                    <span>{elapsed} min</span>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4 space-y-2 flex-1 divide-y divide-slate-100">
                  {barItems.map((item) => {
                    const isReady = item.status === 'pret' || item.status === 'servi';
                    return (
                      <div
                        key={item.id}
                        className={`pt-2 first:pt-0 flex items-center justify-between gap-3 ${
                          isReady ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{item.quantity}x</span>
                          <span className={`text-xs font-bold ${isReady ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                            {item.productName}
                          </span>
                        </div>

                        {!isReady ? (
                          <button
                            onClick={() => handleMarkItemReady(order.id, item.id)}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition-colors"
                          >
                            Prêt
                          </button>
                        ) : (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50">
                  {!allReady ? (
                    <button
                      onClick={() => handleMarkAllBarReady(order)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Toutes les Boissons Sont Prêtes</span>
                    </button>
                  ) : (
                    <div className="text-center text-xs font-bold text-emerald-700 py-1.5">
                      Prêtes au comptoir / Déjà servies
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
