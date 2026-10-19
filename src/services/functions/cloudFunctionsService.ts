import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';
import { UserRole } from '../../types/restaurant';

export interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  options?: Record<string, unknown>;
  destination?: 'cuisine' | 'bar';
}

export interface CreateOrderParams {
  restaurantId?: string;
  type?: 'sur_place' | 'a_emporter' | 'livraison' | 'room_service';
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  guestCount?: number;
  items: OrderItemInput[];
  notes?: string;
  isProforma?: boolean;
  companyBillingName?: string;
  companyBillingNiu?: string;
  discountPercentRequested?: number;
  supervisorToken?: string;
}

export interface RecordPaymentParams {
  orderId: string;
  amount: number;
  method: 'especes' | 'carte_bancaire' | 'orange_money' | 'mtn_momo' | 'virement' | 'cheque' | 'credit_client' | 'bon_repas';
  cashSessionId?: string;
  idempotencyKey?: string;
  cashGiven?: number;
  notes?: string;
}

export class CloudFunctionsService {
  // 1. Rôles et Utilisateurs
  async createUser(data: {
    email: string;
    password?: string;
    name: string;
    role: UserRole;
    phone?: string;
    outlets?: string[];
    organizationId?: string;
  }) {
    const fn = httpsCallable(functions, 'createUser');
    const res = await fn(data);
    return res.data as { success: boolean; userId: string };
  }

  async setUserRole(data: {
    userId: string;
    role: UserRole;
    outlets?: string[];
    organizationId?: string;
    active?: boolean;
  }) {
    const fn = httpsCallable(functions, 'setUserRole');
    const res = await fn(data);
    return res.data as { success: boolean; userId: string; role: UserRole };
  }

  // 2. Sécurité PIN & Superviseur
  async setPin(pin: string, userId?: string) {
    const fn = httpsCallable(functions, 'setPin');
    const res = await fn({ pin, userId });
    return res.data as { success: boolean };
  }

  async verifyPin(pin: string, userId?: string) {
    const fn = httpsCallable(functions, 'verifyPin');
    const res = await fn({ pin, userId });
    return res.data as { success: boolean };
  }

  async verifySupervisor(pin: string, action: string, entityId?: string) {
    const fn = httpsCallable(functions, 'verifySupervisor');
    const res = await fn({ pin, action, entityId });
    return res.data as {
      success: boolean;
      supervisorToken: string;
      supervisorName: string;
      supervisorRole: UserRole;
      expiresInSeconds: number;
    };
  }

  // 3. Commandes Certifiées Serveur
  async createOrder(params: CreateOrderParams) {
    const fn = httpsCallable(functions, 'createOrder');
    const res = await fn(params);
    return res.data as { success: boolean; order: any };
  }

  async addItemsToOrder(orderId: string, items: OrderItemInput[], guestCount?: number) {
    const fn = httpsCallable(functions, 'addItemsToOrder');
    const res = await fn({ orderId, items, guestCount });
    return res.data as { success: boolean; orderId: string; total: number; itemsCount: number };
  }

  // 4. Paiement Transactionnel & Idempotent
  async recordPayment(params: RecordPaymentParams) {
    const fn = httpsCallable(functions, 'recordPayment');
    const idempotencyKey = params.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
    const res = await fn({ ...params, idempotencyKey });
    return res.data as {
      success: boolean;
      paymentId: string;
      orderId: string;
      amountPaid: number;
      totalPaid: number;
      remainingToPay: number;
      isFullyPaid: boolean;
    };
  }

  // 5. Annulation et Void
  async cancelOrder(params: {
    orderId: string;
    reason: string;
    supervisorToken: string;
    actionAfterCancel?: 'restock' | 'waste';
  }) {
    const fn = httpsCallable(functions, 'cancelOrder');
    const res = await fn(params);
    return res.data as { success: boolean; orderId: string; creditNoteId?: string; status: string };
  }

  async voidItem(params: {
    orderId: string;
    itemIndex: number;
    reason: string;
    supervisorToken: string;
    actionAfterCancel?: 'restock' | 'waste';
  }) {
    const fn = httpsCallable(functions, 'voidItem');
    const res = await fn(params);
    return res.data as { success: boolean; orderId: string; newTotal: number; remainingItemsCount: number };
  }

  // 6. Sessions de Caisse
  async openCashSession(params: {
    restaurantId: string;
    registerId: string;
    terminalId: string;
    initialFloat: number;
    notes?: string;
  }) {
    const fn = httpsCallable(functions, 'openCashSession');
    const res = await fn(params);
    return res.data as { success: boolean; session: any };
  }

  async closeCashSession(params: {
    sessionId: string;
    blindCountAmount: number;
    varianceJustification?: string;
    notes?: string;
  }) {
    const fn = httpsCallable(functions, 'closeCashSession');
    const res = await fn(params);
    return res.data as {
      success: boolean;
      sessionId: string;
      zReportNumber: string;
      expectedTotal: number;
      countedTotal: number;
      variance: number;
      status: string;
    };
  }

  // 7. Facturation Certifiée DGI
  async issueInvoice(orderId: string, clientInfo?: any) {
    const fn = httpsCallable(functions, 'issueInvoice');
    const res = await fn({ orderId, clientInfo });
    return res.data as {
      success: boolean;
      invoiceId: string;
      invoiceNumber: string;
      chainHash: string;
      totalTTC: number;
      alreadyIssued?: boolean;
    };
  }

  // 8. Journal d'Audit Immuable
  async appendAuditLog(params: {
    action: string;
    module: string;
    details: string;
    entityId?: string;
    restaurantId?: string;
  }) {
    const fn = httpsCallable(functions, 'appendAuditLog');
    const res = await fn(params);
    return res.data as { success: boolean; logId: string; chainHash: string };
  }
}

export const cloudFunctionsService = new CloudFunctionsService();
