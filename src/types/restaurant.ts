export type UserRole =
  | 'direction'
  | 'manager'
  | 'serveur'
  | 'cuisine'
  | 'bar'
  | 'caisse'
  | 'stock'
  | 'rh'
  | 'finance'
  | 'comptable'
  | 'auditeur';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  active: boolean;
  permissions?: string[];
  organizationId?: string;
  accessibleRestaurantIds?: string[];
  defaultRestaurantId?: string;
  activeRestaurantId?: string;
}

export type FiscalComplianceStatus =
  | 'CONFIGURÉ'
  | 'À_VÉRIFIER'
  | 'NON_CONFIGURÉ'
  | 'NON_DISPONIBLE';

export type TaxRegime = 'reel' | 'simplifie' | 'igp' | 'non_assujetti';

export interface RestaurantSettings {
  id: string;
  organizationId: string;
  restaurantId: string;
  name: string;
  slogan: string;
  address: string;
  phone: string;
  email: string;
  currency: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
  taxRate: number; // e.g. 19.25 (17.5% TVA + 10% CAC = 19.25%)
  baseVatRate: number; // e.g. 17.5%
  cacRate: number; // Centimes Additionnels Communaux (1.75% sur le HT = 10% sur la TVA)
  serviceChargeRate: number;
  zones: string[];
  enableStockAutoDeduction: boolean;
  minCashVarianceAlert: number;

  // Profil Juridique & Fiscal Camerounais (CGI / DGI 2026)
  raisonSociale: string;
  nomCommercial: string;
  formeJuridique: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
  niu: string; // Numéro d'Identifiant Unique fiscal (ex: M012012345678A)
  rccm: string; // Registre du Commerce et du Crédit Mobilier (ex: RC/DLA/2024/B/1234)
  taxCenter: string; // Centre des impôts de rattachement (ex: CIME Yaoundé 1)
  adresseFiscale: string;
  city: string; // Ville (ex: Yaoundé, Douala, Kribi, Bafoussam)
  quartier: string;
  bp: string; // Boîte Postale (ex: BP 3626)
  activitePrincipale: string;
  activitesSecondaires?: string;
  regimeFiscal: TaxRegime;
  assujettiTVA: boolean;
  statutContribuable: 'actif' | 'en_sommeil' | 'suspendu' | 'inconnu';
  exerciceFiscal: string; // ex: 2026
  lastFiscalCheckDate: string; // Date de dernière vérification de la configuration fiscale

  // Paramètres Numérotation & Contrôle des Remises
  invoicePrefix: string; // ex: 2026-RESTO-001
  nextInvoiceSequence: number;
  maxDiscountByRole: Record<UserRole, number>; // ex: serveur: 5, manager: 15, direction: 100

  // Paramètres Mobile Money & QR Code Max-it / MoMo Pay
  orangeMoneyMerchantCode: string; // Code Marchand Orange Money (ex: 789123)
  orangeMoneyPhone: string; // Numéro de réception direct Orange Money (ex: 699887766)
  orangeMaxItQrUrl?: string; // QR code officiel importé Max it / Orange Money
  mtnMoMoMerchantCode: string; // Code Marchand MTN MoMo (ex: 456789)
  mtnMoMoPhone: string; // Numéro de réception direct MTN MoMo (ex: 677112233)
  mtnMoMoQrUrl?: string; // QR code officiel importé MTN MoMo
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  rccm: string;
  headquartersAddress: string;
  city: string;
  phone: string;
  email: string;
  currency: 'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP';
  active: boolean;
  createdAt: string;
}

export type ZoneType =
  | 'salle_principale'
  | 'terrasse'
  | 'vip'
  | 'bar'
  | 'salon_prive'
  | 'climatisee'
  | 'exterieure'
  | 'rooftop'
  | 'evenementielle';

export interface Zone {
  id: string;
  restaurantId: string;
  name: string;
  type: ZoneType;
  color: string;
  displayOrder: number;
  capacity: number;
  printerId?: string;
  defaultServiceCharge?: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type TableShape = 'carree' | 'rectangulaire' | 'ronde' | 'ovale';

export type TableStatus =
  | 'libre'
  | 'reservee'
  | 'occupee'
  | 'attente_commande'
  | 'en_service'
  | 'attente_paiement'
  | 'a_nettoyer'
  | 'hors_service';

export interface RestaurantTable {
  id: string;
  restaurantId?: string;
  zoneId?: string;
  number: string;
  name?: string;
  capacity: number;
  zone: string;
  status: TableStatus;
  shape?: TableShape;
  x?: number; // X coordinate percentage (0 - 100) or px
  y?: number; // Y coordinate percentage (0 - 100) or px
  width?: number; // Width relative size
  height?: number; // Height relative size
  rotation?: number; // Angle 0, 45, 90, 180
  currentOrderId?: string;
  currentReservationId?: string;
  assignedServerId?: string;
  assignedServerName?: string;
  guestsCount?: number;
  timeOccupied?: string;
  active?: boolean;
  mergedWithTableId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashRegister {
  id: string;
  restaurantId: string;
  name: string;
  zoneId?: string;
  terminalId?: string;
  active: boolean;
  assignedUsers: string[];
  allowedPaymentMethods: PaymentMethod[];
  createdAt?: string;
  updatedAt?: string;
}

export type UnitType =
  | 'piece'
  | 'kg'
  | 'g'
  | 'L'
  | 'cl'
  | 'ml'
  | 'bouteille'
  | 'carton'
  | 'sac'
  | 'boite'
  | 'portion';

export type ReservationStatus =
  | 'en_attente'
  | 'confirmee'
  | 'arrivee'
  | 'en_cours'
  | 'terminee'
  | 'annulee'
  | 'no_show';

export interface Reservation {
  id: string;
  restaurantId?: string;
  zoneId?: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  guestCount: number;
  tableId?: string;
  tableName?: string;
  status: ReservationStatus;
  specialRequests?: string;
  notes?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  displayOrder: number;
  active: boolean;
}

export interface RecipeIngredient {
  stockItemId: string;
  stockItemName: string;
  quantityRequired: number;
  unit: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  costPrice: number;
  preparationTimeMinutes: number;
  available: boolean;
  image?: string;
  imageUrl?: string;
  imagePublicId?: string;
  destination: 'cuisine' | 'bar';
  ingredients: RecipeIngredient[];
  taxApplicable: boolean;
  mealCategory?: 'pdj' | 'dejeuner' | 'diner' | 'bar' | 'cave' | 'divers';
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  destination: 'cuisine' | 'bar';
  notes?: string;
  status: 'en_attente' | 'en_preparation' | 'pret' | 'servi';
  preparedAt?: string;
  folio?: number; // 1: Société/Prise en charge, 2: Extra/Personnel
  mealCategory?: 'pdj' | 'dejeuner' | 'diner' | 'bar' | 'cave' | 'divers';
}

export type OrderStatus =
  | 'nouveau'
  | 'envoye'
  | 'en_preparation'
  | 'pret'
  | 'servi'
  | 'attente_paiement'
  | 'payee'
  | 'annulee';

export type PaymentMethod =
  | 'especes'
  | 'orange_money'
  | 'mtn_momo'
  | 'carte'
  | 'virement'
  | 'credit_entreprise'
  | 'mobile_money'
  | 'autre';

export interface Order {
  id: string;
  restaurantId?: string;
  zoneId?: string;
  terminalId?: string;
  cashRegisterId?: string;
  orderNumber: string;
  type: 'sur_place' | 'a_emporter' | 'livraison';
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  serverId: string;
  serverName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'non_paye' | 'partiel' | 'paye';
  paidAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
  // Spécificités Cameroun & Entreprises
  isProforma?: boolean;
  companyBillingName?: string;
  companyBillingNiu?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  date: string;
  sourceLocation: string; // Ex: Magasin Central (Économat)
  destinationLocation: string; // Ex: Bar Comptoir, Cuisine
  items: {
    stockItemId: string;
    stockItemName: string;
    quantity: number;
    unit: string;
  }[];
  operator: string;
  notes?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  method: PaymentMethod;
  cashierId: string;
  cashierName: string;
  date: string;
  reference?: string;
  note?: string;
}

export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialFloat: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedTotal: number;
  countedTotal?: number;
  variance?: number;
  status: 'ouverte' | 'fermee';
  notes?: string;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'entree' | 'sortie' | 'encaissement_vente' | 'remboursement' | 'avance';
  amount: number;
  reason: string;
  user: string;
  timestamp: string;
  referenceDocId?: string;
}

export interface StockItem {
  id: string;
  restaurantId?: string;
  name: string;
  category: 'alimentaire' | 'boissons' | 'entretien' | 'materiel' | 'emballage';
  unit: 'kg' | 'g' | 'L' | 'bouteille' | 'portion' | 'unite' | 'carton';
  currentQuantity: number;
  minThreshold: number;
  optimalQuantity: number;
  purchasePrice: number;
  supplierId?: string;
  supplierName?: string;
  location: string;
  expiryDate?: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  stockItemName: string;
  type:
    | 'entree_achat'
    | 'sortie_consommation'
    | 'perte_gaspillage'
    | 'perime'
    | 'inventaire_correction'
    | 'transfert';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  unit: string;
  reason: string;
  referenceId?: string;
  userName: string;
  timestamp: string;
}

export interface InventoryItemCheck {
  stockItemId: string;
  stockItemName: string;
  theoreticalQty: number;
  actualQty: number;
  variance: number;
  varianceValue: number;
  unit: string;
  justification?: string;
}

export interface Inventory {
  id: string;
  date: string;
  zoneOrCategory: string;
  conductedBy: string;
  items: InventoryItemCheck[];
  totalVarianceValue: number;
  status: 'brouillon' | 'valide';
  validatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  productsSupplied: string[];
  totalPurchases: number;
  currentBalanceDue: number;
  notes?: string;
}

export interface PurchaseOrderItem {
  stockItemId: string;
  stockItemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDeliveryDate?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'brouillon' | 'envoyee' | 'partiellement_recue' | 'recue' | 'annulee';
  receivedAt?: string;
  invoiceNumber?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalVisits: number;
  preferences?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  role: UserRole;
  department: 'Salle' | 'Cuisine' | 'Bar' | 'Administration' | 'Logistique';
  phone: string;
  email: string;
  contractType: 'CDI' | 'CDD' | 'Extra' | 'Stage';
  salary: number;
  hireDate: string;
  status: 'actif' | 'conge' | 'archive';
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'retard' | 'absent' | 'conge';
  justification?: string;
}

export type ConfidentialityLevel =
  | 'public'
  | 'interne'
  | 'confidentiel'
  | 'fiscal'
  | 'rh'
  | 'finance'
  | 'direction';

export interface MediaAsset {
  id: string;
  organizationId: string;
  restaurantId?: string;
  uploadedBy: string;
  fileName: string;
  originalName: string;
  resourceType: 'image' | 'raw' | 'video';
  mimeType: string;
  size: number;
  cloudinaryPublicId: string;
  cloudinaryAssetId?: string;
  secureUrl: string;
  folder: string;
  category: string;
  entityType?: string;
  entityId?: string;
  width?: number;
  height?: number;
  checksum?: string;
  createdAt: string;
  updatedAt?: string;
  status: 'uploading' | 'ready' | 'failed' | 'deleted';
  confidentialityLevel?: ConfidentialityLevel;
}

export interface DocumentItem {
  id: string;
  organizationId?: string;
  restaurantId?: string;
  title: string;
  category:
    | 'facture_fournisseur'
    | 'recu_caisse'
    | 'contrat'
    | 'justificatif_depense'
    | 'rapport'
    | 'administratif'
    | 'autre';
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  relatedEntityId?: string;
  relatedEntityType?: 'supplier' | 'expense' | 'employee' | 'order';
  date: string;
  amount?: number;
  supplierName?: string;
  uploadedBy: string;
  ocrExtractedData?: Record<string, any>;
  ocrStatus?: 'pending' | 'completed' | 'failed' | 'none';
  ocrText?: string;
  ocrProcessedAt?: string;
  // Cloudinary metadata
  cloudinaryPublicId?: string;
  cloudinarySecureUrl?: string;
  resourceType?: 'image' | 'raw' | 'video';
  confidentialityLevel?: ConfidentialityLevel;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category:
    | 'achats_alimentaires'
    | 'boissons'
    | 'salaires'
    | 'loyer'
    | 'electricite_eau'
    | 'maintenance'
    | 'transport'
    | 'autre';
  beneficiary: string;
  reason: string;
  paymentMethod: PaymentMethod;
  status: 'en_attente' | 'validee' | 'payee' | 'rejetee';
  approvedBy?: string;
  approvedAt?: string;
  documentId?: string;
  recordedBy: string;
}

export interface AuditLog {
  id: string;
  organizationId?: string;
  restaurantId?: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  module:
    | 'POS'
    | 'Tables'
    | 'Cuisine'
    | 'Bar'
    | 'Caisse'
    | 'Stocks'
    | 'Achats'
    | 'Finances'
    | 'Personnel'
    | 'Documents'
    | 'Paramètres';
  details: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'alert' | 'info' | 'success';
  module: string;
  priority: 'haute' | 'moyenne' | 'basse';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

// -------------------------------------------------------------
// NOUVEAUX MODÈLES POUR L'OS RESTAURATION PROFESSIONNELLE (CAMEROUN)
// -------------------------------------------------------------

export type InvoiceStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export type MobileMoneyPaymentStatus =
  | 'PENDING'
  | 'DECLARED'
  | 'VERIFYING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type TaxCategory =
  | 'repas'
  | 'boissons'
  | 'boissons_non_alcoolisees'
  | 'boissons_alcoolisees'
  | 'biere'
  | 'vin'
  | 'spiritueux'
  | 'cocktails'
  | 'dessert'
  | 'service'
  | 'livraison'
  | 'evenement'
  | 'autre';

export interface TaxProfile {
  taxable: boolean;
  vatRate: number; // e.g. 17.5%
  cacApplicable: boolean; // Centimes additionnels communaux (10% de la TVA)
  exempt: boolean;
  exemptReason?: string;
  withholdingApplicable: boolean;
  category: TaxCategory;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // ex: 2026-RESTO-001-000001
  sequenceNumber: number;
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  date: string;
  time: string;
  status: InvoiceStatus;
  
  // Émetteur (Restaurant)
  emitterRaisonSociale: string;
  emitterNiu: string;
  emitterRccm: string;
  emitterTaxCenter: string;
  emitterAddress: string;
  emitterPhone: string;
  
  // Client
  customerId?: string;
  customerName: string;
  customerNiu?: string;
  customerRccm?: string;
  customerAddress?: string;
  customerPhone?: string;
  
  // Lignes
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceHT: number;
    discountAmount: number;
    totalHT: number;
    vatRate: number;
    vatAmount: number;
    cacAmount: number;
    totalTTC: number;
  }[];
  
  subtotalHT: number;
  discountTotal: number;
  taxableBase: number;
  vatAmount: number;
  cacAmount: number;
  totalTaxes: number;
  withholdingRate?: number;
  withholdingAmount?: number;
  totalTTC: number;
  netToPay: number;
  amountInWords: string;
  
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentStatus: MobileMoneyPaymentStatus | 'PAID' | 'UNPAID';
  folio?: number;
  notes?: string;
  
  validatedAt?: string;
  validatedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface FiscalJournalItem {
  id: string;
  invoiceId: string;
  documentNumber: string;
  date: string;
  time: string;
  type: 'VENTE' | 'AVOIR' | 'ANNULATION' | 'RETENUE';
  montantHT: number;
  montantTVA: number;
  montantCAC: number;
  montantRetenue: number;
  montantTTC: number;
  utilisateur: string;
  restaurantId: string;
  status: 'VALIDATED' | 'CANCELLED';
  hashIntegrity?: string;
}

export interface CancellationLog {
  id: string;
  ticketOrInvoiceId: string;
  documentNumber: string;
  amount: number;
  reason: string;
  userId: string;
  userName: string;
  approvedBy?: string;
  date: string;
  time: string;
  type: 'COMMANDE' | 'FACTURE' | 'PAIEMENT' | 'LIVRAISON';
}

export interface WithholdingRecord {
  id: string;
  partyId: string;
  partyName: string;
  partyType: 'client' | 'fournisseur';
  regime: TaxRegime;
  withholdingType: 'AIR' | 'TSR' | 'TVA_RETENUE';
  rate: number; // ex: 2.2, 5.5, ou 15%
  base: number;
  amount: number;
  certificateNumber?: string;
  certificateDate?: string;
  status:
    | 'a_appliquer'
    | 'calculee'
    | 'declaree'
    | 'attestation_recue'
    | 'rapprochee'
    | 'annulee';
  date: string;
  referenceDocId?: string;
}

export interface StockLot {
  id: string;
  lotNumber: string;
  stockItemId: string;
  stockItemName: string;
  supplierId: string;
  supplierName: string;
  receptionDate: string;
  expiryDate?: string;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  purchasePrice: number;
  location: string;
  status: 'actif' | 'proche_peremption' | 'perime' | 'epuise';
}

export interface HygieneCheck {
  id: string;
  date: string;
  time: string;
  category: 'temperature' | 'nettoyage' | 'huile_friture' | 'reception_marchandise';
  equipmentOrZone: string; // Ex: Chambre Froide Positive, Frigo Bar, Bain-Marie, Cuisine
  inspectorName: string;
  measuredValue?: string;
  thresholdOrStandard: string;
  result: 'conforme' | 'non_conforme' | 'action_requise';
  correctiveAction?: string;
  notes?: string;
}

export interface RestaurantEvent {
  id: string;
  eventNumber: string;
  title: string;
  type: 'mariage' | 'anniversaire' | 'seminaire' | 'conference' | 'cocktail' | 'reception' | 'catering';
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  assignedHallOrZone: string;
  menuSelected?: string;
  quoteAmount: number;
  depositAmount: number;
  remainingBalance: number;
  status: 'prospect' | 'devis_envoye' | 'confirme' | 'en_cours' | 'termine' | 'annule';
  notes?: string;
}

export interface DeliveryOrder {
  id: string;
  deliveryNumber: string;
  orderId: string;
  orderNumber: string;
  clientName: string;
  clientPhone: string;
  city: string; // Yaoundé, Douala, etc.
  quartier: string; // Bastos, Akwa, Bonapriso, Omnisports, etc.
  repere: string; // En face station Total, carrefour express, etc.
  instructions?: string;
  gpsCoordinates?: string;
  deliveryFee: number;
  deliveryPersonName?: string;
  departureTime?: string;
  deliveredTime?: string;
  proofOfDelivery?: string;
  paymentStatus: 'en_attente' | 'paye_a_la_livraison' | 'prepaye_momo';
  status:
    | 'NOUVELLE'
    | 'CONFIRMEE'
    | 'EN_PREPARATION'
    | 'PRETE'
    | 'EN_COURS_LIVRAISON'
    | 'LIVREE'
    | 'ANNULEE';
}

export interface FiscalObligation {
  id: string;
  obligation: string;
  period: string;
  dueDate: string;
  responsible: string;
  status: 'a_faire' | 'en_preparation' | 'depose' | 'valide' | 'en_retard';
  amountEstimated?: number;
  documentReference?: string;
  comment?: string;
}

export interface ClientCreditAccount {
  id: string;
  customerId: string;
  customerName: string;
  authorizedLimit: number;
  currentBalance: number;
  invoicesCount: number;
  lastPaymentDate?: string;
  status: 'sain' | 'relance_requise' | 'contentieux';
}
