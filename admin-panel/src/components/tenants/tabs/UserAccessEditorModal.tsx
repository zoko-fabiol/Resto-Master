import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  Ban,
  Minus,
} from 'lucide-react';
import {
  Tenant,
  TenantEntitlements,
  TAB_CATALOG,
  TAB_MAP,
  TabId,
  DEFAULT_ROLE_TAB_PERMISSIONS,
  UserRole,
  resolveAccess,
} from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface UserAccessEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  user: any;
  entitlements: TenantEntitlements | null;
  onSaved: () => void;
}

type TabOverrideState = 'inherited' | 'granted' | 'revoked';

export const UserAccessEditorModal: React.FC<UserAccessEditorModalProps> = ({
  isOpen,
  onClose,
  tenant,
  user,
  entitlements,
  onSaved,
}) => {
  const [tabStates, setTabStates] = useState<Record<string, TabOverrideState>>({});
  const [granularPermissions, setGranularPermissions] = useState<Record<string, any>>({});
  const [assignedTableId, setAssignedTableId] = useState('');
  const [reason, setReason] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const role: UserRole = user?.role || 'serveur';

  // Chargement des droits existants (depuis userAccess ou user legacy)
  useEffect(() => {
    if (!isOpen || !user) return;

    const initialTabs: Record<string, TabOverrideState> = {};
    const initialPerms: Record<string, any> = {};

    const userTabs = Array.isArray(user.additionalTabs) ? user.additionalTabs : [];
    const userPerms = user.tabPermissions || {};

    for (const tab of TAB_CATALOG) {
      if (userTabs.includes(tab.id)) {
        initialTabs[tab.id] = 'granted';
      } else if (userPerms[tab.id]?.view === false) {
        initialTabs[tab.id] = 'revoked';
      } else {
        initialTabs[tab.id] = 'inherited';
      }

      if (userPerms[tab.id]) {
        initialPerms[tab.id] = { ...userPerms[tab.id] };
      } else {
        const defaultRolePerm = DEFAULT_ROLE_TAB_PERMISSIONS[role]?.[tab.id];
        initialPerms[tab.id] = defaultRolePerm ? { ...defaultRolePerm } : { view: false, create: false, edit: false, delete: false };
      }
    }

    setTabStates(initialTabs);
    setGranularPermissions(initialPerms);
    setAssignedTableId(user.assignedTableId || '');
    setReason('');
    setTicketNumber('');
    setErrorMsg(null);
  }, [isOpen, user, role]);

  if (!isOpen || !user) return null;

  // Calcul des onglets effectifs "ce que verra l'utilisateur"
  const computedGrantedTabs = TAB_CATALOG.filter((tab) => {
    const parentModuleActive = entitlements?.modules ? Boolean(entitlements.modules[tab.moduleKey]) : true;
    if (!parentModuleActive) return false;

    return resolveAccess({
      tenant,
      entitlements,
      role,
      tab: tab.id,
      action: 'view',
      fallbackPermissions: {
        additionalTabs: Object.entries(tabStates)
          .filter(([_, state]) => state === 'granted')
          .map(([id]) => id),
        tabPermissions: granularPermissions,
      },
    });
  });

  const handleApplyTemplate = (templateName: string) => {
    const nextStates: Record<string, TabOverrideState> = {};
    const nextPerms: Record<string, any> = {};

    for (const tab of TAB_CATALOG) {
      nextStates[tab.id] = 'inherited';
      const rolePerm = DEFAULT_ROLE_TAB_PERMISSIONS[role]?.[tab.id];
      nextPerms[tab.id] = rolePerm ? { ...rolePerm } : { view: false, create: false, edit: false, delete: false };
    }

    if (templateName === 'serveur_standard') {
      nextStates['pos'] = 'granted';
      nextStates['tables'] = 'granted';
      nextPerms['pos'] = { view: true, create: true, edit: false, delete: false };
      nextPerms['tables'] = { view: true, create: true, edit: true, delete: false };
    } else if (templateName === 'caissier_stock') {
      nextStates['pos'] = 'granted';
      nextStates['caisse'] = 'granted';
      nextStates['stock'] = 'granted';
      nextPerms['pos'] = { view: true, create: true, edit: true, delete: false };
      nextPerms['caisse'] = { view: true, create: true, edit: true, delete: false };
      nextPerms['stock'] = { view: true, create: true, edit: false, delete: false };
    }

    setTabStates(nextStates);
    setGranularPermissions(nextPerms);
  };

  const handleCycleTabState = (tabId: string) => {
    setTabStates((prev) => {
      const current = prev[tabId] || 'inherited';
      let next: TabOverrideState = 'inherited';
      if (current === 'inherited') next = 'granted';
      else if (current === 'granted') next = 'revoked';
      else next = 'inherited';
      return { ...prev, [tabId]: next };
    });
  };

  const handleToggleAction = (tabId: string, action: string) => {
    setGranularPermissions((prev) => {
      const currentTabPerms = prev[tabId] || { view: true, create: false, edit: false, delete: false };
      return {
        ...prev,
        [tabId]: {
          ...currentTabPerms,
          [action]: !currentTabPerms[action],
        },
      };
    });
  };

  const handleSave = async () => {
    if (!reason || reason.trim().length < 5) {
      setErrorMsg('Veuillez spécifier un motif explicite d’au moins 5 caractères pour l’audit trail.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const activeTabsList = Object.entries(tabStates)
        .filter(([_, state]) => state === 'granted')
        .map(([tabId]) => tabId);

      await adminPlatformService.setUserAccess({
        orgId: tenant.id,
        targetUserId: user.id || user.uid,
        tabs: activeTabsList,
        permissions: granularPermissions,
        assignedTableId: assignedTableId || undefined,
        reason: reason.trim(),
        ticketNumber: ticketNumber || undefined,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('[UserAccessEditorModal] Erreur:', err);
      setErrorMsg(err?.message || 'Échec de l’enregistrement des droits d’accès.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Droits & Accès : {user.name || user.email}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase font-bold">
                  Rôle : {role}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configuration des onglets visibles et des permissions CRUD de ce collaborateur.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick templates */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold">Modèles prédéfinis :</span>
            <button
              onClick={() => handleApplyTemplate('serveur_standard')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-[11px]"
            >
              Serveur standard
            </button>
            <button
              onClick={() => handleApplyTemplate('caissier_stock')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-[11px]"
            >
              Caissier + Stock
            </button>
          </div>

          {/* Onglets et Droits Matrix */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs flex items-center justify-between">
              <span>Matrice des 24 Onglets Applicatifs</span>
              <span className="text-slate-400 text-[10px] font-normal">
                Cliquez sur l'état pour alterner (Hérité → Accordé → Retiré)
              </span>
            </h4>

            <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl p-2 bg-slate-950/40">
              {TAB_CATALOG.map((tab) => {
                const isModuleSubscribed = entitlements?.modules ? Boolean(entitlements.modules[tab.moduleKey]) : true;
                const state = tabStates[tab.id] || 'inherited';
                const perms = granularPermissions[tab.id] || { view: false, create: false, edit: false, delete: false };

                return (
                  <div
                    key={tab.id}
                    className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-all ${
                      !isModuleSubscribed
                        ? 'opacity-40 bg-slate-950/20 border-slate-900'
                        : state === 'granted'
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : state === 'revoked'
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* State Button */}
                      <button
                        onClick={() => handleCycleTabState(tab.id)}
                        disabled={!isModuleSubscribed}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer shrink-0 ${
                          state === 'granted'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : state === 'revoked'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {state === 'granted' ? 'Accordé' : state === 'revoked' ? 'Retiré' : 'Hérité'}
                      </button>

                      <div>
                        <span className="text-white font-bold">{tab.label}</span>
                        {!isModuleSubscribed && (
                          <span className="ml-2 text-[9px] font-mono text-amber-400 uppercase">
                            (Module {tab.moduleKey} non souscrit)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CRUD checkboxes */}
                    <div className="flex items-center gap-3 text-[11px] self-end sm:self-center">
                      {(['view', 'create', 'edit', 'delete'] as const).map((act) => (
                        <label
                          key={act}
                          className="flex items-center gap-1 cursor-pointer select-none text-slate-300 hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(perms[act])}
                            onChange={() => handleToggleAction(tab.id, act)}
                            disabled={!isModuleSubscribed}
                            className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span className="capitalize">{act === 'view' ? 'Voir' : act === 'create' ? 'Créer' : act === 'edit' ? 'Modifier' : 'Supprimer'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aperçu en direct */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Aperçu en direct : ce que verra l'utilisateur ({computedGrantedTabs.length} onglets)</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">Calculé via resolveAccess</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {computedGrantedTabs.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-semibold border border-slate-700"
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Motif formel obligatoire */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Motif formel de la modification <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : Extension des droits de caisse suite à promotion..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Numéro de ticket support (optionnel)
              </label>
              <input
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                placeholder="Ex : RM-SUP-2026-092"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || reason.trim().length < 5}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Enregistrer les Droits</span>
          </button>
        </div>
      </div>
    </div>
  );
};
