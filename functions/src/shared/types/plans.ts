import { TenantLimits } from './tenant.js';

export interface Plan {
  id: string;
  name: string;
  code: 'starter' | 'pro' | 'enterprise' | 'custom';
  description: string;
  priceFcfaMonthly: number;
  priceFcfaYearly: number;
  trialDays: number;
  limits: TenantLimits;
  includedModules: string[];
  includedFeatures: string[];
  isPublic: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PLANS: Plan[] = [
  {
    id: 'plan_starter',
    name: 'Starter (Essentiel)',
    code: 'starter',
    description: 'Idéal pour petits snacks, fast-foods, bars mono-caisse et vente à emporter.',
    priceFcfaMonthly: 25000,
    priceFcfaYearly: 255000,
    trialDays: 14,
    limits: {
      maxOutlets: 1,
      maxUsers: 3,
      maxTerminals: 1,
      maxOrdersPerMonth: 1500,
    },
    includedModules: [
      'mod_dashboard',
      'mod_pos',
      'mod_menu',
      'mod_caisse',
      'mod_documents',
      'mod_reports',
    ],
    includedFeatures: ['pos_core', 'cash_register_z'],
    isPublic: true,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_pro',
    name: 'Pro (Classique & Grill)',
    code: 'pro',
    description: 'Pour restaurants avec salle, tables, cuisine et plusieurs postes de commande.',
    priceFcfaMonthly: 50000,
    priceFcfaYearly: 510000,
    trialDays: 14,
    limits: {
      maxOutlets: 1,
      maxUsers: 10,
      maxTerminals: 4,
      maxOrdersPerMonth: 10000,
    },
    includedModules: [
      'mod_dashboard',
      'mod_pos',
      'mod_bar_pos',
      'mod_tables',
      'mod_cuisine',
      'mod_bar',
      'mod_menu',
      'mod_recipes_yield',
      'mod_caisse',
      'mod_stock',
      'mod_purchases',
      'mod_clients',
      'mod_staff',
      'mod_documents',
      'mod_reports',
      'mod_audit',
      'mod_settings',
    ],
    includedFeatures: [
      'pos_core',
      'tables_management',
      'kds_kitchen',
      'kds_bar',
      'recipes_bom_yield',
      'cash_register_z',
    ],
    isPublic: true,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'plan_enterprise',
    name: 'Entreprise (Multi-Sites)',
    code: 'enterprise',
    description: 'Pour complexes hôteliers, chaînes multi-établissements, lounges haut de gamme et traiteurs.',
    priceFcfaMonthly: 95000,
    priceFcfaYearly: 970000,
    trialDays: 14,
    limits: {
      maxOutlets: 10,
      maxUsers: 100,
      maxTerminals: 50,
      maxOrdersPerMonth: 100000,
    },
    includedModules: [
      'mod_dashboard',
      'mod_pos',
      'mod_bar_pos',
      'mod_tables',
      'mod_cuisine',
      'mod_bar',
      'mod_menu',
      'mod_recipes_yield',
      'mod_caisse',
      'mod_stock',
      'mod_purchases',
      'mod_hygiene',
      'mod_main_courante',
      'mod_fiscal',
      'mod_finance',
      'mod_clients',
      'mod_delivery',
      'mod_events',
      'mod_staff',
      'mod_documents',
      'mod_reports',
      'mod_audit',
      'mod_settings',
    ],
    includedFeatures: [
      'pos_core',
      'tables_management',
      'kds_kitchen',
      'kds_bar',
      'recipes_bom_yield',
      'cash_register_z',
      'cameroon_fiscal_framework',
      'events_banquets',
      'delivery_orders',
      'multi_outlets_hub',
    ],
    isPublic: true,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];
