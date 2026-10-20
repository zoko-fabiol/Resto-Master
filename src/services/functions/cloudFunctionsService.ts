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

const USE_CLOUD_FUNCTIONS = import.meta.env.VITE_USE_CLOUD_FUNCTIONS === 'true';

export class CloudFunctionsService {
  /**
   * Helper centralisé exécutant l'appel Cloud Function.
   * Si les Cloud Functions ne sont pas activées/déployées (VITE_USE_CLOUD_FUNCTIONS != true),
   * lève immédiatement une exception typée sans déclencher de requête réseau ni d'erreur CORS.
   */
  private async call<TData = unknown, TResult = unknown>(name: string, data?: TData): Promise<TResult> {
    if (!USE_CLOUD_FUNCTIONS) {
      throw new Error(`unavailable: Cloud Function "${name}" non configurée ou non déployée dans cet environnement.`);
    }
    const fn = httpsCallable(functions, name);
    const res = await fn(data);
    return res.data as TResult;
  }

  // 1. Rôles et Utilisateurs
  async createUser(data: {
    email: string;
    password?: string;
    name: string;
    role: UserRole;
    phone?: string;
    outlets?: string[];
    organizationId?: string;
    pin?: string;
    accountType?: 'staff' | 'tablette';
    assignedTableId?: string;
    assignedTableName?: string;
  }) {
    return this.call<{
      email: string;
      password?: string;
      name: string;
      role: UserRole;
      phone?: string;
      outlets?: string[];
      organizationId?: string;
      pin?: string;
      accountType?: 'staff' | 'tablette';
      assignedTableId?: string;
      assignedTableName?: string;
    }, { success: boolean; userId: string; temporaryPassword?: string; generatedPin?: string }>('createUser', data);
  }

  async setUserRole(data: {
    userId: string;
    role: UserRole;
    outlets?: string[];
    organizationId?: string;
    active?: boolean;
  }) {
    return this.call<{
      userId: string;
      role: UserRole;
      outlets?: string[];
      organizationId?: string;
      active?: boolean;
    }, { success: boolean; userId: string; role: UserRole }>('setUserRole', data);
  }

  async deleteUser(data: { userId: string }) {
    return this.call<{ userId: string }, { success: boolean; userId: string }>('deleteUser', data);
  }

  // 2. Sécurité PIN & Superviseur
  async setPin(pin: string, userId?: string) {
    return this.call<{ pin: string; userId?: string }, { success: boolean }>('setPin', { pin, userId });
  }

  async verifyPin(pin: string, userId?: string) {
    return this.call<{ pin: string; userId?: string }, { success: boolean }>('verifyPin', { pin, userId });
  }

  async unlockWithPin(pin: string, terminalId?: string) {
    return this.call<{ pin: string; terminalId?: string }, {
      success: boolean;
      customToken: string;
      user: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
        accessibleRestaurantIds: string[];
        organizationId: string;
      };
    }>('unlockWithPin', { pin, terminalId });
  }

  async verifySupervisor(pin: string, action: string, entityId?: string) {
    return this.call<{ pin: string; action: string; entityId?: string }, {
      success: boolean;
      supervisorToken: string;
      supervisorName: string;
      supervisorRole: UserRole;
      expiresInSeconds: number;
    }>('verifySupervisor', { pin, action, entityId });
  }

  // 3. Commandes Certifiées Serveur
  async createOrder(params: CreateOrderParams) {
    return this.call<CreateOrderParams, { success: boolean; order: any }>('createOrder', params);
  }

  async addItemsToOrder(orderId: string, items: OrderItemInput[], guestCount?: number) {
    return this.call<{ orderId: string; items: OrderItemInput[]; guestCount?: number }, {
      success: boolean;
      orderId: string;
      total: number;
      itemsCount: number;
    }>('addItemsToOrder', { orderId, items, guestCount });
  }

  // 4. Paiement Transactionnel & Idempotent
  async recordPayment(params: RecordPaymentParams) {
    const idempotencyKey = params.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
    return this.call<RecordPaymentParams, {
      success: boolean;
      paymentId: string;
      orderId: string;
      amountPaid: number;
      totalPaid: number;
      remainingToPay: number;
      isFullyPaid: boolean;
    }>('recordPayment', { ...params, idempotencyKey });
  }

  // 5. Annulation et Void
  async cancelOrder(params: {
    orderId: string;
    reason: string;
    supervisorToken: string;
    actionAfterCancel?: 'restock' | 'waste';
  }) {
    return this.call<{
      orderId: string;
      reason: string;
      supervisorToken: string;
      actionAfterCancel?: 'restock' | 'waste';
    }, { success: boolean; orderId: string; creditNoteId?: string; status: string }>('cancelOrder', params);
  }

  async voidItem(params: {
    orderId: string;
    itemIndex: number;
    reason: string;
    supervisorToken: string;
    actionAfterCancel?: 'restock' | 'waste';
  }) {
    return this.call<{
      orderId: string;
      itemIndex: number;
      reason: string;
      supervisorToken: string;
      actionAfterCancel?: 'restock' | 'waste';
    }, { success: boolean; orderId: string; newTotal: number; remainingItemsCount: number }>('voidItem', params);
  }

  // 6. Sessions de Caisse
  async openCashSession(params: {
    restaurantId: string;
    registerId: string;
    terminalId: string;
    initialFloat: number;
    notes?: string;
  }) {
    return this.call<{
      restaurantId: string;
      registerId: string;
      terminalId: string;
      initialFloat: number;
      notes?: string;
    }, { success: boolean; session: any }>('openCashSession', params);
  }

  async closeCashSession(params: {
    sessionId: string;
    blindCountAmount: number;
    varianceJustification?: string;
    notes?: string;
  }) {
    return this.call<{
      sessionId: string;
      blindCountAmount: number;
      varianceJustification?: string;
      notes?: string;
    }, {
      success: boolean;
      sessionId: string;
      zReportNumber: string;
      expectedTotal: number;
      countedTotal: number;
      variance: number;
      status: string;
    }>('closeCashSession', params);
  }

  // 7. Facturation Certifiée DGI
  async issueInvoice(orderId: string, clientInfo?: any) {
    return this.call<{ orderId: string; clientInfo?: any }, {
      success: boolean;
      invoiceId: string;
      invoiceNumber: string;
      chainHash: string;
      totalTTC: number;
      alreadyIssued?: boolean;
    }>('issueInvoice', { orderId, clientInfo });
  }

  // 8. Journal d'Audit Immuable
  async appendAuditLog(params: {
    action: string;
    module: string;
    details: string;
    entityId?: string;
    restaurantId?: string;
  }) {
    return this.call<{
      action: string;
      module: string;
      details: string;
      entityId?: string;
      restaurantId?: string;
    }, { success: boolean; logId: string; chainHash: string }>('appendAuditLog', params);
  }

  // 9. Appairage Sécurisé des Équipements
  async generatePairingCode(terminalId: string) {
    return this.call<{ terminalId: string }, { success: boolean; terminalId: string; pairingCode: string; expiresAt: string }>('generatePairingCode', { terminalId });
  }

  async pairDevice(params: { pairingCode: string; deviceName?: string; ipAddress?: string }) {
    return this.call<{ pairingCode: string; deviceName?: string; ipAddress?: string }, {
      success: boolean;
      terminal: {
        terminalId: string;
        terminalName: string;
        type: string;
        outletId: string;
        assignedRole?: UserRole;
        assignedTableId?: string;
        assignedZone?: string;
        kdsStation?: string;
        pairedAt: string;
        pairingCode: string;
      };
    }>('pairDevice', params);
  }
}

export const cloudFunctionsService = new CloudFunctionsService();
