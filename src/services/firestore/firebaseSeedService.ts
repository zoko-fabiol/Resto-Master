import { db } from '../../lib/firebase';
import {
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
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
  INITIAL_ORGANIZATION,
  INITIAL_ZONES,
  INITIAL_CASH_REGISTERS,
  INITIAL_USER_ACCOUNTS,
} from '../../lib/seedData';
import {
  INITIAL_FEATURES,
  INITIAL_OUTLETS,
  INITIAL_TERMINALS,
  INITIAL_PERIPHERALS,
  INITIAL_ROLE_LIMITS,
  DEFAULT_PERMISSIONS,
} from '../../lib/configurationSeed';
import { DEFAULT_OPERATION_RULES } from '../../types/configuration';

export const firebaseSeedService = {
  /**
   * Migrate existing localStorage data or initial seeds directly into Firestore
   */
  async initializeOrMigrateToFirestore(): Promise<void> {
    try {
      const isMigrated = localStorage.getItem('restomaster_firestore_migrated');
      if (isMigrated === 'true') {
        return;
      }

      // Helper to load localStorage with fallback to initial seed
      const getLocalOrSeed = <T>(key: string, seed: T): T => {
        try {
          const item = localStorage.getItem(`restomaster_${key}`);
          return item ? JSON.parse(item) : seed;
        } catch {
          return seed;
        }
      };

      // Check if Firestore already has the organization
      const orgDoc = await getDoc(doc(db, 'organizations', INITIAL_ORGANIZATION.id));
      if (!orgDoc.exists()) {
        console.log('🚀 Démarrage de la migration/initialisation des données vers Firestore...');

        // Batch 1: Organisation, Paramètres, Outlets, Zones, Caisses, Config
        const batch1 = writeBatch(db);
        const orgData = getLocalOrSeed('organization', INITIAL_ORGANIZATION);
        batch1.set(doc(db, 'organizations', orgData.id), orgData, { merge: true });

        const settingsData = getLocalOrSeed('settings', INITIAL_SETTINGS);
        batch1.set(doc(db, 'settings', settingsData.restaurantId || settingsData.id), settingsData, { merge: true });

        const outlets = getLocalOrSeed('outlets', INITIAL_OUTLETS);
        outlets.forEach((o) => batch1.set(doc(db, 'restaurants', o.id), o, { merge: true }));

        const zones = getLocalOrSeed('zones', INITIAL_ZONES);
        zones.forEach((z) => batch1.set(doc(db, 'zones', z.id), z, { merge: true }));

        const cashRegisters = getLocalOrSeed('cashRegisters', INITIAL_CASH_REGISTERS);
        cashRegisters.forEach((cr) => batch1.set(doc(db, 'cash_registers', cr.id), cr, { merge: true }));

        // System Config
        batch1.set(doc(db, 'system_config', 'features'), { items: getLocalOrSeed('features', INITIAL_FEATURES) }, { merge: true });
        batch1.set(doc(db, 'system_config', 'role_permissions'), { matrix: getLocalOrSeed('rolePermissions', DEFAULT_PERMISSIONS) }, { merge: true });
        batch1.set(doc(db, 'system_config', 'role_limits'), { limits: getLocalOrSeed('roleLimits', INITIAL_ROLE_LIMITS) }, { merge: true });
        batch1.set(doc(db, 'system_config', 'operation_rules'), { rules: getLocalOrSeed('operations_rules', DEFAULT_OPERATION_RULES) }, { merge: true });

        await batch1.commit();

        // Batch 2: Tables, Catégories, Produits
        const batch2 = writeBatch(db);
        const tables = getLocalOrSeed('tables', INITIAL_TABLES);
        tables.forEach((t) => batch2.set(doc(db, 'tables', t.id), t, { merge: true }));

        const categories = getLocalOrSeed('categories', INITIAL_CATEGORIES);
        categories.forEach((c) => batch2.set(doc(db, 'categories', c.id), c, { merge: true }));

        const products = getLocalOrSeed('products', INITIAL_PRODUCTS);
        products.forEach((p) => batch2.set(doc(db, 'products', p.id), p, { merge: true }));

        await batch2.commit();

        // Batch 3: Stocks, Lots, Fournisseurs, Commandes d'achat
        const batch3 = writeBatch(db);
        const stockItems = getLocalOrSeed('stockItems', INITIAL_STOCK_ITEMS);
        stockItems.forEach((si) => batch3.set(doc(db, 'stock_items', si.id), si, { merge: true }));

        const stockLots = getLocalOrSeed('stockLots', INITIAL_STOCK_LOTS);
        stockLots.forEach((sl) => batch3.set(doc(db, 'stock_lots', sl.id), sl, { merge: true }));

        const suppliers = getLocalOrSeed('suppliers', INITIAL_SUPPLIERS);
        suppliers.forEach((s) => batch3.set(doc(db, 'suppliers', s.id), s, { merge: true }));

        const purchaseOrders = getLocalOrSeed('purchaseOrders', INITIAL_PURCHASE_ORDERS);
        purchaseOrders.forEach((po) => batch3.set(doc(db, 'purchase_orders', po.id), po, { merge: true }));

        await batch3.commit();

        // Batch 4: Employés, Comptes Utilisateurs, Pointages, Clients
        const batch4 = writeBatch(db);
        const employees = getLocalOrSeed('employees', INITIAL_EMPLOYEES);
        employees.forEach((e) => batch4.set(doc(db, 'employees', e.id), e, { merge: true }));

        const userAccounts = getLocalOrSeed('user_accounts', INITIAL_USER_ACCOUNTS);
        userAccounts.forEach((ua) => batch4.set(doc(db, 'user_accounts', ua.id), ua, { merge: true }));

        const attendances = getLocalOrSeed('attendances', INITIAL_ATTENDANCE);
        attendances.forEach((a) => batch4.set(doc(db, 'attendances', a.id), a, { merge: true }));

        const customers = getLocalOrSeed('customers', INITIAL_CUSTOMERS);
        customers.forEach((c) => batch4.set(doc(db, 'customers', c.id), c, { merge: true }));

        const clientCredits = getLocalOrSeed('clientCredits', INITIAL_CLIENT_CREDITS);
        clientCredits.forEach((cc) => batch4.set(doc(db, 'client_credits', cc.id), cc, { merge: true }));

        await batch4.commit();

        // Batch 5: Commandes en cours, Réservations, Caisse active, Événements, Livraisons
        const batch5 = writeBatch(db);
        const orders = getLocalOrSeed('orders', INITIAL_ORDERS);
        orders.forEach((o) => batch5.set(doc(db, 'orders', o.id), o, { merge: true }));

        const reservations = getLocalOrSeed('reservations', INITIAL_RESERVATIONS);
        reservations.forEach((r) => batch5.set(doc(db, 'reservations', r.id), r, { merge: true }));

        const cashSession = getLocalOrSeed('cashSession', INITIAL_CASH_SESSION);
        if (cashSession && cashSession.id) {
          batch5.set(doc(db, 'cash_sessions', cashSession.id), cashSession, { merge: true });
        }

        const events = getLocalOrSeed('events', INITIAL_EVENTS);
        events.forEach((ev) => batch5.set(doc(db, 'events', ev.id), ev, { merge: true }));

        const deliveries = getLocalOrSeed('deliveries', INITIAL_DELIVERIES);
        deliveries.forEach((d) => batch5.set(doc(db, 'deliveries', d.id), d, { merge: true }));

        await batch5.commit();
        console.log('✅ Migration / Initialisation Firestore terminée avec succès !');
      }

      // Mark migration as done locally
      localStorage.setItem('restomaster_firestore_migrated', 'true');

      // Nettoyer les clés de localStorage désormais gérées nativement par Firestore
      const keysToClean = [
        'restomaster_settings',
        'restomaster_tables',
        'restomaster_orders',
        'restomaster_stockItems',
        'restomaster_stockMovements',
        'restomaster_products',
        'restomaster_reservations',
        'restomaster_cashSession',
        'restomaster_cashMovements',
        'restomaster_expenses',
        'restomaster_suppliers',
        'restomaster_purchaseOrders',
        'restomaster_customers',
        'restomaster_employees',
        'restomaster_attendances',
        'restomaster_stockLots',
        'restomaster_hygieneChecks',
        'restomaster_events',
        'restomaster_deliveries',
        'restomaster_withholdings',
        'restomaster_fiscalObligations',
        'restomaster_clientCredits',
        'restomaster_cancellationLogs',
        'restomaster_fiscalJournal',
        'restomaster_invoices',
        'restomaster_features',
        'restomaster_outlets',
        'restomaster_terminals',
        'restomaster_rolePermissions',
        'restomaster_roleLimits',
        'restomaster_peripherals',
        'restomaster_printerSettings',
        'restomaster_operations_rules',
        'restomaster_configHistory',
        'restomaster_organization',
        'restomaster_zones',
        'restomaster_cashRegisters',
        'restomaster_offlineQueue',
        'restomaster_offline_action_queue',
      ];
      keysToClean.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Note sur la migration Firestore:', err);
    }
  },
};
