export type FeatureCategory =
  | 'vente_service'
  | 'production'
  | 'stock_achats'
  | 'gestion_finance'
  | 'hygiene_evenements'
  | 'systeme_securite';

export type FeatureRiskLevel = 'faible' | 'moyen' | 'eleve' | 'critique';

export interface FeatureDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  moduleKey: string;
  riskLevel: FeatureRiskLevel;
  defaultEnabled: boolean;
  dependencies?: string[];
}

export const FEATURE_CATALOG: FeatureDefinition[] = [
  // 1. Vente & Service
  {
    id: 'pos_core',
    key: 'pos_core',
    name: 'Vente Directe POS',
    description: 'Interface de caisse enregistreuse et prise de commande rapide au comptoir.',
    category: 'vente_service',
    moduleKey: 'mod_pos',
    riskLevel: 'faible',
    defaultEnabled: true,
  },
  {
    id: 'tables_management',
    key: 'tables_management',
    name: 'Plan de Salle & Gestion de Tables',
    description: 'Organisation visuelle des tables, suivi des couverts et des additions ouvertes.',
    category: 'vente_service',
    moduleKey: 'mod_tables',
    riskLevel: 'faible',
    defaultEnabled: true,
    dependencies: ['pos_core'],
  },
  {
    id: 'bar_pos_exclusive',
    key: 'bar_pos_exclusive',
    name: 'Caisse Dédiée Bar',
    description: 'Écran de vente optimisé pour les boissons et le service au comptoir.',
    category: 'vente_service',
    moduleKey: 'mod_bar_pos',
    riskLevel: 'faible',
    defaultEnabled: false,
  },
  {
    id: 'cash_register_z',
    key: 'cash_register_z',
    name: 'Sessions de Caisse & Ticket Z',
    description: 'Ouverture, fermeture, mouvements de coffre et impression certifiée du Z journalier.',
    category: 'vente_service',
    moduleKey: 'mod_caisse',
    riskLevel: 'critique',
    defaultEnabled: true,
  },
  {
    id: 'delivery_orders',
    key: 'delivery_orders',
    name: 'Gestion des Livraisons',
    description: 'Assignation de livreurs, suivi des courses et paiement à la livraison.',
    category: 'vente_service',
    moduleKey: 'mod_delivery',
    riskLevel: 'moyen',
    defaultEnabled: false,
  },
  {
    id: 'takeaway_orders',
    key: 'takeaway_orders',
    name: 'Commandes à Emporter',
    description: 'File d’attente spécifique pour la vente à emporter avec bipeurs ou SMS.',
    category: 'vente_service',
    moduleKey: 'mod_pos',
    riskLevel: 'faible',
    defaultEnabled: true,
  },
  {
    id: 'table_reservations',
    key: 'table_reservations',
    name: 'Réservations de Tables',
    description: 'Planning des réservations clients avec confirmation et affectation de table.',
    category: 'vente_service',
    moduleKey: 'mod_tables',
    riskLevel: 'faible',
    defaultEnabled: true,
    dependencies: ['tables_management'],
  },

  // 2. Production
  {
    id: 'kds_kitchen',
    key: 'kds_kitchen',
    name: 'KDS Cuisine (Kitchen Display System)',
    description: 'Affichage numérique des bons de commande en temps réel en cuisine.',
    category: 'production',
    moduleKey: 'mod_cuisine',
    riskLevel: 'faible',
    defaultEnabled: true,
  },
  {
    id: 'kds_bar',
    key: 'kds_bar',
    name: 'KDS Bar (Bar Display System)',
    description: 'Affichage des commandes de boissons et cocktails au comptoir bar.',
    category: 'production',
    moduleKey: 'mod_bar',
    riskLevel: 'faible',
    defaultEnabled: false,
  },
  {
    id: 'recipes_bom_yield',
    key: 'recipes_bom_yield',
    name: 'Fiches Techniques & Rendements',
    description: 'Décomposition des recettes en ingrédients pour calcul des coûts de revient.',
    category: 'production',
    moduleKey: 'mod_recipes_yield',
    riskLevel: 'eleve',
    defaultEnabled: true,
  },
  {
    id: 'kds_audio_chimes',
    key: 'kds_audio_chimes',
    name: 'Alertes Sonores KDS',
    description: 'Signaux sonores lors de la réception d’une nouvelle commande en cuisine/bar.',
    category: 'production',
    moduleKey: 'mod_cuisine',
    riskLevel: 'faible',
    defaultEnabled: true,
  },

  // 3. Stock & Achats
  {
    id: 'stock_lots_fefo',
    key: 'stock_lots_fefo',
    name: 'Traçabilité des Lots (FEFO / FIFO)',
    description: 'Gestion des dates limites de consommation (DLC) et alertes péremption.',
    category: 'stock_achats',
    moduleKey: 'mod_stock',
    riskLevel: 'eleve',
    defaultEnabled: true,
  },
  {
    id: 'purchases_suppliers',
    key: 'purchases_suppliers',
    name: 'Achats & Commandes Fournisseurs',
    description: 'Création de bons de commande, réception de marchandises et factures d’achat.',
    category: 'stock_achats',
    moduleKey: 'mod_purchases',
    riskLevel: 'eleve',
    defaultEnabled: true,
  },

  // 4. Gestion & Finance
  {
    id: 'cameroon_fiscal_framework',
    key: 'cameroon_fiscal_framework',
    name: 'Conformité Fiscale DGI & Facturation Normalisée',
    description: 'Mentions légales Cameroun (CGI 2026), calcul TVA 19.25%, précompte et QR Code DGI.',
    category: 'gestion_finance',
    moduleKey: 'mod_fiscal',
    riskLevel: 'critique',
    defaultEnabled: false,
  },
  {
    id: 'hotelpro_maincourante',
    key: 'hotelpro_maincourante',
    name: 'Main Courante Hôtelière',
    description: 'Journal des recettes journalières ventilé par point de vente et transfert chambre.',
    category: 'gestion_finance',
    moduleKey: 'mod_main_courante',
    riskLevel: 'eleve',
    defaultEnabled: false,
  },
  {
    id: 'clients_crm',
    key: 'clients_crm',
    name: 'Fichier Clients & Crédits',
    description: 'Suivi de l’historique des clients, encours de crédit et gestion des arriérés.',
    category: 'gestion_finance',
    moduleKey: 'mod_clients',
    riskLevel: 'moyen',
    defaultEnabled: true,
  },
  {
    id: 'loyalty_program',
    key: 'loyalty_program',
    name: 'Programme de Fidélité & Points',
    description: 'Attribution de points et réductions automatiques selon les consommations.',
    category: 'gestion_finance',
    moduleKey: 'mod_clients',
    riskLevel: 'faible',
    defaultEnabled: false,
    dependencies: ['clients_crm'],
  },
  {
    id: 'staff_planning',
    key: 'staff_planning',
    name: 'Gestion du Personnel & Pointage',
    description: 'Horaires de service, pointage des présences et suivi des pourboires.',
    category: 'gestion_finance',
    moduleKey: 'mod_staff',
    riskLevel: 'moyen',
    defaultEnabled: true,
  },
  {
    id: 'documents_scanner_ged',
    key: 'documents_scanner_ged',
    name: 'GED & Numérisation de Documents',
    description: 'Archivage des factures fournisseurs, contrats et justificatifs scannés.',
    category: 'gestion_finance',
    moduleKey: 'mod_documents',
    riskLevel: 'faible',
    defaultEnabled: true,
  },

  // 5. Hygiène & Événements
  {
    id: 'haccp_hygiene',
    key: 'haccp_hygiene',
    name: 'Module Hygiène & Contrôles HACCP',
    description: 'Relevés de température des chambres froides et fiches de nettoyage.',
    category: 'hygiene_evenements',
    moduleKey: 'mod_hygiene',
    riskLevel: 'moyen',
    defaultEnabled: false,
  },
  {
    id: 'events_banquets',
    key: 'events_banquets',
    name: 'Événements & Banquets',
    description: 'Gestion des devis traiteur, privatisations de salle et acomptes.',
    category: 'hygiene_evenements',
    moduleKey: 'mod_events',
    riskLevel: 'moyen',
    defaultEnabled: false,
  },

  // 6. Système & Sécurité
  {
    id: 'audit_trail_immutable',
    key: 'audit_trail_immutable',
    name: 'Piste d’Audit Immuable',
    description: 'Journalisation inviolable de toutes les actions sensibles des utilisateurs.',
    category: 'systeme_securite',
    moduleKey: 'mod_audit',
    riskLevel: 'critique',
    defaultEnabled: true,
  },
  {
    id: 'offline_sync_engine',
    key: 'offline_sync_engine',
    name: 'Synchronisation Hors-Ligne',
    description: 'Continuité opérationnelle en cas de coupure Internet avec réconciliation différée.',
    category: 'systeme_securite',
    moduleKey: 'mod_settings',
    riskLevel: 'critique',
    defaultEnabled: true,
  },
  {
    id: 'printers_hardware',
    key: 'printers_hardware',
    name: 'Gestion Imprimantes Thermiques & ESC/POS',
    description: 'Routage des impressions vers les imprimantes tickets de caisse et de cuisine.',
    category: 'systeme_securite',
    moduleKey: 'mod_settings',
    riskLevel: 'faible',
    defaultEnabled: true,
  },
];
