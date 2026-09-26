import React, { useState, useRef, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
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
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  setMobileOpen: (open: boolean) => void;
  openSearch: () => void;
  openComplianceModal?: () => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Vue générale et indicateurs d’activité en temps réel' },
  tables: { title: 'Plan des Tables & Salle', subtitle: 'Gestion visuelle des zones, occupation et commandes en cours' },
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
}) => {
  const { currentUser, selectDemoUser } = useAuth();
  const {
    notifications,
    unreadNotifsCount,
    markNotificationRead,
    markAllNotificationsRead,
    cashSession,
    settings,
    resetToDemoData,
    isOnline,
    outlets,
    selectedOutletId,
    changeActiveRestaurant,
    activeRestaurant,
    organization,
  } = useRestaurant() as any;

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [outletMenuOpen, setOutletMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 shadow-xs min-w-0">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
            {tabInfo.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 hidden md:block truncate">
            {tabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Actions, Role Switcher, Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Global Search Trigger */}
        <button
          onClick={openSearch}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200/80 transition-colors text-xs font-medium border border-slate-200"
          title="Rechercher partout (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="hidden xl:inline">Recherche...</span>
          <kbd className="hidden 2xl:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded border border-slate-300">
            Ctrl+K
          </kbd>
        </button>

        {/* Quick New Order POS Action */}
        <button
          onClick={() => setCurrentTab('pos')}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all shrink-0"
          title="Nouvelle Commande"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Commande</span>
        </button>

        {/* Online / Offline Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
          }`}
          title={isOnline ? 'Connecté au Cloud RestoMaster' : 'Mode Hors Ligne Actif (Synchronisation locale)'}
        >
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span className="hidden xl:inline">{isOnline ? 'Cloud Actif' : 'Hors Ligne'}</span>
        </div>

        {/* Norme Cameroun Audit Button */}
        {openComplianceModal && (
          <button
            type="button"
            onClick={openComplianceModal}
            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-all shadow-2xs shrink-0"
            title="Consulter le rapport de conformité aux normes camerounaises"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden lg:inline">Cadre Fiscal Cameroun</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          </button>
        )}

        {/* Cash Register Indicator */}
        <div
          onClick={() => setCurrentTab('caisse')}
          className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium cursor-pointer hover:bg-emerald-100/70 transition-colors shrink-0"
          title="Caisse ouverte - Cliquez pour consulter"
        >
          <Coins className="w-3.5 h-3.5 text-emerald-600" />
          <span>Caisse:</span>
          <span className="font-bold">{formatCurrency(cashSession.expectedTotal, settings.currency)}</span>
        </div>

        {/* Notification Bell with Dropdown */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-500" />
                  Notifications & Alertes
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-amber-600 hover:text-amber-800 font-semibold"
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

        {/* Multi-Restaurant Switcher */}
        <div className="relative shrink-0" ref={outletMenuRef}>
          <button
            onClick={() => setOutletMenuOpen(!outletMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 text-slate-800 transition-colors shadow-2xs"
            title="Établissement actif - Cliquez pour changer"
          >
            <Store className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-left hidden lg:block">
              <div className="text-[9px] uppercase font-bold text-amber-800 leading-none">
                {organization?.name ? (organization.name.length > 20 ? organization.name.slice(0, 20) + '...' : organization.name) : 'Groupe'}
              </div>
              <div className="text-xs font-bold text-slate-900 leading-none mt-1 truncate max-w-[130px]">
                {activeRestaurant?.name || 'Restaurant'}
              </div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-900 hidden sm:inline shrink-0">
              {activeRestaurant?.city || 'CM'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                {outlets?.map((outlet: any) => {
                  const isSelected = outlet.id === selectedOutletId;
                  const isAccessible =
                    !currentUser.accessibleRestaurantIds ||
                    currentUser.accessibleRestaurantIds.includes(outlet.id) ||
                    currentUser.role === 'direction' ||
                    currentUser.role === 'manager';
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
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-amber-50 border border-amber-300'
                          : isAccessible
                          ? 'hover:bg-slate-50 border border-transparent'
                          : 'opacity-50 cursor-not-allowed bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
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
                      {isSelected ? (
                        <Check className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : !isAccessible ? (
                        <span className="text-[9px] text-rose-500 font-semibold shrink-0">Non assigné</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Role Switcher Dropdown */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
          >
            <Shield className="w-4 h-4 text-amber-600" />
            <div className="text-left hidden md:block">
              <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">Rôle Actif</div>
              <div className="text-xs font-semibold text-slate-800 leading-none mt-1">
                {currentRoleLabel.label}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Role Switcher Menu */}
          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Changer de Profil Démo</div>
                  <div className="text-[11px] text-slate-500">Testez les permissions par métier</div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Voulez-vous réinitialiser toutes les données de démonstration ?')) {
                      resetToDemoData();
                      setRoleMenuOpen(false);
                    }
                  }}
                  className="text-[11px] text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
                  title="Réinitialiser les données"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
