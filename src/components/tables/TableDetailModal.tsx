import React, { useState } from 'react';
import { RestaurantTable, TableStatus, Order, OrderItem, Employee, RestaurantSettings } from '../../types/restaurant';
import { TABLE_STATUS_MAP, formatCurrency } from '../../lib/utils';
import {
  X,
  ShoppingBag,
  Utensils,
  CreditCard,
  Sparkles,
  Send,
  UserCheck,
  GitMerge,
  Split,
  Tablet,
  Lock,
  Unlock,
  Check,
  Bell,
  Receipt,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import { usePrompt } from '../ui/ConfirmDialog';

interface TableDetailModalProps {
  table: RestaurantTable;
  allTables: RestaurantTable[];
  order: Order | null;
  settings: RestaurantSettings;
  employees: Employee[];
  currentUserRole?: string;
  isReservationsAllowed: boolean;
  isCleaningAllowed: boolean;
  isMergeAllowed: boolean;
  isDivisionAllowed: boolean;
  onClose: () => void;
  onOpenOrder: (tableId: string) => void;
  onPayOrder: (orderId: string) => void;
  onUpdateStatus: (tableId: string, status: TableStatus) => void;
  onAssignServer: (tableId: string, serverId?: string, serverName?: string) => void;
  onMergeTables: (targetId: string, sourceId: string) => void;
  onSplitTables: (tableId: string) => void;
  onLockTablet: (tableId: string, reason: string) => Promise<void>;
  onUnlockTablet: (tableId: string) => Promise<void>;
  onDismissWaiterCall: (tableId: string) => Promise<void>;
  onSendOrderToCashier: (orderId: string, tableId: string) => void;
  onMarkOrderServed: (orderId: string) => void;
  onOpenKiosk?: (tableId: string) => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  table,
  allTables,
  order,
  settings,
  employees,
  currentUserRole,
  isReservationsAllowed,
  isCleaningAllowed,
  isMergeAllowed,
  isDivisionAllowed,
  onClose,
  onOpenOrder,
  onPayOrder,
  onUpdateStatus,
  onAssignServer,
  onMergeTables,
  onSplitTables,
  onLockTablet,
  onUnlockTablet,
  onDismissWaiterCall,
  onSendOrderToCashier,
  onMarkOrderServed,
  onOpenKiosk,
}) => {
  const prompt = usePrompt();
  const [tableToMergeWith, setTableToMergeWith] = useState('');
  const statusConfig = TABLE_STATUS_MAP[table.status] || TABLE_STATUS_MAP.libre;

  const availableServers = employees.filter(
    (e) => e.role === 'serveur' || e.role === 'caisse' || e.role === 'manager' || e.role === 'direction'
  );

  const canCashout =
    currentUserRole === 'direction' ||
    currentUserRole === 'manager' ||
    currentUserRole === 'caisse' ||
    currentUserRole === 'superadmin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
              {table.number}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Table {table.number}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-medium">{table.zone}</span>
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="tabular-nums">Capacité : {table.capacity} convives</span>
                <span>•</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Active Order Summary */}
          {order ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                <div>
                  <div className="text-xs font-bold text-amber-900">Commande : {order.orderNumber}</div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    Serveur : {order.serverName || table.assignedServerName || 'Non assigné'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-amber-900 tabular-nums">
                    {formatCurrency(order.total, settings.currency)}
                  </div>
                  <div className="text-xs text-amber-700 font-semibold">TTC inclus</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">Articles commandés :</div>
                <div className="space-y-1.5 divide-y divide-slate-100 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                  {order.items.map((item: OrderItem) => (
                    <div key={item.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 tabular-nums">{item.quantity}x</span>
                        <span className="text-slate-800">{item.productName}</span>
                        <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          {item.destination}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 tabular-nums">
                        {formatCurrency(item.quantity * item.unitPrice, settings.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200">
              {table.status === 'libre' ? (
                <p>Cette table est actuellement libre et prête pour accueillir des convives.</p>
              ) : table.status === 'a_nettoyer' ? (
                <p>La table a été libérée et attend d'être nettoyée et redressée pour le service.</p>
              ) : (
                <p>Statut actuel : {statusConfig.label}</p>
              )}
            </div>
          )}

          {/* Server Assignment */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Assigner un serveur à cette table :</span>
            </div>
            <select
              value={table.assignedServerId || ''}
              onChange={(e) => {
                const sId = e.target.value;
                const sEmp = employees.find((emp) => emp.id === sId);
                onAssignServer(table.id, sId || undefined, sEmp?.fullName);
              }}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="">Aucun serveur assigné</option>
              {availableServers.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.fullName} ({srv.role})
                </option>
              ))}
            </select>
          </div>

          {/* Merge / Split Tables */}
          {(isMergeAllowed || isDivisionAllowed) && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GitMerge className="w-3.5 h-3.5 text-amber-600" />
                  <span>Fusion / Séparation de tables :</span>
                </span>
                {isDivisionAllowed && (table.mergedWithTableId || (table.mergedTableIds && table.mergedTableIds.length > 0)) && (
                  <button
                    onClick={() => onSplitTables(table.id)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Split className="w-3 h-3" />
                    <span>Séparer</span>
                  </button>
                )}
              </div>

              {isMergeAllowed && !table.mergedWithTableId && (
                <div className="flex items-center gap-2">
                  <select
                    value={tableToMergeWith}
                    onChange={(e) => setTableToMergeWith(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="">Sélectionner une table voisine...</option>
                    {allTables
                      .filter((t) => t.id !== table.id && !t.mergedWithTableId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.number} ({t.zone} - {t.capacity}p)
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={!tableToMergeWith}
                    onClick={() => {
                      if (tableToMergeWith) {
                        onMergeTables(table.id, tableToMergeWith);
                        setTableToMergeWith('');
                      }
                    }}
                    className="px-3.5 py-2 bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors"
                  >
                    Fusionner
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Status Change */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-600 mb-2">Modifier manuellement le statut :</div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  'libre',
                  'occupee',
                  ...(isReservationsAllowed ? (['reservee'] as TableStatus[]) : []),
                  'attente_paiement',
                  ...(isCleaningAllowed ? (['a_nettoyer'] as TableStatus[]) : []),
                  'hors_service',
                ] as TableStatus[]
              ).map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateStatus(table.id, st)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    table.status === st
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {TABLE_STATUS_MAP[st]?.label || st}
                </button>
              ))}
            </div>
          </div>

          {/* Tablet Kiosk Remote Controls */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tablet className="w-3.5 h-3.5 text-amber-600" />
                <span>Borne / Tablette Client :</span>
              </span>
              {table.tabletLocked ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Verrouillée</span>
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Active</span>
                </span>
              )}
            </div>

            {/* Pending Waiter Call Alert */}
            {table.tabletCallWaiterPending && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span className="font-semibold">Appel Serveur en cours sur cette table !</span>
                </div>
                <button
                  onClick={() => onDismissWaiterCall(table.id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 text-xs"
                >
                  Acquitter
                </button>
              </div>
            )}

            {/* Bill Requested Alert */}
            {table.tabletBillRequested && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2 text-xs text-blue-900 font-semibold">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Les convives ont demandé l'addition depuis la borne client.</span>
              </div>
            )}

            {/* Lock / Unlock Buttons */}
            <div className="flex items-center gap-2">
              {table.tabletLocked ? (
                <button
                  onClick={() => onUnlockTablet(table.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Déverrouiller à distance</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const reason = await prompt({
                      title: `Verrouiller la Tablette ${table.number}`,
                      message: `Indiquez le motif de verrouillage à distance de la Table ${table.number} :`,
                      defaultValue: "Table en cours d'encaissement",
                      placeholder: 'Motif du verrouillage...',
                      confirmLabel: 'Verrouiller',
                    });
                    if (reason !== null) {
                      await onLockTablet(table.id, reason || 'Verrouillée à distance');
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verrouiller à distance</span>
                </button>
              )}

              {onOpenKiosk && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenKiosk(table.id);
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  title="Ouvrir la vue borne client"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Borne Client</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
          {order ? (
            <>
              <button
                onClick={() => {
                  onOpenOrder(table.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>+ Ajouter plats</span>
              </button>

              {order.status !== 'servi' && order.status !== 'payee' && (
                <button
                  onClick={() => onMarkOrderServed(order.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Marquer Servie</span>
                </button>
              )}

              <button
                onClick={() => onSendOrderToCashier(order.id, table.id)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer à la Caisse</span>
              </button>

              {canCashout && (
                <button
                  onClick={() => {
                    onPayOrder(order.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all tabular-nums"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Encaisser ({formatCurrency(order.total, settings.currency)})</span>
                </button>
              )}
            </>
          ) : table.status === 'a_nettoyer' ? (
            <button
              onClick={() => {
                onUpdateStatus(table.id, 'libre');
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Marquer Nettoyée & Prête</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenOrder(table.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
            >
              <Utensils className="w-4 h-4" />
              <span>Ouvrir Commande sur Table {table.number}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
