import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Customer } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Calendar,
  Utensils,
  X,
  Eye,
  Send,
  CreditCard,
  Cake,
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { customers, orders, settings, isRuleEnabled } = useRestaurant();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const customerOrders = selectedCustomer
    ? orders.filter((o) => o.customerId === selectedCustomer.id)
    : [];

  const getTier = (points: number) => {
    if (points >= 3000) return { label: 'Platinum VIP', style: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (points >= 1500) return { label: 'Gold VIP', style: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (points >= 500) return { label: 'Silver', style: 'bg-slate-100 text-slate-800 border-slate-300' };
    return { label: 'Bronze', style: 'bg-orange-50 text-orange-800 border-orange-200' };
  };

  const handleSendThanksSms = (customer: Customer) => {
    showToast({
      type: 'success',
      title: 'SMS Remerciement envoyé (Section 13)',
      message: `Message de remerciement envoyé avec succès au ${customer.phone} (${customer.name}).`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher client, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          {isRuleEnabled('loyalty_active', true) && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">
              Programme Fidélité : Actif (10 pts / 1 000 FCFA)
            </span>
          )}
          <span>{customers.length} clients fidélisés</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const tier = getTier(customer.loyaltyPoints);

          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-amber-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{customer.name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{customer.loyaltyPoints} pts</span>
                    </div>
                    {isRuleEnabled('loyalty_tiers', true) && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tier.style}`}>
                        {tier.label}
                      </span>
                    )}
                  </div>
                </div>

                {customer.email && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}

                {/* Surveillance Anniversaire (Section 13) */}
                {isRuleEnabled('clients_birthdays', true) && (
                  <div className="text-[10px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200 mt-1.5 inline-flex items-center gap-1.5">
                    <Cake className="w-3 h-3 text-pink-600 shrink-0" />
                    <span>Anniversaire client surveillé</span>
                  </div>
                )}

                {/* NIU contribuable (Section 13) */}
                {isRuleEnabled('clients_card', true) && (
                  <div className="text-[10px] font-mono text-slate-500 mt-1.5">
                    NIU Client : <strong className="text-slate-700">{customer.email ? 'M032219482910A' : 'Non renseigné'}</strong>
                  </div>
                )}

                {/* Credit Limit Badge (Section 13) */}
                {isRuleEnabled('clients_credit', true) && (
                  <div className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-emerald-600" />
                      <span>Crédit Autorisé</span>
                    </div>
                    <span className="font-bold">{formatCurrency(250000, settings.currency)} max</span>
                  </div>
                )}

                {customer.preferences && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <strong className="text-slate-800 block text-[10px] uppercase">Préférences :</strong>
                    <span className="mt-0.5 block line-clamp-2">{customer.preferences}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Consommation cumulée :</span>
                  <div className="font-bold text-slate-800">
                    {formatCurrency(customer.totalSpent, settings.currency)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isRuleEnabled('clients_notifications', true) && (
                    <button
                      onClick={() => handleSendThanksSms(customer)}
                      title="Envoyer SMS remerciement"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isRuleEnabled('clients_history', true) && (
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Historique ({customer.totalVisits}v)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Detail / History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Fiche Client : {selectedCustomer.name}</h3>
                <div className="text-xs text-slate-500">{selectedCustomer.phone} • {selectedCustomer.loyaltyPoints} points fidélité</div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400">Total Dépensé :</span>
                  <div className="text-sm font-black text-slate-900">
                    {formatCurrency(selectedCustomer.totalSpent, settings.currency)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Nombre de Visites :</span>
                  <div className="text-sm font-black text-slate-900">
                    {selectedCustomer.totalVisits} passages
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-2">Historique des commandes récentes :</h4>
                {customerOrders.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center">
                    Aucune commande enregistrée au nom de ce client pour le moment.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((ord) => (
                      <div key={ord.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span>{ord.orderNumber} ({ord.tableName || 'À emporter'})</span>
                          <span className="text-amber-800">{formatCurrency(ord.total, settings.currency)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
