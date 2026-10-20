import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar, ITEM_RULE_MAP } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TablesView } from './components/tables/TablesView';
import { PosView } from './components/pos/PosView';
import { KitchenKdsView } from './components/kds/KitchenKdsView';
import { BarKdsView } from './components/kds/BarKdsView';
import { ReservationsView } from './components/reservations/ReservationsView';
import { MenuView } from './components/menu/MenuView';
import { StockView } from './components/stock/StockView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { FinanceView } from './components/finance/FinanceView';
import { ClientsView } from './components/clients/ClientsView';
import { StaffView } from './components/staff/StaffView';
import { DocumentsView } from './components/documents/DocumentsView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditView } from './components/audit/AuditView';
import { AdminCenterView } from './components/settings/AdminCenterView';
import { MainCouranteView } from './components/maincourante/MainCouranteView';
import { CameroonComplianceModal } from './components/compliance/CameroonComplianceModal';
import { FiscalCenterView } from './components/fiscal/FiscalCenterView';
import { EventsView } from './components/events/EventsView';
import { DeliveryView } from './components/delivery/DeliveryView';
import { HygieneView } from './components/hygiene/HygieneView';
import { TableKioskView } from './components/kiosk/TableKioskView';
import { CustomerOrderDisplayView } from './components/kds/CustomerOrderDisplayView';
import { DevicePairingScreen } from './components/auth/DevicePairingScreen';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { UserGuideModal } from './components/common/UserGuideModal';
import { UserRole, UserProfile } from './types/restaurant';
import { ShieldAlert } from 'lucide-react';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ModuleErrorBoundary } from './components/common/ModuleErrorBoundary';

// Modals
import { PaymentModal } from './components/pos/PaymentModal';

const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  direction: 'dashboard',
  manager: 'dashboard',
  serveur: 'tables',
  caisse: 'caisse',
  cuisine: 'kitchen_kds',
  bar: 'bar_kds',
  stock: 'stock',
  rh: 'staff',
  finance: 'finance',
  comptable: 'fiscal',
  auditeur: 'audit',
  tablette: 'kiosk',
  aucun: 'dashboard',
};

const TAB_FEATURE_MAP: Record<string, string> = {
  reservations: 'table_reservations',
  delivery: 'delivery_orders',
  events: 'events_banquets',
  kitchen_kds: 'kds_kitchen',
  bar_kds: 'kds_bar',
  stock: 'stock_lots_fefo',
  purchases: 'purchases_suppliers',
  hygiene: 'haccp_hygiene',
  caisse: 'cash_register_z',
  fiscal: 'cameroon_fiscal_framework',
  main_courante: 'hotelpro_maincourante',
  tables: 'tables_management',
};

const AppContent: React.FC = () => {
  const { canAccess, currentUser, isSessionLocked, switchRole, setCurrentUser, lockSession, logout } = useAuth();
  const {
    seatReservation,
    isFeatureEnabled,
    isRuleEnabled,
    currentDeviceProfile,
    unpairCurrentDevice,
  } = useRestaurant();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [kioskTableId, setKioskTableId] = useState<string | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isDisplayTvOpen, setIsDisplayTvOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  // Auto-route to role's default landing screen on login or role switch (Section 2 & 3 du Guide Genesis)
  const prevRoleRef = React.useRef<UserRole | null>(null);
  useEffect(() => {
    if (currentUser.role === 'tablette' || currentUser.accountType === 'tablette') {
      return;
    }
    if (prevRoleRef.current !== currentUser.role) {
      prevRoleRef.current = currentUser.role;
      const roleDefault = ROLE_DEFAULT_TAB[currentUser.role] || 'dashboard';
      if (canAccess(roleDefault)) {
        setCurrentTab(roleDefault);
      }
    }
  }, [currentUser.role, currentUser.accountType, canAccess]);

  // Sidebar collapsible state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('restomaster_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleSetCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('restomaster_sidebar_collapsed', String(collapsed));
    } catch {
      // ignore
    }
  };

  // Cross-module states
  const [posInitialTableId, setPosInitialTableId] = useState<string | undefined>(undefined);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

  // Global keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Tablet accounts or table tablet hardware profiles auto-route to kiosk mode bound to their assigned table
  const [isTabletKioskUnlocked, setIsTabletKioskUnlocked] = useState(false);

  useEffect(() => {
    const isTabletRole = currentUser.role === 'tablette' || currentUser.accountType === 'tablette';
    const isTableDevice = currentDeviceProfile?.type === 'tablette_table';

    if ((isTabletRole || isTableDevice) && !isTabletKioskUnlocked) {
      if (currentTab !== 'kiosk') {
        setCurrentTab('kiosk');
      }
      const targetTableId = currentDeviceProfile?.assignedTableId || currentUser.assignedTableId;
      if (targetTableId && kioskTableId !== targetTableId) {
        setKioskTableId(targetTableId);
      }
    }
  }, [currentUser, currentDeviceProfile, currentTab, kioskTableId, isTabletKioskUnlocked]);

  // Switch tab if permission restricts currentTab or feature is disabled or module rule is disabled
  useEffect(() => {
    if (currentUser.role === 'tablette' || currentUser.accountType === 'tablette') {
      return;
    }

    const requiredFeature = TAB_FEATURE_MAP[currentTab];
    const isFeatureDisabled = requiredFeature && !isFeatureEnabled(requiredFeature);
    const requiredRule = ITEM_RULE_MAP[currentTab];
    const isRuleDisabled = requiredRule && !isRuleEnabled(requiredRule, true);

    if (!canAccess(currentTab) || isFeatureDisabled || isRuleDisabled) {
      if (canAccess('pos') && isFeatureEnabled('pos_core') && isRuleEnabled('mod_pos', true)) setCurrentTab('pos');
      else if (canAccess('kitchen_kds') && isFeatureEnabled('kds_kitchen') && isRuleEnabled('mod_cuisine', true)) setCurrentTab('kitchen_kds');
      else if (canAccess('bar_kds') && isFeatureEnabled('kds_bar') && isRuleEnabled('mod_bar', true)) setCurrentTab('bar_kds');
      else if (canAccess('stock') && isFeatureEnabled('stock_lots_fefo') && isRuleEnabled('mod_stock', true)) setCurrentTab('stock');
      else if (canAccess('tables') && isFeatureEnabled('tables_management') && isRuleEnabled('mod_tables', true)) setCurrentTab('tables');
      else setCurrentTab('dashboard');
    }
  }, [currentUser.role, currentUser.accountType, currentTab, canAccess, isFeatureEnabled, isRuleEnabled]);

  const handleOpenOrderOnTable = (tableId: string) => {
    setPosInitialTableId(tableId);
    setCurrentTab('pos');
  };

  const handleOpenPayment = (orderId: string) => {
    setPaymentOrderId(orderId);
  };

  const handleSeatGuestFromReservation = async (reservationId: string, tableId: string) => {
    await seatReservation(reservationId, tableId);
    setCurrentTab('tables');
  };

  // Mode Écran TV Retrait Client (QSR / Fast-Food)
  if (currentDeviceProfile?.type === 'ecran_retrait' || isDisplayTvOpen) {
    return (
      <CustomerOrderDisplayView
        onExit={async () => {
          setIsDisplayTvOpen(false);
          if (currentDeviceProfile?.type === 'ecran_retrait') {
            await unpairCurrentDevice();
          }
        }}
      />
    );
  }

  // Mode Tablette Kiosk Plein Écran Dédié : Suppression totale de la Sidebar et du Header d'administration (Exigence Audio & Screenshot)
  if (currentTab === 'kiosk' && !isTabletKioskUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 overflow-hidden w-screen h-screen select-none">
        <TableKioskView
          initialTableId={kioskTableId}
          onExit={async (shouldUnpair?: boolean, supervisor?: UserProfile) => {
            setIsTabletKioskUnlocked(true);
            if (shouldUnpair && currentDeviceProfile?.type === 'tablette_table') {
              await unpairCurrentDevice();
            }
            if (supervisor) {
              setCurrentUser(supervisor);
            } else if (currentUser.role === 'tablette') {
              lockSession();
            }
            setCurrentTab('tables');
          }}
        />
        {/* Tactile PIN Lock Screen Overlay si verrouillage activé */}
        {isSessionLocked && <PinLockScreen />}
      </div>
    );
  }

  const handleSelectTab = (tab: string) => {
    if (tab === 'kiosk') {
      setIsTabletKioskUnlocked(false);
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans antialiased selection:bg-amber-500 selection:text-white max-w-full overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSelectTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={handleSetCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72'
        }`}
      >
        {/* Header Bar */}
        <Header
          currentTab={currentTab}
          setCurrentTab={handleSelectTab}
          setMobileOpen={setMobileOpen}
          openSearch={() => setIsSearchOpen(true)}
          openComplianceModal={() => setIsComplianceOpen(true)}
          openPairingModal={() => setIsPairingOpen(true)}
          openCustomerDisplay={() => setIsDisplayTvOpen(true)}
          openUserGuide={() => setIsUserGuideOpen(true)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto min-w-0">
          {!currentUser.active || currentUser.role === 'aucun' ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto my-12">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Compte en attente d'activation</h2>
              <p className="text-sm text-slate-600 mb-6">
                Votre profil utilisateur n'a aucun rôle actif attribué. Veuillez vous adresser à la direction ou au responsable d'établissement pour activer vos privilèges.
              </p>
              <button
                onClick={() => logout()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <ModuleErrorBoundary key={currentTab} moduleName={currentTab}>
              {currentTab === 'dashboard' && <DashboardView navigateTo={handleSelectTab} />}
              {currentTab === 'tables' && (
                <TablesView
                  onOpenOrder={handleOpenOrderOnTable}
                  onPayOrder={handleOpenPayment}
                  onOpenKiosk={(tId) => {
                    setIsTabletKioskUnlocked(false);
                    setKioskTableId(tId);
                    setCurrentTab('kiosk');
                  }}
                />
              )}
              {currentTab === 'pos' && (
                <PosView
                  initialTableId={posInitialTableId}
                  onOpenPayment={handleOpenPayment}
                  mode="restaurant"
                />
              )}
              {currentTab === 'bar_pos' && (
                <PosView
                  initialTableId={posInitialTableId}
                  onOpenPayment={handleOpenPayment}
                  mode="bar"
                />
              )}
              {currentTab === 'kitchen_kds' && <KitchenKdsView />}
              {currentTab === 'bar_kds' && <BarKdsView />}
              {currentTab === 'reservations' && (
                <ReservationsView onSeatGuest={handleSeatGuestFromReservation} />
              )}
              {currentTab === 'events' && <EventsView />}
              {currentTab === 'delivery' && <DeliveryView />}
              {currentTab === 'menu' && <MenuView />}
              {currentTab === 'stock' && <StockView />}
              {currentTab === 'purchases' && <PurchasesView />}
              {currentTab === 'hygiene' && <HygieneView />}
              {currentTab === 'caisse' && <CashRegisterView onOpenPayment={handleOpenPayment} />}
              {currentTab === 'main_courante' && <MainCouranteView />}
              {currentTab === 'fiscal' && <FiscalCenterView />}
              {currentTab === 'finance' && <FinanceView />}
              {currentTab === 'clients' && <ClientsView />}
              {currentTab === 'staff' && <StaffView />}
              {currentTab === 'documents' && <DocumentsView />}
              {currentTab === 'reports' && <ReportsView />}
              {currentTab === 'audit' && <AuditView />}
              {currentTab === 'settings' && <AdminCenterView />}
            </ModuleErrorBoundary>
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigateTo={setCurrentTab}
      />

      {/* Payment Processing Modal */}
      {paymentOrderId && (
        <PaymentModal
          orderId={paymentOrderId}
          onClose={() => setPaymentOrderId(null)}
        />
      )}

      {/* Cameroon Compliance Modal */}
      <CameroonComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
      />

      {/* Hardware Device Pairing & Provisioning Modal */}
      {isPairingOpen && (
        <DevicePairingScreen
          onSuccess={() => setIsPairingOpen(false)}
          onCancel={() => setIsPairingOpen(false)}
        />
      )}

      {/* Guide d'Utilisation Officiel Genesis Digital Agency Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        initialRole={currentUser.role}
      />

      {/* Tactile PIN Lock Screen Overlay */}
      {isSessionLocked && <PinLockScreen />}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <RestaurantProvider>
            <AppContent />
          </RestaurantProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
