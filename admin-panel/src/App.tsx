import React, { useState, useEffect } from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLoginScreen } from './components/auth/AdminLoginScreen';
import { AdminHeader } from './components/layout/AdminHeader';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { AdminBottomNav } from './components/layout/AdminBottomNav';
import { PlatformDashboardView } from './components/dashboard/PlatformDashboardView';
import { TenantListView } from './components/tenants/TenantListView';
import { TenantDetailView } from './components/tenants/TenantDetailView';
import { CreateTenantModal } from './components/tenants/CreateTenantModal';
import { SignupsListView } from './components/signups/SignupsListView';
import { AnnouncementsView } from './components/announcements/AnnouncementsView';
import { PlatformAdminsView } from './components/admins/PlatformAdminsView';
import { EmailManagementView } from './components/emails/EmailManagementView';
import { CatalogPricingView } from './components/catalog/CatalogPricingView';
import { PendingPaymentsListView } from './components/subscriptions/PendingPaymentsListView';
import { adminPlatformService, PlatformAnnouncement } from './services/adminPlatformService';
import { Tenant, TenantSignupRequest, PlatformAuditLog, SupportSession } from '../../shared/types';
import { ShieldCheck, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';

const AdminPanelInner: React.FC = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // Données temps réel de la plateforme
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [signups, setSignups] = useState<TenantSignupRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);

  // Écouteurs Firestore temps réel
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubTenants = adminPlatformService.subscribeToTenants((data) => setTenants(data));
    const unsubSignups = adminPlatformService.subscribeToSignups((data) => setSignups(data));
    const unsubAudit = adminPlatformService.subscribeToPlatformAuditLogs((data) => setAuditLogs(data));
    const unsubSupport = adminPlatformService.subscribeToSupportSessions((data) => setSupportSessions(data));
    const unsubAnnounce = adminPlatformService.subscribeToAnnouncements((data) => setAnnouncements(data));

    return () => {
      unsubTenants();
      unsubSignups();
      unsubAudit();
      unsubSupport();
      unsubAnnounce();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-xs font-semibold tracking-wide">Initialisation de la console sécurisée...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen />;
  }

  const pendingSignupsCount = signups.filter((s) => s.status === 'en_attente').length;
  const activeSupportSessionsCount = supportSessions.filter((s) => s.active).length;

  const handleSelectTenant = (orgId: string) => {
    setSelectedTenantId(orgId);
    setCurrentTab('tenants');
    setIsMobileMenuOpen(false);
  };

  const handleTabChange = (tab: string) => {
    if (tab !== 'tenants') setSelectedTenantId(null);
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsDesktopSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Sidebar Navigation (Desktop collapsible + Mobile Drawer) */}
      <AdminSidebar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        pendingSignupsCount={pendingSignupsCount}
        activeSupportSessionsCount={activeSupportSessionsCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isDesktopOpen={isDesktopSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isDesktopSidebarOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-3.5 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto min-w-0 pb-24 lg:pb-8">
          {currentTab === 'dashboard' && (
            <PlatformDashboardView
              tenants={tenants}
              signups={signups}
              auditLogs={auditLogs}
              onSelectTenant={handleSelectTenant}
              onNavigateToSignups={() => setCurrentTab('signups')}
              onOpenCreateTenantModal={() => setIsCreateTenantOpen(true)}
            />
          )}

          {currentTab === 'tenants' && (
            <>
              {selectedTenantId ? (
                <TenantDetailView
                  orgId={selectedTenantId}
                  onBack={() => setSelectedTenantId(null)}
                />
              ) : (
                <TenantListView
                  tenants={tenants}
                  onSelectTenant={handleSelectTenant}
                  onOpenCreateTenantModal={() => setIsCreateTenantOpen(true)}
                />
              )}
            </>
          )}

          {currentTab === 'catalog' && <CatalogPricingView />}

          {currentTab === 'signups' && <SignupsListView signups={signups} />}

          {currentTab === 'subscriptions' && <PendingPaymentsListView />}

          {currentTab === 'announcements' && <AnnouncementsView announcements={announcements} />}

          {currentTab === 'support' && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <h1 className="text-xl font-black text-white">Sessions de Télémaintenance Support</h1>
                <span className="font-mono text-slate-400">Total : {supportSessions.length}</span>
              </div>

              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Date Début</th>
                      <th className="py-3 px-4 font-semibold">Restaurant (OrgId)</th>
                      <th className="py-3 px-4 font-semibold">Intervenant Support</th>
                      <th className="py-3 px-4 font-semibold">Mode d’accès</th>
                      <th className="py-3 px-4 font-semibold">Motif</th>
                      <th className="py-3 px-4 font-semibold text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {supportSessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {new Date(sess.startedAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{sess.orgId}</td>
                        <td className="py-3 px-4 text-white font-medium">{sess.adminEmail}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-300">{sess.mode}</td>
                        <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate" title={sess.reason}>
                          "{sess.reason}"
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              sess.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {sess.active ? 'Active' : 'Clôturée'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {supportSessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                          Aucune session de télémaintenance enregistrée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'audit' && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h1 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Piste d’Audit Cryptographique Plateforme
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chaînage SHA-256 infalsifiable : toute modification de droits ou de configuration est scellée.
                  </p>
                </div>
                <span className="font-mono text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 font-bold self-start sm:self-auto">
                  SHA-256 Intégrité Certifiée
                </span>
              </div>

              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">Date & Heure</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                      <th className="py-3 px-4 font-semibold">Cible (Tenant)</th>
                      <th className="py-3 px-4 font-semibold">Détail</th>
                      <th className="py-3 px-4 font-semibold">Motif Obligatoire</th>
                      <th className="py-3 px-4 font-semibold">Auteur</th>
                      <th className="py-3 px-4 font-semibold text-right">Hash SHA-256</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : 'Récent'}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{log.action}</td>
                        <td className="py-3 px-4 font-mono text-amber-400 text-[11px]">
                          {log.targetOrgId || 'GLOBAL'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.detail}>
                          {log.detail}
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate" title={log.reason}>
                          "{log.reason}"
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{log.actorEmail}</td>
                        <td className="py-3 px-4 text-right font-mono text-[10px] text-emerald-400" title={log.sha256Hash}>
                          {log.sha256Hash ? `${log.sha256Hash.slice(0, 8)}…` : 'HASH_OK'}
                        </td>
                      </tr>
                    ))}

                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                          Aucun journal d'audit disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentTab === 'emails' && <EmailManagementView />}

          {currentTab === 'admins' && <PlatformAdminsView />}
        </main>
      </div>

      {/* Navigation Mobile Basse */}
      <AdminBottomNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        pendingSignupsCount={pendingSignupsCount}
        activeSupportSessionsCount={activeSupportSessionsCount}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Modal Création Restaurant */}
      <CreateTenantModal
        isOpen={isCreateTenantOpen}
        onClose={() => setIsCreateTenantOpen(false)}
        onCreated={(newOrgId) => {
          setSelectedTenantId(newOrgId);
          setCurrentTab('tenants');
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <AdminPanelInner />
    </AdminAuthProvider>
  );
};

export default App;
