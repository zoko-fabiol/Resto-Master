import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar, ITEM_RULE_MAP } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ModuleSkeleton } from './components/common/ModuleSkeleton';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ModuleErrorBoundary } from './components/common/ModuleErrorBoundary';

// Lazy-loaded Views (Code-splitting pour optimisation des performances)
const DashboardView = lazy(() => import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })));
const TablesView = lazy(() => import('./components/tables/TablesView').then(m => ({ default: m.TablesView })));
const PosView = lazy(() => import('./components/pos/PosView').then(m => ({ default: m.PosView })));
const KitchenKdsView = lazy(() => import('./components/kds/KitchenKdsView').then(m => ({ default: m.KitchenKdsView })));
const BarKdsView = lazy(() => import('./components/kds/BarKdsView').then(m => ({ default: m.BarKdsView })));
const ReservationsView = lazy(() => import('./components/reservations/ReservationsView').then(m => ({ default: m.ReservationsView })));
const MenuView = lazy(() => import('./components/menu/MenuView').then(m => ({ default: m.MenuView })));
const StockView = lazy(() => import('./components/stock/StockView').then(m => ({ default: m.StockView })));
const PurchasesView = lazy(() => import('./components/purchases/PurchasesView').then(m => ({ default: m.PurchasesView })));
const CashRegisterView = lazy(() => import('./components/cash/CashRegisterView').then(m => ({ default: m.CashRegisterView })));
const FinanceView = lazy(() => import('./components/finance/FinanceView').then(m => ({ default: m.FinanceView })));
const ClientsView = lazy(() => import('./components/clients/ClientsView').then(m => ({ default: m.ClientsView })));
const StaffView = lazy(() => import('./components/staff/StaffView').then(m => ({ default: m.StaffView })));
const DocumentsView = lazy(() => import('./components/documents/DocumentsView').then(m => ({ default: m.DocumentsView })));
const ReportsView = lazy(() => import('./components/reports/ReportsView').then(m => ({ default: m.ReportsView })));
const AuditView = lazy(() => import('./components/audit/AuditView').then(m => ({ default: m.AuditView })));
const AdminCenterView = lazy(() => import('./components/settings/AdminCenterView').then(m => ({ default: m.AdminCenterView })));
const MainCouranteView = lazy(() => import('./components/maincourante/MainCouranteView').then(m => ({ default: m.MainCouranteView })));
const FiscalCenterView = lazy(() => import('./components/fiscal/FiscalCenterView').then(m => ({ default: m.FiscalCenterView })));
const EventsView = lazy(() => import('./components/events/EventsView').then(m => ({ default: m.EventsView })));
const DeliveryView = lazy(() => import('./components/delivery/DeliveryView').then(m => ({ default: m.DeliveryView })));
const HygieneView = lazy(() => import('./components/hygiene/HygieneView').then(m => ({ default: m.HygieneView })));
const TableKioskView = lazy(() => import('./components/kiosk/TableKioskView').then(m => ({ default: m.TableKioskView })));
const CustomerOrderDisplayView = lazy(() => import('./components/kds/CustomerOrderDisplayView').then(m => ({ default: m.CustomerOrderDisplayView })));

// Non-lazy modals / critical screens
import { CameroonComplianceModal } from './components/compliance/CameroonComplianceModal';
import { DevicePairingScreen } from './components/auth/DevicePairingScreen';
import { PinLockScreen } from './components/auth/PinLockScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { UserGuideModal } from './components/common/UserGuideModal';
import { PaymentModal } from './components/pos/PaymentModal';
import { OnboardingWizard } from './components/admin/OnboardingWizard';
import { SetupWizardModal } from './components/setup/SetupWizardModal';
import { TenantStatusBanner } from './components/common/TenantStatusBanner';
import { FeatureGate } from './components/common/FeatureGate';
import { UserRole, UserProfile } from './types/restaurant';
import { ShieldAlert, ShieldCheck, Utensils } from 'lucide-react';

export const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  superadmin: 'settings',
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
  const location = useLocation();
  const navigate = useNavigate();
  const {
    canAccess,
    currentUser,
    firebaseAuthUser,
    isAuthLoading,
    isSessionLocked,
    setCurrentUser,
    lockSession,
    logout,
  } = useAuth();
  const { showToast } = useToast();
  const {
    seatReservation,
    isFeatureEnabled,
    isRuleEnabled,
    currentDeviceProfile,
    unpairCurrentDevice,
    terminals,
    settings,
    outlets,
    tenant,
  } = useRestaurant();

  const currentTerminal = terminals.find((t) => t.id === currentDeviceProfile?.terminalId);
  const isTerminalLocked = isSessionLocked || Boolean(currentTerminal?.isLocked);

  useEffect(() => {
    const handleOfflinePending = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count ?? 0;
      if (count > 0) {
        showToast({
          title: 'Opérations hors ligne en attente',
          message: `${count} opération${count > 1 ? 's' : ''} n'a pas encore été synchronisée. Reconnectez-vous avant de fermer ou désinstaller l'application.`,
          type: 'warning',
          duration: 10000,
        });
      }
    };

    window.addEventListener('restomaster:offline-pending', handleOfflinePending);
    return () => window.removeEventListener('restomaster:offline-pending', handleOfflinePending);
  }, [showToast]);

  useEffect(() => {
    const handlePlatformError = (event: Event) => {
      const detail = (event as CustomEvent<{ operation?: string; message?: string }>).detail;
      showToast({
        title: `Échec de l'${detail?.operation || 'opération'}`,
        message: detail?.message || 'La plateforme n’a pas confirmé cette opération.',
        type: 'error',
        duration: 10000,
      });
    };

    window.addEventListener('restomaster:platform-error', handlePlatformError);
    return () => window.removeEventListener('restomaster:platform-error', handlePlatformError);
  }, [showToast]);

  // Route URL synchronisée (ex: /pos -> pos, / -> '')
  const rawPath = location.pathname.replace(/^\/+/, '').split('/')[0] || '';
  const currentTab = rawPath || 'dashboard';

  const [kioskTableId, setKioskTableId] = useState<string | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [isDisplayTvOpen, setIsDisplayTvOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [hasJustChangedPassword, setHasJustChangedPassword] = useState(false);

  // Auto-launch SetupWizardModal for setupOwner (direction) or superadmin on fresh install
  useEffect(() => {
    const isOwnerOrSuper =
      currentUser.role === 'superadmin' ||
      (currentUser.role === 'direction' && currentUser.setupOwner === true);

    if (
      isOwnerOrSuper &&
      (tenant?.status === 'installation' ||
        (!settings?.certifiedReadyForHandover &&
          (!outlets || outlets.length === 0 || hasJustChangedPassword || currentUser.isFirstLogin)))
    ) {
      setIsSetupWizardOpen(true);
    }
  }, [currentUser.role, currentUser.setupOwner, currentUser.isFirstLogin, tenant?.status, settings?.certifiedReadyForHandover, outlets?.length, hasJustChangedPassword]);

  // Redirection selon le rôle à la connexion ou changement de rôle
  const prevRoleRef = React.useRef<UserRole | null>(null);
  useEffect(() => {
    if (currentUser.role === 'tablette' || currentUser.accountType === 'tablette') {
      return;
    }
    if (!rawPath) {
      const roleDefault = ROLE_DEFAULT_TAB[currentUser.role] || 'dashboard';
      if (canAccess(roleDefault)) {
        navigate(`/${roleDefault}`, { replace: true });
      }
    } else if (prevRoleRef.current !== currentUser.role) {
      prevRoleRef.current = currentUser.role;
      const roleDefault = ROLE_DEFAULT_TAB[currentUser.role] || 'dashboard';
      if (canAccess(roleDefault)) {
        navigate(`/${roleDefault}`);
      }
    }
  }, [rawPath, currentUser.role, currentUser.accountType, canAccess, navigate]);

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
        navigate('/kiosk', { replace: true });
      }
      const targetTableId = currentDeviceProfile?.assignedTableId || currentUser.assignedTableId;
      if (targetTableId && kioskTableId !== targetTableId) {
        setKioskTableId(targetTableId);
      }
    }
  }, [currentUser, currentDeviceProfile, currentTab, kioskTableId, isTabletKioskUnlocked, navigate]);

  // Route guard : refus immédiat de tout accès direct par URL si l'onglet ou le module est interdit
  useEffect(() => {
    if (currentUser.role === 'tablette' || currentUser.accountType === 'tablette') {
      return;
    }

    if (!canAccess(currentTab)) {
      let fallback = 'dashboard';
      if (canAccess('pos')) fallback = 'pos';
      else if (canAccess('kitchen_kds')) fallback = 'kitchen_kds';
      else if (canAccess('bar_kds')) fallback = 'bar_kds';
      else if (canAccess('stock')) fallback = 'stock';
      else if (canAccess('tables')) fallback = 'tables';
      else if (canAccess('caisse')) fallback = 'caisse';

      navigate(`/${fallback}`, { replace: true });
    }
  }, [currentUser.role, currentUser.accountType, currentTab, canAccess, navigate]);

  const handleOpenOrderOnTable = (tableId: string) => {
    setPosInitialTableId(tableId);
    navigate('/pos');
  };

  const handleOpenPayment = (orderId: string) => {
    setPaymentOrderId(orderId);
  };

  const handleSeatGuestFromReservation = async (reservationId: string, tableId: string) => {
    await seatReservation(reservationId, tableId);
    navigate('/tables');
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'kiosk') {
      setIsTabletKioskUnlocked(false);
    }
    navigate(`/${tab}`);
  };

  // 0. Chargement de session initial
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-amber-500">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse mb-3">
          <Utensils className="w-6 h-6" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Chargement de RestoMaster OS...</p>
      </div>
    );
  }

  // 1. Gate d'authentification stricte : si non connecté -> LoginScreen (B1)
  if (!firebaseAuthUser) {
    return <LoginScreen />;
  }

  // 2. Changement de mot de passe obligatoire au premier lancement (B9)
  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordModal
        isOpen={true}
        onSuccess={() => {
          setHasJustChangedPassword(true);
          setIsOnboardingOpen(true);
        }}
      />
    );
  }

  // 3. Compte connecté mais inactif ou sans rôle attribué (B1)
  if (!currentUser.active || currentUser.role === 'aucun') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Compte en attente d'affectation</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Votre compte <span className="text-slate-200 font-semibold">{currentUser.email}</span> est authentifié mais n'a pas encore de rôle actif sur cet établissement. Veuillez contacter le propriétaire de votre restaurant ou l'administrateur de la plateforme pour activer vos accès.
          </p>
          <div className="flex justify-center w-full">
            <button
              onClick={() => logout()}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode Écran TV Retrait Client (QSR / Fast-Food)
  if (currentDeviceProfile?.type === 'ecran_retrait' || isDisplayTvOpen) {
    return (
      <ModuleErrorBoundary moduleName="Écran Retrait">
        <Suspense fallback={<ModuleSkeleton moduleName="Écran Retrait" />}>
          <CustomerOrderDisplayView
            onExit={async () => {
              setIsDisplayTvOpen(false);
              if (currentDeviceProfile?.type === 'ecran_retrait') {
                await unpairCurrentDevice();
              }
            }}
          />
        </Suspense>
      </ModuleErrorBoundary>
    );
  }

  // Mode Tablette Kiosk Plein Écran Dédié
  if (currentTab === 'kiosk' && !isTabletKioskUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 overflow-hidden w-screen h-screen select-none">
        <ModuleErrorBoundary moduleName="Kiosk Client">
          <Suspense fallback={<ModuleSkeleton moduleName="Kiosk Client" />}>
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
                navigate('/tables');
              }}
            />
          </Suspense>
        </ModuleErrorBoundary>
        {/* Tactile PIN Lock Screen Overlay si verrouillage activé */}
        {isTerminalLocked && <PinLockScreen />}
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 text-slate-900 flex font-sans antialiased selection:bg-amber-500 selection:text-white max-w-full overflow-x-hidden">
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
        className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-[padding] duration-200 ease-out ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72'
        }`}
      >
        {/* Bannière de Statut Tenant (Essai, Impayé, Suspendu, Lecture Seule) */}
        <TenantStatusBanner onOpenSetupWizard={() => setIsSetupWizardOpen(true)} />

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
          openOnboarding={() => setIsOnboardingOpen(true)}
        />

        {/* Dynamic View Body avec padding inférieur sur mobile pour BottomNav */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-7">
          <ModuleErrorBoundary key={currentTab} moduleName={currentTab}>
            <Suspense fallback={<ModuleSkeleton moduleName={currentTab} />}>
              {currentTab === 'dashboard' && <DashboardView navigateTo={handleSelectTab} />}
              {currentTab === 'tables' && (
                <FeatureGate moduleKey="mod_tables" title="Plan de Salle Verrouillé" description="Le plan de salle interactif n'est pas inclus dans votre formule actuelle.">
                  <TablesView
                    onOpenOrder={handleOpenOrderOnTable}
                    onPayOrder={handleOpenPayment}
                    onOpenKiosk={(tId) => {
                      setIsTabletKioskUnlocked(false);
                      setKioskTableId(tId);
                      navigate('/kiosk');
                    }}
                  />
                </FeatureGate>
              )}
              {currentTab === 'pos' && (
                <PosView
                  initialTableId={posInitialTableId}
                  onOpenPayment={handleOpenPayment}
                  mode="restaurant"
                />
              )}
              {currentTab === 'bar_pos' && (
                <FeatureGate moduleKey="mod_bar_pos" title="Poste Bar Dédié Verrouillé">
                  <PosView
                    initialTableId={posInitialTableId}
                    onOpenPayment={handleOpenPayment}
                    mode="bar"
                  />
                </FeatureGate>
              )}
              {currentTab === 'kitchen_kds' && (
                <FeatureGate moduleKey="mod_cuisine" title="KDS Cuisine Verrouillé">
                  <KitchenKdsView />
                </FeatureGate>
              )}
              {currentTab === 'bar_kds' && (
                <FeatureGate moduleKey="mod_bar" title="KDS Bar Verrouillé">
                  <BarKdsView />
                </FeatureGate>
              )}
              {currentTab === 'reservations' && (
                <FeatureGate moduleKey="mod_tables" featureKey="table_reservations" title="Cahier de Réservations Verrouillé">
                  <ReservationsView onSeatGuest={handleSeatGuestFromReservation} />
                </FeatureGate>
              )}
              {currentTab === 'events' && (
                <FeatureGate moduleKey="mod_events" title="Événements & Banquets Verrouillés">
                  <EventsView />
                </FeatureGate>
              )}
              {currentTab === 'delivery' && (
                <FeatureGate moduleKey="mod_delivery" title="Module Livraisons Verrouillé">
                  <DeliveryView />
                </FeatureGate>
              )}
              {currentTab === 'menu' && <MenuView />}
              {currentTab === 'stock' && (
                <FeatureGate moduleKey="mod_stock" title="Gestion des Stocks Verrouillée">
                  <StockView />
                </FeatureGate>
              )}
              {currentTab === 'purchases' && (
                <FeatureGate moduleKey="mod_purchases" title="Gestion des Achats Verrouillée">
                  <PurchasesView />
                </FeatureGate>
              )}
              {currentTab === 'hygiene' && (
                <FeatureGate moduleKey="mod_hygiene" title="Contrôle Hygiène & HACCP Verrouillé">
                  <HygieneView />
                </FeatureGate>
              )}
              {currentTab === 'caisse' && <CashRegisterView onOpenPayment={handleOpenPayment} />}
              {currentTab === 'main_courante' && (
                <FeatureGate moduleKey="mod_main_courante" title="Main Courante Hôtelière Verrouillée">
                  <MainCouranteView />
                </FeatureGate>
              )}
              {currentTab === 'fiscal' && (
                <FeatureGate moduleKey="mod_fiscal" title="Module Fiscalité & DGI Verrouillé">
                  <FiscalCenterView />
                </FeatureGate>
              )}
              {currentTab === 'finance' && (
                <FeatureGate moduleKey="mod_finance" title="Module Finances & Trésorerie Verrouillé">
                  <FinanceView />
                </FeatureGate>
              )}
              {currentTab === 'clients' && (
                <FeatureGate moduleKey="mod_clients" title="Fichier Clients & Fidélité Verrouillé">
                  <ClientsView />
                </FeatureGate>
              )}
              {currentTab === 'staff' && (
                <FeatureGate moduleKey="mod_staff" title="Personnel & Plannings Verrouillés">
                  <StaffView />
                </FeatureGate>
              )}
              {currentTab === 'documents' && (
                <FeatureGate moduleKey="mod_documents" title="Documents & Scanner GED Verrouillés">
                  <DocumentsView />
                </FeatureGate>
              )}
              {currentTab === 'reports' && <ReportsView />}
              {currentTab === 'audit' && (
                <FeatureGate moduleKey="mod_audit" title="Journal d’Audit Immuable Verrouillé">
                  <AuditView />
                </FeatureGate>
              )}
              {currentTab === 'settings' && <AdminCenterView />}
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>

      {/* Barre de Navigation Inférieure Mobile (selon le rôle) */}
      <BottomNav currentTab={currentTab} onSelectTab={handleSelectTab} />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigateTo={handleSelectTab}
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

      {/* Guide d'Utilisation Officiel RestoMaster OS Modal */}
      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        initialRole={currentUser.role}
      />

      {/* Assistant de Premier Lancement & Audit Prêt à Livrer */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Assistant d'Installation Pas à Pas Style Première Mise en Route OS */}
      <SetupWizardModal
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onCompleted={() => setIsSetupWizardOpen(false)}
      />

      {/* Tactile PIN Lock Screen Overlay */}
      {isTerminalLocked && <PinLockScreen />}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <RestaurantProvider>
              <AppContent />
            </RestaurantProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
