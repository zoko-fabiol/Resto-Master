import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import {
  Users,
  Award,
  Save,
  CheckCircle2,
  Contact,
  History,
  CreditCard,
  ShieldAlert,
  Coins,
  Ticket,
  Gift,
  Cake,
  MessageSquare,
  Crown,
  BadgePercent,
  Share2,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';

interface Props {
  subTab: 'clients' | 'fidelite';
}

export const ClientsAndLoyaltySection: React.FC<Props> = ({ subTab }) => {
  const { operationRules, updateOperationRules, addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [options, setOptions] = useState<Record<string, boolean>>(operationRules);

  useEffect(() => {
    setOptions(operationRules);
  }, [operationRules]);

  const toggleOption = (key: string) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [currentSubTab, setCurrentSubTab] = useState<'clients' | 'fidelite'>(subTab || 'clients');

  const handleSave = async () => {
    await updateOperationRules(options);
    setSavedSuccess(true);
    addAuditLog('Mise à jour options', 'Paramètres', `Paramètres ${currentSubTab.toUpperCase()} enregistrés`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isClients = currentSubTab === 'clients';
  const Icon = isClients ? Users : Award;
  const title = isClients
    ? 'Configuration Clients, Fiches & Crédits'
    : 'Configuration Programme de Fidélité & Récompenses';
  const description = isClients
    ? 'CRM restaurant, plafonds de créance et historique de consommation'
    : 'Paliers VIP, barème de points, remises et cartes cadeaux';

  const items = isClients
    ? [
        {
          key: 'clients_crm',
          label: 'CRM & Base de données clients',
          description: 'Centralisation des profils, préférences et coordonnées',
          icon: Users,
        },
        {
          key: 'clients_card',
          label: 'Fiche client détaillée (NIU)',
          description: 'Numéro d’Identifiant Unique (NIU) et raison sociale légale',
          icon: Contact,
          badge: 'CGI 2026',
        },
        {
          key: 'clients_history',
          label: 'Historique des achats et plats favoris',
          description: 'Consommations antérieures et plats préférés en salle',
          icon: History,
        },
        {
          key: 'clients_credit',
          label: 'Autorisation de vente à crédit client',
          description: 'Autorisation des ventes en compte société ou différé',
          icon: CreditCard,
        },
        {
          key: 'clients_credit_limit',
          label: 'Plafond strict de crédit par compte',
          description: 'Blocage automatique si dépassement du plafond convenu',
          icon: ShieldAlert,
          badge: 'Anti-Dépassement',
        },
        {
          key: 'clients_loyalty',
          label: 'Liaison compte fidélité',
          description: 'Rapprochement direct avec le solde de points fidélité',
          icon: Award,
        },
        {
          key: 'clients_points',
          label: 'Cumul de points fidélité',
          description: 'Crédit automatique des points lors de chaque encaissement',
          icon: Coins,
        },
        {
          key: 'clients_coupons',
          label: 'Acceptation des coupons clients',
          description: 'Validation des coupons promotionnels et réductions',
          icon: Ticket,
        },
        {
          key: 'clients_gift_cards',
          label: 'Cartes cadeaux prépayées',
          description: 'Cartes cadeaux rechargeables et solde d’avance',
          icon: Gift,
        },
        {
          key: 'clients_birthdays',
          label: 'Alertes anniversaires clients',
          description: 'Notification et geste commercial pour anniversaire client',
          icon: Cake,
        },
        {
          key: 'clients_notifications',
          label: 'Notifications SMS de remerciement',
          description: 'Envoi d’un message SMS/WhatsApp de fidélisation post-visite',
          icon: MessageSquare,
        },
      ]
    : [
        {
          key: 'loyalty_active',
          label: 'Programme fidélité actif',
          description: 'Activation globale du barème et des récompenses',
          icon: Award,
        },
        {
          key: 'loyalty_points_accrual',
          label: 'Attribution automatique des points',
          description: 'Crédit de 10 points par tranche de 1 000 FCFA dépensés',
          icon: Coins,
          badge: '10 pts / 1 000 F',
        },
        {
          key: 'loyalty_tiers',
          label: 'Niveaux clients (Bronze à Platinum)',
          description: 'Paliers VIP automatiques : Bronze, Silver, Gold et Platinum',
          icon: Crown,
          badge: 'Bronze à VIP',
        },
        {
          key: 'loyalty_rewards',
          label: 'Catalogue de récompenses',
          description: 'Échange de points contre boissons, desserts ou plats offerts',
          icon: Gift,
        },
        {
          key: 'loyalty_coupons',
          label: 'Coupons de réduction ponctuelle',
          description: 'Émission de codes promo à usage unique ou temporaires',
          icon: Ticket,
        },
        {
          key: 'loyalty_promotions',
          label: 'Promotions automatiques heures creuses',
          description: 'Remises tarifaires automatiques sur plages horaires définies',
          icon: BadgePercent,
        },
        {
          key: 'loyalty_gift_cards',
          label: 'Cartes cadeaux rechargeables',
          description: 'Gestion des cartes cadeaux rechargeables physiques ou digitales',
          icon: CreditCard,
        },
        {
          key: 'loyalty_referral',
          label: 'Programme de parrainage client',
          description: 'Attribution de points bonus pour parrainage de nouveaux convives',
          icon: Share2,
        },
      ];

  return (
    <div className="space-y-4">
      {/* Switcher CRM / Fidélité */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentSubTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSubTab === 'clients'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>Fiches Clients, CRM & Crédits</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentSubTab('fidelite')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSubTab === 'fidelite'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>Programme de Fidélité VIP & Points</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900">{title}</h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {isClients ? 'Section 13' : 'Section 14'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paramètres enregistrés
          </span>
        )}
      </div>

      {/* Modern Rule Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((item) => (
          <ModernRuleToggle
            key={item.key}
            id={item.key}
            label={item.label}
            description={item.description}
            badge={item.badge}
            icon={item.icon}
            checked={options[item.key] ?? false}
            onChange={() => toggleOption(item.key)}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          {items.filter((i) => options[i.key]).length} sur {items.length} options activées
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
  </div>
  );
};
