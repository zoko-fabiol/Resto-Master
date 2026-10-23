import { httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
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

export interface CloudFunctionDiagnostic {
  message: string;
  code: string;
}

interface CloudFunctionErrorLike {
  code?: unknown;
  message?: unknown;
}

function isCloudFunctionErrorLike(error: unknown): error is CloudFunctionErrorLike {
  return typeof error === 'object' && error !== null;
}

export function mapCloudFunctionError(
  error: unknown,
  serviceEnabled = USE_CLOUD_FUNCTIONS
): CloudFunctionDiagnostic {
  if (!serviceEnabled) {
    return {
      code: 'disabled',
      message: "Le service de demande en ligne est désactivé dans cette version de l'application.",
    };
  }

  const code = isCloudFunctionErrorLike(error) && typeof error.code === 'string'
    ? error.code
    : '';
  const rawMessage = isCloudFunctionErrorLike(error) && typeof error.message === 'string'
    ? error.message
    : '';

  if (code === 'functions/not-found') {
    return {
      code,
      message: "Le service d'inscription n'est pas déployé sur ce projet. Contactez le support.",
    };
  }
  if (code === 'functions/resource-exhausted') {
    return { code, message: 'Trop de demandes. Réessayez dans quelques minutes.' };
  }
  if (code === 'functions/invalid-argument') {
    return { code, message: rawMessage || 'Les données saisies sont invalides.' };
  }
  if (code === 'functions/internal' || code === 'functions/unavailable' || code === 'functions/network-request-failed') {
    return {
      code,
      message: 'Le service est injoignable (réseau ou blocage de sécurité). Vérifiez votre connexion.',
    };
  }
  return {
    code: code || 'unknown',
    message: rawMessage || 'Une erreur inattendue est survenue. Contactez le support.',
  };
}

export function isCloudFunctionsEnabled(): boolean {
  return USE_CLOUD_FUNCTIONS;
}

export class CloudFunctionsService {
  /**
   * Helper centralisé exécutant l'appel Cloud Function.
   * Si les Cloud Functions ne sont pas activées/déployées (VITE_USE_CLOUD_FUNCTIONS != true),
   * lève immédiatement une exception typée sans déclencher de requête réseau ni d'erreur CORS.
   */
  private async call<TData = unknown, TResult = unknown>(name: string, data?: TData): Promise<TResult> {
    if (!USE_CLOUD_FUNCTIONS) {
      const error = new Error('Le service de demande en ligne est désactivé dans cette version de l’application.');
      Object.assign(error, { code: 'disabled' });
      throw error;
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

  // TEMPORAIRE : sera remplacé par une création de compte authentifiée,
  // vérification d'e-mail et App Check.
  // 10. Provisionnement & Gestion Multi-Tenant SaaS
  // Sans Cloud Function (plan Firebase gratuit) : la demande est écrite directement
  // dans `tenant_signups`, collection en création seule pour le public (voir firestore.rules).
  // L'approbation reste manuelle par la plateforme.
  async submitSignup(data: {
    companyName?: string;
    legalForm?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    applicantName?: string;
    desiredPlanId?: string;
    estimatedTables?: number;
    initialPassword?: string;
  }): Promise<{ success: boolean; signupId: string; message: string }> {
    const invalid = (message: string): never => {
      throw Object.assign(new Error(message), { code: 'functions/invalid-argument' });
    };

    const companyName = data.companyName?.trim();
    const city = data.city?.trim();
    const phone = data.phone?.trim();
    const applicantName = data.applicantName?.trim();
    const email = data.email?.trim().toLowerCase();

    if (!companyName || !city || !phone || !email || !applicantName) {
      return invalid(
        'Veuillez renseigner tous les champs obligatoires (Société, Ville, Téléphone, E-mail, Responsable).'
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return invalid('Adresse e-mail invalide.');
    }

    const signupId = `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    try {
      await setDoc(doc(db, 'tenant_signups', signupId), {
        id: signupId,
        companyName: companyName.slice(0, 120),
        legalForm: data.legalForm || 'SARL',
        city: city.slice(0, 80),
        country: data.country?.trim() || 'Cameroun',
        phone: phone.slice(0, 30),
        email: email.slice(0, 120),
        applicantName: applicantName.slice(0, 120),
        desiredPlanId: data.desiredPlanId || 'plan_pro',
        estimatedTables: data.estimatedTables ? Number(data.estimatedTables) : 10,
        initialPassword: data.initialPassword?.trim() || '',
        status: 'en_attente',
        submittedAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'permission-denied') {
        throw Object.assign(
          new Error("La demande a été refusée par le serveur. Vérifiez les champs saisis ou contactez le support."),
          { code }
        );
      }
      throw error;
    }

    return {
      success: true,
      signupId,
      message:
        "Votre demande d'inscription a été reçue avec succès. Notre équipe prendra contact avec vous sous peu pour activer votre établissement.",
    };
  }

  async approveSignup(data: { signupId: string; planId?: string; reason: string; profileType?: string }) {
    return this.call<
      typeof data,
      { success: boolean; orgId: string; passwordResetLink?: string; message: string }
    >('approveSignup', data);
  }

  async validateRestaurantAccessCode(restaurantCode: string) {
    if (!USE_CLOUD_FUNCTIONS) {
      return { success: true, orgId: '' };
    }
    try {
      return await this.call<{ restaurantCode: string }, { success: true; orgId: string }>('validateRestaurantAccessCode', {
        restaurantCode,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message || '';
      // Si la fonction n'est pas déployée sur Firebase (plan Spark ou environnement dev)
      if (
        code === 'functions/not-found' ||
        code === 'not-found' ||
        message.includes('not-found') ||
        message.includes('internal')
      ) {
        return { success: true, orgId: '' };
      }
      throw err;
    }
  }

  async completeRestaurantSetup(setupSessionId: string, reason: string): Promise<{
    success: true;
    restaurantCode?: string;
    codeAlreadyDelivered: boolean;
  }> {
    if (!USE_CLOUD_FUNCTIONS) {
      return { success: true, restaurantCode: 'RMS-INIT-SETUP', codeAlreadyDelivered: true };
    }
    return this.call<
      { setupSessionId: string; reason: string },
      { success: true; restaurantCode?: string; codeAlreadyDelivered: boolean }
    >(
      'completeRestaurantSetup',
      { setupSessionId, reason }
    );
  }

  async rejectSignup(data: { signupId: string; reason: string }) {
    return this.call<typeof data, { success: boolean; message: string }>('rejectSignup', data);
  }

  async createTenant(data: {
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
  }) {
    return this.call<
      typeof data,
      { success: boolean; orgId: string; restaurantId: string; ownerUid: string; passwordResetLink?: string }
    >('createTenant', data);
  }

  async setTenantStatus(data: {
    orgId: string;
    status: 'demande' | 'inscription_en_attente' | 'installation' | 'paiement_en_attente' | 'paiement_a_verifier' | 'onboarding' | 'essai' | 'actif' | 'impaye' | 'suspendu' | 'resilie' | 'archive';
    suspensionMode?: 'read_only' | 'full_block';
    reason: string;
  }) {
    return this.call<
      typeof data,
      { success: boolean; orgId: string; oldStatus: string; newStatus: string; suspensionMode?: string }
    >('setTenantStatus', data);
  }

  // ---------------------------------------------------------------------------
  // Catalogue & Abonnements RestoMaster OS (Phase 2 & 3)
  // ---------------------------------------------------------------------------

  async computeQuote(data: {
    packId: 'minimum' | 'medium' | 'premium';
    restaurantType: string;
    billingCycle: 'mensuel' | 'annuel' | 'a_vie';
    selectedAddons?: string[];
    additionalCapacities?: {
      extraTerminals?: number;
      extraUsers?: number;
      extraOrdersBlocks?: number;
      extraOutlets?: number;
    };
  }) {
    return this.call<typeof data, { quote: any; entitlements: any }>('computeQuote', data);
  }

  async submitSubscriptionOrder(data: {
    packId: 'minimum' | 'medium' | 'premium';
    billingCycle: 'mensuel' | 'annuel' | 'a_vie';
    selectedAddons?: string[];
    additionalCapacities?: {
      extraTerminals?: number;
      extraUsers?: number;
      extraOrdersBlocks?: number;
      extraOutlets?: number;
    };
  }) {
    return this.call<
      typeof data,
      { success: boolean; orderId: string; paymentReference: string; payableAmountFcfa: number; quote: any }
    >('submitSubscriptionOrder', data);
  }

  async markPaymentSent(data: {
    orderId: string;
    paymentMethod: 'virement_bancaire' | 'orange_money' | 'mtn_momo' | 'cheque' | 'especes';
    transactionReference: string;
    payerNotes?: string;
    proofUrl?: string;
  }) {
    return this.call<typeof data, { success: boolean; message: string }>('markPaymentSent', data);
  }

  async validateSubscriptionPayment(data: {
    orderId: string;
    cashierNotes?: string;
    actualAmountReceivedFcfa?: number;
  }) {
    return this.call<
      typeof data,
      { success: boolean; invoiceNumber: string; endsAt: string; message: string }
    >('validateSubscriptionPayment', data);
  }

  async rejectSubscriptionPayment(data: {
    orderId: string;
    rejectionReason: string;
  }) {
    return this.call<typeof data, { success: boolean; message: string }>('rejectSubscriptionPayment', data);
  }
}

export const cloudFunctionsService = new CloudFunctionsService();

