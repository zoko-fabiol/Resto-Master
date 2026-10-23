export type UserRole =
  | 'superadmin'
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
  | 'auditeur'
  | 'tablette'
  | 'aucun';

export type AccountType = 'staff' | 'tablette';

export interface TabPermission {
  view: boolean;   // Droit de consulter / accéder à l'onglet
  create: boolean; // Droit d'ajouter des éléments
  edit: boolean;   // Droit de modifier
  delete: boolean; // Droit de supprimer / annuler
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  pinCode?: string; // Optionnel car désormais stocké hashé côté serveur dans user_pins
  hasPin?: boolean;
  role: UserRole;
  accountType: AccountType;
  active: boolean;
  avatar?: string;
  phone?: string;
  matricule?: string;
  isFirstLogin?: boolean;
  setupOwner?: boolean; // Vrai pour le propriétaire de l'établissement pendant et après installation
  // Spécifique aux comptes de tablettes tactiles (Mode Kiosk)
  assignedTableId?: string;
  assignedTableName?: string;
  // Matrice des permissions granulaires personnalisées par onglet (CRUD)
  tabPermissions?: Record<string, TabPermission>;
  // Onglets additionnels explicitement accordés hors rôle par défaut
  additionalTabs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  active: boolean;
  mustChangePassword?: boolean;
  isFirstLogin?: boolean;
  setupOwner?: boolean;
  hasPin?: boolean;
  pinCode?: string;
  badgeNumber?: string;
  permissions?: string[];
  accountType?: AccountType;
  assignedTableId?: string;
  assignedTableName?: string;
  tabPermissions?: Record<string, TabPermission>;
  additionalTabs?: string[];
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
  niu: string; // Numéro d'Identifiant Unique fiscal (13 caractères DGI)
  rccm: string; // Registre du Commerce et du Crédit Mobilier
  taxCenter: string; // Centre des impôts de rattachement
  adresseFiscale: string;
  city: string; // Ville
  quartier: string;
  bp: string; // Boîte Postale
  activitePrincipale: string;
  activitesSecondaires?: string;
  regimeFiscal: TaxRegime;
  assujettiTVA: boolean;
  statutContribuable: 'actif' | 'en_sommeil' | 'suspendu' | 'inconnu';
  exerciceFiscal: string; // ex: Année fiscale en cours
  lastFiscalCheckDate: string; // Date de dernière vérification de la configuration fiscale

  // Paramètres Numérotation & Contrôle des Remises
  invoicePrefix: string; // Préfixe légal de facturation
  nextInvoiceSequence: number;
  /** @deprecated Utiliser roleLimits[role].maxDiscountPercent */
  maxDiscountByRole?: Record<UserRole, number>;

  // Paramètres Mobile Money & QR Code Max-it / MoMo Pay
  orangeMoneyMerchantCode: string; // Code Marchand Orange Money
  orangeMoneyPhone: string; // Numéro de réception direct Orange Money
  orangeMaxItQrUrl?: string; // QR code officiel importé Max it / Orange Money
  mtnMoMoMerchantCode: string; // Code Marchand MTN MoMo
  mtnMoMoPhone: string; // Numéro de réception direct MTN MoMo
  mtnMoMoQrUrl?: string; // QR code officiel importé MTN MoMo

  // Mode Opérationnel Cuisine & Stocks
  kitchenOperationMode: 'ecran_cuisine' | 'sans_compte';
  defaultReceiptWidth: '58mm' | '80mm';
  stockDeductionTiming?: 'envoi_cuisine' | 'encaissement'; // Déstockage à l'envoi ou au paiement
  priceDisplayMode?: 'TTC' | 'HT'; // Affichage prix TTC ou HT

  // Paramètres Fiscaux Avancés & Retenues (AIR)
  withholdingRate?: number; // e.g. 2.2% ou 5.5%
  timeZone?: string; // e.g. 'Africa/Douala'

  // Paramètres Opérationnels Mobile Money
  mtnActive?: boolean;
  mtnMode?: 'test' | 'production';
  mtnManualVerification?: boolean;
  mtnAutoConfirmApi?: boolean;
  orangeActive?: boolean;
  orangeMode?: 'test' | 'production';
  orangeManualVerification?: boolean;
  orangeAutoConfirmApi?: boolean;

  // Méthodes de Paiement & Comptes Comptables SYSCOHADA
  paymentMethods?: Record<string, boolean>;
  accountingAccounts?: {
    cuisineSales: string;
    barSales: string;
    vatCollected: string;
    cacCollected: string;
    withholdingAir: string;
    cashAccount: string;
    mobileMoneyAccount: string;
    clientsAccount: string;
  };

  // Verrouillage de Livraison & Certification de Mise en Service (Phase E)
  configurationVerrouillee?: boolean;
  certifiedReadyForHandover?: boolean;
  certifiedAt?: string;
  certifiedBy?: string;
  handoverSlipPrinted?: boolean;

  // Passerelle E-mails Google Apps Script (Restaurant)
  emailConfig?: {
    gasWebhookUrl?: string;
    senderName?: string;
    stockAlertEnabled?: boolean;
    stockAlertRecipient?: string;
    reservationConfirmationEnabled?: boolean;
    digitalReceiptEnabled?: boolean;
    zReportEmailEnabled?: boolean;
    zReportRecipient?: string;
    orderReadyEnabled?: boolean;
    directorReportEnabled?: boolean;
    directorReportFrequency?: 'jour' | 'semaine' | 'mois' | 'tous';
    directorEmailRecipient?: string;
  };
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
  coordVersion?: number; // Version des coordonnées (2 = unités logiques absolues 1200x800)
  layoutVersion?: number; // Version de disposition (2 = unités logiques absolues 1200x800)
  x?: number; // Logical X coordinate (0 - 1200)
  y?: number; // Logical Y coordinate (0 - 800)
  width?: number; // Logical width in px (default 100)
  height?: number; // Logical height in px (default 100)
  rotation?: number; // Angle 0..360
  layoutLocked?: boolean; // Verrouillage géométrique contre les déplacements accidentels
  currentOrderId?: string;
  currentReservationId?: string;
  assignedServerId?: string;
  assignedServerName?: string;
  guestsCount?: number;
  timeOccupied?: string;
  active?: boolean;
  mergedWithTableId?: string;
  mergedTableIds?: string[]; // IDs des tables fusionnées avec cette table principale
  createdAt?: string;
  updatedAt?: string;

  // Tablette Kiosk Client & Verrouillage à distance
  tabletKioskEnabled?: boolean;
  tabletLocked?: boolean;
  tabletLockedReason?: string;
  tabletLockedAt?: string;
  tabletLockedBy?: string;
  tabletDeviceName?: string;
  tabletAllowSelfOrdering?: boolean;
  tabletCallWaiterPending?: boolean;
  tabletBillRequested?: boolean;
}

export type DecorType =
  | 'mur'
  | 'comptoir'
  | 'bar'
  | 'porte'
  | 'colonne'
  | 'entree'
  | 'escalier'
  | 'fenetre'
  | 'plante';

export interface DecorElement {
  id: string;
  restaurantId: string;
  zoneId: string;
  type: DecorType;
  coordVersion?: number; // Version des coordonnées (2 = unités logiques 1200x800)
  layoutVersion?: number; // Version de disposition (2 = unités logiques 1200x800)
  name?: string;
  x: number; // Coordonnée logique X (0 - 1200)
  y: number; // Coordonnée logique Y (0 - 800)
  width: number; // Largeur logique
  height: number; // Hauteur logique
  rotation?: number; // Rotation en degrés (0..360)
  color?: string; // Couleur personnalisée
  label?: string; // Libellé affiché sur le plan
  createdAt?: string;
  updatedAt?: string;
}

export interface LayoutLock {
  id: string; // `${restaurantId}_${zoneId}`
  restaurantId: string;
  zoneId: string;
  userId: string;
  userName: string;
  userRole?: string;
  acquiredAt: string; // ISO
  expiresAt: string; // ISO
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
  costPerUnit?: number;
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
  category?: string;
  portionYield?: number; // Portions/couverts réalisés par formule standard (par défaut 1)
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  name?: string;
  unitPrice: number;
  quantity: number;
  destination: 'cuisine' | 'bar';
  notes?: string;
  status: 'en_attente' | 'en_preparation' | 'pret' | 'servi';
  preparedAt?: string;
  servedAt?: string;
  folio?: number; // 1: Société/Prise en charge, 2: Extra/Personnel
  mealCategory?: 'pdj' | 'dejeuner' | 'diner' | 'bar' | 'cave' | 'divers';
  seatNumber?: number; // 0 = Partagé/Table, 1 = Couvert 1, 2 = Couvert 2, etc.
  seatLabel?: string; // Ex: "Couvert 1", "Couvert 2", "Table"
  selectedModifiers?: string[];
  courseTiming?: 'entree' | 'plat' | 'dessert' | 'direct';
}

export type OrderStatus =
  | 'nouveau'
  | 'envoye'
  | 'en_preparation'
  | 'pret'
  | 'servi'
  | 'attente_paiement'
  | 'partiellement_payee'
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
  guestCount?: number; // Nombre de personnes / couverts
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: 'non_paye' | 'partiel' | 'paye';
  paidAmount: number;
  totalPaid?: number;
  paymentMethod?: PaymentMethod;
  tip?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  preparedAt?: string;
  servedAt?: string;
  paidAt?: string;
  payments?: Payment[];
  // Spécificités Cameroun & Entreprises
  isProforma?: boolean;
  companyBillingName?: string;
  companyBillingNiu?: string;
  discountPercentRequested?: number;
  supervisorToken?: string;
  /** Commande créée hors-ligne, non certifiée par le serveur (numéro PRV-…) */
  provisional?: boolean;
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

export type ShiftType = 'midi' | 'soir' | 'journee_continue' | 'repos' | 'conge';

export interface WeeklyDaySchedule {
  day?: string;
  active?: boolean;
  shift: ShiftType | string;
  startTime?: string;
  endTime?: string;
  isOff?: boolean;
  notes?: string;
}

export type WeeklySchedule = Record<string, WeeklyDaySchedule>;

export interface Employee {
  id: string;
  fullName: string;
  role: UserRole;
  hasPin?: boolean;
  pinCode?: string; // Obsolète : remplacé par hasPin et stocké hashé dans user_pins
  matricule?: string;
  department: 'Salle' | 'Cuisine' | 'Bar' | 'Administration' | 'Logistique';
  phone: string;
  email: string;
  contractType: 'CDI' | 'CDD' | 'Extra' | 'Stage';
  salary: number;
  hireDate: string;
  status: 'actif' | 'conge' | 'archive';
  weeklySchedule?: WeeklySchedule;
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
  remainingAmount?: number;
  paidAmount?: number;
  paymentType?: string;
  description?: string;
  supplier?: string;
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
  securitySignature?: string;
  chainHash?: string;
  qrCodeData?: string;
  currency?: string;
  
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

// --- MODULE RESSOURCES HUMAINES & BILAN COMMERCIAL ---

export interface RhEmployee {
  id: string | number;
  nom: string;
  prenom: string;
  site: string;
  type: 'permanent' | 'temporaire' | string;
  salaireBase: number;
  contact: string;
  statut: 'actif' | 'renvoye' | string;
  dateRenvoi?: string | null;
  dateEmbauche?: string | null;
  [key: string]: any;
}

export interface AttendanceDetail {
  arrivalTime?: string;
  justification?: string;
  absenceReason?: string;
  halfDayPeriod?: 'morning' | 'afternoon';
  [key: string]: any;
}

export interface RhPayrollExtras {
  prime: number;
  dette: number;
  retenue: number;
}

export interface RhAppDataPayload {
  employees: RhEmployee[];
  attendance?: Record<string, number>;
  attendanceDetails?: Record<string, AttendanceDetail>;
  dailyNotes?: Record<string, string>;
  payrollExtras?: Record<string, RhPayrollExtras>;
  visibleSundays?: string[];
  [key: string]: any;
}

export interface DailyRecordItem {
  id?: string | number;
  name?: string;
  qty: number;
  price?: number;
  cost?: number;
}

export interface DailyRecord {
  id: string | number;
  date: string;
  total?: number;
  totalCost?: number;
  items?: DailyRecordItem[];
  clientName?: string;
  paymentMethod?: string;
  [key: string]: any;
}

export interface Quote {
  id: string | number;
  date: string;
  total?: number;
  clientName?: string;
  status?: string;
  items?: DailyRecordItem[];
  [key: string]: any;
}

export interface Income {
  id: string | number;
  date: string;
  amount: number;
  description?: string;
  source?: string;
  receivedBy?: string;
  paymentMethod?: string;
  [key: string]: any;
}

