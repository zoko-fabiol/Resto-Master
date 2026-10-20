import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  RestaurantSettings,
  RestaurantTable,
  Category,
  StockItem,
  StockMovement,
  Product,
  Order,
  OrderItem,
  OrderStatus,
  TableStatus,
  Reservation,
  Supplier,
  PurchaseOrder,
  Customer,
  Employee,
  Attendance,
  CashRegisterSession,
  CashMovement,
  Expense,
  DocumentItem,
  AuditLog,
  NotificationItem,
  Payment,
  PaymentMethod,
  Inventory,
  StockLot,
  HygieneCheck,
  RestaurantEvent,
  DeliveryOrder,
  WithholdingRecord,
  FiscalObligation,
  ClientCreditAccount,
  CancellationLog,
  FiscalJournalItem,
  Invoice,
  TaxRegime,
  UserRole,
  Organization,
  Zone,
  CashRegister,
  TableShape,
  MediaAsset,
  UserAccount,
  TabPermission,
  AccountType,
  WeeklySchedule,
  DecorElement,
  LayoutLock,
} from '../types/restaurant';
import { FloorPlanDiffResult } from '../components/tables/floorPlanDiff';
import {
  FeatureItem,
  FeatureStatus,
  Outlet,
  Terminal,
  DeviceProfile,
  Peripheral,
  PrinterSettings,
  OperationRules,
  RoleLimits,
  RolePermissionMatrix,
  PermissionModule,
  PermissionAction,
  ConfigurationHistoryItem,
  ConfigurationAlert,
  ConfigurationProfileType,
} from '../types/configuration';
import {
  DEFAULT_FEATURES,
  DEFAULT_ROLE_LIMITS,
  DEFAULT_OPERATION_RULES,
  DEFAULT_SETTINGS,
  DEFAULT_ORGANIZATION,
  DEFAULT_CASH_SESSION,
  DEFAULT_PERMISSIONS,
} from '../config/defaults';
import { FeatureService } from '../services/features/featureService';
import { generateOrderNumber, generateSecureId } from '../lib/utils';
import { cloudFunctionsService } from '../services/functions/cloudFunctionsService';
import { TaxEngine } from '../services/fiscal/taxEngine';
import { hashPin } from '../services/security/cryptoService';

import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { ordersFirestoreService } from '../services/firestore/ordersFirestoreService';
import { tablesFirestoreService } from '../services/firestore/tablesFirestoreService';
import { documentsFirestoreService } from '../services/firestore/documentsFirestoreService';
import { restaurantFirestoreService } from '../services/firestore/restaurantFirestoreService';
import { productsFirestoreService } from '../services/firestore/productsFirestoreService';
import { stockFirestoreService } from '../services/firestore/stockFirestoreService';
import { cashFirestoreService } from '../services/firestore/cashFirestoreService';
import { reservationsFirestoreService } from '../services/firestore/reservationsFirestoreService';
import { staffFirestoreService } from '../services/firestore/staffFirestoreService';
import { fiscalFirestoreService } from '../services/firestore/fiscalFirestoreService';
import { configFirestoreService } from '../services/firestore/configFirestoreService';
import { offlineSyncService } from '../services/firestore/offlineSyncService';
import { printerService } from '../services/printing/printerService';
import { cloudinaryService } from '../services/media/cloudinaryService';
import { customersFirestoreService } from '../services/firestore/customersFirestoreService';

function isNetworkOrOfflineError(err: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (!err) return false;
  const code = (err.code || '').toString().toLowerCase();
  const message = (err.message || '').toString().toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('network') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('offline') ||
    message.includes('timeout')
  );
}

interface RestaurantContextType {
  settings: RestaurantSettings;
  updateSettings: (newSettings: Partial<RestaurantSettings>) => void;
  categories: Category[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  stockLots: StockLot[];
  products: Product[];
  tables: RestaurantTable[];
  orders: Order[];
  reservations: Reservation[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  employees: Employee[];
  attendances: Attendance[];
  cashSession: CashRegisterSession;
  cashMovements: CashMovement[];
  expenses: Expense[];
  documents: DocumentItem[];
  mediaAssets: MediaAsset[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;

  // Nouveaux Modules & Traçabilité (Cameroun)
  hygieneChecks: HygieneCheck[];
  events: RestaurantEvent[];
  deliveries: DeliveryOrder[];
  withholdings: WithholdingRecord[];
  fiscalObligations: FiscalObligation[];
  clientCredits: ClientCreditAccount[];
  cancellationLogs: CancellationLog[];
  fiscalJournal: FiscalJournalItem[];
  invoices: Invoice[];
  isOnline: boolean;
  offlineQueueCount: number;

  // Actions Existantes & Renforcées
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderItemStatus: (
    orderId: string,
    itemId: string,
    status: 'en_attente' | 'en_preparation' | 'pret' | 'servi'
  ) => Promise<void>;
  recordOrderPayment: (
    orderId: string,
    amount: number,
    method: PaymentMethod,
    note?: string,
    idempotencyKey?: string
  ) => Promise<void>;
  addItemsToOrder: (orderId: string, newItems: OrderItem[], guestCount?: number) => Promise<Order>;
  updateTableGuestsCount: (tableId: string, count: number) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  createReservation: (resData: Omit<Reservation, 'id' | 'createdAt'>) => Promise<void>;
  updateReservationStatus: (resId: string, status: Reservation['status']) => Promise<void>;
  seatReservation: (reservationId: string, tableId: string) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'timestamp' | 'userName'>) => Promise<void>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  toggleProductAvailability: (productId: string) => Promise<void>;
  submitInventoryAudit: (inventory: Omit<Inventory, 'id'>) => Promise<void>;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => Promise<void>;
  receivePurchaseOrder: (poId: string, invoiceNum?: string) => Promise<void>;
  createSupplier: (supplier: Omit<Supplier, 'id' | 'totalPurchases' | 'currentBalanceDue'>) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'recordedBy'>) => Promise<void>;
  approveExpense: (expenseId: string) => Promise<void>;
  recordCashMovement: (type: CashMovement['type'], amount: number, reason: string) => Promise<void>;
  closeCashRegister: (countedTotal: number, notes?: string) => Promise<void>;
  openCashRegister: (initialFloat: number, notes?: string) => Promise<void>;
  addAttendanceRecord: (employeeId: string, status: Attendance['status'], justification?: string) => Promise<void>;
  addDocument: (docItem: Omit<DocumentItem, 'id' | 'uploadedBy'>) => Promise<void>;
  uploadMediaAsset: (
    file: File,
    folder: string,
    category: string,
    entityType?: string,
    entityId?: string
  ) => Promise<MediaAsset>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  syncError: string | null;
  clearSyncError: () => void;
  addNotification: (
    title: string,
    message: string,
    type: NotificationItem['type'],
    module: string,
    priority?: NotificationItem['priority'],
    actionUrl?: string
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  addAuditLog: (action: string, module: AuditLog['module'], details: string, entityId?: string) => void;

  // Nouvelles Actions Métier
  cancelOrderWithAudit: (orderId: string, reason: string, approvedBy?: string) => Promise<void>;
  addStockLot: (lot: Omit<StockLot, 'id'>) => Promise<void>;
  addHygieneCheck: (check: Omit<HygieneCheck, 'id'>) => Promise<void>;
  createEvent: (eventData: Omit<RestaurantEvent, 'id' | 'eventNumber'>) => Promise<void>;
  updateEventStatus: (eventId: string, status: RestaurantEvent['status']) => Promise<void>;
  createDelivery: (delivData: Omit<DeliveryOrder, 'id' | 'deliveryNumber'>) => Promise<void>;
  updateDeliveryStatus: (deliveryId: string, status: DeliveryOrder['status']) => Promise<void>;
  recordWithholding: (withholding: Omit<WithholdingRecord, 'id'>) => Promise<void>;
  recordCreditPayment: (customerId: string, amount: number, note?: string) => Promise<void>;
  updateFiscalObligationStatus: (obligationId: string, status: FiscalObligation['status']) => Promise<void>;
  generateInvoiceForOrder: (
    orderId: string,
    clientInfo?: {
      id?: string;
      name?: string;
      niu?: string;
      rccm?: string;
      address?: string;
      phone?: string;
      regime?: TaxRegime;
      applyWithholding?: boolean;
    }
  ) => Promise<Invoice>;

  // Pilotage Tablette Table (Kiosk) & Verrouillage à distance Admin/Firebase
  lockTableTablet: (tableId: string, reason?: string) => Promise<void>;
  unlockTableTablet: (tableId: string) => Promise<void>;
  lockAllTableTablets: (reason?: string) => Promise<void>;
  unlockAllTableTablets: () => Promise<void>;
  callWaiterFromTablet: (tableId: string) => Promise<void>;
  dismissWaiterCall: (tableId: string) => Promise<void>;
  requestBillFromTablet: (tableId: string) => Promise<void>;
  updateEmployeePin: (employeeId: string, newPin: string) => Promise<void>;
  updateEmployeeWeeklySchedule: (employeeId: string, schedule: WeeklySchedule) => Promise<void>;
  quickReceiveStock: (
    stockItemId: string,
    quantity: number,
    supplierName: string,
    invoiceNumber?: string,
    unitPrice?: number
  ) => Promise<void>;
  sendOrderToCashier: (orderId: string, tableId?: string) => Promise<void>;

  // Gestion des Comptes Utilisateurs & Tablettes Tactiles (Droits Granulaires CRUD par Onglet)
  userAccounts: UserAccount[];
  createUserAccount: (
    accountData: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt'> & { pin?: string; password?: string }
  ) => Promise<UserAccount & { temporaryPassword?: string; generatedPin?: string }>;
  updateUserAccount: (id: string, updates: Partial<UserAccount>) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  toggleUserAccountStatus: (id: string) => Promise<void>;
  updateUserAccountPermissions: (
    id: string,
    tabPermissions: Record<string, TabPermission>,
    additionalTabs: string[]
  ) => Promise<void>;

  // Centre d'Administration & Configuration Professionnel (eZee Optimus style)
  features: FeatureItem[];
  outlets: Outlet[];
  terminals: Terminal[];
  currentDeviceProfile: DeviceProfile | null;
  pairDeviceWithCode: (pairingCode: string) => Promise<DeviceProfile | null>;
  unpairCurrentDevice: () => Promise<void>;
  generateTerminalPairingCode: (terminalId: string) => Promise<string>;
  toggleProduct86: (productId: string) => Promise<void>;
  rolePermissions: RolePermissionMatrix;
  roleLimits: Record<UserRole, RoleLimits>;
  peripherals: Peripheral[];
  configHistory: ConfigurationHistoryItem[];
  configAlerts: ConfigurationAlert[];
  selectedOutletId: string;
  setSelectedOutletId: (outletId: string) => void;
  selectedTerminalId: string;
  setSelectedTerminalId: (terminalId: string) => void;
  adminDisplayMode: 'simple' | 'avance';
  setAdminDisplayMode: (mode: 'simple' | 'avance') => void;

  // Architecture Multi-Restaurants, Organisation & Hiérarchie
  organization: Organization;
  updateOrganization: (orgUpdates: Partial<Organization>) => Promise<void>;
  activeRestaurant: Outlet | undefined;
  changeActiveRestaurant: (outletId: string) => void;
  zones: Zone[];
  allZones: Zone[];
  cashRegisters: CashRegister[];
  allCashRegisters: CashRegister[];
  activeZoneId: string | 'all';
  setActiveZoneId: (zoneId: string | 'all') => void;
  activeCashRegisterId: string;
  setActiveCashRegisterId: (regId: string) => void;

  // Gestion des Salles / Zones
  addZone: (zone: Omit<Zone, 'id'>) => Promise<Zone>;
  updateZone: (zoneId: string, updates: Partial<Zone>) => Promise<void>;
  deleteZone: (zoneId: string) => Promise<void>;

  // Gestion des Tables & Plan de Salle 2D
  addTable: (table: Omit<RestaurantTable, 'id'>) => Promise<RestaurantTable>;
  updateTable: (tableId: string, updates: Partial<RestaurantTable>) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  mergeTables: (targetTableId: string, sourceTableId: string) => Promise<void>;
  splitTables: (tableId: string) => Promise<void>;
  batchSaveTables: (tables: RestaurantTable[]) => Promise<void>;
  batchSaveDecorElements: (elements: DecorElement[], removedIds?: string[]) => Promise<void>;
  saveFloorPlanDiff: (diff: FloorPlanDiffResult) => Promise<void>;
  addTablesBatch: (tables: Omit<RestaurantTable, 'id'>[]) => Promise<RestaurantTable[]>;
  decorElements: DecorElement[];
  saveDecorElement: (decor: DecorElement) => Promise<void>;
  deleteDecorElement: (decorId: string) => Promise<void>;
  acquireLayoutLock: (zoneId: string, user: { id: string; name: string; role?: string }) => Promise<{ success: boolean; lock?: LayoutLock; message?: string }>;
  renewLayoutLock: (zoneId: string, userId: string) => Promise<boolean>;
  releaseLayoutLock: (zoneId: string, userId: string) => Promise<void>;

  // Caisses
  addCashRegister: (reg: Omit<CashRegister, 'id'>) => Promise<void>;

  // Données Globales Groupe
  allTables: RestaurantTable[];
  allOrders: Order[];
  allReservations: Reservation[];

  // Actions Administration & Configuration
  updateFeatureStatus: (featureId: string, status: FeatureStatus) => Promise<void>;
  updateFeatureConfig: (featureId: string, config: Record<string, any>) => Promise<void>;
  updateRolePermission: (role: UserRole, module: PermissionModule, action: PermissionAction, allowed: boolean) => Promise<void>;
  updateRoleLimits: (role: UserRole, limits: Partial<RoleLimits>) => Promise<void>;
  applyConfigProfile: (profile: ConfigurationProfileType) => Promise<void>;
  addOutlet: (outlet: Omit<Outlet, 'id'> | Outlet) => Promise<Outlet>;
  updateOutlet: (id: string, updates: Partial<Outlet>) => Promise<void>;
  deleteOutlet: (id: string) => Promise<void>;
  addTerminal: (terminal: Omit<Terminal, 'id'>) => Promise<void>;
  updateTerminal: (id: string, updates: Partial<Terminal>) => Promise<void>;
  deleteTerminal: (id: string) => Promise<void>;
  addPeripheral: (periph: Omit<Peripheral, 'id'>) => Promise<void>;
  updatePeripheral: (id: string, updates: Partial<Peripheral>) => Promise<void>;
  deletePeripheral: (id: string) => Promise<void>;
  printerSettings: PrinterSettings;
  updatePrinterSettings: (settings: Partial<PrinterSettings>) => Promise<void>;
  operationRules: OperationRules;
  updateOperationRules: (updates: Partial<OperationRules>) => Promise<void>;
  isRuleEnabled: (ruleKey: string, defaultValue?: boolean) => boolean;
  isFeatureEnabled: (featureId: string) => boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [syncError, setSyncError] = useState<string | null>(null);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const handleSyncError = useCallback(
    (operation: string, error: unknown) => {
      const errorMsg = error instanceof Error ? error.message : 'Erreur de communication Firestore';
      console.error(`[RestoMaster OS] Échec d'écriture Firestore (${operation}) :`, error);
      setSyncError(`Échec de synchronisation (${operation}): ${errorMsg}`);
      showToast({
        title: 'Erreur de synchronisation Cloud',
        message: `Impossible d'enregistrer "${operation}" sur le serveur : ${errorMsg}`,
        type: 'error',
      });
    },
    [showToast]
  );

  // Versionnage et purge automatique des données résiduelles de test
  const STORAGE_VERSION_KEY = 'restomaster_storage_version';
  const CURRENT_STORAGE_VERSION = '2.0.0-clean';

  if (typeof window !== 'undefined') {
    try {
      const version = localStorage.getItem(STORAGE_VERSION_KEY);
      if (version !== CURRENT_STORAGE_VERSION) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith('restomaster_') ||
              key.startsWith('rh_app_') ||
              key.startsWith('stock_expert_') ||
              key.startsWith('pos_') ||
              key === 'rh_app_data')
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
      }
    } catch (e) {
      console.warn('[Storage] Purge error:', e);
    }
  }

  // Local state with localStorage fallback pour les configurations uniquement
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`restomaster_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveState = <T,>(key: string, value: T): void => {
    try {
      localStorage.setItem(`restomaster_${key}`, JSON.stringify(value));
    } catch {
      // ignore
    }
  };

  const [settings, setSettings] = useState<RestaurantSettings>(() => loadState('settings', DEFAULT_SETTINGS));
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [cashSession, setCashSession] = useState<CashRegisterSession>(() => loadState('cashSession', DEFAULT_CASH_SESSION));
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Nouveaux Modules & Données Métier Cameroun
  const [stockLots, setStockLots] = useState<StockLot[]>([]);
  const [hygieneChecks, setHygieneChecks] = useState<HygieneCheck[]>([]);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [withholdings, setWithholdings] = useState<WithholdingRecord[]>([]);
  const [fiscalObligations, setFiscalObligations] = useState<FiscalObligation[]>([]);
  const [clientCredits, setClientCredits] = useState<ClientCreditAccount[]>([]);
  const [cancellationLogs, setCancellationLogs] = useState<CancellationLog[]>([]);
  const [fiscalJournal, setFiscalJournal] = useState<FiscalJournalItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => loadState('offlineQueue', []));

  // Centre d'Administration & Configuration Professionnel
  const [features, setFeatures] = useState<FeatureItem[]>(() => loadState('features', DEFAULT_FEATURES));
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [currentDeviceProfile, setCurrentDeviceProfile] = useState<DeviceProfile | null>(() => {
    try {
      const saved = localStorage.getItem('restomaster_device_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(() => loadState('rolePermissions', DEFAULT_PERMISSIONS));
  const [roleLimits, setRoleLimits] = useState<Record<UserRole, RoleLimits>>(() => loadState('roleLimits', DEFAULT_ROLE_LIMITS));
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(() =>
    loadState('printerSettings', {
      autoPrintReceiptOnPayment: true,
      autoPrintKitchenOnOrder: true,
      autoOpenCashDrawerOnCash: true,
      receiptCopiesCount: 1,
    })
  );
  const [operationRules, setOperationRules] = useState<OperationRules>(() =>
    loadState('operations_rules', DEFAULT_OPERATION_RULES)
  );
  const [configHistory, setConfigHistory] = useState<ConfigurationHistoryItem[]>([]);
  const [configAlerts, setConfigAlerts] = useState<ConfigurationAlert[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => loadState('selectedOutletId', ''));
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(() => loadState('selectedTerminalId', ''));
  const [adminDisplayMode, setAdminDisplayMode] = useState<'simple' | 'avance'>('avance');

  // Architecture Multi-Restaurants & Organisation
  const [organization, setOrganization] = useState<Organization>(() => loadState('organization', DEFAULT_ORGANIZATION));
  const [zones, setZones] = useState<Zone[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [decorElements, setDecorElements] = useState<DecorElement[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | 'all'>(() => loadState('activeZoneId', 'all'));
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<string>(() => loadState('activeCashRegisterId', ''));

  // Restaurant Actif & Données Filtrées
  const activeRestaurant = useMemo(() => {
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  }, [outlets, selectedOutletId]);

  const activeTables = useMemo(() => {
    return tables.filter((t) => !t.restaurantId || t.restaurantId === selectedOutletId);
  }, [tables, selectedOutletId]);

  const activeDecorElements = useMemo(() => {
    return decorElements.filter((d) => !d.restaurantId || d.restaurantId === selectedOutletId);
  }, [decorElements, selectedOutletId]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => !o.restaurantId || o.restaurantId === selectedOutletId);
  }, [orders, selectedOutletId]);

  const activeReservations = useMemo(() => {
    return reservations.filter((r) => !r.restaurantId || r.restaurantId === selectedOutletId);
  }, [reservations, selectedOutletId]);

  const activeZones = useMemo(() => {
    return zones.filter((z) => !z.restaurantId || z.restaurantId === selectedOutletId);
  }, [zones, selectedOutletId]);

  const activeCashRegisters = useMemo(() => {
    return cashRegisters.filter((r) => !r.restaurantId || r.restaurantId === selectedOutletId);
  }, [cashRegisters, selectedOutletId]);

  // Écouteur statut réseau (Offline / Online)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline sync queue subscriber
  useEffect(() => {
    const unsub = offlineSyncService.subscribe((queue) => {
      setOfflineQueue(queue);
    });
    return () => unsub();
  }, []);

  // Firestore Real-Time Sync Listeners scoped to Active Outlet & Group
  useEffect(() => {
    if (!selectedOutletId) return;

    const unsubOrders = ordersFirestoreService.subscribeToRestaurantOrders(
      selectedOutletId,
      (remoteOrders) => {
        setOrders((prev) => {
          const others = prev.filter((o) => o.restaurantId && o.restaurantId !== selectedOutletId);
          return [...remoteOrders, ...others];
        });
      }
    );

    const unsubTables = tablesFirestoreService.subscribeToRestaurantTables(
      selectedOutletId,
      (remoteTables) => {
        setTables((prev) => {
          const others = prev.filter((t) => t.restaurantId && t.restaurantId !== selectedOutletId);
          return [...remoteTables, ...others];
        });
      }
    );

    const unsubZones = tablesFirestoreService.subscribeToRestaurantZones(
      selectedOutletId,
      (remoteZones) => {
        setZones((prev) => {
          const others = prev.filter((z) => z.restaurantId && z.restaurantId !== selectedOutletId);
          return [...remoteZones, ...others];
        });
      }
    );

    const unsubDecor = tablesFirestoreService.subscribeToRestaurantDecorElements(
      selectedOutletId,
      (remoteDecor) => {
        setDecorElements((prev) => {
          const others = prev.filter((d) => d.restaurantId && d.restaurantId !== selectedOutletId);
          return [...remoteDecor, ...others];
        });
      }
    );

    const unsubDocs = documentsFirestoreService.subscribeToDocuments(
      selectedOutletId,
      (remoteDocs) => {
        setDocuments((prev) => {
          const map = new Map(prev.map((d) => [d.id, d]));
          remoteDocs.forEach((d) => map.set(d.id, d));
          return Array.from(map.values());
        });
      }
    );

    const unsubAssets = documentsFirestoreService.subscribeToMediaAssets(
      organization.id,
      (remoteAssets) => {
        setMediaAssets((prev) => {
          const map = new Map(prev.map((a) => [a.id, a]));
          remoteAssets.forEach((a) => map.set(a.id, a));
          return Array.from(map.values());
        });
      }
    );

    // Menu & Produits
    const unsubProducts = productsFirestoreService.subscribeToProducts(selectedOutletId, setProducts);
    const unsubCategories = productsFirestoreService.subscribeToCategories(setCategories);

    // Stocks & Lots
    const unsubStockItems = stockFirestoreService.subscribeToStockItems(selectedOutletId, setStockItems);
    const unsubStockMovements = stockFirestoreService.subscribeToStockMovements(setStockMovements);
    const unsubStockLots = stockFirestoreService.subscribeToStockLots(setStockLots);
    const unsubSuppliers = stockFirestoreService.subscribeToSuppliers(setSuppliers);
    const unsubPurchaseOrders = stockFirestoreService.subscribeToPurchaseOrders(setPurchaseOrders);
    const unsubHygieneChecks = stockFirestoreService.subscribeToHygieneChecks(setHygieneChecks);

    // Caisse & Finances
    const unsubCashRegisters = cashFirestoreService.subscribeToCashRegisters(selectedOutletId, setCashRegisters);
    const unsubCashMovements = cashFirestoreService.subscribeToCashMovements(setCashMovements);
    const unsubExpenses = cashFirestoreService.subscribeToExpenses(setExpenses);
    const unsubCustomers = cashFirestoreService.subscribeToCustomers(setCustomers);
    const unsubClientCredits = cashFirestoreService.subscribeToClientCredits(setClientCredits);

    // Réservations, Événements & Livraisons
    const unsubReservations = reservationsFirestoreService.subscribeToReservations(selectedOutletId, setReservations);
    const unsubDeliveries = reservationsFirestoreService.subscribeToDeliveries(setDeliveries);
    const unsubEvents = reservationsFirestoreService.subscribeToEvents(setEvents);

    // RH, Personnel & Comptes
    const unsubUserAccounts = staffFirestoreService.subscribeToUsers(setUserAccounts);
    const unsubEmployees = staffFirestoreService.subscribeToEmployees(setEmployees);
    const unsubAttendances = staffFirestoreService.subscribeToAttendances(setAttendances);

    // Fiscalité & Facturation
    const unsubInvoices = fiscalFirestoreService.subscribeToInvoices(selectedOutletId, setInvoices);
    const unsubFiscalJournal = fiscalFirestoreService.subscribeToFiscalJournal(selectedOutletId, setFiscalJournal);
    const unsubWithholdings = fiscalFirestoreService.subscribeToWithholdings(setWithholdings);
    const unsubFiscalObligations = fiscalFirestoreService.subscribeToFiscalObligations(setFiscalObligations);
    const unsubCancellationLogs = fiscalFirestoreService.subscribeToCancellationLogs(setCancellationLogs);

    // Configuration & Système
    const unsubOutlets = restaurantFirestoreService.subscribeToOutlets(undefined, (list) => {
      setOutlets(list);
      if (list.length > 0 && !selectedOutletId) {
        setSelectedOutletId(list[0].id);
      }
    });
    const unsubOrg = restaurantFirestoreService.subscribeToOrganization(organization.id, (remoteOrg) => {
      if (remoteOrg) setOrganization(remoteOrg);
    });
    const unsubSettings = restaurantFirestoreService.subscribeToSettings(selectedOutletId, (remoteSettings) => {
      if (remoteSettings) setSettings(remoteSettings);
    });
    const unsubFeatures = configFirestoreService.subscribeToFeatures(setFeatures);
    const unsubTerminals = configFirestoreService.subscribeToTerminals(setTerminals);
    const unsubPeripherals = configFirestoreService.subscribeToPeripherals(setPeripherals);
    const unsubRolePermissions = configFirestoreService.subscribeToRolePermissions(setRolePermissions);
    const unsubRoleLimits = configFirestoreService.subscribeToRoleLimits(setRoleLimits);
    const unsubPrinterSettings = configFirestoreService.subscribeToPrinterSettings(setPrinterSettings);
    const unsubOperationRules = configFirestoreService.subscribeToOperationRules(setOperationRules);
    const unsubConfigHistory = configFirestoreService.subscribeToConfigHistory(setConfigHistory);
    const unsubAuditLogs = configFirestoreService.subscribeToAuditLogs(setAuditLogs);
    const unsubNotifications = configFirestoreService.subscribeToNotifications(setNotifications);

    return () => {
      unsubOrders();
      unsubTables();
      unsubZones();
      unsubDecor();
      unsubDocs();
      unsubAssets();
      unsubProducts();
      unsubCategories();
      unsubStockItems();
      unsubStockMovements();
      unsubStockLots();
      unsubSuppliers();
      unsubPurchaseOrders();
      unsubHygieneChecks();
      unsubCashRegisters();
      unsubCashMovements();
      unsubExpenses();
      unsubCustomers();
      unsubClientCredits();
      unsubReservations();
      unsubDeliveries();
      unsubEvents();
      unsubUserAccounts();
      unsubEmployees();
      unsubAttendances();
      unsubInvoices();
      unsubFiscalJournal();
      unsubWithholdings();
      unsubFiscalObligations();
      unsubCancellationLogs();
      unsubOutlets();
      unsubOrg();
      unsubSettings();
      unsubFeatures();
      unsubTerminals();
      unsubPeripherals();
      unsubRolePermissions();
      unsubRoleLimits();
      unsubPrinterSettings();
      unsubOperationRules();
      unsubConfigHistory();
      unsubAuditLogs();
      unsubNotifications();
    };
  }, [selectedOutletId, organization.id]);

  const addAuditLog = useCallback(
    (action: string, module: AuditLog['module'], details: string, entityId?: string) => {
      const newLog: AuditLog = {
        id: generateSecureId('log'),
        timestamp: new Date().toISOString(),
        userName: currentUser.name,
        userRole: currentUser.role,
        action,
        module,
        details,
        entityId,
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 199)]);

      cloudFunctionsService
        .appendAuditLog({
          action,
          module,
          details,
          entityId,
          restaurantId: selectedOutletId,
        })
        .then((res) => {
          if (res?.logId) {
            setAuditLogs((prev) =>
              prev.map((l) => (l.id === newLog.id ? { ...l, id: res.logId } : l))
            );
          }
        })
        .catch(() => {
          configFirestoreService.appendAuditLog(newLog).catch((err) => {
            handleSyncError('Journalisation audit', err);
          });
        });
    },
    [currentUser, handleSyncError, selectedOutletId]
  );

  const addNotification = useCallback(
    (title: string, message: string, type: NotificationItem['type'], module: string, priority: NotificationItem['priority'] = 'moyenne', actionUrl?: string) => {
      const newNotif: NotificationItem = {
        id: generateSecureId('notif'),
        title,
        message,
        type,
        module,
        priority,
        read: false,
        timestamp: new Date().toISOString(),
        actionUrl,
      };
      setNotifications((prev) => [newNotif, ...prev]);
      configFirestoreService.saveNotification(newNotif).catch((err) => {
        console.warn('Erreur écriture notification Firestore:', err);
      });
    },
    []
  );

  // Check low stocks automatically
  useEffect(() => {
    stockItems.forEach((item) => {
      if (item.currentQuantity <= item.minThreshold) {
        // check if already notified today
        const existing = notifications.some(
          (n) => n.module === 'Stocks' && n.title.includes(item.name)
        );
        if (!existing) {
          addNotification(
            `Alerte Stock : ${item.name}`,
            `Quantité (${item.currentQuantity} ${item.unit}) inférieure au seuil minimum (${item.minThreshold} ${item.unit}).`,
            'alert',
            'Stocks',
            'haute',
            'stock'
          );
        }
      }
    });
  }, [stockItems, notifications, addNotification]);

  // Historique centralisé des modifications de configuration (Audit Trail)
  const logConfigHistory = useCallback(
    async (
      category: string,
      action: string,
      detail: string,
      oldValue?: string,
      newValue?: string,
      featureKey?: string
    ) => {
      try {
        const historyItem: ConfigurationHistoryItem = {
          id: generateSecureId('cfghist'),
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'Administrateur',
          category,
          action,
          detail,
          oldValue,
          newValue,
          featureKey,
        };
        setConfigHistory((prev) => [historyItem, ...prev.slice(0, 99)]);
        await configFirestoreService.appendConfigHistory(historyItem);
      } catch (err) {
        console.warn('Erreur écriture historique configuration Firestore:', err);
      }
    },
    [currentUser]
  );

  // Update Settings
  const updateSettings = async (newSettings: Partial<RestaurantSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await restaurantFirestoreService.saveSettings(updated);
      await logConfigHistory('Général', 'Mise à jour paramètres', 'Modification configuration générale');
      showToast({
        title: 'Paramètres enregistrés',
        message: 'Configuration générale enregistrée avec succès.',
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Paramètres restaurant', err);
      throw err;
    }
    addAuditLog('Mise à jour paramètres restaurant', 'Paramètres', 'Modification configuration générale');
  };

  // Déduction atomique de stock avec gestion du négatif réel et lots FEFO
  const deductStockForOrderItems = async (
    items: OrderItem[],
    orderNumber: string,
    orderId: string
  ) => {
    if (!settings.enableStockAutoDeduction) return;
    const now = new Date().toISOString();

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.ingredients && prod.ingredients.length > 0) {
        for (const ing of prod.ingredients) {
          const consumedQty = ing.quantityRequired * item.quantity;
          const delta = -consumedQty;

          // État local pré-calculé (autorise le stock négatif réel sans clamp Math.max)
          const currentItem = stockItems.find((s) => s.id === ing.stockItemId);
          const previousQuantity = currentItem ? currentItem.currentQuantity : 0;
          const newQuantity = Math.round((previousQuantity + delta) * 100) / 100;

          setStockItems((prevStk) =>
            prevStk.map((s) =>
              s.id === ing.stockItemId
                ? { ...s, currentQuantity: newQuantity, lastUpdated: now }
                : s
            )
          );

          const movement: StockMovement = {
            id: generateSecureId('mv'),
            stockItemId: ing.stockItemId,
            stockItemName: ing.stockItemName,
            type: 'sortie_consommation',
            quantityChange: delta,
            previousQuantity,
            newQuantity,
            unit: ing.unit,
            reason: `Vente commande ${orderNumber} (${item.quantity}x ${item.productName})`,
            referenceId: orderId,
            userName: currentUser.name,
            timestamp: now,
          };
          setStockMovements((prev) => [movement, ...prev]);

          // Déduction atomique Firestore par transaction avec increment()
          stockFirestoreService
            .deductStockItemAtomically(ing.stockItemId, delta, {
              type: 'sortie_consommation',
              reason: `Vente commande ${orderNumber} (${item.quantity}x ${item.productName})`,
              unit: ing.unit,
              referenceId: orderId,
              userId: currentUser.id,
              userName: currentUser.name,
            })
            .then((res) => {
              if (res.isNegative && isRuleEnabled('notif_stock_critique', true)) {
                addNotification(
                  'Alerte Stock Négatif Critique',
                  `L'article "${ing.stockItemName}" est en rupture / stock négatif (${res.newQuantity} ${ing.unit}). Réapprovisionnement urgent requis.`,
                  'alert',
                  'Stock',
                  'haute'
                );
              }
            })
            .catch((err) => {
              handleSyncError('Déduction stock atomique', err);
            });

          // Déstockage des lots selon stratégie FIFO ou FEFO (Section 11)
          const useFifo = isRuleEnabled('stock_fifo', false) && !isRuleEnabled('stock_fefo', true);
          const strategy = useFifo ? 'fifo' : 'fefo';
          stockFirestoreService.deductLots(ing.stockItemId, consumedQty, strategy).catch((err) => {
            console.warn(`[RestaurantContext] Erreur déduction ${strategy.toUpperCase()} lots:`, err);
          });
        }
      }
    }
  };

  // 1. Create Order
  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const now = new Date().toISOString();

    // 1. Tentative d'exécution autoritaire côté serveur (Cloud Functions)
    try {
      const itemsInput = (orderData.items || []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        notes: i.notes,
        destination: i.destination,
      }));
      const cfRes = await cloudFunctionsService.createOrder({
        restaurantId: orderData.restaurantId || selectedOutletId,
        type: orderData.type || 'sur_place',
        tableId: orderData.tableId,
        tableName: orderData.tableName,
        customerId: orderData.customerId,
        customerName: orderData.customerName,
        guestCount: orderData.guestCount,
        items: itemsInput,
        notes: orderData.notes,
        isProforma: orderData.isProforma,
        companyBillingName: orderData.companyBillingName,
        companyBillingNiu: orderData.companyBillingNiu,
        discountPercentRequested: orderData.discountPercentRequested,
        supervisorToken: orderData.supervisorToken,
      });

      if (cfRes?.success && cfRes.order) {
        const serverOrder = cfRes.order as Order;
        setOrders((prev) => [serverOrder, ...prev.filter((o) => o.id !== serverOrder.id)]);
        if (serverOrder.tableId) {
          setTables((prev) =>
            prev.map((t) =>
              t.id === serverOrder.tableId
                ? {
                    ...t,
                    status: 'en_service',
                    currentOrderId: serverOrder.id,
                    assignedServerName: currentUser.name,
                    guestsCount: serverOrder.guestCount || t.guestsCount || t.capacity,
                    timeOccupied: now,
                  }
                : t
            )
          );
        }
        addAuditLog(
          'Création commande POS certifiée',
          'POS',
          `Commande ${serverOrder.orderNumber} créée par Cloud Functions (Total: ${serverOrder.total} ${settings.currency})`,
          serverOrder.id
        );
        return serverOrder;
      }
    } catch (cfErr: any) {
      if (isNetworkOrOfflineError(cfErr)) {
        console.warn('[RestaurantContext] Mode hors-ligne détecté pour createOrder, repli local:', cfErr);
      } else {
        console.error('[RestaurantContext] Refus strict du serveur pour createOrder:', cfErr);
        const errorMsg = cfErr?.message || 'Création de commande refusée par le serveur.';
        addNotification('Échec Création Commande', errorMsg, 'alert', 'POS', 'haute');
        throw new Error(errorMsg);
      }
    }

    // 2. Repli local (hors-ligne provisoire en attente de certification serveur)
    const newOrderNumber = generateOrderNumber(undefined, true);
    const newOrder: Order = {
      id: generateSecureId('ord'),
      orderNumber: newOrderNumber,
      restaurantId: orderData.restaurantId || selectedOutletId,
      type: orderData.type || 'sur_place',
      tableId: orderData.tableId,
      tableName: orderData.tableName,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      serverId: currentUser.id,
      serverName: currentUser.name,
      guestCount: orderData.guestCount,
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      total: orderData.total || 0,
      status: 'envoye',
      paymentStatus: 'non_paye',
      paidAmount: 0,
      notes: orderData.notes,
      createdAt: now,
      updatedAt: now,
      payments: [],
    };

    setOrders((prev) => [newOrder, ...prev]);

    // If assigned to a table, update table status & guestsCount
    if (newOrder.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === newOrder.tableId
            ? {
                ...t,
                status: 'en_service',
                currentOrderId: newOrder.id,
                assignedServerName: currentUser.name,
                guestsCount: newOrder.guestCount || t.guestsCount || t.capacity,
                timeOccupied: now,
              }
            : t
        )
      );
      tablesFirestoreService.updateTableStatus(newOrder.tableId, 'en_service').catch((err) => {
        handleSyncError('Statut table en service', err);
      });
    }

    // Déduction atomique de stock si configurée à l'envoi en cuisine
    if (settings.enableStockAutoDeduction && settings.stockDeductionTiming !== 'encaissement') {
      deductStockForOrderItems(newOrder.items, newOrder.orderNumber, newOrder.id);
    }

    addAuditLog(
      'Création commande POS (Provisoire Hors-Ligne)',
      'POS',
      `Nouvelle commande ${newOrder.orderNumber} enregistrée en local (Total: ${newOrder.total} ${settings.currency})`,
      newOrder.id
    );

    addNotification(
      `Nouvelle commande ${newOrder.orderNumber}`,
      `Envoyée en préparation pour ${newOrder.tableName || 'À emporter'} (${newOrder.items.length} articles).`,
      'info',
      'Cuisine',
      'moyenne',
      'kitchen_kds'
    );

    await ordersFirestoreService.saveOrder(newOrder);

    return newOrder;
  };

  // 1b. Ajouter des articles à une commande existante (Synchronisation POS & Tablette Convives)
  const addItemsToOrder = async (
    orderId: string,
    newItems: OrderItem[],
    guestCount?: number
  ): Promise<Order> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) throw new Error('Commande introuvable');

    const now = new Date().toISOString();

    // 1. Tentative Cloud Functions
    try {
      const itemsInput = newItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        notes: i.notes,
        destination: i.destination,
      }));
      const cfRes = await cloudFunctionsService.addItemsToOrder(orderId, itemsInput, guestCount);

      if (cfRes?.success) {
        // Le serveur a mis à jour la commande et déduit les stocks dans la transaction Firestore
        const updatedItems = [...targetOrder.items, ...newItems];
        const updatedOrder: Order = {
          ...targetOrder,
          items: updatedItems,
          total: cfRes.total ?? targetOrder.total,
          guestCount: guestCount || targetOrder.guestCount,
          updatedAt: now,
        };

        setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

        if (targetOrder.tableId) {
          setTables((prev) =>
            prev.map((t) =>
              t.id === targetOrder.tableId
                ? {
                    ...t,
                    status: 'en_service',
                    currentOrderId: targetOrder.id,
                    guestsCount: guestCount || t.guestsCount,
                  }
                : t
            )
          );
        }

        addAuditLog(
          'Ajout articles commande certifié',
          'POS',
          `${newItems.length} article(s) ajouté(s) à la commande ${targetOrder.orderNumber} par Cloud Functions`,
          targetOrder.id
        );

        return updatedOrder;
      }
    } catch (cfErr: any) {
      if (isNetworkOrOfflineError(cfErr)) {
        console.warn('[RestaurantContext] Mode hors-ligne détecté pour addItemsToOrder, repli local:', cfErr);
      } else {
        console.error('[RestaurantContext] Refus strict du serveur pour addItemsToOrder:', cfErr);
        const errorMsg = cfErr?.message || 'Ajout d\'articles refusé par le serveur.';
        addNotification('Échec Ajout Articles', errorMsg, 'alert', 'POS', 'haute');
        throw new Error(errorMsg);
      }
    }

    const updatedItems = [...targetOrder.items, ...newItems];

    // Calcul du nouveau sous-total
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    // Calcul TVA / Taxe
    const taxRate = settings.taxRate || 19.25;
    const newTax = Math.round((newSubtotal * taxRate) / 100);
    const newTotal = newSubtotal + newTax - (targetOrder.discount || 0);

    const updatedGuestCount = guestCount || targetOrder.guestCount;

    const updatedOrder: Order = {
      ...targetOrder,
      items: updatedItems,
      subtotal: newSubtotal,
      tax: newTax,
      total: newTotal,
      guestCount: updatedGuestCount,
      status: targetOrder.status === 'payee' || targetOrder.status === 'annulee' ? targetOrder.status : 'envoye',
      updatedAt: now,
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // Si la commande est liée à une table, synchroniser guestsCount sur la table
    if (targetOrder.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === targetOrder.tableId
            ? {
                ...t,
                status: 'en_service',
                currentOrderId: targetOrder.id,
                guestsCount: updatedGuestCount || t.guestsCount,
              }
            : t
        )
      );
    }

    // Déduction atomique de stock si configurée à l'envoi en cuisine
    if (settings.enableStockAutoDeduction && settings.stockDeductionTiming !== 'encaissement') {
      deductStockForOrderItems(newItems, targetOrder.orderNumber, targetOrder.id);
    }

    addAuditLog(
      'Ajout articles commande',
      'POS',
      `${newItems.length} article(s) ajouté(s) à la commande ${targetOrder.orderNumber} (${targetOrder.tableName || ''})`,
      targetOrder.id
    );

    addNotification(
      `Articles ajoutés : ${targetOrder.orderNumber}`,
      `Nouveaux plats/boissons ajoutés à la ${targetOrder.tableName || 'table'}.`,
      'info',
      'Cuisine',
      'moyenne',
      'kitchen_kds'
    );

    await ordersFirestoreService.saveOrder(updatedOrder);

    return updatedOrder;
  };

  // 1c. Mettre à jour le nombre de couverts d'une table
  const updateTableGuestsCount = async (tableId: string, count: number): Promise<void> => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId ? { ...t, guestsCount: count } : t
      )
    );
    const targetTable = tables.find((t) => t.id === tableId);
    if (targetTable?.currentOrderId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === targetTable.currentOrderId ? { ...o, guestCount: count } : o
        )
      );
    }
    addAuditLog(
      'Mise à jour couverts table',
      'Tables',
      `Nombre de couverts défini à ${count} pour la Table ${targetTable?.number || tableId}`,
      tableId
    );
  };

  // 2. Update Order Status
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    let updatedOrder: Order | undefined;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          // If status is 'servi', mark items as 'servi' too
          let newItems = o.items;
          if (status === 'servi') {
            newItems = o.items.map((it) => ({
              ...it,
              status: 'servi',
              servedAt: it.servedAt || now,
            }));
          } else if (status === 'pret') {
            newItems = o.items.map((it) => ({
              ...it,
              status: it.status === 'servi' ? 'servi' : 'pret',
              preparedAt: it.preparedAt || now,
            }));
          } else if (status === 'en_preparation') {
            newItems = o.items.map((it) => ({
              ...it,
              status: it.status === 'en_attente' ? 'en_preparation' : it.status,
            }));
          }

          updatedOrder = {
            ...o,
            status,
            items: newItems,
            updatedAt: now,
            preparedAt: status === 'pret' ? (o.preparedAt || now) : o.preparedAt,
            servedAt: status === 'servi' ? (o.servedAt || now) : o.servedAt,
            paidAt: status === 'payee' ? (o.paidAt || now) : o.paidAt,
          };
          return updatedOrder;
        }
        return o;
      })
    );

    // If order becomes ready
    if (status === 'pret' && updatedOrder) {
      addNotification(
        `Commande Prête : ${updatedOrder.orderNumber}`,
        `Les plats/boissons de la ${updatedOrder.tableName || 'commande'} sont prêts à être servis !`,
        'success',
        'Service',
        'haute',
        'tables'
      );
    } else if (status === 'servi' && updatedOrder) {
      addNotification(
        `Commande Servie : ${updatedOrder.orderNumber}`,
        `La table ${updatedOrder.tableName || 'commande'} a été servie. Bon appétit !`,
        'info',
        'Service',
        'moyenne',
        'tables'
      );
    }

    addAuditLog(
      'Changement statut commande',
      'POS',
      `Commande passée au statut ${status}`,
      orderId
    );

    await ordersFirestoreService.updateOrderStatus(orderId, status);
  };

  // 3. Update Order Item Status
  const updateOrderItemStatus = async (
    orderId: string,
    itemId: string,
    status: 'en_attente' | 'en_preparation' | 'pret' | 'servi'
  ) => {
    const now = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              status,
              preparedAt: status === 'pret' ? (item.preparedAt || now) : item.preparedAt,
              servedAt: status === 'servi' ? (item.servedAt || now) : item.servedAt,
            };
          }
          return item;
        });

        // Determine updated order status based on all items
        const allServi = newItems.every((i) => i.status === 'servi');
        const allReadyOrServi = newItems.every((i) => i.status === 'pret' || i.status === 'servi');
        const anyInPrep = newItems.some((i) => i.status === 'en_preparation');

        let nextOrderStatus = order.status;
        if (allServi) {
          nextOrderStatus = 'servi';
        } else if (allReadyOrServi) {
          nextOrderStatus = 'pret';
        } else if (anyInPrep && order.status === 'envoye') {
          nextOrderStatus = 'en_preparation';
        }

        return {
          ...order,
          items: newItems,
          status: nextOrderStatus,
          preparedAt: nextOrderStatus === 'pret' ? (order.preparedAt || now) : order.preparedAt,
          servedAt: nextOrderStatus === 'servi' ? (order.servedAt || now) : order.servedAt,
          updatedAt: now,
        };
      })
    );

    addAuditLog('Mise à jour article KDS', 'Cuisine', `Article marqué "${status}"`, itemId);

    await ordersFirestoreService.updateOrderItemStatus(targetOrder, itemId, status);
  };

  // 4. Record Order Payment
  const recordOrderPayment = async (
    orderId: string,
    amount: number,
    method: PaymentMethod,
    note?: string,
    idempotencyKeyParam?: string
  ) => {
    const now = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const roundedAmount = Math.round(Number(amount));
    if (isNaN(roundedAmount) || roundedAmount <= 0) {
      throw new Error('Le montant du paiement doit être supérieur à zéro.');
    }

    const idempotencyKey =
      idempotencyKeyParam ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : generateSecureId('idemp'));

    // 1. Tentative d'enregistrement de paiement certifié Cloud Functions (idempotent, audit, points fidélité)
    try {
      const cfRes = await cloudFunctionsService.recordPayment({
        orderId,
        amount: roundedAmount,
        method: method as any,
        cashSessionId: cashSession?.id,
        idempotencyKey,
        notes: note,
      });

      if (cfRes?.success) {
        // Le serveur a validé et commis atomiquement la transaction Firestore
        // Mise à jour optimiste locale en attendant onSnapshot :
        const newPaidAmount = cfRes.totalPaid ?? (targetOrder.paidAmount || 0) + roundedAmount;
        const isFullyPaid = cfRes.isFullyPaid;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  paidAmount: newPaidAmount,
                  totalPaid: newPaidAmount,
                  paymentStatus: isFullyPaid ? 'paye' : 'partiel',
                  status: isFullyPaid ? 'payee' : 'partiellement_payee',
                  paidAt: isFullyPaid ? now : o.paidAt,
                  updatedAt: now,
                }
              : o
          )
        );

        if (isFullyPaid && targetOrder.tableId) {
          setTables((prev) =>
            prev.map((t) =>
              t.id === targetOrder.tableId
                ? { ...t, status: 'a_nettoyer', currentOrderId: undefined }
                : t
            )
          );
        }

        // On arrête ici : aucune double écriture cliente (pas de doublon de mouvement de caisse ni d'ordre)
        return;
      }
    } catch (cfErr: any) {
      if (isNetworkOrOfflineError(cfErr)) {
        console.warn('[RestaurantContext] Mode hors-ligne détecté, mise en file d\'attente de recordPayment:', cfErr);
        offlineSyncService.enqueueCloudFunction(
          'recordPayment',
          {
            orderId,
            amount: roundedAmount,
            method,
            cashSessionId: cashSession?.id,
            idempotencyKey,
            notes: note,
          },
          idempotencyKey
        );
      } else {
        // Refus strict du serveur : aucune écriture locale ne doit contourner la décision serveur
        console.error('[RestaurantContext] Refus strict du serveur pour le paiement:', cfErr);
        const errorMsg = cfErr?.message || 'Paiement refusé par le serveur.';
        addNotification('Échec Encaissement', errorMsg, 'alert', 'Caisse', 'haute');
        throw new Error(errorMsg);
      }
    }

    // 2. Repli local UNIQUEMENT en cas de déconnexion réseau avérée
    const payment: Payment = {
      id: generateSecureId('pay'),
      orderId,
      orderNumber: targetOrder.orderNumber,
      amount: roundedAmount,
      method,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      date: now,
      note,
    };

    const newPaidAmount = (targetOrder.paidAmount || 0) + roundedAmount;
    const isFullyPaid = newPaidAmount >= targetOrder.total;

    const updatedOrder: Order = {
      ...targetOrder,
      paidAmount: newPaidAmount,
      totalPaid: newPaidAmount,
      paymentStatus: isFullyPaid ? 'paye' : 'partiel',
      status: isFullyPaid ? 'payee' : 'partiellement_payee',
      paidAt: isFullyPaid ? now : targetOrder.paidAt,
      updatedAt: now,
      payments: [...(targetOrder.payments || []), payment],
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // Libérer la table si soldée
    if (isFullyPaid && targetOrder.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === targetOrder.tableId
            ? { ...t, status: 'a_nettoyer', currentOrderId: undefined }
            : t
        )
      );
      tablesFirestoreService.updateTableStatus(targetOrder.tableId, 'a_nettoyer').catch((err) => {
        handleSyncError('Statut table à nettoyer', err);
      });
    }

    // Mouvement d'espèces en session locale
    if (method === 'especes') {
      const movement: CashMovement = {
        id: generateSecureId('cm'),
        sessionId: cashSession.id,
        type: 'encaissement_vente',
        amount: roundedAmount,
        reason: `Règlement espèces ${targetOrder.orderNumber} (Hors-ligne)`,
        user: currentUser.name,
        timestamp: now,
        referenceDocId: orderId,
      };
      setCashMovements((prev) => [movement, ...prev]);
      cashFirestoreService.saveCashMovement(movement).catch((err) => {
        handleSyncError('Encaissement espèces en caisse', err);
      });
      setCashSession((prev) => {
        const updated = {
          ...prev,
          totalCashIn: prev.totalCashIn + roundedAmount,
          expectedTotal: prev.expectedTotal + roundedAmount,
        };
        cashFirestoreService.saveCashSession(updated).catch((err) => {
          handleSyncError('Session de caisse', err);
        });
        return updated;
      });
    }

    // Fidélité client locale
    if (targetOrder.customerId) {
      const pointsEarned = Math.floor(roundedAmount / 1000);
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetOrder.customerId) {
            const updated = {
              ...c,
              loyaltyPoints: c.loyaltyPoints + pointsEarned,
              totalSpent: c.totalSpent + roundedAmount,
              totalVisits: c.totalVisits + 1,
            };
            customersFirestoreService.saveCustomer(updated).catch((err) => {
              handleSyncError('Fidélité client', err);
            });
            return updated;
          }
          return c;
        })
      );
    }

    // Déduction stock à l'encaissement si configuré
    if (settings.enableStockAutoDeduction && settings.stockDeductionTiming === 'encaissement' && isFullyPaid) {
      deductStockForOrderItems(targetOrder.items, targetOrder.orderNumber, targetOrder.id);
    }

    addAuditLog(
      'Encaissement paiement hors-ligne',
      'Caisse',
      `Paiement hors-ligne de ${roundedAmount} ${settings.currency} (${method}) pour commande ${targetOrder.orderNumber}`,
      orderId
    );

    await ordersFirestoreService.recordOrderPayment(targetOrder, payment);
  };

  // 5. Update Table Status
  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status } : t))
    );
    await tablesFirestoreService.updateTableStatus(tableId, status);
    addAuditLog('Changement statut table', 'Tables', `Table passée au statut ${status}`, tableId);
  };

  // 5b. Pilotage Tablette Kiosk Table & Verrouillage à distance Admin / Firebase
  const lockTableTablet = async (tableId: string, reason: string = 'Verrouillée à distance par la Direction') => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              tabletLocked: true,
              tabletLockedReason: reason,
              tabletLockedAt: new Date().toISOString(),
              tabletLockedBy: currentUser.name,
            }
          : t
      )
    );
    await tablesFirestoreService.updateTableTabletLock(tableId, true, reason, currentUser.name);
    const targetTable = tables.find((t) => t.id === tableId);
    addAuditLog(
      'Verrouillage Tablette Table',
      'Tables',
      `Table ${targetTable?.number || tableId} (${targetTable?.name || ''}) verrouillée à distance par ${currentUser.name}. Motif: ${reason}`,
      tableId
    );
  };

  const unlockTableTablet = async (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              tabletLocked: false,
              tabletLockedReason: undefined,
              tabletLockedAt: undefined,
              tabletLockedBy: undefined,
            }
          : t
      )
    );
    await tablesFirestoreService.updateTableTabletLock(tableId, false);
    const targetTable = tables.find((t) => t.id === tableId);
    addAuditLog(
      'Déverrouillage Tablette Table',
      'Tables',
      `Table ${targetTable?.number || tableId} déverrouillée à distance par ${currentUser.name}`,
      tableId
    );
  };

  const lockAllTableTablets = async (reason: string = 'Verrouillage global Direction') => {
    const tableIds = tables.filter((t) => !selectedOutletId || t.restaurantId === selectedOutletId).map((t) => t.id);
    setTables((prev) =>
      prev.map((t) =>
        !selectedOutletId || t.restaurantId === selectedOutletId
          ? {
              ...t,
              tabletLocked: true,
              tabletLockedReason: reason,
              tabletLockedAt: new Date().toISOString(),
              tabletLockedBy: currentUser.name,
            }
          : t
      )
    );
    for (const tid of tableIds) {
      tablesFirestoreService.updateTableTabletLock(tid, true, reason, currentUser.name).catch((err) => {
        handleSyncError('Verrouillage tablette', err);
      });
    }
    addAuditLog(
      'Verrouillage Global Tablettes',
      'Tables',
      `Toutes les tablettes de l'établissement (${tableIds.length}) verrouillées à distance par ${currentUser.name}`
    );
  };

  const unlockAllTableTablets = async () => {
    const tableIds = tables.filter((t) => !selectedOutletId || t.restaurantId === selectedOutletId).map((t) => t.id);
    setTables((prev) =>
      prev.map((t) =>
        !selectedOutletId || t.restaurantId === selectedOutletId
          ? {
              ...t,
              tabletLocked: false,
              tabletLockedReason: undefined,
              tabletLockedAt: undefined,
              tabletLockedBy: undefined,
            }
          : t
      )
    );
    for (const tid of tableIds) {
      tablesFirestoreService.updateTableTabletLock(tid, false).catch((err) => {
        handleSyncError('Déverrouillage tablette', err);
      });
    }
    addAuditLog(
      'Déverrouillage Global Tablettes',
      'Tables',
      `Toutes les tablettes de l'établissement déverrouillées à distance par ${currentUser.name}`
    );
  };

  const callWaiterFromTablet = async (tableId: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, tabletCallWaiterPending: true } : t))
    );
    await tablesFirestoreService.updateCallWaiterStatus(tableId, true);
    const targetTable = tables.find((t) => t.id === tableId);
    addAuditLog(
      'Appel Serveur Client',
      'Tables',
      `Le client de la Table ${targetTable?.number || tableId} demande un serveur`,
      tableId
    );
  };

  const dismissWaiterCall = async (tableId: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, tabletCallWaiterPending: false } : t))
    );
    await tablesFirestoreService.updateCallWaiterStatus(tableId, false);
  };

  const requestBillFromTablet = async (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId ? { ...t, tabletBillRequested: true, status: 'attente_paiement' } : t
      )
    );
    const targetTable = tables.find((t) => t.id === tableId);
    addAuditLog(
      'Demande Addition Client',
      'Tables',
      `Le client de la Table ${targetTable?.number || tableId} a demandé l'addition depuis sa tablette`,
      tableId
    );
  };

  const updateEmployeePin = async (employeeId: string, newPin: string) => {
    try {
      const { hash, salt } = await hashPin(newPin);
      await setDoc(
        doc(db, 'user_pins', employeeId),
        {
          userId: employeeId,
          hash,
          salt,
          failedAttempts: 0,
          lockoutUntil: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, hasPin: true } : e))
    );
    const emp = employees.find((e) => e.id === employeeId);
    addAuditLog(
      'Modification Code PIN',
      'Personnel',
      `Code PIN sécurisé (PBKDF2) pour l'employé ${emp?.fullName || employeeId}`,
      employeeId
    );
  };

  const updateEmployeeWeeklySchedule = async (employeeId: string, schedule: WeeklySchedule) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, weeklySchedule: schedule } : e))
    );
    const emp = employees.find((e) => e.id === employeeId);
    addAuditLog(
      'Mise à jour planning hebdomadaire',
      'Personnel',
      `Planning de service hebdomadaire mis à jour pour ${emp?.fullName || employeeId}`,
      employeeId
    );
  };

  const quickReceiveStock = async (
    stockItemId: string,
    quantity: number,
    supplierName: string,
    invoiceNumber?: string,
    unitPrice?: number
  ) => {
    const now = new Date().toISOString();
    const item = stockItems.find((s) => s.id === stockItemId);
    if (!item) return;

    const previousQ = item.currentQuantity;
    const newQ = previousQ + quantity;

    setStockItems((prev) =>
      prev.map((s) =>
        s.id === stockItemId
          ? {
              ...s,
              currentQuantity: Math.round(newQ * 100) / 100,
              purchasePrice: unitPrice !== undefined && unitPrice > 0 ? unitPrice : s.purchasePrice,
              supplierName: supplierName || s.supplierName,
              lastUpdated: now,
            }
          : s
      )
    );

    const newMovement: StockMovement = {
      id: generateSecureId('mv-rec'),
      stockItemId: item.id,
      stockItemName: item.name,
      type: 'entree_achat',
      quantityChange: quantity,
      previousQuantity: previousQ,
      newQuantity: newQ,
      unit: item.unit,
      reason: `Réception livraison : ${supplierName || 'Fournisseur'} ${invoiceNumber ? `(Réf: ${invoiceNumber})` : ''}`,
      referenceId: invoiceNumber || undefined,
      userName: currentUser.name,
      timestamp: now,
    };
    setStockMovements((prev) => [newMovement, ...prev]);

    addAuditLog(
      'Réception Marchandises',
      'Stocks',
      `Livraison de +${quantity} ${item.unit} de ${item.name} reçue de ${supplierName}`,
      item.id
    );

    addNotification(
      'Livraison Stock Enregistrée',
      `+${quantity} ${item.unit} de ${item.name} (${supplierName}) ajoutés au stock.`,
      'info',
      'Stock'
    );
  };

  const sendOrderToCashier = async (orderId: string, tableId?: string) => {
    const now = new Date().toISOString();
    let targetTableName = 'Table';

    if (tableId) {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === tableId) {
            targetTableName = `Table ${t.number}`;
            return { ...t, status: 'attente_paiement' };
          }
          return t;
        })
      );
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          if (o.tableName) targetTableName = `Table ${o.tableName}`;
          return { ...o, status: 'attente_paiement', updatedAt: now };
        }
        return o;
      })
    );

    addAuditLog(
      'Envoi Commande à la Caisse',
      'POS',
      `Addition de la ${targetTableName} envoyée à la caisse pour règlement`,
      orderId
    );

    addNotification(
      `Addition en attente : ${targetTableName}`,
      `La commande de la ${targetTableName} a été transmise au poste de caisse pour encaissement.`,
      'warning',
      'Caisse',
      'haute',
      'caisse'
    );
  };

  // 5c. Gestion Sécurisée des Comptes Utilisateurs Serveur (Cloud Functions + Firestore users)
  const createUserAccount = async (
    accountData: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt'> & { pin?: string; password?: string }
  ): Promise<UserAccount & { temporaryPassword?: string; generatedPin?: string }> => {
    let userId: string;
    let temporaryPassword = accountData.password || `Temp${Math.random().toString(36).slice(2, 8)}!`;
    let generatedPin = accountData.pin || Math.floor(1000 + Math.random() * 9000).toString();

    try {
      const res = await cloudFunctionsService.createUser({
        email: accountData.email,
        name: accountData.name,
        role: accountData.role,
        phone: accountData.phone,
        pin: accountData.pin,
        accountType: accountData.accountType,
        assignedTableId: accountData.assignedTableId,
        assignedTableName: accountData.assignedTableName,
        outlets: selectedOutletId ? [selectedOutletId] : undefined,
        organizationId: organization?.id,
      });
      userId = res.userId;
      if (res.temporaryPassword) temporaryPassword = res.temporaryPassword;
      if (res.generatedPin) generatedPin = res.generatedPin;
    } catch {
      // Repli direct Firestore si Cloud Functions non activées
      userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { hash, salt } = await hashPin(generatedPin);
      await setDoc(
        doc(db, 'user_pins', userId),
        {
          userId,
          hash,
          salt,
          failedAttempts: 0,
          lockoutUntil: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await staffFirestoreService.updateUserProfile(userId, {
        name: accountData.name,
        email: accountData.email,
        role: accountData.role,
        accountType: accountData.accountType,
        active: true,
        phone: accountData.phone,
        matricule: accountData.matricule,
        hasPin: true,
        assignedTableId: accountData.assignedTableId,
        assignedTableName: accountData.assignedTableName,
        tabPermissions: accountData.tabPermissions,
        additionalTabs: accountData.additionalTabs,
      });
    }

    if (accountData.matricule || accountData.tabPermissions || accountData.additionalTabs) {
      await staffFirestoreService.updateUserProfile(userId, {
        matricule: accountData.matricule,
        tabPermissions: accountData.tabPermissions,
        additionalTabs: accountData.additionalTabs,
      });
    }

    const nowStr = new Date().toISOString().slice(0, 10);
    const newAccount: UserAccount & { temporaryPassword?: string; generatedPin?: string } = {
      ...accountData,
      id: userId,
      hasPin: true,
      createdAt: nowStr,
      updatedAt: nowStr,
      temporaryPassword,
      generatedPin,
    };

    addAuditLog(
      'Création Compte Utilisateur',
      'Personnel',
      `Création du compte ${newAccount.name} (${newAccount.accountType === 'tablette' ? 'Borne Tablette ' + (newAccount.assignedTableName || '') : 'Rôle ' + newAccount.role})`,
      userId
    );

    return newAccount;
  };

  const updateUserAccount = async (id: string, updates: Partial<UserAccount>) => {
    if (updates.role !== undefined || updates.active !== undefined) {
      const current = userAccounts.find((a) => a.id === id);
      const roleToSet = updates.role || current?.role || 'serveur';
      const activeToSet = updates.active !== undefined ? updates.active : (current?.active !== false);
      try {
        await cloudFunctionsService.setUserRole({
          userId: id,
          role: roleToSet,
          active: activeToSet,
          outlets: selectedOutletId ? [selectedOutletId] : undefined,
          organizationId: organization?.id,
        });
      } catch {
        // Ignorer si Cloud Functions non déployées, staffFirestoreService synchronisera le profil
      }
    }

    await staffFirestoreService.updateUserProfile(id, updates);

    addAuditLog(
      'Modification Compte Utilisateur',
      'Personnel',
      `Mise à jour des paramètres du compte ID ${id}`,
      id
    );
  };

  const deleteUserAccount = async (id: string) => {
    const target = userAccounts.find((a) => a.id === id);
    try {
      await cloudFunctionsService.deleteUser({ userId: id });
    } catch {
      // Ignorer si Cloud Functions non déployées
    }
    // Désactiver dans Firestore pour couper immédiatement les accès
    await staffFirestoreService.updateUserProfile(id, { active: false });
    addAuditLog(
      'Suppression Compte Utilisateur',
      'Personnel',
      `Suppression du compte ${target?.name || id} (${target?.role})`,
      id
    );
  };

  const toggleUserAccountStatus = async (id: string) => {
    const target = userAccounts.find((a) => a.id === id);
    if (!target) return;
    const newActive = !target.active;
    await cloudFunctionsService.setUserRole({
      userId: id,
      role: target.role,
      active: newActive,
      outlets: selectedOutletId ? [selectedOutletId] : undefined,
      organizationId: organization?.id,
    });
    await staffFirestoreService.updateUserProfile(id, { active: newActive });
    addAuditLog(
      newActive ? 'Activation Compte Utilisateur' : 'Désactivation Compte Utilisateur',
      'Personnel',
      `Statut du compte ${target.name} passé à ${newActive ? 'actif' : 'inactif'}`,
      id
    );
  };

  const updateUserAccountPermissions = async (
    id: string,
    tabPermissions: Record<string, TabPermission>,
    additionalTabs: string[]
  ) => {
    await staffFirestoreService.updateUserProfile(id, {
      tabPermissions,
      additionalTabs,
    });
    const target = userAccounts.find((a) => a.id === id);
    addAuditLog(
      'Mise à Jour Droits Granulaires',
      'Paramètres',
      `Droits par onglet (Voir/Créer/Modifier/Supprimer) modifiés pour ${target?.name || id}`,
      id
    );
  };

  // 6. Create Reservation
  const createReservation = async (resData: Omit<Reservation, 'id' | 'createdAt'>) => {
    const newRes: Reservation = {
      ...resData,
      id: generateSecureId('res'),
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [newRes, ...prev]);

    // If table assigned, mark table reserved
    if (newRes.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === newRes.tableId ? { ...t, status: 'reservee', currentReservationId: newRes.id } : t
        )
      );
    }

    addAuditLog(
      'Nouvelle réservation',
      'Tables',
      `Réservation pour ${newRes.customerName} (${newRes.guestCount} pers.) le ${newRes.date} à ${newRes.time}`,
      newRes.id
    );

    addNotification(
      'Nouvelle réservation confirmée',
      `${newRes.customerName} - ${newRes.guestCount} personnes à ${newRes.time}`,
      'info',
      'Réservations'
    );
  };

  // 7. Update Reservation Status
  const updateReservationStatus = async (resId: string, status: Reservation['status']) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status } : r))
    );
    addAuditLog('Statut réservation mis à jour', 'Tables', `Réservation passée à ${status}`, resId);
  };

  // 8. Seat Reservation
  const seatReservation = async (reservationId: string, tableId: string) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === reservationId ? { ...r, status: 'en_cours', tableId } : r))
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'attente_commande',
              currentReservationId: reservationId,
              guestsCount: res.guestCount,
              timeOccupied: new Date().toISOString(),
            }
          : t
      )
    );

    addAuditLog(
      'Installation client réservation',
      'Tables',
      `Client ${res.customerName} installé à la table`,
      tableId
    );
  };

  // 9. Stock Movement
  const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'timestamp' | 'userName'>) => {
    const now = new Date().toISOString();
    const item = stockItems.find((s) => s.id === movement.stockItemId);
    const prevQ = item ? item.currentQuantity : 0;
    const newQ = prevQ + movement.quantityChange;

    const fullMovement: StockMovement = {
      ...movement,
      id: generateSecureId('mv'),
      previousQuantity: prevQ,
      newQuantity: newQ,
      userName: currentUser.name,
      timestamp: now,
    };

    setStockMovements((prev) => [fullMovement, ...prev]);

    setStockItems((prev) =>
      prev.map((s) =>
        s.id === movement.stockItemId
          ? { ...s, currentQuantity: Math.round(newQ * 100) / 100, lastUpdated: now }
          : s
      )
    );

    addAuditLog(
      `Mouvement de stock (${movement.type})`,
      'Stocks',
      `${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} ${movement.unit} pour ${movement.stockItemName}. Motif: ${movement.reason}`,
      movement.stockItemId
    );
  };

  // 10. Create Product
  const createProduct = async (prod: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...prod,
      id: generateSecureId('prod'),
    };
    setProducts((prev) => [...prev, newProduct]);
    productsFirestoreService.saveProduct(newProduct).catch((err) => {
      handleSyncError('Création produit', err);
    });
    addAuditLog('Création nouveau produit menu', 'POS', `Produit ${newProduct.name} créé à ${newProduct.price} ${settings.currency}`);
  };

  // 10b. Update Product / Fiche Technique
  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, ...updates };
          productsFirestoreService.saveProduct(updated).catch((err) => {
            handleSyncError('Mise à jour produit', err);
          });
          return updated;
        }
        return p;
      })
    );
    addAuditLog('Mise à jour fiche technique / produit', 'POS', `Produit / Formule ${productId} mis à jour`, productId);
  };

  // 11. Toggle Product Availability
  const toggleProductAvailability = async (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, available: !p.available };
          addAuditLog(
            'Disponibilité produit modifiée',
            'POS',
            `Produit ${p.name} marqué comme ${updated.available ? 'Disponible' : 'Épuisé / Indisponible'}`,
            productId
          );
          return updated;
        }
        return p;
      })
    );
  };

  // 12. Submit Inventory Audit
  const submitInventoryAudit = async (inventoryData: Omit<Inventory, 'id'>) => {
    const now = new Date().toISOString();
    const newInventory: Inventory = {
      ...inventoryData,
      id: generateSecureId('inv'),
      validatedAt: now,
      status: 'valide',
    };

    // Apply adjustments to stock items and create adjustment movements
    inventoryData.items.forEach((item) => {
      if (item.variance !== 0) {
        const fullMovement: StockMovement = {
          id: generateSecureId('mv-inv'),
          stockItemId: item.stockItemId,
          stockItemName: item.stockItemName,
          type: 'inventaire_correction',
          quantityChange: item.variance,
          previousQuantity: item.theoreticalQty,
          newQuantity: item.actualQty,
          unit: item.unit,
          reason: `Régularisation inventaire physique (${item.justification || 'Écart constaté'})`,
          userName: currentUser.name,
          timestamp: now,
        };
        setStockMovements((prev) => [fullMovement, ...prev]);

        setStockItems((prev) =>
          prev.map((s) =>
            s.id === item.stockItemId
              ? { ...s, currentQuantity: item.actualQty, lastUpdated: now }
              : s
          )
        );
      }
    });

    addAuditLog(
      'Validation inventaire physique',
      'Stocks',
      `Inventaire ${inventoryData.zoneOrCategory} validé. Écart total valorisé: ${inventoryData.totalVarianceValue} ${settings.currency}`,
      newInventory.id
    );

    addNotification(
      'Inventaire physique validé',
      `Ajustements de stock enregistrés pour ${inventoryData.zoneOrCategory}. Écart net: ${inventoryData.totalVarianceValue} ${settings.currency}`,
      inventoryData.totalVarianceValue !== 0 ? 'warning' : 'success',
      'Stocks'
    );
  };

  // 13. Create Purchase Order
  const createPurchaseOrder = async (po: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => {
    const num = `BC-${new Date().toISOString().slice(2, 7).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newPo: PurchaseOrder = {
      ...po,
      id: generateSecureId('po'),
      orderNumber: num,
    };
    setPurchaseOrders((prev) => [newPo, ...prev]);
    addAuditLog('Bon de commande fournisseur créé', 'Achats', `BC ${num} pour ${po.supplierName} (${po.totalAmount} ${settings.currency})`);
  };

  // 14. Receive Purchase Order
  const receivePurchaseOrder = async (poId: string, invoiceNum?: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    const now = new Date().toISOString();

    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId
          ? {
              ...p,
              status: 'recue',
              receivedAt: now,
              invoiceNumber: invoiceNum || `FAC-${p.supplierName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
            }
          : p
      )
    );

    // Increase stock for each item in the purchase order
    po.items.forEach((item) => {
      const targetStock = stockItems.find((s) => s.id === item.stockItemId);
      const prevQ = targetStock ? targetStock.currentQuantity : 0;
      const newQ = prevQ + item.quantity;

      const movement: StockMovement = {
        id: generateSecureId('mv-rcv'),
        stockItemId: item.stockItemId,
        stockItemName: item.stockItemName,
        type: 'entree_achat',
        quantityChange: item.quantity,
        previousQuantity: prevQ,
        newQuantity: newQ,
        unit: item.unit,
        reason: `Réception bon de commande ${po.orderNumber}`,
        referenceId: po.id,
        userName: currentUser.name,
        timestamp: now,
      };

      setStockMovements((prev) => [movement, ...prev]);
      setStockItems((prev) =>
        prev.map((s) =>
          s.id === item.stockItemId
            ? { ...s, currentQuantity: Math.round(newQ * 100) / 100, lastUpdated: now }
            : s
        )
      );
    });

    // Update supplier balance due
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === po.supplierId
          ? {
              ...s,
              totalPurchases: s.totalPurchases + po.totalAmount,
              currentBalanceDue: s.currentBalanceDue + po.totalAmount,
            }
          : s
      )
    );

    addAuditLog(
      'Réception commande fournisseur',
      'Achats',
      `Marchandises reçues pour ${po.orderNumber}. Stock automatiquement incrémenté. Facture: ${invoiceNum || 'Générée'}`,
      po.id
    );

    addNotification(
      `Réception commande fournisseur ${po.orderNumber}`,
      `Marchandises livrées par ${po.supplierName} et intégrées aux stocks.`,
      'success',
      'Achats'
    );
  };

  // 15. Create Supplier
  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'totalPurchases' | 'currentBalanceDue'>) => {
    const newSup: Supplier = {
      ...supplierData,
      id: generateSecureId('sup'),
      totalPurchases: 0,
      currentBalanceDue: 0,
    };
    setSuppliers((prev) => [...prev, newSup]);
    addAuditLog('Nouveau fournisseur enregistré', 'Achats', `Fournisseur ${newSup.company} (${newSup.name})`);
  };

  // 16. Create Expense avec contrôle des limites de dépenses (maxExpenseAmount)
  const createExpense = async (exp: Omit<Expense, 'id' | 'recordedBy'>) => {
    const userRole = currentUser.role;
    const roleLimit = roleLimits?.[userRole];
    const maxAllowed = roleLimit?.maxExpenseAmount ?? (userRole === 'direction' ? 10000000 : 0);
    const requiresApproval = userRole !== 'direction' && (exp.amount > maxAllowed || maxAllowed === 0);

    const newExp: Expense = {
      ...exp,
      id: generateSecureId('exp'),
      recordedBy: currentUser.name,
      status: requiresApproval ? 'en_attente' : (exp.status || 'validee'),
    };
    setExpenses((prev) => [newExp, ...prev]);
    addAuditLog('Nouvelle dépense enregistrée', 'Finances', `${exp.amount} ${settings.currency} - ${exp.reason} (${exp.category})`);

    if (newExp.status === 'en_attente') {
      addNotification(
        'Dépense en attente d’approbation',
        `${newExp.amount} ${settings.currency} demandés pour "${newExp.reason}" (plafond autorisé: ${maxAllowed} FCFA).`,
        'warning',
        'Finances',
        'haute',
        'finance'
      );
    }
  };

  // 17. Approve Expense
  const approveExpense = async (expenseId: string) => {
    const now = new Date().toISOString();
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              status: 'validee',
              approvedBy: currentUser.name,
              approvedAt: now,
            }
          : e
      )
    );
    addAuditLog('Approbation de dépense', 'Finances', `Dépense validée par ${currentUser.name}`, expenseId);
  };

  // 18. Cash Register Actions
  const recordCashMovement = async (type: CashMovement['type'], amount: number, reason: string) => {
    const now = new Date().toISOString();
    const movement: CashMovement = {
      id: generateSecureId('cm'),
      sessionId: cashSession.id,
      type,
      amount,
      reason,
      user: currentUser.name,
      timestamp: now,
    };
    setCashMovements((prev) => [movement, ...prev]);

    setCashSession((prev) => {
      const isAddition = type === 'entree' || type === 'encaissement_vente';
      return {
        ...prev,
        totalCashIn: isAddition ? prev.totalCashIn + amount : prev.totalCashIn,
        totalCashOut: !isAddition ? prev.totalCashOut + amount : prev.totalCashOut,
        expectedTotal: isAddition ? prev.expectedTotal + amount : prev.expectedTotal - amount,
      };
    });

    addAuditLog(`Mouvement de caisse (${type})`, 'Caisse', `${amount} ${settings.currency} - ${reason}`);
  };

  const closeCashRegister = async (countedTotal: number, notes?: string) => {
    const now = new Date().toISOString();
    const variance = countedTotal - cashSession.expectedTotal;

    // Tentative de clôture certifiée côté serveur avec journal Z
    try {
      await cloudFunctionsService.closeCashSession({
        sessionId: cashSession.id,
        blindCountAmount: countedTotal,
        varianceJustification: notes,
        notes,
      });
    } catch (cfErr) {
      console.warn('[RestaurantContext] Repli local pour closeCashSession:', cfErr);
    }

    setCashSession((prev) => ({
      ...prev,
      status: 'fermee',
      closedAt: now,
      closedBy: currentUser.name,
      countedTotal,
      variance,
      notes: notes || prev.notes,
    }));

    addAuditLog(
      'Clôture journalière de caisse',
      'Caisse',
      `Caisse fermée par ${currentUser.name}. Montant attendu: ${cashSession.expectedTotal} ${settings.currency}, Compté: ${countedTotal} ${settings.currency}, Écart: ${variance} ${settings.currency}`
    );

    if (Math.abs(variance) > settings.minCashVarianceAlert && isRuleEnabled('notif_ecart_caisse', true)) {
      addNotification(
        'Écart de caisse important détecté',
        `Écart de clôture de ${variance} ${settings.currency} constaté par ${currentUser.name}. Justification requise.`,
        'alert',
        'Caisse',
        'haute',
        'caisse'
      );
    }
  };

  const openCashRegister = async (initialFloat: number, notes?: string) => {
    const now = new Date().toISOString();

    let serverSessionId: string | undefined;
    try {
      const cfRes = await cloudFunctionsService.openCashSession({
        restaurantId: selectedOutletId,
        registerId: 'caisse-principale',
        terminalId: 'term-main',
        initialFloat,
        notes,
      });
      if (cfRes?.session?.id) {
        serverSessionId = cfRes.session.id;
      }
    } catch (cfErr) {
      console.warn('[RestaurantContext] Repli local pour openCashSession:', cfErr);
    }

    const newSession: CashRegisterSession = {
      id: serverSessionId || generateSecureId('sess'),
      openedAt: now,
      openedBy: currentUser.name,
      initialFloat,
      totalCashIn: 0,
      totalCashOut: 0,
      expectedTotal: initialFloat,
      status: 'ouverte',
      notes: notes || 'Nouvelle session de caisse',
    };
    setCashSession(newSession);

    const initialMovement: CashMovement = {
      id: generateSecureId('cm'),
      sessionId: newSession.id,
      type: 'entree',
      amount: initialFloat,
      reason: 'Fond de caisse initial ouverture',
      user: currentUser.name,
      timestamp: now,
    };
    setCashMovements((prev) => [initialMovement, ...prev]);

    addAuditLog('Ouverture de caisse', 'Caisse', `Fond de caisse initial: ${initialFloat} ${settings.currency}`);
  };

  // 19. Staff & Attendance
  const addAttendanceRecord = async (employeeId: string, status: Attendance['status'], justification?: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const now = new Date();
    const newAtt: Attendance = {
      id: generateSecureId('att'),
      employeeId,
      employeeName: emp.fullName,
      date: now.toISOString().slice(0, 10),
      checkIn: now.toTimeString().slice(0, 5),
      status,
      justification,
    };
    setAttendances((prev) => [newAtt, ...prev]);
    addAuditLog('Pointage employé', 'Personnel', `${emp.fullName} pointé ${status}`);
  };

  // 20. Document Archiving & Scanner
  const addDocument = async (docItem: Omit<DocumentItem, 'id' | 'uploadedBy'>) => {
    const now = new Date().toISOString();
    const newDoc: DocumentItem = {
      ...docItem,
      id: generateSecureId('doc'),
      organizationId: organization.id,
      restaurantId: docItem.restaurantId || selectedOutletId,
      uploadedBy: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    await documentsFirestoreService.saveDocument(newDoc);
    addAuditLog('Nouveau document archivé', 'Documents', `${newDoc.title} (${newDoc.category})`, newDoc.id);
  };

  const uploadMediaAsset = async (
    file: File,
    folder: string,
    category: string,
    entityType?: string,
    entityId?: string
  ): Promise<MediaAsset> => {
    const asset = await cloudinaryService.upload(file, {
      folder,
      category: category as any,
      organizationId: organization.id,
      restaurantId: selectedOutletId,
      entityType: entityType as any,
      entityId,
    });

    setMediaAssets((prev) => [asset, ...prev]);
    await documentsFirestoreService.saveMediaAsset(asset);
    addAuditLog('Téléversement média Cloudinary', 'Documents', `Fichier ${file.name} téléversé dans ${folder}`, asset.id);
    return asset;
  };

  const deleteMediaAsset = async (assetId: string) => {
    const asset = mediaAssets.find((a) => a.id === assetId);
    if (asset) {
      await cloudinaryService.deleteAsset(asset.cloudinaryPublicId);
      await documentsFirestoreService.deleteMediaAsset(assetId);
      setMediaAssets((prev) => prev.filter((a) => a.id !== assetId));
      addAuditLog('Suppression média Cloudinary', 'Documents', `Média ${asset.fileName} supprimé`, assetId);
    }
  };

  const syncOfflineData = async () => {
    if (!isFeatureEnabled('offline_sync_engine')) return;
    await offlineSyncService.processQueue();
  };

  // Notifications helpers
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated = { ...n, read: true };
          configFirestoreService.saveNotification(updated).catch(() => {});
          return updated;
        }
        return n;
      })
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      updated.forEach((n) => {
        configFirestoreService.saveNotification(n).catch(() => {});
      });
      return updated;
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    configFirestoreService.deleteNotification(id).catch(() => {});
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // 21. Traçabilité des Annulations & Sécurité Audit
  const cancelOrderWithAudit = async (orderId: string, reason: string, approvedBy?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // 1. Tentative d'annulation sécurisée côté serveur (token superviseur + note de crédit automatique)
    try {
      const cfRes = await cloudFunctionsService.cancelOrder({
        orderId,
        reason,
        supervisorToken: 'SUPERVISOR_SESSION_AUTHORIZED',
        actionAfterCancel: 'restock',
      });

      if (cfRes?.success) {
        // Le serveur a déjà contre-passé la caisse, déduit la fidélité, restocké les articles,
        // émis la note de crédit, mis à jour la commande à 'annulee', libéré la table et journalisé l'audit.
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'annulee', updatedAt: new Date().toISOString() } : o))
        );
        if (targetOrder.tableId) {
          setTables((prev) =>
            prev.map((t) => (t.id === targetOrder.tableId ? { ...t, status: 'libre', currentOrderId: undefined } : t))
          );
        }
        return;
      }
    } catch (cfErr: any) {
      if (isNetworkOrOfflineError(cfErr)) {
        console.warn('[RestaurantContext] Mode hors-ligne pour cancelOrder, repli local:', cfErr);
      } else {
        console.error('[RestaurantContext] Refus strict du serveur pour cancelOrder:', cfErr);
        const errorMsg = cfErr?.message || 'Annulation refusée par le serveur.';
        addNotification('Échec Annulation Commande', errorMsg, 'alert', 'POS', 'haute');
        throw new Error(errorMsg);
      }
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    const log: CancellationLog = {
      id: generateSecureId('can'),
      ticketOrInvoiceId: targetOrder.id,
      documentNumber: targetOrder.orderNumber,
      amount: targetOrder.total,
      reason,
      userId: currentUser.id,
      userName: currentUser.name,
      approvedBy: approvedBy || (currentUser.role === 'manager' || currentUser.role === 'direction' ? currentUser.name : 'Direction'),
      date,
      time,
      type: 'COMMANDE',
    };

    setCancellationLogs((prev) => [log, ...prev]);

    // Update order status to annulee
    await updateOrderStatus(orderId, 'annulee');

    // Libérer la table si occupée
    if (targetOrder.tableId) {
      await updateTableStatus(targetOrder.tableId, 'libre');
    }

    addAuditLog(
      'Annulation commande motivée',
      'POS',
      `Commande ${targetOrder.orderNumber} annulée. Motif: "${reason}". Validé par: ${log.approvedBy}. Montant: ${targetOrder.total} ${settings.currency}`,
      targetOrder.id
    );

    // Remise en stock atomique des ingrédients si la commande avait été déstockée
    const itemsToRestock: Array<{
      stockItemId: string;
      stockItemName: string;
      quantityToRestore: number;
      unit: string;
    }> = [];

    for (const item of targetOrder.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.ingredients && prod.ingredients.length > 0) {
        for (const ing of prod.ingredients) {
          const qtyToRestore = (ing.quantityRequired || 0) * (item.quantity || 1);
          if (qtyToRestore > 0) {
            const existing = itemsToRestock.find((x) => x.stockItemId === ing.stockItemId);
            if (existing) {
              existing.quantityToRestore = Math.round((existing.quantityToRestore + qtyToRestore) * 100) / 100;
            } else {
              itemsToRestock.push({
                stockItemId: ing.stockItemId,
                stockItemName: ing.stockItemName,
                quantityToRestore: Math.round(qtyToRestore * 100) / 100,
                unit: ing.unit,
              });
            }
          }
        }
      }
    }

    if (itemsToRestock.length > 0) {
      stockFirestoreService.restockItemsAtomically(
        itemsToRestock,
        targetOrder.orderNumber,
        currentUser.name
      ).catch((err) => {
        console.warn('[RestaurantContext] Erreur restockItemsAtomically:', err);
      });

      setStockItems((prev) =>
        prev.map((item) => {
          const restock = itemsToRestock.find((r) => r.stockItemId === item.id);
          if (restock) {
            return {
              ...item,
              currentQuantity: Math.round((item.currentQuantity + restock.quantityToRestore) * 100) / 100,
              lastUpdated: now.toISOString(),
            };
          }
          return item;
        })
      );
    }

    await ordersFirestoreService.cancelOrder(orderId, reason, log.approvedBy);
  };

  // 22. Gestion des Lots de Stock (FIFO / FEFO)
  const addStockLot = async (lot: Omit<StockLot, 'id'>) => {
    const newLot: StockLot = {
      ...lot,
      id: generateSecureId('lot'),
    };
    setStockLots((prev) => [newLot, ...prev]);
    addAuditLog(
      'Réception lot de stock',
      'Stocks',
      `Lot N° ${newLot.lotNumber} (${newLot.stockItemName}) - Qté: ${newLot.initialQuantity} ${newLot.unit} - Pér.: ${newLot.expiryDate || 'N/A'}`
    );
  };

  // 23. Contrôles Hygiène & HACCP
  const addHygieneCheck = async (check: Omit<HygieneCheck, 'id'>) => {
    const newCheck: HygieneCheck = {
      ...check,
      id: generateSecureId('hyg'),
    };
    setHygieneChecks((prev) => [newCheck, ...prev]);
    addAuditLog(
      'Contrôle hygiène HACCP',
      'Paramètres',
      `Contrôle ${newCheck.category} sur ${newCheck.equipmentOrZone}: Résultat ${newCheck.result.toUpperCase()} par ${newCheck.inspectorName}`
    );
  };

  // 24. Événements & Banquets
  const createEvent = async (eventData: Omit<RestaurantEvent, 'id' | 'eventNumber'>) => {
    const eventCount = events.length + 1;
    const eventNumber = `EVT-2026-${eventCount.toString().padStart(4, '0')}`;
    const newEvent: RestaurantEvent = {
      ...eventData,
      id: generateSecureId('evt'),
      eventNumber,
    };
    setEvents((prev) => [newEvent, ...prev]);
    addAuditLog(
      'Création événement banquet',
      'Finances',
      `${newEvent.title} pour ${newEvent.clientName} (${newEvent.guestCount} convives). Devis: ${newEvent.quoteAmount} ${settings.currency}`
    );
  };

  const updateEventStatus = async (eventId: string, status: RestaurantEvent['status']) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status } : e))
    );
  };

  // 25. Livraisons (Cameroun)
  const createDelivery = async (delivData: Omit<DeliveryOrder, 'id' | 'deliveryNumber'>) => {
    const delivCount = deliveries.length + 1;
    const deliveryNumber = `LIV-2026-${delivCount.toString().padStart(4, '0')}`;
    const newDeliv: DeliveryOrder = {
      ...delivData,
      id: generateSecureId('deliv'),
      deliveryNumber,
    };
    setDeliveries((prev) => [newDeliv, ...prev]);
    addAuditLog(
      'Nouvelle livraison enregistrée',
      'POS',
      `Livraison ${deliveryNumber} vers ${newDeliv.quartier} (${newDeliv.repere}) pour ${newDeliv.clientName}`
    );
  };

  const updateDeliveryStatus = async (deliveryId: string, status: DeliveryOrder['status']) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status } : d))
    );
  };

  // 26. Retenues Fiscales (AIR)
  const recordWithholding = async (withholding: Omit<WithholdingRecord, 'id'>) => {
    const newWh: WithholdingRecord = {
      ...withholding,
      id: generateSecureId('wh'),
    };
    setWithholdings((prev) => [newWh, ...prev]);
    addAuditLog(
      'Enregistrement retenue fiscale',
      'Finances',
      `Retenue ${newWh.withholdingType} ${newWh.rate}% (${newWh.amount} ${settings.currency}) sur ${newWh.partyName}`
    );
  };

  // 27. Crédit Client (Créances)
  const recordCreditPayment = async (customerId: string, amount: number, note?: string) => {
    setClientCredits((prev) =>
      prev.map((c) =>
        c.customerId === customerId
          ? {
              ...c,
              currentBalance: Math.max(0, c.currentBalance - amount),
              lastPaymentDate: new Date().toISOString().slice(0, 10),
            }
          : c
      )
    );
    addAuditLog(
      'Encaissement acompte créance client',
      'Finances',
      `Règlement créance client ${amount} ${settings.currency}. ${note || ''}`
    );
  };

  // 28. Échéancier Fiscal
  const updateFiscalObligationStatus = async (obligationId: string, status: FiscalObligation['status']) => {
    setFiscalObligations((prev) =>
      prev.map((o) => (o.id === obligationId ? { ...o, status } : o))
    );
  };

  // 29. Facturation Fiscale Normalisée & Journal Fiscal
  const generateInvoiceForOrder = async (
    orderId: string,
    clientInfo?: {
      id?: string;
      name?: string;
      niu?: string;
      rccm?: string;
      address?: string;
      phone?: string;
      regime?: TaxRegime;
      applyWithholding?: boolean;
    }
  ): Promise<Invoice> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) throw new Error('Commande introuvable');

    // Tentative d'émission officielle certifiée Cloud Function (numérotation continue inaltérable + sceau SHA-256)
    try {
      const cfRes = await cloudFunctionsService.issueInvoice(orderId, clientInfo);
      if (cfRes?.success && cfRes.invoiceId) {
        const seqNumber = parseInt(cfRes.invoiceNumber.split('-').pop() || '1', 10);
        const { invoice: baseInvoice, journalItem } = TaxEngine.createFiscalInvoice(
          targetOrder,
          settings,
          seqNumber,
          clientInfo
        );
        const officialInvoice: Invoice = {
          ...baseInvoice,
          id: cfRes.invoiceId,
          invoiceNumber: cfRes.invoiceNumber,
          sequenceNumber: seqNumber,
          securitySignature: cfRes.chainHash,
          totalTTC: cfRes.totalTTC || baseInvoice.totalTTC,
        };
        setInvoices((prev) => [officialInvoice, ...prev.filter((i) => i.id !== officialInvoice.id)]);
        setFiscalJournal((prev) => [journalItem, ...prev.filter((j) => j.invoiceId !== officialInvoice.id)]);
        addAuditLog(
          'Émission facture fiscale certifiée (Cloud Functions)',
          'POS',
          `Facture certifiée N° ${cfRes.invoiceNumber} générée pour commande ${targetOrder.orderNumber}. TTC: ${officialInvoice.totalTTC} ${settings.currency}`,
          officialInvoice.id
        );
        return officialInvoice;
      }
    } catch (cfErr) {
      console.warn('[RestaurantContext] Repli local pour issueInvoice:', cfErr);
    }

    // Repli local en cas d'indisponibilité réseau
    const nextSeq = settings.nextInvoiceSequence || 43;
    const { invoice, journalItem } = TaxEngine.createFiscalInvoice(
      targetOrder,
      settings,
      nextSeq,
      clientInfo
    );

    // Mettre à jour la séquence
    setSettings((prev) => ({
      ...prev,
      nextInvoiceSequence: nextSeq + 1,
    }));

    setInvoices((prev) => [invoice, ...prev]);
    setFiscalJournal((prev) => [journalItem, ...prev]);

    addAuditLog(
      'Émission facture fiscale officielle',
      'POS',
      `Facture N° ${invoice.invoiceNumber} générée pour commande ${targetOrder.orderNumber}. TTC: ${invoice.totalTTC} ${settings.currency}`
    );

    return invoice;
  };

  // 30. Centre de Configuration & Fonctionnalités (eZee style)
  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      return FeatureService.isFeatureEnabled(features, featureId);
    },
    [features]
  );

  // When network comes back online, trigger queue processing if offline sync is enabled
  useEffect(() => {
    if (isOnline && isFeatureEnabled('offline_sync_engine')) {
      offlineSyncService.processQueue().catch((err) => {
        handleSyncError('Traitement file hors-ligne', err);
      });
    }
  }, [isOnline, isFeatureEnabled, handleSyncError]);

  // Synchronize hardware printer availability with printers_hardware feature
  useEffect(() => {
    printerService.setHardwareEnabled(isFeatureEnabled('printers_hardware'));
  }, [isFeatureEnabled]);

  const updateFeatureStatus = async (featureId: string, status: FeatureStatus) => {
    const targetFeat = features.find((f) => f.id === featureId);
    if (!targetFeat) return;

    const updated = features.map((f) =>
      f.id === featureId
        ? {
            ...f,
            status,
            activatedAt: new Date().toISOString().slice(0, 10),
            activatedBy: currentUser.name,
          }
        : f
    );
    setFeatures(updated);
    saveState('features', updated);

    const historyItem: ConfigurationHistoryItem = {
      id: generateSecureId('hist'),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Administrateur',
      action: status === 'ACTIVÉ' ? 'ACTIVATION' : status === 'SUSPENDU' ? 'SUSPENSION' : 'DÉSACTIVATION',
      category: targetFeat.category,
      featureKey: targetFeat.id,
      detail: `Fonctionnalité "${targetFeat.name}" passée au statut ${status}`,
      oldValue: targetFeat.status,
      newValue: status,
    };

    setConfigHistory((prev) => [historyItem, ...prev]);

    try {
      await configFirestoreService.saveFeatures(updated);
      await configFirestoreService.appendConfigHistory(historyItem);
      showToast({
        title: 'Fonctionnalité mise à jour',
        message: `La fonctionnalité "${targetFeat.name}" est désormais ${status.toLowerCase()}.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Mise à jour fonctionnalité', err);
      throw err;
    }

    addAuditLog(
      'Modification fonctionnalité',
      'Paramètres',
      `Fonctionnalité "${targetFeat.name}" -> ${status} par ${currentUser?.name || 'Administrateur'}`
    );
  };

  const updateFeatureConfig = async (featureId: string, config: Record<string, any>) => {
    const targetFeat = features.find((f) => f.id === featureId);
    if (!targetFeat) return;

    const updated = features.map((f) =>
      f.id === featureId
        ? { ...f, configuration: { ...f.configuration, ...config } }
        : f
    );
    setFeatures(updated);
    saveState('features', updated);

    try {
      await configFirestoreService.saveFeatures(updated);
      await logConfigHistory(
        'Fonctionnalités',
        'Configuration',
        `Options de "${targetFeat.name}" mises à jour`,
        undefined,
        JSON.stringify(config),
        targetFeat.id
      );
      showToast({
        title: 'Configuration enregistrée',
        message: `Les options de "${targetFeat.name}" ont été mises à jour.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Configuration fonctionnalité', err);
      throw err;
    }

    addAuditLog(
      'Configuration fonctionnalité',
      'Paramètres',
      `Options de "${targetFeat.name}" mises à jour par ${currentUser?.name || 'Administrateur'}`
    );
  };

  const updateRolePermission = async (
    role: UserRole,
    module: PermissionModule,
    action: PermissionAction,
    allowed: boolean
  ) => {
    const currentRolePerms = (rolePermissions as any)[role] || {};
    const currentModulePerms = currentRolePerms[module] || {};
    const updated: RolePermissionMatrix = {
      ...rolePermissions,
      [role]: {
        ...currentRolePerms,
        [module]: {
          ...currentModulePerms,
          [action]: allowed,
        },
      },
    };
    setRolePermissions(updated);
    saveState('rolePermissions', updated);

    try {
      await configFirestoreService.saveRolePermissions(updated);
      await logConfigHistory(
        'Permissions',
        'Mise à jour RBAC',
        `Rôle ${role} -> ${module}.${action} = ${allowed ? 'AUTORISÉ' : 'REFUSÉ'}`
      );
      showToast({
        title: 'Permissions enregistrées',
        message: `Droits d'accès mis à jour pour le rôle ${role}.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Permissions RBAC', err);
      throw err;
    }

    addAuditLog(
      'Modification permissions RBAC',
      'Paramètres',
      `Rôle ${role} -> ${module}.${action} = ${allowed ? 'AUTORISÉ' : 'REFUSÉ'}`
    );
  };

  const updateRoleLimits = async (role: UserRole, limits: Partial<RoleLimits>) => {
    const updated = {
      ...roleLimits,
      [role]: {
        ...roleLimits[role],
        ...limits,
      },
    };
    setRoleLimits(updated);
    saveState('roleLimits', updated);

    try {
      await configFirestoreService.saveRoleLimits(updated);
      await logConfigHistory(
        'Limites',
        'Mise à jour plafonds',
        `Plafonds & approbations mis à jour pour ${role}`
      );
      showToast({
        title: 'Limites enregistrées',
        message: `Les plafonds d'autorisation pour le rôle ${role} ont été enregistrés.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Limites de rôle', err);
      throw err;
    }

    addAuditLog(
      'Modification limites de rôle',
      'Paramètres',
      `Plafonds & approbations mis à jour pour ${role}`
    );
  };

  const applyConfigProfile = async (profile: ConfigurationProfileType) => {
    // 1. Mettre à jour et persister les fonctionnalités modulaires
    const updatedFeatures = FeatureService.applyProfile(features, profile);
    setFeatures(updatedFeatures);
    saveState('features', updatedFeatures);

    // 2. Mettre à jour et persister les règles de visibilité des modules
    const profileRules = FeatureService.getOperationRulesForProfile(profile);
    const nextRules = { ...operationRules, ...profileRules };
    setOperationRules(nextRules);
    saveState('operations_rules', nextRules);

    const historyItem: ConfigurationHistoryItem = {
      id: generateSecureId('hist'),
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Administrateur',
      action: 'PROFIL_CONFIGURATION',
      category: 'operations',
      detail: `Application du profil prédéfini "${profile.replace('_', ' ').toUpperCase()}"`,
      newValue: profile,
    };
    setConfigHistory((prev) => [historyItem, ...prev]);

    try {
      await configFirestoreService.saveFeatures(updatedFeatures);
      await configFirestoreService.saveOperationRules(nextRules);
      await configFirestoreService.appendConfigHistory(historyItem);
      showToast({
        title: 'Profil appliqué',
        message: `Le profil "${profile.replace('_', ' ').toUpperCase()}" a été déployé avec succès.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Profil de configuration', err);
      throw err;
    }

    addAuditLog(
      'Application profil configuration',
      'Paramètres',
      `Profil ${profile} déployé par ${currentUser?.name || 'Administrateur'}`
    );
  };

  const addOutlet = async (outlet: Omit<Outlet, 'id'> | Outlet): Promise<Outlet> => {
    const newOutlet: Outlet = {
      ...outlet,
      id: (outlet as any).id || generateSecureId('out'),
      createdAt: (outlet as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setOutlets((prev) => [...prev.filter((o) => o.id !== newOutlet.id), newOutlet]);
    if (!selectedOutletId) {
      setSelectedOutletId(newOutlet.id);
    }
    try {
      await restaurantFirestoreService.saveOutlet(newOutlet);
    } catch (err) {
      console.warn('[RestaurantContext] Sauvegarde outlet Firestore échouée:', err);
    }
    addAuditLog(
      'Création établissement',
      'Paramètres',
      `Nouvel établissement ajouté : ${newOutlet.name} (${newOutlet.city})`
    );
    return newOutlet;
  };

  const updateOutlet = async (id: string, updates: Partial<Outlet>): Promise<void> => {
    const existing = outlets.find((o) => o.id === id);
    if (!existing) return;
    const updated: Outlet = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setOutlets((prev) => prev.map((o) => (o.id === id ? updated : o)));
    try {
      await restaurantFirestoreService.saveOutlet(updated);
    } catch (err) {
      console.warn('[RestaurantContext] Mise à jour outlet Firestore échouée:', err);
    }
    addAuditLog(
      'Mise à jour établissement',
      'Paramètres',
      `Établissement "${updated.name}" mis à jour`
    );
  };

  const deleteOutlet = async (id: string): Promise<void> => {
    const target = outlets.find((o) => o.id === id);
    setOutlets((prev) => prev.filter((o) => o.id !== id));
    if (selectedOutletId === id) {
      const remaining = outlets.filter((o) => o.id !== id);
      setSelectedOutletId(remaining[0]?.id || '');
    }
    try {
      await restaurantFirestoreService.deleteOutlet(id);
    } catch (err) {
      console.warn('[RestaurantContext] Suppression outlet Firestore échouée:', err);
    }
    addAuditLog(
      'Suppression établissement',
      'Paramètres',
      `Établissement supprimé : ${target?.name || id}`
    );
  };

  const generateCsprngPairingToken = (): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomBytes = new Uint8Array(8);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    }
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars[randomBytes[i] % chars.length];
    }
    return `${rand.slice(0, 4)}-${rand.slice(4, 8)}`;
  };

  const addTerminal = async (terminalData: Omit<Terminal, 'id'>) => {
    const code = `TRM-${generateCsprngPairingToken()}`;
    const newTerm: Terminal = {
      ...terminalData,
      id: generateSecureId('term'),
      pairingCode: terminalData.pairingCode || code,
      pairingExpiresAt: terminalData.pairingExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      active: terminalData.active ?? true,
      allowedFeatures: terminalData.allowedFeatures || ['all'],
    };
    setTerminals((prev) => [...prev, newTerm]);
    try {
      await configFirestoreService.saveTerminal(newTerm);
      await logConfigHistory('Terminaux', 'Ajout terminal', `Terminal ${newTerm.name} (${newTerm.type}) configuré`);
      showToast({
        title: 'Terminal créé',
        message: `Le terminal ${newTerm.name} a été enregistré sur le serveur.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Création terminal', err);
      throw err;
    }
    addAuditLog(
      'Création terminal',
      'Paramètres',
      `Nouveau terminal configuré : ${newTerm.name} (${newTerm.type})`
    );
  };

  const updateTerminal = async (id: string, updates: Partial<Terminal>) => {
    const existing = terminals.find((t) => t.id === id);
    if (!existing) return;
    const updated: Terminal = { ...existing, ...updates };
    setTerminals((prev) => prev.map((t) => (t.id === id ? updated : t)));
    try {
      await configFirestoreService.saveTerminal(updated);
      await logConfigHistory('Terminaux', 'Modification terminal', `Terminal ${updated.name} mis à jour`);
      showToast({
        title: 'Terminal mis à jour',
        message: `Le terminal ${updated.name} a été synchronisé.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Mise à jour terminal', err);
      throw err;
    }
    addAuditLog('Modification terminal', 'Paramètres', `Terminal ${updated.name} mis à jour`);
  };

  const deleteTerminal = async (id: string) => {
    const target = terminals.find((t) => t.id === id);
    setTerminals((prev) => prev.filter((t) => t.id !== id));
    try {
      await configFirestoreService.deleteTerminal(id);
      await logConfigHistory('Terminaux', 'Suppression terminal', `Terminal ${target?.name || id} supprimé`);
      showToast({
        title: 'Terminal supprimé',
        message: `Le terminal ${target?.name || id} a été retiré.`,
        type: 'info',
      });
    } catch (err) {
      handleSyncError('Suppression terminal', err);
      throw err;
    }
    addAuditLog('Suppression terminal', 'Paramètres', `Terminal supprimé : ${target?.name || id}`);
  };

  const generateTerminalPairingCode = async (terminalId: string): Promise<string> => {
    try {
      const res = await cloudFunctionsService.generatePairingCode(terminalId);
      if (res && res.pairingCode) {
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === terminalId ? { ...t, pairingCode: res.pairingCode, pairingExpiresAt: res.expiresAt } : t
          )
        );
        addAuditLog('Code Appairage Généré (Cloud Function)', 'Paramètres', `Code ${res.pairingCode} généré pour terminal ${terminalId}`);
        return res.pairingCode;
      }
    } catch (err) {
      console.warn('Fallback direct pour generateTerminalPairingCode:', err);
    }

    const code = `TRM-${generateCsprngPairingToken()}`;
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const existing = terminals.find((t) => t.id === terminalId);
    if (existing) {
      const updated: Terminal = { ...existing, pairingCode: code, pairingExpiresAt: expires };
      setTerminals((prev) => prev.map((t) => (t.id === terminalId ? updated : t)));
      try {
        await configFirestoreService.saveTerminal(updated);
      } catch (err) {
        console.warn('Erreur sauvegarde terminal Firestore:', err);
      }
    }
    addAuditLog('Code Appairage Généré (Local)', 'Paramètres', `Code ${code} généré pour terminal ${terminalId}`);
    return code;
  };

  const pairDeviceWithCode = async (pairingCode: string): Promise<DeviceProfile | null> => {
    const clean = pairingCode.trim().toUpperCase().replace(/[\s-]+/g, '');

    // 1. Tenter l'appairage via la Cloud Function atomique
    try {
      const res = await cloudFunctionsService.pairDevice({ pairingCode: clean });
      if (res && res.terminal) {
        const t = res.terminal;
        const profile: DeviceProfile = {
          terminalId: t.terminalId,
          terminalName: t.terminalName,
          type: t.type as any,
          outletId: t.outletId,
          assignedRole: t.assignedRole,
          assignedTableId: t.assignedTableId,
          assignedZone: t.assignedZone,
          kdsStation: t.kdsStation as any,
          pairedAt: t.pairedAt,
          pairingCode: t.pairingCode,
        };
        try {
          localStorage.setItem('restomaster_device_profile', JSON.stringify(profile));
          if (profile.assignedTableId) {
            localStorage.setItem('restomaster_tablet_table_id', profile.assignedTableId);
          }
        } catch {}
        setCurrentDeviceProfile(profile);
        addAuditLog('Appairage Réussi (Cloud Function)', 'Paramètres', `Appareil appairé au profil "${t.terminalName}"`);
        return profile;
      }
    } catch (err) {
      console.warn('Fallback direct pour pairDeviceWithCode:', err);
    }

    // 2. Fallback Firestore direct
    const found = terminals.find((t) => {
      if (!t.pairingCode) return false;
      const cleanTermCode = t.pairingCode.toUpperCase().replace(/[\s-]+/g, '');
      return cleanTermCode === clean || cleanTermCode === `TRM${clean}`;
    });
    if (!found) return null;

    if (found.pairingExpiresAt && new Date(found.pairingExpiresAt).getTime() < Date.now()) {
      addAuditLog(
        'Échec Appairage',
        'Paramètres',
        `Tentative d'utilisation d'un code expiré pour "${found.name}"`
      );
      return null;
    }

    const now = new Date().toISOString();
    const updatedTerm: Terminal = { ...found, pairedAt: now, active: true };
    try {
      await configFirestoreService.saveTerminal(updatedTerm);
    } catch (err) {
      console.warn('Erreur mise à jour appairage terminal Firestore:', err);
    }

    const profile: DeviceProfile = {
      terminalId: found.id,
      terminalName: found.name,
      type: found.type,
      outletId: found.outletId,
      assignedRole: found.assignedRole,
      assignedTableId: found.assignedTableId,
      assignedZone: found.assignedZone,
      kdsStation: found.kdsStation,
      pairedAt: now,
      pairingCode: found.pairingCode || clean,
    };

    try {
      localStorage.setItem('restomaster_device_profile', JSON.stringify(profile));
      if (profile.assignedTableId) {
        localStorage.setItem('restomaster_tablet_table_id', profile.assignedTableId);
      }
    } catch {}

    setTerminals((prev) => prev.map((t) => (t.id === found.id ? updatedTerm : t)));
    setCurrentDeviceProfile(profile);
    addAuditLog(
      'Appairage Réussi (Direct)',
      'Paramètres',
      `Appareil appairé au profil "${found.name}" (${found.type})`
    );
    return profile;
  };

  const unpairCurrentDevice = async (): Promise<void> => {
    try {
      localStorage.removeItem('restomaster_device_profile');
    } catch {
      // ignore
    }
    setCurrentDeviceProfile(null);
    addAuditLog('Désappairage Terminal', 'Paramètres', 'Terminal désappairé avec succès');
  };

  const toggleProduct86 = async (productId: string): Promise<void> => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const newStatus = !target.available;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, available: newStatus } : p))
    );

    addAuditLog(
      newStatus ? 'Remise en Vente Produit' : 'Règle 86 - Rupture Immédiate',
      'Cuisine',
      `${target.name} déclaré ${newStatus ? 'DISPONIBLE' : 'RUPTURE / 86'}`
    );
  };

  const addPeripheral = async (periph: Omit<Peripheral, 'id'>) => {
    const newP: Peripheral = {
      ...periph,
      id: generateSecureId('periph'),
    };
    setPeripherals((prev) => [...prev, newP]);
    try {
      await configFirestoreService.savePeripheral(newP);
      await logConfigHistory('Périphériques', 'Ajout périphérique', `Périphérique ${newP.name} (${newP.type}) configuré`);
      showToast({
        title: 'Périphérique ajouté',
        message: `Le périphérique ${newP.name} a été enregistré.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Ajout périphérique', err);
      throw err;
    }
    addAuditLog(
      'Ajout périphérique',
      'Paramètres',
      `Périphérique configuré : ${newP.name} (${newP.type})`
    );
  };

  const updatePeripheral = async (id: string, updates: Partial<Peripheral>) => {
    const existing = peripherals.find((p) => p.id === id);
    if (!existing) return;
    const updated: Peripheral = { ...existing, ...updates };
    setPeripherals((prev) => prev.map((p) => (p.id === id ? updated : p)));
    try {
      await configFirestoreService.savePeripheral(updated);
      await logConfigHistory('Périphériques', 'Modification périphérique', `Périphérique ${updated.name} mis à jour`);
      showToast({
        title: 'Périphérique mis à jour',
        message: `Les modifications pour ${updated.name} ont été enregistrées.`,
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Mise à jour périphérique', err);
      throw err;
    }
    addAuditLog('Modification imprimante', 'Paramètres', `Périphérique mis à jour ${id}`);
  };

  const deletePeripheral = async (id: string) => {
    const target = peripherals.find((p) => p.id === id);
    setPeripherals((prev) => prev.filter((p) => p.id !== id));
    try {
      await configFirestoreService.deletePeripheral(id);
      await logConfigHistory('Périphériques', 'Suppression périphérique', `Périphérique ${target?.name || id} supprimé`);
      showToast({
        title: 'Périphérique supprimé',
        message: `Le périphérique ${target?.name || id} a été supprimé.`,
        type: 'info',
      });
    } catch (err) {
      handleSyncError('Suppression périphérique', err);
      throw err;
    }
    addAuditLog('Suppression imprimante', 'Paramètres', `Périphérique supprimé ${id}`);
  };

  const updatePrinterSettings = async (settingsUpdates: Partial<PrinterSettings>) => {
    const next = { ...printerSettings, ...settingsUpdates };
    setPrinterSettings(next);
    saveState('printerSettings', next);
    try {
      await configFirestoreService.savePrinterSettings(next);
      await logConfigHistory('Imprimantes', 'Mise à jour paramètres impression', 'Options d\'automatisation d\'impression enregistrées');
      showToast({
        title: 'Impression configurée',
        message: 'Les paramètres d\'impression thermique ont été enregistrés.',
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Paramètres d\'impression', err);
      throw err;
    }
    addAuditLog('Configuration impression', 'Paramètres', 'Options d\'automatisation d\'impression mises à jour');
  };

  // 31. Règles Opérationnelles Métier (Section 7 POS, Tables, Cuisine, Bar, Caisse)
  const isRuleEnabled = useCallback(
    (ruleKey: string, defaultValue = true): boolean => {
      if (ruleKey in operationRules) {
        return !!operationRules[ruleKey];
      }
      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        if (feat.configuration && ruleKey in feat.configuration) {
          return !!feat.configuration[ruleKey];
        }
      }
      return defaultValue;
    },
    [operationRules, features]
  );

  const updateOperationRules = async (updates: Partial<OperationRules>) => {
    const next = { ...operationRules, ...updates } as unknown as OperationRules;
    setOperationRules(next);
    saveState('operations_rules', next);
    try {
      await configFirestoreService.saveOperationRules(next);
      await logConfigHistory(
        'Règles opérationnelles',
        'Mise à jour règles',
        `${Object.keys(updates).length} règle(s) opérationnelle(s) mise(s) à jour`
      );
      showToast({
        title: 'Règles enregistrées',
        message: 'Les règles opérationnelles ont été enregistrées sur le serveur.',
        type: 'success',
      });
    } catch (err) {
      handleSyncError('Règles opérationnelles', err);
      throw err;
    }
    addAuditLog(
      'Mise à jour règles opérationnelles',
      'Paramètres',
      `${Object.keys(updates).length} règle(s) opérationnelle(s) mise(s) à jour`
    );
  };

  // 31. Multi-Restaurants & Organisation
  const changeActiveRestaurant = (outletId: string) => {
    const targetOutlet = outlets.find((o) => o.id === outletId);
    if (!targetOutlet) return;
    setSelectedOutletId(outletId);
    setActiveZoneId('all');
    // Affecter la caisse correspondante
    const outletRegister = cashRegisters.find((r) => r.restaurantId === outletId);
    if (outletRegister) {
      setActiveCashRegisterId(outletRegister.id);
    }
    addAuditLog(
      'Changement établissement actif',
      'Paramètres',
      `Basculement vers l'établissement : ${targetOutlet.name} (${targetOutlet.city})`
    );
  };

  const updateOrganization = async (orgUpdates: Partial<Organization>) => {
    const updatedOrg = {
      ...organization,
      ...orgUpdates,
      updatedAt: new Date().toISOString(),
    };
    setOrganization(updatedOrg);
    await restaurantFirestoreService.saveOrganization(updatedOrg);
    addAuditLog(
      'Modification profil organisation',
      'Paramètres',
      `Mise à jour des paramètres du groupe / organisation`
    );
  };

  // Zones & Salles
  const addZone = async (zoneData: Omit<Zone, 'id'>): Promise<Zone> => {
    const newZone: Zone = {
      ...zoneData,
      id: generateSecureId('zone'),
      restaurantId: zoneData.restaurantId || selectedOutletId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setZones((prev) => [...prev, newZone]);
    await tablesFirestoreService.saveZone(newZone);
    addAuditLog(
      'Création zone / salle',
      'Tables',
      `Nouvelle zone créée : ${newZone.name} (${newZone.type})`
    );
    return newZone;
  };

  const updateZone = async (zoneId: string, updates: Partial<Zone>) => {
    const target = zones.find((z) => z.id === zoneId);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? updated : z))
    );
    await tablesFirestoreService.saveZone(updated);
    addAuditLog('Modification zone', 'Tables', `Zone ${zoneId} mise à jour`);
  };

  const deleteZone = async (zoneId: string) => {
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
    await tablesFirestoreService.deleteZone(zoneId);
    addAuditLog('Suppression zone', 'Tables', `Zone ${zoneId} supprimée`);
  };

  // Tables & Plan de Salle 2D
  const addTable = async (tableData: Omit<RestaurantTable, 'id'>): Promise<RestaurantTable> => {
    const newTable: RestaurantTable = {
      ...tableData,
      id: generateSecureId('tbl'),
      restaurantId: tableData.restaurantId || selectedOutletId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTables((prev) => [...prev, newTable]);
    await tablesFirestoreService.saveTable(newTable);
    addAuditLog(
      'Création table',
      'Tables',
      `Table N° ${newTable.number} ajoutée (Capacité: ${newTable.capacity})`
    );
    return newTable;
  };

  const updateTable = async (tableId: string, updates: Partial<RestaurantTable>) => {
    const target = tables.find((t) => t.id === tableId);
    if (!target) return;
    const updated = { ...target, ...updates, updatedAt: new Date().toISOString() };
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? updated : t))
    );
    await tablesFirestoreService.saveTable(updated);
  };

  const deleteTable = async (tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    await tablesFirestoreService.deleteTable(tableId);
    addAuditLog('Suppression table', 'Tables', `Table ${tableId} supprimée`);
  };

  const batchSaveTables = async (updatedTables: RestaurantTable[]) => {
    setTables((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      updatedTables.forEach((t) => map.set(t.id, t));
      return Array.from(map.values());
    });
    await tablesFirestoreService.batchSaveTables(updatedTables);
    addAuditLog('Plan de salle', 'Tables', `${updatedTables.length} tables mises à jour (sauvegarde par lot)`);
  };

  const batchSaveDecorElements = async (elements: DecorElement[], removedIds: string[] = []) => {
    setDecorElements((prev) => {
      const filtered = prev.filter((d) => !removedIds.includes(d.id));
      const map = new Map(filtered.map((d) => [d.id, d]));
      elements.forEach((e) => map.set(e.id, e));
      return Array.from(map.values());
    });
    await tablesFirestoreService.batchSaveDecor(elements, removedIds);
    addAuditLog('Plan de salle', 'Tables', `Éléments de décor mis à jour (${elements.length} modifiés, ${removedIds.length} supprimés)`);
  };

  const saveFloorPlanDiff = async (diff: FloorPlanDiffResult) => {
    await tablesFirestoreService.batchApplyFloorPlanDiff(diff, selectedOutletId);

    // Mettre à jour l'état local tables
    setTables((prev) => {
      // 1. Filtrer les tables supprimées
      const filtered = prev.filter((t) => !diff.tablesToDelete.includes(t.id));
      const map = new Map(filtered.map((t) => [t.id, t]));

      // 2. Mettre à jour les champs géométriques (LAYOUT ONLY)
      for (const layout of diff.tablesToUpdate) {
        const existing = map.get(layout.id);
        if (existing) {
          map.set(layout.id, {
            ...existing,
            ...layout,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Ajouter les nouvelles tables créées
      for (const created of diff.tablesToCreate) {
        map.set(created.id, created);
      }

      return Array.from(map.values());
    });

    // Mettre à jour l'état local décor
    setDecorElements((prev) => {
      const filtered = prev.filter((d) => !diff.decorToDelete.includes(d.id));
      const map = new Map(filtered.map((d) => [d.id, d]));
      for (const decor of diff.decorToUpsert) {
        map.set(decor.id, decor);
      }
      return Array.from(map.values());
    });

    addAuditLog(
      'Plan de salle',
      'Tables',
      `Plan de salle synchronisé (${diff.tablesToCreate.length} créées, ${diff.tablesToUpdate.length} modifiées, ${diff.tablesToDelete.length} supprimées)`
    );
  };

  const acquireLayoutLock = async (
    zoneId: string,
    user: { id: string; name: string; role?: string }
  ) => {
    const restaurantId = selectedOutletId || activeRestaurant?.id || '';
    return tablesFirestoreService.acquireLayoutLock(restaurantId, zoneId, user);
  };

  const renewLayoutLock = async (zoneId: string, userId: string) => {
    const restaurantId = selectedOutletId || activeRestaurant?.id || '';
    return tablesFirestoreService.renewLayoutLock(restaurantId, zoneId, userId);
  };

  const releaseLayoutLock = async (zoneId: string, userId: string) => {
    const restaurantId = selectedOutletId || activeRestaurant?.id || '';
    return tablesFirestoreService.releaseLayoutLock(restaurantId, zoneId, userId);
  };

  const addTablesBatch = async (newTablesData: Omit<RestaurantTable, 'id'>[]): Promise<RestaurantTable[]> => {
    const now = new Date().toISOString();
    const created: RestaurantTable[] = newTablesData.map((td) => ({
      ...td,
      id: generateSecureId('tbl'),
      restaurantId: td.restaurantId || selectedOutletId,
      createdAt: now,
      updatedAt: now,
    }));
    setTables((prev) => [...prev, ...created]);
    await tablesFirestoreService.batchSaveTables(created);
    addAuditLog('Création de tables par lot', 'Tables', `${created.length} tables générées par lot`);
    return created;
  };

  const saveDecorElement = async (decor: DecorElement) => {
    const target = { ...decor, updatedAt: new Date().toISOString() };
    setDecorElements((prev) => {
      const exists = prev.some((d) => d.id === target.id);
      if (exists) return prev.map((d) => (d.id === target.id ? target : d));
      return [...prev, target];
    });
    await tablesFirestoreService.saveDecorElement(target);
  };

  const deleteDecorElement = async (decorId: string) => {
    setDecorElements((prev) => prev.filter((d) => d.id !== decorId));
    await tablesFirestoreService.deleteDecorElement(decorId);
    addAuditLog('Suppression décor', 'Tables', `Élément de décor ${decorId} supprimé`);
  };

  const mergeTables = async (targetTableId: string, sourceTableId: string) => {
    const target = tables.find((t) => t.id === targetTableId);
    const source = tables.find((t) => t.id === sourceTableId);
    if (!target || !source) return;

    const mergedList = Array.from(new Set([...(target.mergedTableIds || []), sourceTableId]));
    const updatedTarget: RestaurantTable = {
      ...target,
      mergedTableIds: mergedList,
      status: 'occupee' as TableStatus,
      updatedAt: new Date().toISOString(),
    };
    const updatedSource: RestaurantTable = {
      ...source,
      mergedWithTableId: targetTableId,
      status: 'occupee' as TableStatus,
      updatedAt: new Date().toISOString(),
    };

    setTables((prev) =>
      prev.map((t) => (t.id === targetTableId ? updatedTarget : t.id === sourceTableId ? updatedSource : t))
    );

    await tablesFirestoreService.mergeTablesAtomic(target, source);
    addAuditLog('Fusion de tables', 'Tables', `Table ${source.number} fusionnée avec Table ${target.number}`);
  };

  const splitTables = async (tableId: string) => {
    const target = tables.find((t) => t.id === tableId);
    if (!target) return;

    const primaryId = target.mergedWithTableId || target.id;
    const secondaryTables = tables.filter((t) => t.mergedWithTableId === primaryId);
    const secondaryIds = secondaryTables.map((t) => t.id);

    setTables((prev) =>
      prev.map((t) => {
        if (t.id === primaryId) {
          return { ...t, mergedTableIds: [], mergedWithTableId: undefined, updatedAt: new Date().toISOString() };
        }
        if (secondaryIds.includes(t.id)) {
          return { ...t, mergedWithTableId: undefined, status: 'libre' as TableStatus, updatedAt: new Date().toISOString() };
        }
        return t;
      })
    );

    await tablesFirestoreService.splitTablesAtomic(primaryId, secondaryIds);
    addAuditLog('Séparation de tables', 'Tables', `Séparation des tables associées à Table ${target.number}`);
  };

  const addCashRegister = async (regData: Omit<CashRegister, 'id'>) => {
    const newReg: CashRegister = {
      ...regData,
      id: generateSecureId('reg'),
      restaurantId: regData.restaurantId || selectedOutletId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCashRegisters((prev) => [...prev, newReg]);
    addAuditLog('Création caisse', 'Caisse', `Caisse ${newReg.name} ajoutée`);
  };

  return (
    <RestaurantContext.Provider
      value={{
        settings,
        updateSettings,
        categories,
        stockItems,
        stockMovements,
        stockLots,
        products,
        // Données partitionnées par restaurant actif
        tables: activeTables,
        orders: activeOrders,
        reservations: activeReservations,
        zones: activeZones,
        cashRegisters: activeCashRegisters,
        // Données globales
        allTables: tables,
        allOrders: orders,
        allReservations: reservations,
        allZones: zones,
        allCashRegisters: cashRegisters,

        suppliers,
        purchaseOrders,
        customers,
        employees,
        attendances,
        cashSession,
        cashMovements,
        expenses,
        documents,
        mediaAssets,
        auditLogs,
        notifications,
        unreadNotifsCount,

        hygieneChecks,
        events,
        deliveries,
        withholdings,
        fiscalObligations,
        clientCredits,
        cancellationLogs,
        fiscalJournal,
        invoices,
        isOnline,
        offlineQueueCount: offlineQueue.length,

        // Administration & Features
        features,
        outlets,
        terminals,
        rolePermissions,
        roleLimits,
        peripherals,
        configHistory,
        configAlerts,
        selectedOutletId,
        setSelectedOutletId,
        selectedTerminalId,
        setSelectedTerminalId,
        adminDisplayMode,
        setAdminDisplayMode,

        // Architecture Multi-Restaurants
        organization,
        updateOrganization,
        activeRestaurant,
        changeActiveRestaurant,
        activeZoneId,
        setActiveZoneId,
        activeCashRegisterId,
        setActiveCashRegisterId,
        addZone,
        updateZone,
        deleteZone,
        addTable,
        updateTable,
        deleteTable,
        mergeTables,
        splitTables,
        batchSaveTables,
        batchSaveDecorElements,
        saveFloorPlanDiff,
        acquireLayoutLock,
        renewLayoutLock,
        releaseLayoutLock,
        addTablesBatch,
        decorElements: activeDecorElements,
        saveDecorElement,
        deleteDecorElement,
        addCashRegister,

        createOrder,
        updateOrderStatus,
        updateOrderItemStatus,
        recordOrderPayment,
        addItemsToOrder,
        updateTableGuestsCount,
        updateTableStatus,
        lockTableTablet,
        unlockTableTablet,
        lockAllTableTablets,
        unlockAllTableTablets,
        callWaiterFromTablet,
        dismissWaiterCall,
        requestBillFromTablet,
        updateEmployeePin,
        updateEmployeeWeeklySchedule,
        quickReceiveStock,
        sendOrderToCashier,

        // Gestion des Comptes Utilisateurs & Tablettes Tactiles
        userAccounts,
        createUserAccount,
        updateUserAccount,
        deleteUserAccount,
        toggleUserAccountStatus,
        updateUserAccountPermissions,

        createReservation,
        updateReservationStatus,
        seatReservation,
        addStockMovement,
        createProduct,
        updateProduct,
        toggleProductAvailability,
        submitInventoryAudit,
        createPurchaseOrder,
        receivePurchaseOrder,
        createSupplier,
        createExpense,
        approveExpense,
        recordCashMovement,
        closeCashRegister,
        openCashRegister,
        addAttendanceRecord,
        addDocument,
        uploadMediaAsset,
        deleteMediaAsset,
        syncOfflineData,
        syncError,
        clearSyncError,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        addAuditLog,

        cancelOrderWithAudit,
        addStockLot,
        addHygieneCheck,
        createEvent,
        updateEventStatus,
        createDelivery,
        updateDeliveryStatus,
        recordWithholding,
        recordCreditPayment,
        updateFiscalObligationStatus,
        generateInvoiceForOrder,

        // Fonctions Configuration
        currentDeviceProfile,
        pairDeviceWithCode,
        unpairCurrentDevice,
        generateTerminalPairingCode,
        toggleProduct86,
        updateFeatureStatus,
        updateFeatureConfig,
        updateRolePermission,
        updateRoleLimits,
        applyConfigProfile,
        addOutlet,
        updateOutlet,
        deleteOutlet,
        addTerminal,
        updateTerminal,
        deleteTerminal,
        addPeripheral,
        updatePeripheral,
        deletePeripheral,
        printerSettings,
        updatePrinterSettings,
        operationRules,
        updateOperationRules,
        isRuleEnabled,
        isFeatureEnabled,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

// Re-export des hooks métier spécialisés pour modularité et découpage propre
export {
  useTables,
  useOrders,
  useStock,
  useCashRegister,
  useStaff,
  useRestaurantSettings,
} from '../hooks/restaurant';

