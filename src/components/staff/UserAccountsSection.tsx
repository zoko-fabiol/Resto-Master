import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { UserAccount, UserRole, AccountType, TabPermission } from '../../types/restaurant';
import { ROLE_LABELS } from '../../lib/utils';
import { useConfirm } from '../ui/ConfirmDialog';
import {
  Tablet,
  Shield,
  ShieldCheck,
  Key,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Search,
  ExternalLink,
  Sparkles,
  Smartphone,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

// Modules configurables avec leurs métadonnées
const SYSTEM_MODULES: { id: string; label: string; category: string; icon: string }[] = [
  // Services & Ventes
  { id: 'tables', label: 'Plan des Tables', category: 'Services & Ventes', icon: 'LayoutGrid' },
  { id: 'pos', label: 'Prise de Commande / POS', category: 'Services & Ventes', icon: 'ShoppingCart' },
  { id: 'kitchen_kds', label: 'Cuisine KDS', category: 'Services & Ventes', icon: 'UtensilsCrossed' },
  { id: 'bar_kds', label: 'Bar & Boissons KDS', category: 'Services & Ventes', icon: 'Wine' },
  { id: 'reservations', label: 'Réservations de Tables', category: 'Services & Ventes', icon: 'Calendar' },
  { id: 'delivery', label: 'Livraisons & Emporter', category: 'Services & Ventes', icon: 'Truck' },
  { id: 'events', label: 'Banquets & Événements', category: 'Services & Ventes', icon: 'PartyPopper' },

  // Production & Stocks
  { id: 'menu', label: 'Carte des Plats & Recettes', category: 'Production & Stocks', icon: 'BookOpen' },
  { id: 'stock', label: 'Stocks & Lots FEFO', category: 'Production & Stocks', icon: 'Package' },
  { id: 'purchases', label: 'Achats & Fournisseurs', category: 'Production & Stocks', icon: 'Truck' },
  { id: 'hygiene', label: 'Hygiène & Contrôles HACCP', category: 'Production & Stocks', icon: 'ShieldAlert' },

  // Caisse & Fiscalité
  { id: 'caisse', label: 'Caisse & Clôture Z', category: 'Caisse & Finances', icon: 'DollarSign' },
  { id: 'main_courante', label: 'Main Courante HotelPro', category: 'Caisse & Finances', icon: 'FileSpreadsheet' },
  { id: 'fiscal', label: 'Fiscalité Cameroun & DGI', category: 'Caisse & Finances', icon: 'Receipt' },
  { id: 'finance', label: 'Finances & Dépenses', category: 'Caisse & Finances', icon: 'TrendingUp' },

  // Gestion & Pilotage
  { id: 'dashboard', label: 'Tableau de Bord Exécutif', category: 'Gestion & Pilotage', icon: 'LayoutDashboard' },
  { id: 'clients', label: 'Clients & Programmes Fidélité', category: 'Gestion & Pilotage', icon: 'Heart' },
  { id: 'staff', label: 'Personnel & Comptes Utilisateurs', category: 'Gestion & Pilotage', icon: 'Users' },
  { id: 'documents', label: 'Scanner & GED Numérique', category: 'Gestion & Pilotage', icon: 'Folder' },
  { id: 'reports', label: 'Rapports Statistiques & Ventes', category: 'Gestion & Pilotage', icon: 'BarChart3' },
  { id: 'audit', label: 'Piste d\'Audit Inaltérable', category: 'Gestion & Pilotage', icon: 'FileText' },
  { id: 'settings', label: 'Paramètres Système', category: 'Gestion & Pilotage', icon: 'Settings' },

  // Borne Tablette
  { id: 'kiosk', label: 'Borne Tablette Tactile (Kiosk Client)', category: 'Mode Borne', icon: 'Tablet' },
];

export const UserAccountsSection: React.FC = () => {
  const {
    userAccounts,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    toggleUserAccountStatus,
    updateUserAccountPermissions,
    tables,
  } = useRestaurant();

  const { unlockSessionWithPin, updateCurrentUserPin, currentUser } = useAuth();
  const confirm = useConfirm();

  // Filtrage & Recherche
  const [filterType, setFilterType] = useState<'all' | 'staff' | 'tablette'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  // Gestion du PIN
  const [showPin, setShowPin] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedAccountForPin, setSelectedAccountForPin] = useState<UserAccount | null>(null);
  const [quickNewPin, setQuickNewPin] = useState('');
  const [showQuickPin, setShowQuickPin] = useState(true);

  // Formulaire création / édition rapide
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    pinCode: '',
    role: 'serveur' as UserRole,
    accountType: 'staff' as AccountType,
    matricule: '',
    phone: '',
    assignedTableId: '',
  });

  // Permissions temporaires en cours d'édition dans la modale
  const [tempPermissions, setTempPermissions] = useState<Record<string, TabPermission>>({});
  const [tempAdditionalTabs, setTempAdditionalTabs] = useState<string[]>([]);

  // Générateur de code PIN unique aléatoire à 4 chiffres (sans collision)
  const generateUniquePin = (excludeUserId?: string): string => {
    const existingPins = new Set(
      userAccounts
        .filter((a) => a.id !== excludeUserId)
        .map((a) => a.pinCode)
    );
    for (let attempts = 0; attempts < 1000; attempts++) {
      const candidate = Math.floor(1000 + Math.random() * 9000).toString();
      if (!existingPins.has(candidate)) {
        return candidate;
      }
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Détection en temps réel des collisions de PIN (doublons)
  const pinCollision = useMemo(() => {
    if (!formData.pinCode || formData.pinCode.length < 4) return null;
    return userAccounts.find(
      (a) => a.id !== editingAccount?.id && a.pinCode === formData.pinCode
    );
  }, [formData.pinCode, userAccounts, editingAccount]);

  const quickPinCollision = useMemo(() => {
    if (!quickNewPin || quickNewPin.length < 4) return null;
    return userAccounts.find(
      (a) => a.id !== selectedAccountForPin?.id && a.pinCode === quickNewPin
    );
  }, [quickNewPin, userAccounts, selectedAccountForPin]);

  // Filtrer les comptes
  const filteredAccounts = useMemo(() => {
    return userAccounts.filter((acc) => {
      if (filterType === 'staff' && acc.accountType === 'tablette') return false;
      if (filterType === 'tablette' && acc.accountType !== 'tablette') return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        acc.name.toLowerCase().includes(term) ||
        acc.email.toLowerCase().includes(term) ||
        (acc.matricule && acc.matricule.toLowerCase().includes(term)) ||
        (acc.assignedTableName && acc.assignedTableName.toLowerCase().includes(term)) ||
        acc.role.toLowerCase().includes(term)
      );
    });
  }, [userAccounts, filterType, searchTerm]);

  // Comptes tablettes seuls pour la vitrine
  const tabletAccounts = useMemo(() => {
    return userAccounts.filter((acc) => acc.accountType === 'tablette');
  }, [userAccounts]);

  const staffAccounts = useMemo(() => {
    return userAccounts.filter((acc) => acc.accountType !== 'tablette');
  }, [userAccounts]);

  // Ouvrir la modale de création
  const handleOpenCreateModal = (type: AccountType = 'staff') => {
    const nextNum = tabletAccounts.length + 1;
    const defaultTable = tables[nextNum - 1] || tables[0];
    const initialPin = type === 'tablette'
      ? `000${nextNum}`.slice(-4)
      : generateUniquePin();

    setFormData({
      name: type === 'tablette' ? `Tablette Table ${defaultTable ? defaultTable.number : nextNum}` : '',
      email: type === 'tablette' ? `tablette${nextNum}@restaurant.local` : '',
      pinCode: initialPin,
      role: type === 'tablette' ? 'tablette' : 'serveur',
      accountType: type,
      matricule: type === 'tablette' ? `TAB-0${nextNum}` : `SRV-0${staffAccounts.length + 1}`,
      phone: '',
      assignedTableId: defaultTable?.id || '',
    });
    setEditingAccount(null);
    setShowPin(true);
    setCreateModalOpen(true);
  };

  // Ouvrir la modale de modification rapide de PIN
  const handleOpenQuickPinModal = (acc: UserAccount) => {
    setSelectedAccountForPin(acc);
    setQuickNewPin(generateUniquePin(acc.id));
    setShowQuickPin(true);
    setPinModalOpen(true);
  };

  const handleSaveQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForPin || quickNewPin.length !== 4 || quickPinCollision) return;

    await updateUserAccount(selectedAccountForPin.id, { pinCode: quickNewPin });

    if (
      currentUser.id === selectedAccountForPin.id ||
      currentUser.email.toLowerCase() === selectedAccountForPin.email.toLowerCase()
    ) {
      await updateCurrentUserPin(quickNewPin);
    }

    setPinModalOpen(false);
    setSelectedAccountForPin(null);
    setQuickNewPin('');
  };

  // Sauvegarder un compte (Création ou Mise à jour)
  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pinCode.length !== 4 || pinCollision) {
      return;
    }
    const assignedTable = tables.find((t) => t.id === formData.assignedTableId);

    if (editingAccount) {
      await updateUserAccount(editingAccount.id, {
        name: formData.name,
        email: formData.email,
        pinCode: formData.pinCode,
        role: formData.role,
        accountType: formData.accountType,
        matricule: formData.matricule,
        phone: formData.phone,
        assignedTableId: formData.accountType === 'tablette' ? formData.assignedTableId : undefined,
        assignedTableName: formData.accountType === 'tablette' && assignedTable ? (assignedTable.name || `Table ${assignedTable.number}`) : undefined,
      });

      // Synchronisation immédiate si c'est l'utilisateur en cours
      if (
        currentUser.id === editingAccount.id ||
        currentUser.email.toLowerCase() === editingAccount.email.toLowerCase()
      ) {
        await updateCurrentUserPin(formData.pinCode);
      }
    } else {
      await createUserAccount({
        name: formData.name,
        email: formData.email,
        pinCode: formData.pinCode,
        role: formData.role,
        accountType: formData.accountType,
        active: true,
        matricule: formData.matricule,
        phone: formData.phone,
        assignedTableId: formData.accountType === 'tablette' ? formData.assignedTableId : undefined,
        assignedTableName: formData.accountType === 'tablette' && assignedTable ? (assignedTable.name || `Table ${assignedTable.number}`) : undefined,
        tabPermissions: formData.accountType === 'tablette'
          ? { kiosk: { view: true, create: true, edit: false, delete: false } }
          : undefined,
        additionalTabs: [],
      });
    }
    setCreateModalOpen(false);
  };

  // Ouvrir l'éditeur de permissions
  const handleOpenPermissions = (acc: UserAccount) => {
    setEditingAccount(acc);
    setTempPermissions(acc.tabPermissions || {});
    setTempAdditionalTabs(acc.additionalTabs || []);
    setPermissionsModalOpen(true);
  };

  // Basculer un droit granulaire (view, create, edit, delete)
  const handleToggleAction = (moduleId: string, action: keyof TabPermission) => {
    setTempPermissions((prev) => {
      const current = prev[moduleId] || { view: false, create: false, edit: false, delete: false };
      const nextVal = !current[action];
      const updated: TabPermission = { ...current, [action]: nextVal };

      // Si on active create/edit/delete, on active automatiquement 'view'
      if (nextVal && action !== 'view') {
        updated.view = true;
      }
      // Si on désactive 'view', on désactive tout
      if (!nextVal && action === 'view') {
        updated.create = false;
        updated.edit = false;
        updated.delete = false;
      }

      return {
        ...prev,
        [moduleId]: updated,
      };
    });
  };

  // Basculer l'attribution d'un onglet supplémentaire
  const handleToggleAdditionalTab = (moduleId: string) => {
    setTempAdditionalTabs((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((id) => id !== moduleId);
      } else {
        // En l'ajoutant, on donne au moins le droit 'view'
        setTempPermissions((p) => ({
          ...p,
          [moduleId]: p[moduleId] || { view: true, create: false, edit: false, delete: false },
        }));
        return [...prev, moduleId];
      }
    });
  };

  // Présets rapides
  const applyPreset = (type: 'full' | 'readonly' | 'clear') => {
    if (type === 'full') {
      const all: Record<string, TabPermission> = {};
      SYSTEM_MODULES.forEach((m) => {
        all[m.id] = { view: true, create: true, edit: true, delete: true };
      });
      setTempPermissions(all);
    } else if (type === 'readonly') {
      const ro: Record<string, TabPermission> = {};
      SYSTEM_MODULES.forEach((m) => {
        ro[m.id] = { view: true, create: false, edit: false, delete: false };
      });
      setTempPermissions(ro);
    } else if (type === 'clear') {
      setTempPermissions({});
      setTempAdditionalTabs([]);
    }
  };

  // Sauvegarder les permissions
  const handleSavePermissions = async () => {
    if (!editingAccount) return;
    await updateUserAccountPermissions(editingAccount.id, tempPermissions, tempAdditionalTabs);
    setPermissionsModalOpen(false);
  };

  // Tester la tablette directement
  const handleTestTablet = async (tablet: UserAccount) => {
    const success = await unlockSessionWithPin(tablet.pinCode);
    if (success) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SECTION VITRINE TABLETTES CLIENTS (Exigence Audio 2) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Tablet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Tablettes Tactiles & Bornes Clients
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Mode Kiosk Sans Sidebar
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Chaque table physique dispose de son compte borne dédié (Tablette 1, 2, 3...) relié à son numéro de table et son PIN sécurisé.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenCreateModal('tablette')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Tablette de Table</span>
          </button>
        </div>

        {/* Grille des Tablettes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {tabletAccounts.map((tablet) => {
            const assignedTable = tables.find((t) => t.id === tablet.assignedTableId);
            return (
              <div
                key={tablet.id}
                className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all hover:scale-[1.01] hover:border-indigo-400/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{tablet.name}</h4>
                        <span className="text-[10px] font-mono text-indigo-300">{tablet.matricule || 'TAB'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleUserAccountStatus(tablet.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        tablet.active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {tablet.active ? 'En ligne' : 'Inactif'}
                    </button>
                  </div>

                  <div className="bg-black/30 rounded-xl p-3 space-y-1.5 mb-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400">Table assignée :</span>
                      <span className="font-bold text-amber-300">
                        {tablet.assignedTableName || assignedTable?.name || `Table ${assignedTable?.number || 'Non liée'}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-400">Code PIN de connexion :</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-indigo-200">
                          {tablet.pinCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPinModal(tablet)}
                          className="p-1 rounded text-amber-300 hover:text-amber-200 hover:bg-white/10 transition-colors"
                          title="Modifier le code PIN de cette borne"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleTestTablet(tablet)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-xs"
                    title="Connexion instantanée avec ce compte tablette pour tester l'écran Kiosk tactile sans sidebar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lancer Mode Kiosk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickPinModal(tablet)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-500/20 text-slate-200 hover:text-amber-300 transition-all border border-transparent hover:border-amber-400/30"
                    title="Modifier le code PIN"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenPermissions(tablet)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all"
                    title="Droits d'accès"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingAccount(tablet);
                      setFormData({
                        name: tablet.name,
                        email: tablet.email,
                        pinCode: tablet.pinCode,
                        role: tablet.role,
                        accountType: tablet.accountType,
                        matricule: tablet.matricule || '',
                        phone: tablet.phone || '',
                        assignedTableId: tablet.assignedTableId || '',
                      });
                      setShowPin(false);
                      setCreateModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-all"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BARRE D'OUTILS ET FILTRES DES COMPTES UTILISATEURS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filtres par type */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tous les Comptes ({userAccounts.length})
          </button>
          <button
            onClick={() => setFilterType('staff')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'staff' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Salariés & Équipe ({staffAccounts.length})
          </button>
          <button
            onClick={() => setFilterType('tablette')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'tablette' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tablettes ({tabletAccounts.length})
          </button>
        </div>

        {/* Barre de Recherche & Bouton Ajouter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, rôle, PIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
            />
          </div>

          <button
            onClick={() => handleOpenCreateModal('staff')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* 3. TABLEAU DES COMPTES & DROITS GRANULAIRES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Liste des Utilisateurs & Droits d'Accès Granulaires
            </h4>
            <p className="text-xs text-slate-500">
              Gestion fine des autorisations par onglet : Voir, Ajouter (+), Modifier (Éditer), Supprimer (Annuler).
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredAccounts.length} compte(s) affiché(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Rôle & Type</th>
                <th className="py-3 px-4">PIN & Matricule</th>
                <th className="py-3 px-4">Droits d'Accès Configurés</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((acc) => {
                const roleInfo = ROLE_LABELS[acc.role] || { label: acc.role, color: 'bg-slate-100 text-slate-800' };
                const permCount = Object.keys(acc.tabPermissions || {}).length;
                const additionalCount = acc.additionalTabs?.length || 0;

                return (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Nom + Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {acc.avatar ? (
                          <img
                            src={acc.avatar}
                            alt={acc.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-800 text-sm">
                            {acc.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{acc.name}</span>
                            {acc.accountType === 'tablette' && (
                              <span className="p-0.5 rounded bg-indigo-100 text-indigo-700" title="Tablette Kiosk">
                                <Tablet className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{acc.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rôle & Type */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                        {acc.accountType === 'tablette' && acc.assignedTableName && (
                          <div className="text-[11px] text-amber-700 font-semibold">
                            Affectée : {acc.assignedTableName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* PIN & Matricule */}
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPinModal(acc)}
                          className="bg-slate-100 hover:bg-amber-100 px-2 py-0.5 rounded font-bold text-slate-800 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-colors flex items-center gap-1.5 group cursor-pointer"
                          title="Cliquer pour modifier le code PIN de ce collaborateur"
                        >
                          <Key className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                          <span>{acc.pinCode}</span>
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {acc.matricule || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Droits configurés */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {acc.role === 'direction' ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[10px]">
                            Accès Total Administrateur (22 onglets)
                          </span>
                        ) : acc.accountType === 'tablette' ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-[10px]">
                            Mode Kiosk Client Exclusif (Sans Sidebar)
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                              {permCount} onglet(s) paramétré(s)
                            </span>
                            {additionalCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[10px]">
                                +{additionalCount} onglet(s) additionnel(s)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleUserAccountStatus(acc.id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          acc.active
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {acc.active ? 'Actif' : 'Suspendu'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPinModal(acc)}
                          className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                          title="Modifier le code PIN"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenPermissions(acc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200"
                          title="Paramétrer les permissions fines (CRUD par onglet)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Droits Granulaires</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setFormData({
                              name: acc.name,
                              email: acc.email,
                              pinCode: acc.pinCode,
                              role: acc.role,
                              accountType: acc.accountType,
                              matricule: acc.matricule || '',
                              phone: acc.phone || '',
                              assignedTableId: acc.assignedTableId || '',
                            });
                            setShowPin(false);
                            setCreateModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Modifier les informations"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {acc.id !== 'acc-1' && acc.id !== 'acc-dir' && (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Supprimer ce compte utilisateur ?',
                                message: `Confirmez-vous la suppression du compte de ${acc.name} ? Cette action est irréversible.`,
                                confirmLabel: 'Supprimer',
                                cancelLabel: 'Annuler',
                                variant: 'danger',
                              });
                              if (ok) {
                                deleteUserAccount(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Supprimer ce compte"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODALE DE CRÉATION / MODIFICATION D'UN COMPTE */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  {formData.accountType === 'tablette' ? <Tablet className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingAccount
                      ? `Modifier le Compte : ${editingAccount.name}`
                      : formData.accountType === 'tablette'
                      ? 'Nouvelle Tablette de Table (Borne Kiosk)'
                      : 'Créer un Compte Salarié'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Définissez les identifiants et le code PIN de connexion
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAccount} className="space-y-4 pt-4">
              {/* Type de compte */}
              {!editingAccount && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Type de Compte</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, accountType: 'staff', role: 'serveur' })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        formData.accountType === 'staff'
                          ? 'border-amber-500 bg-amber-50/50 text-slate-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-5 h-5 text-amber-600" />
                      <div>
                        <div className="font-bold text-xs">Salarié / Staff</div>
                        <div className="text-[10px] text-slate-500">Serveur, Cuisine, Caisse...</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          accountType: 'tablette',
                          role: 'tablette',
                          name: `Tablette Table ${tables[0]?.number || '1'}`,
                          assignedTableId: tables[0]?.id || '',
                        })
                      }
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        formData.accountType === 'tablette'
                          ? 'border-indigo-500 bg-indigo-50/50 text-slate-900 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Tablet className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="font-bold text-xs">Tablette Kiosk</div>
                        <div className="text-[10px] text-slate-500">Borne client sans sidebar</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Nom & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.accountType === 'tablette' ? 'Nom de la Tablette' : 'Nom & Prénom'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.accountType === 'tablette' ? 'ex: Tablette Table 1' : 'ex: Paul Biya'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant / Email</label>
                  <input
                    type="email"
                    required
                    placeholder="ex: table1@restaurant.local"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Rôle & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.accountType === 'staff' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rôle Métier</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-bold"
                    >
                      <option value="direction">Direction Générale (PDG)</option>
                      <option value="manager">Responsable Restaurant (Manager)</option>
                      <option value="serveur">Serveur de Salle</option>
                      <option value="cuisine">Chef & Cuisine KDS</option>
                      <option value="bar">Barman & Boissons</option>
                      <option value="caisse">Caissière Principale</option>
                      <option value="stock">Magasinier / Économe</option>
                      <option value="rh">Ressources Humaines</option>
                      <option value="finance">Responsable Financier</option>
                      <option value="comptable">Comptable (SYSCOHADA)</option>
                      <option value="auditeur">Auditeur / Contrôle Interne</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Table Physique Assignée</label>
                    <select
                      value={formData.assignedTableId}
                      onChange={(e) => setFormData({ ...formData, assignedTableId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden font-bold"
                    >
                      <option value="">Sélectionner la table...</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          Table {t.number} — {t.name} ({t.capacity} couverts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Code PIN (4 chiffres)</label>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, pinCode: generateUniquePin(editingAccount?.id) }))}
                      className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>Générer un PIN</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4}
                      required
                      placeholder="ex: 1234"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '') })}
                      className={`w-full px-3 py-2 pr-10 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono text-center tracking-widest text-lg font-bold transition-colors ${
                        pinCollision ? 'border-red-400 bg-red-50/20 text-red-900' : 'border-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showPin ? 'Masquer le code PIN' : 'Afficher le code PIN'}
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {pinCollision ? (
                    <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium leading-tight animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>
                        Ce code PIN est déjà attribué à <strong>{pinCollision.name}</strong> ({ROLE_LABELS[pinCollision.role]?.label || pinCollision.role}).
                      </span>
                    </div>
                  ) : formData.pinCode.length === 4 ? (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Code PIN unique disponible</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Matricule & Téléphone (si staff) */}
              {formData.accountType === 'staff' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Matricule Employé</label>
                    <input
                      type="text"
                      placeholder="ex: SRV-04"
                      value={formData.matricule}
                      onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Contact</label>
                    <input
                      type="tel"
                      placeholder="+237 6..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formData.pinCode.length !== 4 || !!pinCollision}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                    formData.pinCode.length !== 4 || !!pinCollision
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {editingAccount ? 'Enregistrer les Modifications' : 'Créer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODALE DE CONFIGURATION DES DROITS GRANULAIRES (CRUD PAR ONGLET - Exigence Audio 1) */}
      {permissionsModalOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">
                      Permissions & Droits d'Accès Granulaires : {editingAccount.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Rôle : {ROLE_LABELS[editingAccount.role]?.label || editingAccount.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Cochez précisément les opérations permises pour chaque onglet : Voir, Ajouter (+), Modifier (Éditer), Supprimer (Annuler).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPermissionsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de présets rapides */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Présets Rapides :</span>
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  Tout Autoriser (Full Admin)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('readonly')}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  Lecture Seule Partout
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clear')}
                  className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition-colors"
                >
                  Révoquer Tout
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-900">{tempAdditionalTabs.length}</span> onglet(s) additionnel(s) accordé(s)
              </div>
            </div>

            {/* Matrice Granulaire Interactive (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {['Services & Ventes', 'Production & Stocks', 'Caisse & Finances', 'Gestion & Pilotage', 'Mode Borne'].map((category) => {
                const modules = SYSTEM_MODULES.filter((m) => m.category === category);
                if (modules.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      {category}
                    </h4>

                    <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200/70">
                      {modules.map((mod) => {
                        const perm = tempPermissions[mod.id] || { view: false, create: false, edit: false, delete: false };
                        const isAdditional = tempAdditionalTabs.includes(mod.id);

                        return (
                          <div
                            key={mod.id}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              perm.view ? 'bg-white' : 'bg-slate-50/40 opacity-75'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                                  perm.view
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {mod.label.slice(0, 1)}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                  <span>{mod.label}</span>
                                  {isAdditional && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      Onglet Additionnel
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">Module ID: {mod.id}</span>
                              </div>
                            </div>

                            {/* 4 Boutons / Checkboxes CRUD */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Voir */}
                              <button
                                type="button"
                                onClick={() => handleToggleAction(mod.id, 'view')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  perm.view
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Voir</span>
                              </button>

                              {/* Ajouter */}
                              <button
                                type="button"
                                onClick={() => handleToggleAction(mod.id, 'create')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  perm.create
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ajouter (+)</span>
                              </button>

                              {/* Modifier */}
                              <button
                                type="button"
                                onClick={() => handleToggleAction(mod.id, 'edit')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  perm.edit
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Modifier</span>
                              </button>

                              {/* Supprimer */}
                              <button
                                type="button"
                                onClick={() => handleToggleAction(mod.id, 'delete')}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  perm.delete
                                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer</span>
                              </button>

                              {/* Bouton pour marquer comme Onglet Additionnel */}
                              <button
                                type="button"
                                onClick={() => handleToggleAdditionalTab(mod.id)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                  isAdditional
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
                                }`}
                                title={
                                  isAdditional
                                    ? 'Onglet accordé en extra au-delà du rôle par défaut'
                                    : 'Définir comme onglet accordé en extra'
                                }
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-white flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Droits immédiatement effectifs à la sauvegarde.
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPermissionsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les Droits Granulaires</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODALE MODIFICATION RAPIDE DE CODE PIN */}
      {pinModalOpen && selectedAccountForPin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Modifier le Code PIN
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {selectedAccountForPin.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPin} className="space-y-4 pt-4">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[11px] text-slate-500">Compte collaborateur / borne :</div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="truncate max-w-[160px]">{selectedAccountForPin.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    Actuel : {selectedAccountForPin.pinCode}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Nouveau PIN (4 chiffres)</label>
                  <button
                    type="button"
                    onClick={() => setQuickNewPin(generateUniquePin(selectedAccountForPin.id))}
                    className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Générer un PIN</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showQuickPin ? 'text' : 'password'}
                    maxLength={4}
                    autoFocus
                    required
                    placeholder="ex: 5824"
                    value={quickNewPin}
                    onChange={(e) => setQuickNewPin(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3 py-2.5 pr-10 bg-slate-50 border rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden font-mono text-center tracking-widest text-xl font-bold transition-colors ${
                      quickPinCollision ? 'border-red-400 bg-red-50/20 text-red-900' : 'border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPin(!showQuickPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showQuickPin ? 'Masquer le code PIN' : 'Afficher le code PIN'}
                  >
                    {showQuickPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {quickPinCollision ? (
                  <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium leading-tight animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    <span>
                      Déjà utilisé par <strong>{quickPinCollision.name}</strong>.
                    </span>
                  </div>
                ) : quickNewPin.length === 4 ? (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Code PIN unique prêt à être enregistré</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={quickNewPin.length !== 4 || !!quickPinCollision}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                    quickNewPin.length !== 4 || !!quickPinCollision
                      ? 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  Enregistrer le PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
