export type TenantStatus =
  | 'demande'
  | 'inscription_en_attente'
  | 'installation'
  | 'paiement_en_attente'
  | 'paiement_a_verifier'
  | 'onboarding'
  | 'essai'
  | 'actif'
  | 'impaye'
  | 'suspendu'
  | 'resilie'
  | 'archive';

export type TenantSuspensionMode = 'read_only' | 'full_block';

export type SetupSessionStatus =
  | 'draft'
  | 'in_progress'
  | 'ready_for_handover'
  | 'completed'
  | 'blocked';

export interface SetupSession {
  id: string;
  status: SetupSessionStatus;
  currentStep: number;
  actorUid: string;
  actorEmail: string;
  orgId?: string;
  restaurantId?: string;
  codeDeliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitialSetupRequest {
  setupSessionId: string;
  companyName: string;
  legalName?: string;
  legalForm?: TenantCompanyInfo['legalForm'];
  taxId?: string;
  rccm?: string;
  taxCenter?: string;
  city: string;
  country?: string;
  address: string;
  phone: string;
  email: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  planId?: string;
  profileType?: string;
  channel?: 'stable' | 'beta';
  currency?: Tenant['currency'];
  reason: string;
  ticketNumber?: string;
}

export interface InitialSetupResult {
  success: true;
  orgId: string;
  restaurantId: string;
  ownerUid: string;
  passwordResetLink: string;
  restaurantCode?: string;
  codeAlreadyDelivered: boolean;
}

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
  pendingDeletionId?: string;
  planId: string;
  packId?: string;
  restaurantType?: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
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
  setupStatus?: SetupSessionStatus;
  setupCompletedAt?: string;
  setupCompletedBy?: string;
  restaurantCodeVersion?: number;
}

export interface PendingDeletion {
  id: string;
  orgId: string;
  companyName: string;
  requestedByUid: string;
  requestedByEmail: string;
  requestedAt: string;
  status: 'en_attente_approbation' | 'approuvee' | 'rejetee';
  purgeScheduledAt: string;
  reason: string;
  approvedByUid?: string;
  approvedByEmail?: string;
  approvedAt?: string;
  approvalReason?: string;
}
