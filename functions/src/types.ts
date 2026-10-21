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
