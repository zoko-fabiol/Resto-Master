export type TenantStatus =
  | 'inscription_en_attente'
  | 'onboarding'
  | 'essai'
  | 'actif'
  | 'impaye'
  | 'suspendu'
  | 'resilie'
  | 'archive';

export type TenantSuspensionMode = 'read_only' | 'full_block';

export interface TenantLimits {
  maxOutlets: number;
  maxUsers: number;
  maxTerminals: number;
  maxOrdersPerMonth: number;
}

export interface TenantCompanyInfo {
  name: string;
  legalName: string;
  legalForm?: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
  taxId?: string; // NIU (Numéro d'Identifiant Unique)
  rccm?: string;  // Registre du Commerce et du Crédit Mobilier
  taxCenter?: string;
  headquartersAddress: string;
  city: string;
  country: string;
  phone: string;
  email: string;
}

export interface TenantOwnerInfo {
  uid: string;
  name: string;
  email: string;
  phone?: string;
}

export interface TenantFeatureEntitlement {
  status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ';
  source: 'plan' | 'override' | 'profil';
  expiresAt?: string;
  activatedBy: string;
  activatedAt: string;
  reason?: string;
}

export interface TenantEntitlements {
  orgId: string;
  features: Record<string, TenantFeatureEntitlement>;
  modules: Record<string, boolean>; // e.g. mod_pos, mod_cuisine, mod_stock, etc.
  operationRules: Record<string, boolean>;
  lockedConfigKeys: string[];
  effectiveLimits: TenantLimits;
  updatedAt: string;
  updatedBy: string;
}

export interface Tenant {
  id: string; // orgId
  status: TenantStatus;
  suspensionMode?: TenantSuspensionMode;
  suspensionReason?: string;
  planId: string;
  trialEndsAt?: string;
  company: TenantCompanyInfo;
  owner: TenantOwnerInfo;
  creationSource: 'inscription_libre' | 'cree_par_admin';
  channel: 'stable' | 'beta';
  labels?: string[];
  internalNotes?: string;
  healthScore?: number;
  lastActiveAt?: string;
  limits: TenantLimits;
  currency: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
  createdAt: string;
  updatedAt: string;
}
