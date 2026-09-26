import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { Sidebar } from './components/layout/Sidebar';
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

// Modals
import { PaymentModal } from './components/pos/PaymentModal';

const AppContent: React.FC = () => {
  const { canAccess, currentUser } = useAuth();
  const { seatReservation } = useRestaurant();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);

  // Cross-module states
  const [posInitialTableId, setPosInitialTableId] = useState<string | undefined>(undefined);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

  // Switch tab if permission restricts currentTab
  useEffect(() => {
    if (!canAccess(currentTab)) {
      if (canAccess('pos')) setCurrentTab('pos');
      else if (canAccess('kitchen_kds')) setCurrentTab('kitchen_kds');
      else if (canAccess('bar_kds')) setCurrentTab('bar_kds');
      else if (canAccess('stock')) setCurrentTab('stock');
      else if (canAccess('tables')) setCurrentTab('tables');
      else setCurrentTab('dashboard');
    }
  }, [currentUser.role, currentTab, canAccess]);

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans antialiased selection:bg-amber-500 selection:text-white max-w-full overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 max-w-full overflow-x-hidden">
        {/* Header Bar */}
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          setMobileOpen={setMobileOpen}
          openSearch={() => setIsSearchOpen(true)}
          openComplianceModal={() => setIsComplianceOpen(true)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto min-w-0">
          {currentTab === 'dashboard' && <DashboardView navigateTo={setCurrentTab} />}
          {currentTab === 'tables' && (
            <TablesView
              onOpenOrder={handleOpenOrderOnTable}
              onPayOrder={handleOpenPayment}
            />
          )}
          {currentTab === 'pos' && (
            <PosView
              initialTableId={posInitialTableId}
              onOpenPayment={handleOpenPayment}
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
          {currentTab === 'caisse' && <CashRegisterView />}
          {currentTab === 'main_courante' && <MainCouranteView />}
          {currentTab === 'fiscal' && <FiscalCenterView />}
          {currentTab === 'finance' && <FinanceView />}
          {currentTab === 'clients' && <ClientsView />}
          {currentTab === 'staff' && <StaffView />}
          {currentTab === 'documents' && <DocumentsView />}
          {currentTab === 'reports' && <ReportsView />}
          {currentTab === 'audit' && <AuditView />}
          {currentTab === 'settings' && <AdminCenterView />}
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
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <AppContent />
      </RestaurantProvider>
    </AuthProvider>
  );
}
