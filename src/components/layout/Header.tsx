import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS, isDemoModeActive } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useConfirm } from '../ui/ConfirmDialog';
import { formatCurrency, ROLE_LABELS } from '../../lib/utils';
import {
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ShoppingBag,
  Coins,
  Shield,
  ShieldCheck,
  RotateCcw,
  Store,
  Building2,
  MapPin,
  Check,
  Lock,
  Key,
  Tablet,
  Monitor,
  Tv,
  KeyRound,
  BookOpen,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { ChangeMyPinModal } from '../auth/ChangeMyPinModal';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  setMobileOpen: (open: boolean) => void;
  openSearch: () => void;
  openComplianceModal?: () => void;
  openPairingModal?: () => void;
  openCustomerDisplay?: () => void;
  openUserGuide?: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue générale et indicateurs d’activité en temps réel' },
  tables: { title: 'Plan des Tables & Salle', subtitle: 'Gestion visuelle des zones, occupation et commandes en cours' },
  kiosk: { title: 'Borne & Tablette Client Kiosk', subtitle: 'Interface tactile convive, menu numérique et verrouillage à distance' },
  pos: { title: 'Caisse POS & Prise de Commande', subtitle: 'Saisie rapide, envoi cuisine/bar et règlements' },
  kitchen_kds: { title: 'Kitchen Display System (Cuisine)', subtitle: 'Suivi des commandes en direct et temps de préparation' },
  bar_kds: { title: 'Bar & Boissons KDS', subtitle: 'Préparation des cocktails, boissons et vins' },
  reservations: { title: 'Réservations de Tables', subtitle: 'Planning des réservations et affectation de tables' },
  events: { title: 'Événements & Banquets', subtitle: 'Devis, séminaires d’entreprises, mariages, cocktails et catering' },
  delivery: { title: 'Courses & Livraisons', subtitle: 'Gestion des livraisons urbaines par quartier, repères et coursiers' },
  menu: { title: 'Carte & Recettes', subtitle: 'Gestion des plats, tarifs, ingrédients et fiches techniques' },
  stock: { title: 'Stocks, Lots & Inventaires', subtitle: 'Traçabilité des lots FEFO/FIFO, alertes péremption et mouvements' },
  purchases: { title: 'Achats & Fournisseurs', subtitle: 'Bons de commande, contrôle contribuable et réceptions de lots' },
  hygiene: { title: 'Hygiène & Contrôles HACCP', subtitle: 'Relevés de températures chaîne du froid, huiles et salubrité' },
  caisse: { title: 'Gestion de Caisse & Z Journalier', subtitle: 'Ouverture, encaissements, clôture et Z de caisse complet' },
  main_courante: { title: 'Main Courante Restauration', subtitle: 'Matrice journalière des consommations et encaissements conforme HotelPro' },
  fiscal: { title: 'Fiscalité & E-Billing (Cameroun)', subtitle: 'TVA 19,25%, retenues AIR, journal fiscal, calendrier DGI et export SYSCOHADA' },
  finance: { title: 'Finances & Dépenses', subtitle: 'Recettes réelles, créances clients, charges et résultat opérationnel estimé' },
  clients: { title: 'Clients, Crédit & Fidélité', subtitle: 'CRM, suivi des créances d’entreprises, limites de crédit et points' },
  staff: { title: 'Personnel & Présences', subtitle: 'Équipe, pointages du jour, horaires, avances et contrats' },
  documents: { title: 'GED & Numérisation', subtitle: 'Archivage numérique, factures scannées et contrats' },
  reports: { title: 'Rapports & Statistiques', subtitle: 'Analyses des ventes, marges, pertes et rentabilité' },
  audit: { title: 'Journal d’Audit & Sécurité', subtitle: 'Traçabilité complète et horodatée de toutes les opérations' },
  settings: { title: 'Paramètres du Restaurant', subtitle: 'Identité juridique, taux de TVA, numérotation et contrôles' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  setMobileOpen,
  openSearch,
  openComplianceModal,
  openPairingModal,
  openCustomerDisplay,
  openUserGuide,
}) => {
  const { currentUser, selectDemoUser, lockSession, isDemoMode } = useAuth();
  const confirm = useConfirm();
  const {
    notifications,
    unreadNotifsCount,
    markNotificationRead,
    markAllNotificationsRead,
    cashSession,
    settings,
    resetToDemoData,
    isOnline,
    offlineQueueCount,
    outlets,
    changeActiveRestaurant,
    activeRestaurant,
    organization,
    currentDeviceProfile,
    syncError,
    clearSyncError,
  } = useRestaurant() as any;

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [outletMenuOpen, setOutletMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const outletMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (outletMenuRef.current && !outletMenuRef.current.contains(event.target as Node)) {
        setOutletMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabInfo = TAB_TITLES[currentTab] || { title: 'RestoMaster', subtitle: 'Gestion de restaurant' };
  const currentRoleLabel = ROLE_LABELS[currentUser.role] || { label: currentUser.role, color: 'bg-gray-100 text-gray-800' };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs min-w-0">
      {/* ========================================================= */}
      {/* ÉTAGE 1 : Contexte de la Vue (Gauche) & Identité / Session (Droite) */}
      {/* ========================================================= */}
      <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 border-b border-slate-100">
        {/* Left: Mobile Drawer Trigger & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              {tabInfo.title}
            </h1>
            <p className="text-[11px] text-slate-400 hidden md:block truncate">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Identity, Restaurant, Notifications, Lock */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sync Error Indicator */}
          {syncError && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs font-semibold animate-pulse"
              title={syncError}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="hidden sm:inline truncate max-w-[140px]">Erreur Cloud</span>
              <button
                type="button"
                onClick={clearSyncError}
                className="hover:text-rose-900 ml-1 text-xs font-bold leading-none cursor-pointer"
                title="Ignorer l'alerte"
              >
                ✕
              </button>
            </div>
          )}

          {/* Multi-Restaurant Switcher */}
          <div className="relative shrink-0" ref={outletMenuRef}>
            <button
              onClick={() => setOutletMenuOpen(!outletMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              title="Établissement actif - Cliquez pour changer"
            >
              <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                  {activeRestaurant?.name || 'Restaurant'}
                </div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 hidden sm:inline shrink-0">
                {activeRestaurant?.city || 'CM'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Restaurant Selection Dropdown */}
            {outletMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Établissements du Groupe</div>
                    <div className="text-[11px] text-slate-500">Changer de restaurant actif</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {outlets?.length || 0} sites
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                  {outlets?.map((outlet: any) => {
                    const isSelected = activeRestaurant?.id === outlet.id;
                    const isAccessible = currentUser.role === 'direction' || currentUser.role === 'manager';

                    return (
                      <button
                        key={outlet.id}
                        disabled={!isAccessible}
                        onClick={() => {
                          if (isAccessible) {
                            changeActiveRestaurant(outlet.id);
                            setOutletMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-amber-50 border border-amber-300'
                            : isAccessible
                            ? 'hover:bg-slate-50'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">{outlet.name}</span>
                              {outlet.isMain && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                                  Siège
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>
                                {outlet.city} • {outlet.neighborhood || outlet.address}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Dropdown */}
          <div className="relative shrink-0" ref={roleMenuRef}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                  {currentUser.name || 'Utilisateur'}
                </div>
                <div className="text-[10px] text-slate-500 leading-none mt-1">
                  {currentRoleLabel.label}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Role Switcher Menu */}
            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
                {/* Utilisateur Actif & Bouton Modifier mon PIN */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 m-2 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-400 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                        <div className="text-[10px] text-amber-800 font-medium">Session : {currentRoleLabel.label}</div>
                      </div>
                    </div>
                    {currentUser.pinCode && (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900 shadow-2xs shrink-0">
                        PIN: ••••
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      setPinModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Modifier mon code PIN</span>
                  </button>
                </div>

                {isDemoMode && isDemoModeActive && (
                  <>
                    <div className="px-4 py-2 border-b border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Changer de Profil Démo</div>
                        <div className="text-[11px] text-slate-500">Testez les permissions par métier</div>
                      </div>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Réinitialisation des données démo',
                            message: 'Voulez-vous réinitialiser toutes les données de démonstration ? Toutes les modifications locales seront remplacées par le jeu d\'essai initial.',
                            confirmText: 'Réinitialiser',
                            variant: 'danger',
                          });
                          if (ok) {
                            resetToDemoData();
                            setRoleMenuOpen(false);
                          }
                        }}
                        className="text-[11px] text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium cursor-pointer"
                        title="Réinitialiser les données"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                      {DEMO_ACCOUNTS.map((account) => {
                        const isSelected = currentUser.email === account.email;
                        const label = ROLE_LABELS[account.role];
                        return (
                          <button
                            key={account.email}
                            onClick={() => {
                              selectDemoUser(account);
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={account.avatar}
                              alt={account.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 truncate">{account.name}</span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${label.color}`}>
                                  {label.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{account.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Notification Bell with Dropdown */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Notifications & Alertes</span>
                  </div>
                  {unreadNotifsCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Aucune alerte active pour le moment
                    </div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.actionUrl) {
                            setCurrentTab(notif.actionUrl);
                            setNotifOpen(false);
                          }
                        }}
                        className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                          !notif.read ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                            <span className="truncate">{notif.title}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                              {notif.timestamp.slice(11, 16)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug line-clamp-2">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Lock Session Button */}
          <button
            onClick={() => lockSession()}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Verrouiller la session (Code PIN requis)"
            aria-label="Verrouiller"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ÉTAGE 2 : Actions Primaires de Service (Gauche) & Outils Métier (Droite) */}
      {/* ========================================================= */}
      <div className="px-3 sm:px-6 py-1.5 sm:py-2 bg-slate-50/60 flex items-center justify-between gap-3 overflow-x-auto">
        {/* Left: Quick Search, New Order, Cash Float */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Global Search Trigger */}
          <button
            onClick={openSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 transition-colors text-xs font-medium border border-slate-200 shadow-2xs"
            title="Rechercher partout (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px]">Recherche...</span>
            <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">
              Ctrl+K
            </kbd>
          </button>

          {/* Primary Action: New Order POS */}
          <button
            onClick={() => setCurrentTab('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all shrink-0 active:scale-98"
            title="Ouvrir la caisse tactile pour une nouvelle commande"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>+ Nouvelle Commande</span>
          </button>

          {/* Cash Register Indicator */}
          {cashSession.status === 'ouverte' && (
            <button
              onClick={() => setCurrentTab('caisse')}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-xs font-medium transition-colors shrink-0"
              title="Caisse ouverte • Cliquez pour ouvrir le poste d'encaissement"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold text-emerald-700">Caisse :</span>
              <span className="font-black text-emerald-900">{formatCurrency(cashSession.expectedTotal, settings.currency)}</span>
            </button>
          )}
        </div>

        {/* Right: Cloud Status, Guide, Compliance, TV Display, Tablet, Pairing */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Online / Offline Status Badge with Offline Queue Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 transition-colors ${
              !isOnline
                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                : (offlineQueueCount || 0) > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-emerald-700 border-slate-200'
            }`}
            title={
              !isOnline
                ? `Mode Hors Ligne Actif (${offlineQueueCount || 0} opération(s) en attente)`
                : (offlineQueueCount || 0) > 0
                ? `Synchronisation en cours : ${offlineQueueCount} opération(s) en attente`
                : 'Connecté au Cloud RestoMaster'
            }
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Hors Ligne {(offlineQueueCount || 0) > 0 ? `(${offlineQueueCount})` : ''}</span>
              </>
            ) : (offlineQueueCount || 0) > 0 ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>Synchro ({offlineQueueCount})</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden lg:inline">En Ligne</span>
              </>
            )}
          </div>

          {/* Guide d'Utilisation Officiel Genesis Digital Agency */}
          {openUserGuide && (
            <button
              onClick={openUserGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Consulter le Guide d'Utilisation Officiel RestoMaster OS (Genesis Digital Agency)"
              aria-label="Consulter le guide d'utilisation"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span className="hidden sm:inline text-xs font-semibold">Guide d'Utilisation</span>
            </button>
          )}

          {/* Cadre Fiscal Cameroun / DGI Compliance Button */}
          {openComplianceModal && (
            <button
              type="button"
              onClick={openComplianceModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-900 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Consulter le rapport de conformité fiscale Cameroun DGI"
              aria-label="Consulter le cadre fiscal et conformité DGI"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span className="hidden xl:inline text-xs font-semibold">Cadre Fiscal</span>
            </button>
          )}

          {/* Quick Launch Customer Order Display (TV Retrait) */}
          {openCustomerDisplay && (
            <button
              onClick={openCustomerDisplay}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Lancer l'écran TV Retrait Client (Affichage plein écran des commandes en préparation & prêtes)"
              aria-label="Lancer l'écran TV retrait client"
            >
              <Tv className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span className="hidden 2xl:inline text-xs font-semibold">Écran Retrait</span>
            </button>
          )}

          {/* Quick Launch Client Tablet Kiosk */}
          <button
            onClick={() => setCurrentTab('kiosk')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors shadow-2xs text-xs font-bold cursor-pointer ${
              currentTab === 'kiosk'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Ouvrir le Mode Borne / Tablette Client Kiosk"
            aria-label="Ouvrir le mode borne kiosk client"
          >
            <Tablet className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span className="hidden 2xl:inline">Borne Kiosk</span>
          </button>

          {/* Paired Terminal Identity Pill & Provisioning Trigger */}
          {openPairingModal && (
            <button
              onClick={openPairingModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all shadow-2xs text-xs font-semibold cursor-pointer"
              title={
                currentDeviceProfile
                  ? `Poste appairé : ${currentDeviceProfile.terminalName} (${currentDeviceProfile.type})`
                  : 'Appairer ce terminal matériel'
              }
              aria-label="Gérer l'appairage du terminal"
            >
              {currentDeviceProfile ? (
                <Monitor className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <KeyRound className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              )}
              <span className="hidden 2xl:inline">
                {currentDeviceProfile ? currentDeviceProfile.terminalName : 'Appairer'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Self-Service de Modification du Code PIN */}
      <ChangeMyPinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
      />
    </header>
  );
};
