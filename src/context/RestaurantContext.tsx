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
} from '../types/restaurant';
import {
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_STOCK_ITEMS,
  INITIAL_PRODUCTS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_RESERVATIONS,
  INITIAL_SUPPLIERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_CASH_SESSION,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_EXPENSES,
  INITIAL_DOCUMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STOCK_LOTS,
  INITIAL_HYGIENE_CHECKS,
  INITIAL_EVENTS,
  INITIAL_DELIVERIES,
  INITIAL_WITHHOLDINGS,
  INITIAL_FISCAL_OBLIGATIONS,
  INITIAL_CLIENT_CREDITS,
  INITIAL_CANCELLATION_LOGS,
  INITIAL_ORGANIZATION,
  INITIAL_ZONES,
  INITIAL_CASH_REGISTERS,
} from '../lib/seedData';
import {
  FeatureItem,
  FeatureStatus,
  Outlet,
  Terminal,
  Peripheral,
  RoleLimits,
  RolePermissionMatrix,
  PermissionModule,
  PermissionAction,
  ConfigurationHistoryItem,
  ConfigurationAlert,
  ConfigurationProfileType,
} from '../types/configuration';
import {
  INITIAL_FEATURES,
  INITIAL_OUTLETS,
  INITIAL_TERMINALS,
  INITIAL_PERIPHERALS,
  INITIAL_ROLE_LIMITS,
  DEFAULT_PERMISSIONS,
  INITIAL_CONFIG_HISTORY,
  CONFIGURATION_ALERTS_INITIAL,
} from '../lib/configurationSeed';
import { FeatureService } from '../services/features/featureService';
import { generateOrderNumber } from '../lib/utils';
import { TaxEngine } from '../services/fiscal/taxEngine';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { ordersFirestoreService } from '../services/firestore/ordersFirestoreService';
import { tablesFirestoreService } from '../services/firestore/tablesFirestoreService';
import { documentsFirestoreService } from '../services/firestore/documentsFirestoreService';
import { restaurantFirestoreService } from '../services/firestore/restaurantFirestoreService';
import { offlineSyncService } from '../services/firestore/offlineSyncService';
import { cloudinaryService } from '../services/media/cloudinaryService';

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
    note?: string
  ) => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  createReservation: (resData: Omit<Reservation, 'id' | 'createdAt'>) => Promise<void>;
  updateReservationStatus: (resId: string, status: Reservation['status']) => Promise<void>;
  seatReservation: (reservationId: string, tableId: string) => Promise<void>;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'timestamp' | 'userName'>) => Promise<void>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<void>;
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
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addAuditLog: (action: string, module: AuditLog['module'], details: string, entityId?: string) => void;
  resetToDemoData: () => void;

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

  // Centre d'Administration & Configuration Professionnel (eZee Optimus style)
  features: FeatureItem[];
  outlets: Outlet[];
  terminals: Terminal[];
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
  activeRestaurant: Outlet;
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
  addOutlet: (outlet: Omit<Outlet, 'id'>) => Promise<void>;
  addTerminal: (terminal: Omit<Terminal, 'id'>) => Promise<void>;
  addPeripheral: (periph: Omit<Peripheral, 'id'>) => Promise<void>;
  isFeatureEnabled: (featureId: string) => boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Local state with localStorage fallback
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(`restomaster_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [settings, setSettings] = useState<RestaurantSettings>(() => loadState('settings', INITIAL_SETTINGS));
  const [categories, setCategories] = useState<Category[]>(() => loadState('categories', INITIAL_CATEGORIES));
  const [stockItems, setStockItems] = useState<StockItem[]>(() => loadState('stockItems', INITIAL_STOCK_ITEMS));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadState('stockMovements', []));
  const [products, setProducts] = useState<Product[]>(() => loadState('products', INITIAL_PRODUCTS));
  const [tables, setTables] = useState<RestaurantTable[]>(() => loadState('tables', INITIAL_TABLES));
  const [orders, setOrders] = useState<Order[]>(() => loadState('orders', INITIAL_ORDERS));
  const [reservations, setReservations] = useState<Reservation[]>(() => loadState('reservations', INITIAL_RESERVATIONS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadState('suppliers', INITIAL_SUPPLIERS));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => loadState('purchaseOrders', INITIAL_PURCHASE_ORDERS));
  const [customers, setCustomers] = useState<Customer[]>(() => loadState('customers', INITIAL_CUSTOMERS));
  const [employees, setEmployees] = useState<Employee[]>(() => loadState('employees', INITIAL_EMPLOYEES));
  const [attendances, setAttendances] = useState<Attendance[]>(() => loadState('attendances', INITIAL_ATTENDANCE));
  const [cashSession, setCashSession] = useState<CashRegisterSession>(() => loadState('cashSession', INITIAL_CASH_SESSION));
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => loadState('cashMovements', INITIAL_CASH_MOVEMENTS));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', INITIAL_EXPENSES));
  const [documents, setDocuments] = useState<DocumentItem[]>(() => loadState('documents', INITIAL_DOCUMENTS));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadState('auditLogs', INITIAL_AUDIT_LOGS));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadState('notifications', INITIAL_NOTIFICATIONS));

  // Nouveaux Modules & Données Métier Cameroun
  const [stockLots, setStockLots] = useState<StockLot[]>(() => loadState('stockLots', INITIAL_STOCK_LOTS));
  const [hygieneChecks, setHygieneChecks] = useState<HygieneCheck[]>(() => loadState('hygieneChecks', INITIAL_HYGIENE_CHECKS));
  const [events, setEvents] = useState<RestaurantEvent[]>(() => loadState('events', INITIAL_EVENTS));
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>(() => loadState('deliveries', INITIAL_DELIVERIES));
  const [withholdings, setWithholdings] = useState<WithholdingRecord[]>(() => loadState('withholdings', INITIAL_WITHHOLDINGS));
  const [fiscalObligations, setFiscalObligations] = useState<FiscalObligation[]>(() => loadState('fiscalObligations', INITIAL_FISCAL_OBLIGATIONS));
  const [clientCredits, setClientCredits] = useState<ClientCreditAccount[]>(() => loadState('clientCredits', INITIAL_CLIENT_CREDITS));
  const [cancellationLogs, setCancellationLogs] = useState<CancellationLog[]>(() => loadState('cancellationLogs', INITIAL_CANCELLATION_LOGS));
  const [fiscalJournal, setFiscalJournal] = useState<FiscalJournalItem[]>(() => loadState('fiscalJournal', []));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', []));
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => loadState('mediaAssets', []));
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => loadState('offlineQueue', []));

  // Centre d'Administration & Configuration Professionnel (eZee Optimus style)
  const [features, setFeatures] = useState<FeatureItem[]>(() => loadState('features', INITIAL_FEATURES));
  const [outlets, setOutlets] = useState<Outlet[]>(() => loadState('outlets', INITIAL_OUTLETS));
  const [terminals, setTerminals] = useState<Terminal[]>(() => loadState('terminals', INITIAL_TERMINALS));
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(() => loadState('rolePermissions', DEFAULT_PERMISSIONS));
  const [roleLimits, setRoleLimits] = useState<Record<UserRole, RoleLimits>>(() => loadState('roleLimits', INITIAL_ROLE_LIMITS));
  const [peripherals, setPeripherals] = useState<Peripheral[]>(() => loadState('peripherals', INITIAL_PERIPHERALS));
  const [configHistory, setConfigHistory] = useState<ConfigurationHistoryItem[]>(() => loadState('configHistory', INITIAL_CONFIG_HISTORY));
  const [configAlerts, setConfigAlerts] = useState<ConfigurationAlert[]>(() => loadState('configAlerts', CONFIGURATION_ALERTS_INITIAL));
  const [selectedOutletId, setSelectedOutletId] = useState<string>(() => loadState('selectedOutletId', 'out-1'));
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(() => loadState('selectedTerminalId', 'term-1'));
  const [adminDisplayMode, setAdminDisplayMode] = useState<'simple' | 'avance'>('avance');

  // Architecture Multi-Restaurants & Organisation
  const [organization, setOrganization] = useState<Organization>(() => loadState('organization', INITIAL_ORGANIZATION));
  const [zones, setZones] = useState<Zone[]>(() => loadState('zones', INITIAL_ZONES));
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(() => loadState('cashRegisters', INITIAL_CASH_REGISTERS));
  const [activeZoneId, setActiveZoneId] = useState<string | 'all'>(() => loadState('activeZoneId', 'all'));
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<string>(() => loadState('activeCashRegisterId', 'reg-1'));

  // Restaurant Actif & Données Filtrées
  const activeRestaurant = useMemo(() => {
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  }, [outlets, selectedOutletId]);

  const activeTables = useMemo(() => {
    return tables.filter((t) => !t.restaurantId || t.restaurantId === selectedOutletId);
  }, [tables, selectedOutletId]);

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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('restomaster_settings', JSON.stringify(settings));
    localStorage.setItem('restomaster_tables', JSON.stringify(tables));
    localStorage.setItem('restomaster_orders', JSON.stringify(orders));
    localStorage.setItem('restomaster_stockItems', JSON.stringify(stockItems));
    localStorage.setItem('restomaster_stockMovements', JSON.stringify(stockMovements));
    localStorage.setItem('restomaster_products', JSON.stringify(products));
    localStorage.setItem('restomaster_reservations', JSON.stringify(reservations));
    localStorage.setItem('restomaster_cashSession', JSON.stringify(cashSession));
    localStorage.setItem('restomaster_cashMovements', JSON.stringify(cashMovements));
    localStorage.setItem('restomaster_expenses', JSON.stringify(expenses));
    localStorage.setItem('restomaster_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('restomaster_purchaseOrders', JSON.stringify(purchaseOrders));
    localStorage.setItem('restomaster_customers', JSON.stringify(customers));
    localStorage.setItem('restomaster_employees', JSON.stringify(employees));
    localStorage.setItem('restomaster_attendances', JSON.stringify(attendances));
    localStorage.setItem('restomaster_documents', JSON.stringify(documents));
    localStorage.setItem('restomaster_mediaAssets', JSON.stringify(mediaAssets));
    localStorage.setItem('restomaster_auditLogs', JSON.stringify(auditLogs));
    localStorage.setItem('restomaster_notifications', JSON.stringify(notifications));

    // Nouveaux modules
    localStorage.setItem('restomaster_stockLots', JSON.stringify(stockLots));
    localStorage.setItem('restomaster_hygieneChecks', JSON.stringify(hygieneChecks));
    localStorage.setItem('restomaster_events', JSON.stringify(events));
    localStorage.setItem('restomaster_deliveries', JSON.stringify(deliveries));
    localStorage.setItem('restomaster_withholdings', JSON.stringify(withholdings));
    localStorage.setItem('restomaster_fiscalObligations', JSON.stringify(fiscalObligations));
    localStorage.setItem('restomaster_clientCredits', JSON.stringify(clientCredits));
    localStorage.setItem('restomaster_cancellationLogs', JSON.stringify(cancellationLogs));
    localStorage.setItem('restomaster_fiscalJournal', JSON.stringify(fiscalJournal));
    localStorage.setItem('restomaster_invoices', JSON.stringify(invoices));
    localStorage.setItem('restomaster_offlineQueue', JSON.stringify(offlineQueue));

    // Administration & Feature Flags
    localStorage.setItem('restomaster_features', JSON.stringify(features));
    localStorage.setItem('restomaster_outlets', JSON.stringify(outlets));
    localStorage.setItem('restomaster_terminals', JSON.stringify(terminals));
    localStorage.setItem('restomaster_rolePermissions', JSON.stringify(rolePermissions));
    localStorage.setItem('restomaster_roleLimits', JSON.stringify(roleLimits));
    localStorage.setItem('restomaster_peripherals', JSON.stringify(peripherals));
    localStorage.setItem('restomaster_configHistory', JSON.stringify(configHistory));

    // Architecture Multi-Restaurants & Groupes
    localStorage.setItem('restomaster_organization', JSON.stringify(organization));
    localStorage.setItem('restomaster_zones', JSON.stringify(zones));
    localStorage.setItem('restomaster_cashRegisters', JSON.stringify(cashRegisters));
    localStorage.setItem('restomaster_selectedOutletId', JSON.stringify(selectedOutletId));
    localStorage.setItem('restomaster_activeZoneId', JSON.stringify(activeZoneId));
    localStorage.setItem('restomaster_activeCashRegisterId', JSON.stringify(activeCashRegisterId));
  }, [
    settings,
    tables,
    orders,
    stockItems,
    stockMovements,
    products,
    reservations,
    cashSession,
    cashMovements,
    expenses,
    suppliers,
    purchaseOrders,
    customers,
    employees,
    attendances,
    documents,
    mediaAssets,
    auditLogs,
    notifications,
    stockLots,
    hygieneChecks,
    events,
    deliveries,
    withholdings,
    fiscalObligations,
    clientCredits,
    cancellationLogs,
    fiscalJournal,
    invoices,
    offlineQueue,
    features,
    outlets,
    terminals,
    rolePermissions,
    roleLimits,
    peripherals,
    configHistory,
    organization,
    zones,
    cashRegisters,
    selectedOutletId,
    activeZoneId,
    activeCashRegisterId,
  ]);

  // Offline sync queue subscriber
  useEffect(() => {
    const unsub = offlineSyncService.subscribe((queue) => {
      setOfflineQueue(queue);
    });
    return () => unsub();
  }, []);

  // When network comes back online, trigger queue processing
  useEffect(() => {
    if (isOnline) {
      offlineSyncService.processQueue().catch(() => {});
    }
  }, [isOnline]);

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

    return () => {
      unsubOrders();
      unsubTables();
      unsubZones();
      unsubDocs();
      unsubAssets();
    };
  }, [selectedOutletId, organization.id]);

  const addAuditLog = useCallback(
    (action: string, module: AuditLog['module'], details: string, entityId?: string) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userName: currentUser.name,
        userRole: currentUser.role,
        action,
        module,
        details,
        entityId,
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 199)]);
      try {
        setDoc(doc(db, 'auditLogs', newLog.id), newLog).catch(() => {});
      } catch {
        // ignore
      }
    },
    [currentUser]
  );

  const addNotification = useCallback(
    (title: string, message: string, type: NotificationItem['type'], module: string, priority: NotificationItem['priority'] = 'moyenne', actionUrl?: string) => {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
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

  // Update Settings
  // Update Settings
  const updateSettings = async (newSettings: Partial<RestaurantSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await restaurantFirestoreService.saveSettings(updated);
    } catch {}
    addAuditLog('Mise à jour paramètres restaurant', 'Paramètres', 'Modification configuration générale');
  };

  // 1. Create Order
  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    const newOrderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: newOrderNumber,
      restaurantId: orderData.restaurantId || selectedOutletId,
      type: orderData.type || 'sur_place',
      tableId: orderData.tableId,
      tableName: orderData.tableName,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      serverId: currentUser.id,
      serverName: currentUser.name,
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

    // If assigned to a table, update table status
    if (newOrder.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === newOrder.tableId
            ? {
                ...t,
                status: 'en_service',
                currentOrderId: newOrder.id,
                assignedServerName: currentUser.name,
                timeOccupied: now,
              }
            : t
        )
      );
      tablesFirestoreService.updateTableStatus(newOrder.tableId, 'en_service').catch(() => {});
    }

    // Deduct stock if enabled
    if (settings.enableStockAutoDeduction) {
      newOrder.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && prod.ingredients && prod.ingredients.length > 0) {
          prod.ingredients.forEach((ing) => {
            const consumedQty = ing.quantityRequired * item.quantity;
            setStockItems((prevStk) =>
              prevStk.map((s) => {
                if (s.id === ing.stockItemId) {
                  const newQ = Math.max(0, s.currentQuantity - consumedQty);
                  return { ...s, currentQuantity: Math.round(newQ * 100) / 100, lastUpdated: now };
                }
                return s;
              })
            );

            // record stock movement
            const newMovement: StockMovement = {
              id: `mv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              stockItemId: ing.stockItemId,
              stockItemName: ing.stockItemName,
              type: 'sortie_consommation',
              quantityChange: -consumedQty,
              previousQuantity: 0,
              newQuantity: 0,
              unit: ing.unit,
              reason: `Vente commande ${newOrder.orderNumber} (${item.quantity}x ${item.productName})`,
              referenceId: newOrder.id,
              userName: currentUser.name,
              timestamp: now,
            };
            setStockMovements((prev) => [newMovement, ...prev]);
          });
        }
      });
    }

    addAuditLog(
      'Création commande POS',
      'POS',
      `Nouvelle commande ${newOrder.orderNumber} pour ${newOrder.tableName || 'À emporter'} (Total: ${newOrder.total} ${settings.currency})`,
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

  // 2. Update Order Status
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    let updatedOrder: Order | undefined;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          updatedOrder = { ...o, status, updatedAt: now };
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
              preparedAt: status === 'pret' ? now : item.preparedAt,
            };
          }
          return item;
        });

        // If all items ready, automatically advance order status to 'pret'
        const allReady = newItems.every((i) => i.status === 'pret' || i.status === 'servi');
        const nextOrderStatus = allReady ? 'pret' : order.status === 'envoye' ? 'en_preparation' : order.status;

        return {
          ...order,
          items: newItems,
          status: nextOrderStatus,
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
    note?: string
  ) => {
    const now = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      orderId,
      orderNumber: targetOrder.orderNumber,
      amount,
      method,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      date: now,
      note,
    };

    const newPaidAmount = (targetOrder.paidAmount || 0) + amount;
    const isFullyPaid = newPaidAmount >= targetOrder.total - 1; // 1 currency unit delta tolerance

    const updatedOrder: Order = {
      ...targetOrder,
      paidAmount: newPaidAmount,
      paymentStatus: isFullyPaid ? 'paye' : 'partiel',
      status: isFullyPaid ? 'payee' : 'attente_paiement',
      updatedAt: now,
      payments: [...(targetOrder.payments || []), payment],
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // If order was table-assigned and is fully paid, free or mark table for cleaning
    if (isFullyPaid && targetOrder.tableId) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === targetOrder.tableId
            ? { ...t, status: 'a_nettoyer', currentOrderId: undefined }
            : t
        )
      );
      tablesFirestoreService.updateTableStatus(targetOrder.tableId, 'a_nettoyer').catch(() => {});
    }

    // If payment method is cash, register in cash session
    if (method === 'especes') {
      const movement: CashMovement = {
        id: `cm-${Date.now()}`,
        sessionId: cashSession.id,
        type: 'encaissement_vente',
        amount,
        reason: `Règlement espèces ${targetOrder.orderNumber}`,
        user: currentUser.name,
        timestamp: now,
        referenceDocId: orderId,
      };
      setCashMovements((prev) => [movement, ...prev]);
      setCashSession((prev) => ({
        ...prev,
        totalCashIn: prev.totalCashIn + amount,
        expectedTotal: prev.expectedTotal + amount,
      }));
    }

    // Award loyalty points to customer if identified
    if (targetOrder.customerId) {
      const pointsEarned = Math.floor(amount / 1000); // 1 point per 1000 currency units
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === targetOrder.customerId
            ? {
                ...c,
                loyaltyPoints: c.loyaltyPoints + pointsEarned,
                totalSpent: c.totalSpent + amount,
                totalVisits: c.totalVisits + 1,
              }
            : c
        )
      );
    }

    addAuditLog(
      'Encaissement paiement',
      'Caisse',
      `Paiement de ${amount} ${settings.currency} (${method}) pour commande ${targetOrder.orderNumber}`,
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

  // 6. Create Reservation
  const createReservation = async (resData: Omit<Reservation, 'id' | 'createdAt'>) => {
    const newRes: Reservation = {
      ...resData,
      id: `res-${Date.now()}`,
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
      id: `mv-${Date.now()}`,
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
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [...prev, newProduct]);
    addAuditLog('Création nouveau produit menu', 'POS', `Produit ${newProduct.name} créé à ${newProduct.price} ${settings.currency}`);
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
      id: `inv-${Date.now()}`,
      validatedAt: now,
      status: 'valide',
    };

    // Apply adjustments to stock items and create adjustment movements
    inventoryData.items.forEach((item) => {
      if (item.variance !== 0) {
        const fullMovement: StockMovement = {
          id: `mv-inv-${Date.now()}-${item.stockItemId}`,
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
      id: `po-${Date.now()}`,
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
        id: `mv-rcv-${Date.now()}-${item.stockItemId}`,
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
      id: `sup-${Date.now()}`,
      totalPurchases: 0,
      currentBalanceDue: 0,
    };
    setSuppliers((prev) => [...prev, newSup]);
    addAuditLog('Nouveau fournisseur enregistré', 'Achats', `Fournisseur ${newSup.company} (${newSup.name})`);
  };

  // 16. Create Expense
  const createExpense = async (exp: Omit<Expense, 'id' | 'recordedBy'>) => {
    const newExp: Expense = {
      ...exp,
      id: `exp-${Date.now()}`,
      recordedBy: currentUser.name,
    };
    setExpenses((prev) => [newExp, ...prev]);
    addAuditLog('Nouvelle dépense enregistrée', 'Finances', `${exp.amount} ${settings.currency} - ${exp.reason} (${exp.category})`);

    if (newExp.status === 'en_attente') {
      addNotification(
        'Dépense en attente d’approbation',
        `${newExp.amount} ${settings.currency} demandés pour "${newExp.reason}".`,
        'warning',
        'Finances',
        'moyenne',
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
      id: `cm-${Date.now()}`,
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

    if (Math.abs(variance) > settings.minCashVarianceAlert) {
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
    const newSession: CashRegisterSession = {
      id: `sess-${Date.now()}`,
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
      id: `cm-${Date.now()}`,
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
      id: `att-${Date.now()}`,
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
      id: `doc-${Date.now()}`,
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
    await offlineSyncService.processQueue();
  };

  // Notifications helpers
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // 21. Traçabilité des Annulations & Sécurité Audit
  const cancelOrderWithAudit = async (orderId: string, reason: string, approvedBy?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);

    const log: CancellationLog = {
      id: `can-${Date.now()}`,
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

    await ordersFirestoreService.cancelOrder(orderId, reason, log.approvedBy);
  };

  // 22. Gestion des Lots de Stock (FIFO / FEFO)
  const addStockLot = async (lot: Omit<StockLot, 'id'>) => {
    const newLot: StockLot = {
      ...lot,
      id: `lot-${Date.now()}`,
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
      id: `hyg-${Date.now()}`,
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
      id: `evt-${Date.now()}`,
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
      id: `deliv-${Date.now()}`,
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
      id: `wh-${Date.now()}`,
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

  const updateFeatureStatus = async (featureId: string, status: FeatureStatus) => {
    const targetFeat = features.find((f) => f.id === featureId);
    if (!targetFeat) return;

    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              status,
              activatedAt: new Date().toISOString().slice(0, 10),
              activatedBy: currentUser.name,
            }
          : f
      )
    );

    const historyItem: ConfigurationHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action: status === 'ACTIVÉ' ? 'ACTIVATION' : status === 'SUSPENDU' ? 'SUSPENSION' : 'DÉSACTIVATION',
      category: targetFeat.category,
      featureKey: targetFeat.id,
      detail: `Fonctionnalité "${targetFeat.name}" passée au statut ${status}`,
      oldValue: targetFeat.status,
      newValue: status,
    };

    setConfigHistory((prev) => [historyItem, ...prev]);

    addAuditLog(
      'Modification fonctionnalité',
      'Paramètres',
      `Fonctionnalité "${targetFeat.name}" -> ${status} par ${currentUser.name}`
    );
  };

  const updateFeatureConfig = async (featureId: string, config: Record<string, any>) => {
    const targetFeat = features.find((f) => f.id === featureId);
    if (!targetFeat) return;

    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? { ...f, configuration: { ...f.configuration, ...config } }
          : f
      )
    );

    addAuditLog(
      'Configuration fonctionnalité',
      'Paramètres',
      `Options de "${targetFeat.name}" mises à jour par ${currentUser.name}`
    );
  };

  const updateRolePermission = async (
    role: UserRole,
    module: PermissionModule,
    action: PermissionAction,
    allowed: boolean
  ) => {
    setRolePermissions((prev) => {
      const currentRolePerms = (prev as any)[role] || {};
      const currentModulePerms = currentRolePerms[module] || {};
      return {
        ...prev,
        [role]: {
          ...currentRolePerms,
          [module]: {
            ...currentModulePerms,
            [action]: allowed,
          },
        },
      };
    });

    addAuditLog(
      'Modification permissions RBAC',
      'Paramètres',
      `Rôle ${role} -> ${module}.${action} = ${allowed ? 'AUTORISÉ' : 'REFUSÉ'}`
    );
  };

  const updateRoleLimits = async (role: UserRole, limits: Partial<RoleLimits>) => {
    setRoleLimits((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        ...limits,
      },
    }));

    addAuditLog(
      'Modification limites de rôle',
      'Paramètres',
      `Plafonds & approbations mis à jour pour ${role}`
    );
  };

  const applyConfigProfile = async (profile: ConfigurationProfileType) => {
    const updated = FeatureService.applyProfile(features, profile);
    setFeatures(updated);

    const historyItem: ConfigurationHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.name,
      action: 'PROFIL_CONFIGURATION',
      category: 'operations',
      detail: `Application du profil prédéfini "${profile.replace('_', ' ').toUpperCase()}"`,
      newValue: profile,
    };
    setConfigHistory((prev) => [historyItem, ...prev]);

    addAuditLog(
      'Application profil configuration',
      'Paramètres',
      `Profil ${profile} déployé par ${currentUser.name}`
    );
  };

  const addOutlet = async (outlet: Omit<Outlet, 'id'>) => {
    const newOutlet: Outlet = {
      ...outlet,
      id: `out-${Date.now()}`,
    };
    setOutlets((prev) => [...prev, newOutlet]);
    addAuditLog(
      'Création établissement',
      'Paramètres',
      `Nouvel établissement ajouté : ${newOutlet.name} (${newOutlet.city})`
    );
  };

  const addTerminal = async (terminal: Omit<Terminal, 'id'>) => {
    const newTerm: Terminal = {
      ...terminal,
      id: `term-${Date.now()}`,
    };
    setTerminals((prev) => [...prev, newTerm]);
    addAuditLog(
      'Création terminal',
      'Paramètres',
      `Nouveau terminal configuré : ${newTerm.name} (${newTerm.type})`
    );
  };

  const addPeripheral = async (periph: Omit<Peripheral, 'id'>) => {
    const newP: Peripheral = {
      ...periph,
      id: `periph-${Date.now()}`,
    };
    setPeripherals((prev) => [...prev, newP]);
    addAuditLog(
      'Ajout périphérique',
      'Paramètres',
      `Périphérique configuré : ${newP.name} (${newP.type})`
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
      id: `zone-${Date.now()}`,
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
      id: `tbl-${Date.now()}`,
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

  const mergeTables = async (targetTableId: string, sourceTableId: string) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTableId) {
          return { ...t, mergedWithTableId: targetTableId, status: 'occupee' as TableStatus };
        }
        if (t.id === targetTableId) {
          return { ...t, status: 'occupee' as TableStatus };
        }
        return t;
      })
    );
    addAuditLog('Fusion de tables', 'Tables', `Table ${sourceTableId} fusionnée avec Table ${targetTableId}`);
  };

  const splitTables = async (tableId: string) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId || t.mergedWithTableId === tableId) {
          return { ...t, mergedWithTableId: undefined, status: 'libre' as TableStatus };
        }
        return t;
      })
    );
    addAuditLog('Séparation de tables', 'Tables', `Table ${tableId} séparée`);
  };

  const addCashRegister = async (regData: Omit<CashRegister, 'id'>) => {
    const newReg: CashRegister = {
      ...regData,
      id: `reg-${Date.now()}`,
      restaurantId: regData.restaurantId || selectedOutletId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCashRegisters((prev) => [...prev, newReg]);
    addAuditLog('Création caisse', 'Caisse', `Caisse ${newReg.name} ajoutée`);
  };

  // Reset demo data
  const resetToDemoData = () => {
    setSettings(INITIAL_SETTINGS);
    setCategories(INITIAL_CATEGORIES);
    setStockItems(INITIAL_STOCK_ITEMS);
    setStockMovements([]);
    setProducts(INITIAL_PRODUCTS);
    setTables(INITIAL_TABLES);
    setOrders(INITIAL_ORDERS);
    setReservations(INITIAL_RESERVATIONS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setCustomers(INITIAL_CUSTOMERS);
    setEmployees(INITIAL_EMPLOYEES);
    setAttendances(INITIAL_ATTENDANCE);
    setCashSession(INITIAL_CASH_SESSION);
    setCashMovements(INITIAL_CASH_MOVEMENTS);
    setExpenses(INITIAL_EXPENSES);
    setDocuments(INITIAL_DOCUMENTS);
    setMediaAssets([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);

    // Nouveaux modules
    setStockLots(INITIAL_STOCK_LOTS);
    setHygieneChecks(INITIAL_HYGIENE_CHECKS);
    setEvents(INITIAL_EVENTS);
    setDeliveries(INITIAL_DELIVERIES);
    setWithholdings(INITIAL_WITHHOLDINGS);
    setFiscalObligations(INITIAL_FISCAL_OBLIGATIONS);
    setClientCredits(INITIAL_CLIENT_CREDITS);
    setCancellationLogs(INITIAL_CANCELLATION_LOGS);
    setFiscalJournal([]);
    setInvoices([]);
    setOfflineQueue([]);

    // Centre de configuration
    setFeatures(INITIAL_FEATURES);
    setOutlets(INITIAL_OUTLETS);
    setTerminals(INITIAL_TERMINALS);
    setRolePermissions(DEFAULT_PERMISSIONS);
    setRoleLimits(INITIAL_ROLE_LIMITS);
    setPeripherals(INITIAL_PERIPHERALS);
    setConfigHistory(INITIAL_CONFIG_HISTORY);
    setConfigAlerts(CONFIGURATION_ALERTS_INITIAL);

    // Multi-Restaurants & Groupes
    setOrganization(INITIAL_ORGANIZATION);
    setZones(INITIAL_ZONES);
    setCashRegisters(INITIAL_CASH_REGISTERS);
    setSelectedOutletId('out-1');
    setActiveZoneId('all');
    setActiveCashRegisterId('reg-1');

    localStorage.clear();
    addAuditLog('Réinitialisation démo', 'Paramètres', 'Jeu de données de démonstration réinitialisé');
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
        addCashRegister,

        createOrder,
        updateOrderStatus,
        updateOrderItemStatus,
        recordOrderPayment,
        updateTableStatus,
        createReservation,
        updateReservationStatus,
        seatReservation,
        addStockMovement,
        createProduct,
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
        markNotificationRead,
        markAllNotificationsRead,
        addAuditLog,
        resetToDemoData,

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
        updateFeatureStatus,
        updateFeatureConfig,
        updateRolePermission,
        updateRoleLimits,
        applyConfigProfile,
        addOutlet,
        addTerminal,
        addPeripheral,
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
