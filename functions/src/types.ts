export type UserRole =
  | 'superadmin'
  | 'direction'
  | 'manager'
  | 'serveur'
  | 'caisse'
  | 'cuisine'
  | 'bar'
  | 'stock'
  | 'rh'
  | 'finance'
  | 'comptable'
  | 'auditeur'
  | 'tablette'
  | 'aucun';

export type PlatformRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'support'
  | 'billing'
  | 'viewer';

export interface PlatformCustomClaims {
  platformRole: PlatformRole;
  active?: boolean;
}

export interface CallerPlatformContext {
  uid: string;
  email: string;
  platformRole: PlatformRole;
  name: string;
  active: boolean;
}

export interface UserCustomClaims {
  role: UserRole;
  outlets?: string[];
  organizationId?: string;
  active?: boolean;
}

export interface SupervisorTokenPayload {
  supervisorUid: string;
  supervisorName: string;
  supervisorRole: UserRole;
  action: string;
  entityId?: string;
  expiresAt: number;
}

export interface OrderItemIntent {
  productId: string;
  quantity: number;
  notes?: string;
  options?: Record<string, unknown>;
  destination?: 'cuisine' | 'bar';
}

export interface CreateOrderRequest {
  restaurantId?: string;
  type?: 'sur_place' | 'a_emporter' | 'livraison' | 'room_service';
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  guestCount?: number;
  items: OrderItemIntent[];
  notes?: string;
  isProforma?: boolean;
  companyBillingName?: string;
  companyBillingNiu?: string;
  discountPercentRequested?: number;
  supervisorToken?: string;
}

export interface AddItemsToOrderRequest {
  orderId: string;
  items: OrderItemIntent[];
  guestCount?: number;
}

export interface RecordPaymentRequest {
  orderId: string;
  amount: number;
  method: 'especes' | 'carte_bancaire' | 'orange_money' | 'mtn_momo' | 'virement' | 'cheque' | 'credit_client' | 'bon_repas';
  cashSessionId?: string;
  idempotencyKey: string;
  cashGiven?: number;
  notes?: string;
}

export interface CancelOrderRequest {
  orderId: string;
  reason: string;
  supervisorToken: string;
  actionAfterCancel?: 'restock' | 'waste';
}

export interface VoidItemRequest {
  orderId: string;
  itemIndex: number;
  reason: string;
  supervisorToken: string;
  actionAfterCancel?: 'restock' | 'waste';
}

export interface OpenCashSessionRequest {
  restaurantId: string;
  registerId: string;
  terminalId: string;
  initialFloat: number;
  notes?: string;
}

export interface CloseCashSessionRequest {
  sessionId: string;
  blindCountAmount: number;
  varianceJustification?: string;
  notes?: string;
}

export interface IssueInvoiceRequest {
  orderId: string;
  clientInfo?: {
    id?: string;
    name?: string;
    niu?: string;
    rccm?: string;
    address?: string;
    phone?: string;
    regime?: 'reel' | 'simplifie' | 'forfait' | 'non_assujetti';
    applyWithholding?: boolean;
  };
}

export interface AppendAuditLogRequest {
  action: string;
  module: string;
  details: string;
  entityId?: string;
  restaurantId?: string;
}

export interface SubmitSignupRequest {
  companyName: string;
  legalForm?: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  applicantName: string;
  desiredPlanId: string;
  estimatedTables?: number;
}

export interface ApproveSignupRequest {
  signupId: string;
  planId?: string;
  reason: string;
  profileType?: string;
}

export interface RejectSignupRequest {
  signupId: string;
  reason: string;
}

export interface CreateTenantRequest {
  companyName: string;
  legalName?: string;
  legalForm?: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
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
  planId: 'plan_starter' | 'plan_pro' | 'plan_enterprise';
  profileType?: string;
  channel?: 'stable' | 'beta';
  currency?: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
  reason: string;
  ticketNumber?: string;
}

export interface SetTenantStatusRequest {
  orgId: string;
  status: 'inscription_en_attente' | 'onboarding' | 'essai' | 'actif' | 'impaye' | 'suspendu' | 'resilie' | 'archive';
  suspensionMode?: 'read_only' | 'full_block';
  reason: string;
}

export interface UpdateTenantEntitlementsRequest {
  orgId: string;
  features?: Record<string, { status: 'ACTIVÉ' | 'SUSPENDU' | 'DÉSACTIVÉ'; reason?: string; expiresAt?: string }>;
  modules?: Record<string, boolean>;
  operationRules?: Record<string, boolean>;
  lockedConfigKeys?: string[];
  reason: string;
  ticketNumber?: string;
}

export interface ApplyProfileToTenantRequest {
  orgId: string;
  profileId: 'fast_food' | 'restaurant_classique' | 'bar_lounge' | 'hotel_complexe' | 'snack_takeaway';
  reason: string;
  ticketNumber?: string;
}

export interface RecordTenantPaymentRequest {
  orgId: string;
  amountFcfa: number;
  periodMonths: number;
  paymentMethod: 'especes' | 'virement_bancaire' | 'orange_money' | 'mtn_momo' | 'cheque';
  reference?: string;
  notes?: string;
}

export interface StartSupportSessionRequest {
  orgId: string;
  mode: 'read_only' | 'read_write';
  reason: string;
  durationMinutes?: number;
}

export interface CloseSupportSessionRequest {
  sessionId: string;
  summary?: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  message: string;
  type: 'info' | 'maintenance' | 'nouveaute' | 'urgent';
  targetPlanIds?: string[];
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Phase 5 : Snapshots, Rollback & Diagnostics
// ---------------------------------------------------------------------------
export interface SnapshotTenantConfigRequest {
  orgId: string;
  label?: string;
  reason: string;
}

export interface RollbackTenantConfigRequest {
  orgId: string;
  snapshotId: string;
  reason: string;
}

export interface RunDiagnosticsRequest {
  orgId: string;
}

export interface DiagnosticCheckItem {
  category: 'fiscalite' | 'caisse' | 'materiel' | 'paiement' | 'securite';
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface DiagnosticResult {
  orgId: string;
  healthScore: number;
  status: 'healthy' | 'warning' | 'critical';
  checks: DiagnosticCheckItem[];
  checkedAt: string;
}

// ---------------------------------------------------------------------------
// Phase 6 : Cycle de vie sensible (2-Man Rule), Révocation, Export
// ---------------------------------------------------------------------------
export interface RequestTenantDeletionRequest {
  orgId: string;
  reason: string;
}

export interface ApproveTenantDeletionRequest {
  deletionRequestId: string;
  reason: string;
}

export interface ForceSignOutRequest {
  orgId: string;
  uid?: string;
  reason: string;
}

export interface ResetOwnerPasswordRequest {
  orgId: string;
  reason: string;
}

export interface ChangeTenantPlanRequest {
  orgId: string;
  newPlanId: string;
  reason: string;
}

export interface ExportTenantDataRequest {
  orgId: string;
  reason: string;
}

