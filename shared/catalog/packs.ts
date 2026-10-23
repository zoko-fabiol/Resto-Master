/**
 * RestoMaster OS — Catalogue officiel des Packs, Options et Types de Restaurant
 * Source unique de vérité pour la tarification, les quotas et les modules.
 */

import { TenantLimits } from '../types/tenant';

export type PackId = 'minimum' | 'medium' | 'premium';

export type BillingCycle = 'mensuel' | 'annuel' | 'a_vie';

export type RestaurantTypeId =
  | 'snack_takeaway'
  | 'fast_food'
  | 'restaurant_classique'
  | 'maquis_bar_restaurant'
  | 'bar_lounge'
  | 'boulangerie_cafe'
  | 'traiteur_banquets'
  | 'hotel_restaurant';

export interface PackDefinition {
  id: PackId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  priceMonthly: number; // En FCFA HT
  limits: TenantLimits;
  isPopular?: boolean;
}

export interface AddonDefinition {
  id: string;
  key: string;
  name: string;
  category: 'production' | 'service' | 'gestion' | 'finance' | 'hygiene';
  description: string;
  priceMonthly: number; // En FCFA HT
  moduleKey?: string;
  featureKey?: string;
  dependencies?: string[];
  applicableTypes?: RestaurantTypeId[]; // Si non spécifié, tous les types
}

export interface CapacityPricing {
  extraTerminalMonthly: number;     // 3 000 FCFA
  extraUserMonthly: number;         // 1 000 FCFA
  extraOrdersBlockMonthly: number;  // 3 000 FCFA pour 5 000 commandes
  ordersBlockSize: number;          // 5 000 commandes
  extraOutletPercentOfPack: number; // 60% (0.60) du pack mensuel
}

export interface RestaurantTypeDefinition {
  id: RestaurantTypeId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  iconName: string;
  // Modules socles communs inclus dans tous les packs
  coreModules: string[];
  // Modules additionnels inclus selon le pack pour ce type
  tierModules: {
    minimum: string[];
    medium: string[];
    premium: string[];
  };
  recommendedPack: PackId;
}

export interface CatalogSettings {
  annualMultiplier: number;        // 10 x le mensuel (2 mois offerts)
  lifetimeMultiplier: number;      // 25 x le mensuel
  lifetimeMaintenanceMultiplier: number; // 2.4 x le mensuel (maintenance annuelle)
  taxMode: 'HT' | 'TTC';
  tvaRate: number;                 // 0.1925 (19.25%)
  roundStep: number;               // 500 FCFA
  graceDays: number;               // 7 jours
  readOnlyDays: number;            // 30 jours
}

// ---------------------------------------------------------------------------
// 1. Réglages par défaut du catalogue
// ---------------------------------------------------------------------------

export const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
  annualMultiplier: 10,
  lifetimeMultiplier: 25,
  lifetimeMaintenanceMultiplier: 2.4,
  taxMode: 'HT',
  tvaRate: 0.1925,
  roundStep: 500,
  graceDays: 7,
  readOnlyDays: 30,
};

// ---------------------------------------------------------------------------
// 2. Packs Officiels RestoMaster OS
// ---------------------------------------------------------------------------

export const CATALOG_PACKS: Record<PackId, PackDefinition> = {
  minimum: {
    id: 'minimum',
    name: 'Minimum',
    badge: 'Essentiel',
    tagline: 'Pour démarrer immédiatement avec l’essentiel opérationnel.',
    description: 'Mono-poste de vente, gestion des encaissements et rapports essentiels.',
    priceMonthly: 25000,
    limits: {
      maxOutlets: 1,
      maxUsers: 3,
      maxTerminals: 1,
      maxOrdersPerMonth: 1500,
    },
  },
  medium: {
    id: 'medium',
    name: 'Médium',
    badge: 'Recommandé',
    tagline: 'L’équilibre parfait pour les établissements en pleine activité.',
    description: 'Multi-postes, gestion complète des stocks, fiches techniques et écrans KDS.',
    priceMonthly: 35000,
    isPopular: true,
    limits: {
      maxOutlets: 1,
      maxUsers: 8,
      maxTerminals: 3,
      maxOrdersPerMonth: 6000,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    badge: 'Intégral',
    tagline: 'La puissance totale sans compromis pour les leaders de la restauration.',
    description: 'Tous les modules inclus, conformité fiscale DGI, RH, finances et volume élevé.',
    priceMonthly: 50000,
    limits: {
      maxOutlets: 1,
      maxUsers: 20,
      maxTerminals: 8,
      maxOrdersPerMonth: 20000,
    },
  },
};

// ---------------------------------------------------------------------------
// 3. Tarification des Capacités Supplémentaires
// ---------------------------------------------------------------------------

export const CAPACITY_PRICING: CapacityPricing = {
  extraTerminalMonthly: 3000,
  extraUserMonthly: 1000,
  extraOrdersBlockMonthly: 3000,
  ordersBlockSize: 5000,
  extraOutletPercentOfPack: 0.6,
};

// ---------------------------------------------------------------------------
// 4. Options à la Carte (Addons)
// ---------------------------------------------------------------------------

export const CATALOG_ADDONS: AddonDefinition[] = [
  // Tranche 1 500 FCFA
  {
    id: 'addon_tables',
    key: 'addon_tables',
    name: 'Plan de salle',
    category: 'service',
    description: 'Organisation visuelle des tables, plans interactifs et addition par table.',
    priceMonthly: 1500,
    moduleKey: 'mod_tables',
    featureKey: 'tables_management',
  },
  {
    id: 'addon_reservations',
    key: 'addon_reservations',
    name: 'Réservations',
    category: 'service',
    description: 'Cahier de réservations des tables avec confirmations et alertes d’arrivée.',
    priceMonthly: 1500,
    moduleKey: 'mod_tables',
    featureKey: 'table_reservations',
    dependencies: ['addon_tables'],
  },
  {
    id: 'addon_bar_pos',
    key: 'addon_bar_pos',
    name: 'Espace Bar',
    category: 'service',
    description: 'Interface de caisse dédiée bar et comptoir rapide pour boissons.',
    priceMonthly: 1500,
    moduleKey: 'mod_bar_pos',
    featureKey: 'bar_pos_exclusive',
  },
  {
    id: 'addon_kds_kitchen',
    key: 'addon_kds_kitchen',
    name: 'Cuisine KDS',
    category: 'production',
    description: 'Écran de production cuisine temps réel avec gestion des cuissons.',
    priceMonthly: 1500,
    moduleKey: 'mod_cuisine',
    featureKey: 'kds_kitchen',
  },
  {
    id: 'addon_kds_bar',
    key: 'addon_kds_bar',
    name: 'Bar KDS',
    category: 'production',
    description: 'Écran de production bar pour préparation fluide des boissons et cocktails.',
    priceMonthly: 1500,
    moduleKey: 'mod_bar',
    featureKey: 'kds_bar',
  },
  {
    id: 'addon_documents',
    key: 'addon_documents',
    name: 'Documents',
    category: 'gestion',
    description: 'Gestion Électronique des Documents (GED), factures scannées et contrats.',
    priceMonthly: 1500,
    moduleKey: 'mod_documents',
    featureKey: 'documents_scanner_ged',
  },
  {
    id: 'addon_loyalty',
    key: 'addon_loyalty',
    name: 'Fidélité',
    category: 'service',
    description: 'Programme de fidélité, cagnottes et remises personnalisées pour clients.',
    priceMonthly: 1500,
    moduleKey: 'mod_clients',
    featureKey: 'loyalty_program',
    dependencies: ['addon_clients'],
  },

  // Tranche 2 000 FCFA
  {
    id: 'addon_delivery',
    key: 'addon_delivery',
    name: 'Livraisons',
    category: 'service',
    description: 'Suivi des coursiers, commandes livrées et encaissement à la livraison.',
    priceMonthly: 2000,
    moduleKey: 'mod_delivery',
    featureKey: 'delivery_orders',
  },

  // Tranche 2 500 FCFA
  {
    id: 'addon_events',
    key: 'addon_events',
    name: 'Événements',
    category: 'service',
    description: 'Devis traiteur, privatisations de salle, banquets et suivi des acomptes.',
    priceMonthly: 2500,
    moduleKey: 'mod_events',
    featureKey: 'events_banquets',
  },
  {
    id: 'addon_clients',
    key: 'addon_clients',
    name: 'Clients',
    category: 'gestion',
    description: 'Fichier client complet, carnet d’adresses et historique des consommations.',
    priceMonthly: 2500,
    moduleKey: 'mod_clients',
    featureKey: 'clients_crm',
  },
  {
    id: 'addon_staff',
    key: 'addon_staff',
    name: 'Personnel',
    category: 'gestion',
    description: 'Gestion des équipes, plannings, pointage et suivi des pourboires.',
    priceMonthly: 2500,
    moduleKey: 'mod_staff',
    featureKey: 'staff_planning',
  },
  {
    id: 'addon_haccp',
    key: 'addon_haccp',
    name: 'HACCP',
    category: 'hygiene',
    description: 'Relevés de températures chambres froides et plans de nettoyage certifiés.',
    priceMonthly: 2500,
    moduleKey: 'mod_hygiene',
    featureKey: 'haccp_hygiene',
  },

  // Tranche 3 000 FCFA
  {
    id: 'addon_finances',
    key: 'addon_finances',
    name: 'Finances',
    category: 'finance',
    description: 'Comptabilité simplifiée, trésorerie, comptes de charges et résultats.',
    priceMonthly: 3000,
    moduleKey: 'mod_finance',
  },

  // Tranche 3 500 FCFA
  {
    id: 'addon_stocks',
    key: 'addon_stocks',
    name: 'Stocks',
    category: 'production',
    description: 'Gestion multi-magasins, seuils d’alerte, inventaires et traçabilité FEFO.',
    priceMonthly: 3500,
    moduleKey: 'mod_stock',
    featureKey: 'stock_lots_fefo',
  },
  {
    id: 'addon_purchases',
    key: 'addon_purchases',
    name: 'Achats',
    category: 'gestion',
    description: 'Bons de commande fournisseurs, réceptions de marchandises et factures.',
    priceMonthly: 3500,
    moduleKey: 'mod_purchases',
    featureKey: 'purchases_suppliers',
  },
  {
    id: 'addon_recipes',
    key: 'addon_recipes',
    name: 'Fiches techniques',
    category: 'production',
    description: 'Fiches techniques recettes, déstockage automatique des ingrédients et calculs de marges.',
    priceMonthly: 3500,
    moduleKey: 'mod_recipes_yield',
    featureKey: 'recipes_bom_yield',
  },
  {
    id: 'addon_main_courante',
    key: 'addon_main_courante',
    name: 'Main courante',
    category: 'finance',
    description: 'Journal de recettes ventilé par point de vente et transferts hôtel/chambre.',
    priceMonthly: 3500,
    moduleKey: 'mod_main_courante',
    featureKey: 'hotelpro_maincourante',
  },

  // Tranche 5 000 FCFA
  {
    id: 'addon_fiscal',
    key: 'addon_fiscal',
    name: 'Centre fiscal',
    category: 'finance',
    description: 'Conformité fiscale DGI Cameroun 2026, TVA 19.25%, QR-Code certifié et états fiscaux.',
    priceMonthly: 5000,
    moduleKey: 'mod_fiscal',
    featureKey: 'cameroon_fiscal_framework',
  },
];

// ---------------------------------------------------------------------------
// 5. Types d'Établissements (8 Profils Métier)
// ---------------------------------------------------------------------------

export const CORE_MODULES: string[] = [
  'mod_dashboard',
  'mod_pos',
  'mod_caisse',
  'mod_menu',
  'mod_reports',
  'mod_settings',
  'mod_audit',
];

export const RESTAURANT_TYPES: Record<RestaurantTypeId, RestaurantTypeDefinition> = {
  snack_takeaway: {
    id: 'snack_takeaway',
    name: 'Snack & Vente à Emporter',
    badge: 'Snack',
    tagline: 'Service ultra-rapide au comptoir et commandes à emporter.',
    description: 'Idéal pour sandwicheries, glaciers, kiosques et concepts mono-poste.',
    iconName: 'Coffee',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents'],
      medium: ['mod_documents', 'mod_cuisine', 'mod_delivery'],
      premium: [
        'mod_documents',
        'mod_cuisine',
        'mod_delivery',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
        'mod_clients',
      ],
    },
    recommendedPack: 'minimum',
  },

  fast_food: {
    id: 'fast_food',
    name: 'Fast-Food & Burger',
    badge: 'Fast-Food',
    tagline: 'Gros volumes de commandes, KDS cuisine et chaîne de préparation cadencée.',
    description: 'Conçu pour restaurants à fort débit, KDS réactif et livraison.',
    iconName: 'UtensilsCrossed',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_cuisine'],
      medium: [
        'mod_documents',
        'mod_cuisine',
        'mod_delivery',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
      ],
      premium: [
        'mod_documents',
        'mod_cuisine',
        'mod_delivery',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
        'mod_hygiene',
        'mod_clients',
        'mod_finance',
      ],
    },
    recommendedPack: 'medium',
  },

  restaurant_classique: {
    id: 'restaurant_classique',
    name: 'Restaurant Classique & Grill',
    badge: 'Classique',
    tagline: 'Service à table complet avec plan de salle interactif et réservations.',
    description: 'Le standard de la gastronomie et bistronomie avec gestion de rangs.',
    iconName: 'Utensils',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_tables', 'mod_cuisine'],
      medium: [
        'mod_documents',
        'mod_tables',
        'mod_cuisine',
        'mod_bar_pos',
        'mod_bar',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
      ],
      premium: [
        'mod_documents',
        'mod_tables',
        'mod_cuisine',
        'mod_bar_pos',
        'mod_bar',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
        'mod_hygiene',
        'mod_clients',
        'mod_finance',
        'mod_fiscal',
      ],
    },
    recommendedPack: 'medium',
  },

  maquis_bar_restaurant: {
    id: 'maquis_bar_restaurant',
    name: 'Maquis & Bar-Restaurant',
    badge: 'Maquis',
    tagline: 'Bières fraîches, grillades, ambiance vivante et double pôle bar / braise.',
    description: 'Gestion équilibrée des boissons comptoir et des commandes de grillades.',
    iconName: 'Flame',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_bar_pos', 'mod_cuisine'],
      medium: [
        'mod_documents',
        'mod_bar_pos',
        'mod_cuisine',
        'mod_bar',
        'mod_tables',
        'mod_stock',
        'mod_purchases',
      ],
      premium: [
        'mod_documents',
        'mod_bar_pos',
        'mod_cuisine',
        'mod_bar',
        'mod_tables',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
        'mod_clients',
        'mod_finance',
      ],
    },
    recommendedPack: 'medium',
  },

  bar_lounge: {
    id: 'bar_lounge',
    name: 'Bar, Lounge & Night-Club',
    badge: 'Lounge',
    tagline: 'Vente rapide au bar, contrôle précis des bouteilles, salons VIP et musique.',
    description: 'Spécialisé pour débits de boissons, bars à vins, salons chicha et clubs.',
    iconName: 'Wine',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_bar_pos', 'mod_bar'],
      medium: [
        'mod_documents',
        'mod_bar_pos',
        'mod_bar',
        'mod_tables',
        'mod_stock',
        'mod_purchases',
      ],
      premium: [
        'mod_documents',
        'mod_bar_pos',
        'mod_bar',
        'mod_tables',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_events',
        'mod_clients',
        'mod_staff',
        'mod_finance',
      ],
    },
    recommendedPack: 'medium',
  },

  boulangerie_cafe: {
    id: 'boulangerie_cafe',
    name: 'Boulangerie, Pâtisserie & Salon de thé',
    badge: 'Boulangerie',
    tagline: 'Vente à la pièce, formules petits déjeuners et fiches recettes farine/beurre.',
    description: 'Gestion des fabrications du matin, périssables et vente comptoir.',
    iconName: 'Croissant',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents'],
      medium: [
        'mod_documents',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
      ],
      premium: [
        'mod_documents',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_staff',
        'mod_delivery',
        'mod_clients',
        'mod_finance',
        'mod_hygiene',
      ],
    },
    recommendedPack: 'medium',
  },

  traiteur_banquets: {
    id: 'traiteur_banquets',
    name: 'Traiteur & Événementiel',
    badge: 'Traiteur',
    tagline: 'Banquets, mariages, devis traiteur personnalisés et gestion logistique.',
    description: 'Événements extérieurs, gestion des acomptes et volumes traiteur.',
    iconName: 'PartyPopper',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_events', 'mod_clients'],
      medium: [
        'mod_documents',
        'mod_events',
        'mod_clients',
        'mod_recipes_yield',
        'mod_stock',
        'mod_purchases',
        'mod_delivery',
      ],
      premium: [
        'mod_documents',
        'mod_events',
        'mod_clients',
        'mod_recipes_yield',
        'mod_stock',
        'mod_purchases',
        'mod_delivery',
        'mod_staff',
        'mod_hygiene',
        'mod_finance',
        'mod_fiscal',
      ],
    },
    recommendedPack: 'premium',
  },

  hotel_restaurant: {
    id: 'hotel_restaurant',
    name: 'Hôtel & Complexe Touristique',
    badge: 'Hôtel',
    tagline: 'Multi-points de vente, main courante hôtelière et conformité fiscale.',
    description: 'Pour resorts et hôtels intégrant restaurants, bars piscine et room-service.',
    iconName: 'Building2',
    coreModules: CORE_MODULES,
    tierModules: {
      minimum: ['mod_documents', 'mod_tables', 'mod_bar_pos', 'mod_cuisine'],
      medium: [
        'mod_documents',
        'mod_tables',
        'mod_bar_pos',
        'mod_bar',
        'mod_cuisine',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_main_courante',
      ],
      premium: [
        'mod_documents',
        'mod_tables',
        'mod_bar_pos',
        'mod_bar',
        'mod_cuisine',
        'mod_stock',
        'mod_purchases',
        'mod_recipes_yield',
        'mod_main_courante',
        'mod_events',
        'mod_clients',
        'mod_staff',
        'mod_hygiene',
        'mod_finance',
        'mod_fiscal',
        'mod_delivery',
      ],
    },
    recommendedPack: 'premium',
  },
};
