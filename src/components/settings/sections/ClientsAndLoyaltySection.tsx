import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Users, Award, Save, CheckCircle2 } from 'lucide-react';

interface Props {
  subTab: 'clients' | 'fidelite';
}

export const ClientsAndLoyaltySection: React.FC<Props> = ({ subTab }) => {
  const { addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [clientOptions, setClientOptions] = useState<Record<string, boolean>>({
    clients_crm: true,
    clients_card: true,
    clients_history: true,
    clients_credit: true,
    clients_credit_limit: true,
    clients_loyalty: true,
    clients_points: true,
    clients_coupons: true,
    clients_gift_cards: true,
    clients_birthdays: true,
    clients_notifications: true,
  });

  const [loyaltyOptions, setLoyaltyOptions] = useState<Record<string, boolean>>({
    loyalty_active: true,
    loyalty_points_accrual: true,
    loyalty_tiers: true,
    loyalty_rewards: true,
    loyalty_coupons: true,
    loyalty_promotions: true,
    loyalty_gift_cards: true,
    loyalty_referral: true,
  });

  const toggleOption = (key: string, isClients: boolean) => {
    if (isClients) {
      setClientOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      setLoyaltyOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    addAuditLog('Mise à jour options', 'Paramètres', `Paramètres ${subTab.toUpperCase()} enregistrés`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isClients = subTab === 'clients';
  const Icon = isClients ? Users : Award;
  const title = isClients
    ? 'Configuration Clients, Fiches & Crédits'
    : 'Configuration Programme de Fidélité & Récompenses';
  const description = isClients
    ? 'CRM restaurant, plafonds de créance et historique de consommation (Section 13)'
    : 'Paliers VIP, barème de points, remises et cartes cadeaux (Section 14)';

  const items = isClients
    ? [
        { key: 'clients_crm', label: 'CRM & Base de données clients' },
        { key: 'clients_card', label: 'Fiche client détaillée (NIU, coordonnées)' },
        { key: 'clients_history', label: 'Historique des achats et plats favoris' },
        { key: 'clients_credit', label: 'Autorisation de vente à crédit client' },
        { key: 'clients_credit_limit', label: 'Plafond strict de crédit par compte' },
        { key: 'clients_loyalty', label: 'Liaison compte fidélité' },
        { key: 'clients_points', label: 'Cumul de points fidélité' },
        { key: 'clients_coupons', label: 'Acceptation des coupons clients' },
        { key: 'clients_gift_cards', label: 'Cartes cadeaux prépayées' },
        { key: 'clients_birthdays', label: 'Alertes anniversaires clients' },
        { key: 'clients_notifications', label: 'Notifications SMS de remerciement' },
      ]
    : [
        { key: 'loyalty_active', label: 'Programme fidélité actif' },
        { key: 'loyalty_points_accrual', label: 'Attribution automatique des points (ex: 10 pts / 1 000 FCFA)' },
        { key: 'loyalty_tiers', label: 'Niveaux clients (Bronze, Silver, Gold, Platinum)' },
        { key: 'loyalty_rewards', label: 'Catalogue de récompenses (Plats ou boissons offerts)' },
        { key: 'loyalty_coupons', label: 'Coupons de réduction ponctuelle' },
        { key: 'loyalty_promotions', label: 'Promotions automatiques heures creuses' },
        { key: 'loyalty_gift_cards', label: 'Cartes cadeaux rechargeables' },
        { key: 'loyalty_referral', label: 'Programme de parrainage client' },
      ];

  const currentOptions = isClients ? clientOptions : loyaltyOptions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" /> Enregistré
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {items.map((item) => {
          const checked = currentOptions[item.key] ?? false;

          return (
            <label
              key={item.key}
              onClick={() => toggleOption(item.key, isClients)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? 'border-amber-400/80 bg-amber-50/30'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {}}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <span className={`font-semibold ${checked ? 'text-slate-950 font-bold' : 'text-slate-700'}`}>
                {item.label}
              </span>
            </label>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          {items.filter((i) => currentOptions[i.key]).length} sur {items.length} options activées
        </span>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer les paramètres</span>
        </button>
      </div>
    </div>
  );
};
