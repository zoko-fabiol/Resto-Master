import { UserRole } from './restaurant';
export type { UserRole };

export type FeatureStatus = 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ';

export type FeatureCategory =
  | 'operations'
  | 'pos'
  | 'tables'
  | 'cuisine'
  | 'bar'
  | 'stock'
  | 'purchases'
  | 'clients'
  | 'fidelite'
  | 'livraison'
  | 'reservations'
  | 'evenements'
  | 'facturation'
  | 'fiscalite'
  | 'paiements'
  | 'mobile_money'
  | 'caisse'
  | 'rapports'
  | 'peripheriques'
  | 'securite'
  | 'offline';

export interface FeatureItem {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  version: string;
  dependencies?: string[];
  isCritical?: boolean;
  isRecommended?: boolean;
  isAdvanced?: boolean;
  isExperimental?: boolean;
  activatedAt?: string;
  activatedBy?: string;
  configuration: Record<string, any>;
}

export interface Outlet {
  id: string;
  organizationId: string;
  name: string;
  commercialName?: string;
  legalName?: string;
  legalForm?: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
  niu?: string;
  rccm?: string;
  taxCenter?: string;
  city: string;
  address: string;
  neighborhood?: string;
  postalBox?: string;
  phone: string;
  email?: string;
  timezone?: string;
  currency?: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
  operationalProfile?: ConfigurationProfileType;
  isMain: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Restaurant = Outlet;

export type TerminalType =
  | 'caisse_fixe'
  | 'tablette_serveur'
  | 'tablette_table'
  | 'kds_cuisine'
  | 'kds_bar'
  | 'borne_client'
  | 'ecran_retrait'
  | 'poste_dg';

export interface Terminal {
  id: string;
  outletId: string;
  name: string;
  type: TerminalType;
  ipAddress?: string;
  assignedZone?: string;
  assignedRole?: UserRole;
  assignedTableId?: string;
  kdsStation?: 'expo' | 'chaud' | 'froid' | 'bar';
  pairingCode?: string;
  pairingExpiresAt?: string;
  pairedAt?: string;
  isLocked?: boolean;
  active: boolean;
  allowedFeatures: string[];
}

export interface DeviceProfile {
  terminalId: string;
  terminalName: string;
  type: TerminalType;
  outletId: string;
  assignedRole?: UserRole;
  assignedTableId?: string;
  assignedZone?: string;
  kdsStation?: 'expo' | 'chaud' | 'froid' | 'bar';
  pairedAt: string;
  pairingCode: string;
}

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'validate'
  | 'cancel'
  | 'export';

export type PermissionModule =
  | 'pos'
  | 'tables'
  | 'caisse'
  | 'invoices'
  | 'stock'
  | 'purchases'
  | 'clients'
  | 'finance'
  | 'fiscal'
  | 'staff'
  | 'audit'
  | 'events'
  | 'delivery'
  | 'settings';

export type RolePermissionMatrix = Record<
  UserRole,
  Record<PermissionModule, Record<PermissionAction, boolean>>
>;

export interface RoleLimits {
  maxDiscountPercent: number;
  maxRefundAmount: number;
  maxExpenseAmount: number;
  requiresApprovalForDiscount: boolean;
  requiresApprovalForRefund: boolean;
  requiresApprovalForCancel: boolean;
  requiresApprovalForNegativePrice: boolean;
}

export interface PrinterSettings {
  autoPrintReceiptOnPayment: boolean;
  autoPrintKitchenOnOrder: boolean;
  autoOpenCashDrawerOnCash: boolean;
  receiptCopiesCount: number;
}

export interface Peripheral {
  id: string;
  name: string;
  model?: string;
  type:
    | 'imprimante_ticket'
    | 'imprimante_cuisine'
    | 'imprimante_bar'
    | 'tiroir_caisse'
    | 'ecran_client'
    | 'scanner_code_barres';
  role?: 'caisse' | 'cuisine' | 'bar' | 'polyvalente';
  connectionType: 'usb' | 'reseau_ip' | 'bluetooth' | 'systeme';
  address: string;
  port?: number;
  terminalId?: string;
  outletId: string;
  active: boolean;
  paperWidth?: '58mm' | '80mm';
  charactersPerLine?: 32 | 42 | 48;
  openDrawerOnCash?: boolean;
  cutPaper?: boolean;
  soundBuzzer?: boolean;
  isDefault?: boolean;
}

export interface ConfigurationHistoryItem {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: string;
  featureKey?: string;
  detail: string;
  oldValue?: string;
  newValue?: string;
}

export interface ConfigurationAlert {
  id: string;
  severity: 'warning' | 'error' | 'info';
  message: string;
  category: string;
  actionLink?: string;
  actionLabel?: string;
}

export type ConfigurationProfileType =
  | 'restaurant_classique'
  | 'depart_essentiel'
  | 'bar_lounge'
  | 'fast_food'
  | 'hotel_restaurant'
  | 'restaurant_livraison'
  | 'evenementiel_traiteur';

export type OperationRules = Record<string, boolean>;

export const DEFAULT_OPERATION_RULES: OperationRules = {
  // Modules Applicatifs (Visibilité & Activation Globale)
  mod_dashboard: true,
  mod_pos: true,
  mod_bar_pos: true,
  mod_tables: true,
  mod_cuisine: true,
  mod_bar: true,
  mod_menu: true,
  mod_recipes_yield: true,
  mod_caisse: true,
  mod_stock: true,
  mod_purchases: true,
  mod_hygiene: true,
  mod_main_courante: true,
  mod_fiscal: true,
  mod_finance: true,
  mod_clients: true,
  mod_delivery: true,
  mod_events: true,
  mod_staff: true,
  mod_documents: true,
  mod_reports: true,
  mod_audit: true,
  mod_settings: true,

  // POS (Section 7)
  pos_active: true,
  pos_use_tables: true,
  pos_quick_orders: true,
  pos_sale_without_table: true,
  pos_edit_order: true,
  pos_delete_line: true,
  pos_cancel_order: true,
  pos_require_cancel_reason: true,
  pos_allow_discount: true,
  pos_require_discount_approval: true,
  pos_custom_price: false,
  pos_zero_price: false,
  pos_item_comp: true,
  pos_split_bill: true,
  pos_partial_payment: true,
  pos_change_server: true,
  pos_table_transfer: true,
  pos_table_merge: true,
  pos_table_split: true,
  pos_show_ticket_number: true,
  pos_show_server: true,
  pos_show_order_time: true,

  // Tables (Section 8)
  tables_management: true,
  tables_floor_plan: true,
  tables_zones: true,
  tables_capacity: true,
  tables_reservations: true,
  tables_auto_status: true,
  tables_transfer: true,
  tables_merge: true,
  tables_division: true,
  tables_cleaning: true,
  tables_auto_server_assign: true,

  // Cuisine (Section 9)
  cuisine_kds: true,
  cuisine_auto_send: true,
  cuisine_priority: true,
  cuisine_prep_timer: true,
  cuisine_notify_ready: true,
  cuisine_notify_delay: true,
  cuisine_print_ticket: true,
  cuisine_screen: true,
  cuisine_prep_categories: true,
  cuisine_stations: true,

  // Bar (Section 10)
  bar_module: true,
  bar_screen: true,
  bar_print: true,
  bar_bottles: true,
  bar_glasses: true,
  bar_cocktails: true,
  bar_cocktail_recipes: true,
  bar_losses: true,
  bar_breakage: true,
  bar_consumption_control: true,

  // Caisse (Section 22)
  caisse_management: true,
  caisse_mandatory_open: true,
  caisse_float: true,
  caisse_expenses: true,
  caisse_withdrawals: true,
  caisse_transfers: true,
  caisse_mandatory_close: true,
  caisse_mandatory_count: true,
  caisse_variance_control: true,
  caisse_z_report: true,
  caisse_block_after_close: true,
  caisse_reopen_with_auth: true,

  // Livraison (Section 15)
  delivery_active: true,
  delivery_online_order: true,
  delivery_zones: true,
  delivery_fees: true,
  delivery_driver_assignment: true,
  delivery_tracking: true,
  delivery_proof: true,
  delivery_customer_notifications: true,
  delivery_web_orders: true,

  // Réservations (Section 16)
  res_management: true,
  res_online: true,
  res_waitlist: true,
  res_auto_confirm: true,
  res_reminders: true,
  res_deposit: true,
  res_noshow: true,
  res_availability: true,

  // Événements (Section 17)
  event_active: true,
  event_quotes: true,
  event_deposit: true,
  event_custom_menus: true,
  event_banquet: true,
  event_hall: true,
  event_planning: true,
  event_billing: true,

  // Stocks & Lots (Section 11)
  stock_gestion: true,
  stock_by_outlet: true,
  stock_by_location: true,
  stock_lots: true,
  stock_expiry_dates: true,
  stock_fifo: false,
  stock_fefo: true,
  stock_inventory: true,
  stock_disallow_negative: true,
  stock_low_alert: true,
  stock_expiry_alert: true,
  stock_transfers: true,
  stock_losses: true,
  stock_breakage: true,
  stock_adjustments: true,
  stock_production: true,
  stock_recipe_cost: true,

  // Achats & Fournisseurs (Section 12)
  achats_purchase_requests: true,
  achats_validation: true,
  achats_purchase_orders: true,
  achats_reception: true,
  achats_supplier_invoices: true,
  achats_supplier_returns: true,
  achats_supplier_comparison: true,
  achats_price_history: true,
  achats_approval: true,

  // Clients, Fiches & Crédits (Section 13)
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

  // Programme de Fidélité (Section 14)
  loyalty_active: true,
  loyalty_points_accrual: true,
  loyalty_tiers: true,
  loyalty_rewards: true,
  loyalty_coupons: true,
  loyalty_promotions: true,
  loyalty_gift_cards: true,
  loyalty_referral: true,

  // Facturation Officielle (Section 18)
  bill_active: true,
  bill_a5: true,
  bill_custom_templates: true,
  bill_auto_numbering: true,
  bill_numbering_by_outlet: true,
  bill_numbering_by_terminal: false,
  bill_amount_in_words: true,
  bill_discounts: true,
  bill_taxes_detail: true,
  bill_withholdings: true,
  bill_credit_notes: true,
  bill_cancellations: true,
  bill_refunds: true,
  bill_corporate: true,
  bill_events: true,
  bill_client_credit: true,

  // Moyens d'Encaissement & Paiement (Section 20)
  pay_especes: true,
  pay_cb: true,
  pay_mtn_momo: true,
  pay_orange_money: true,
  pay_virement: true,
  pay_cheque: true,
  pay_credit_client: true,
  pay_partiel: true,
  pay_multiple: true,

  // Notifications & Alertes Système (Section 26)
  notif_stock_critique: true,
  notif_peremption_lot: true,
  notif_ecart_caisse: true,
  notif_rappel_fiscal: true,
  notif_retard_cuisine: true,
  notif_rupture_bar: true,
};
