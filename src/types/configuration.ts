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

export interface Terminal {
  id: string;
  outletId: string;
  name: string;
  type: 'caisse_fixe' | 'tablette_serveur' | 'kds_cuisine' | 'kds_bar' | 'borne_client';
  ipAddress?: string;
  assignedZone?: string;
  assignedRole?: UserRole;
  active: boolean;
  allowedFeatures: string[];
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

export interface Peripheral {
  id: string;
  name: string;
  type:
    | 'imprimante_ticket'
    | 'imprimante_cuisine'
    | 'imprimante_bar'
    | 'tiroir_caisse'
    | 'ecran_client'
    | 'scanner_code_barres';
  connectionType: 'usb' | 'reseau_ip' | 'bluetooth';
  address: string;
  port?: number;
  terminalId?: string;
  outletId: string;
  active: boolean;
  paperWidth?: '58mm' | '80mm';
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
  | 'bar_lounge'
  | 'fast_food'
  | 'hotel_restaurant'
  | 'restaurant_livraison'
  | 'evenementiel_traiteur';
