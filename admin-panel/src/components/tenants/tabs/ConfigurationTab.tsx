import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  RefreshCw,
  Mail,
  Zap,
  Info,
  Server,
  Layers,
} from 'lucide-react';
import { Tenant, TenantEntitlements } from '@shared';
import { OPERATION_RULES, OperationRuleDefinition, MODULE_CATALOG } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface ConfigurationTabProps {
  tenant: Tenant;
  entitlements: TenantEntitlements | null;
}

export const ConfigurationTab: React.FC<ConfigurationTabProps> = ({ tenant, entitlements }) => {
  const [currentRules, setCurrentRules] = useState<Record<string, any>>({});
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [initialRules, setInitialRules] = useState<Record<string, any>>({});
  const [initialLockedKeys, setInitialLockedKeys] = useState<Set<string>>(new Set());

  // Passerelle e-mail
  const [emailWebhookUrl, setEmailWebhookUrl] = useState('');
  const [emailSenderName, setEmailSenderName] = useState('');

  // États UI
  const [filterModule, setFilterModule] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  useEffect(() => {
    const unsub = adminPlatformService.subscribeToTenantSnapshots(tenant.id, (list) => {
      setSnapshots(list);
    });
    return () => unsub();
  }, [tenant.id]);

  // Initialisation à partir des entitlements du tenant
  useEffect(() => {
    const rules: Record<string, any> = {};
    for (const def of OPERATION_RULES) {
      if (entitlements?.operationRules && entitlements.operationRules[def.key] !== undefined) {
        rules[def.key] = entitlements.operationRules[def.key];
      } else {
        rules[def.key] = def.defaultValue;
      }
    }
    setCurrentRules(rules);
    setInitialRules({ ...rules });

    const locked = new Set<string>(entitlements?.lockedConfigKeys || []);
    setLockedKeys(locked);
    setInitialLockedKeys(new Set(locked));
  }, [entitlements]);

  // Détection des modifications (différentiel)
  const modifiedRules = OPERATION_RULES.filter((r) => {
    const ruleChanged = currentRules[r.key] !== initialRules[r.key];
    const delegableChanged = lockedKeys.has(r.key) !== initialLockedKeys.has(r.key);
    return ruleChanged || delegableChanged;
  });

  const hasCriticalChanges = modifiedRules.some((r) => r.risk === 'critique' || r.risk === 'eleve');

  const handleToggleRule = (key: string) => {
    setCurrentRules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleDelegable = (key: string) => {
    setLockedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key); // Rendre délégable au restaurant (non verrouillé)
      } else {
        next.add(key); // Verrouiller côté plateforme
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (modifiedRules.length === 0) return;
    if (!reason || reason.trim().length < 5) {
      setErrorMsg('Veuillez renseigner un motif formel d’au moins 5 caractères pour le journal d’audit.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      // 1. Snapshot automatique avant modification
      await adminPlatformService.snapshotTenantConfig({
        orgId: tenant.id,
        reason: `Auto-snapshot avant mise à jour de ${modifiedRules.length} règles (${reason.trim()})`,
      });

      // 2. Application séquentielle certifiée via Cloud Function setTenantRule
      for (const rule of modifiedRules) {
        const isLocked = lockedKeys.has(rule.key);
        await adminPlatformService.setTenantRule({
          orgId: tenant.id,
          ruleKey: rule.key,
          value: currentRules[rule.key],
          delegable: !isLocked,
          reason: reason.trim(),
          ticketNumber: ticketNumber || undefined,
        });
      }

      setInitialRules({ ...currentRules });
      setInitialLockedKeys(new Set(lockedKeys));
      setSaveSuccess(true);
      setShowConfirmModal(false);
      setReason('');
      setTicketNumber('');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[ConfigurationTab] Erreur enregistrement:', err);
      setErrorMsg(err?.message || 'Échec de l’enregistrement de la configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async () => {
    if (!snapshots || snapshots.length === 0) {
      alert('Aucun instantané de configuration disponible pour ce restaurant.');
      return;
    }

    const latestSnap = snapshots[0];
    const snapLabel = latestSnap.label || latestSnap.reason || latestSnap.id;
    const confirm = window.confirm(
      `Restaurer le dernier instantané "${snapLabel}" pour "${tenant.company?.name || tenant.id}" ?`
    );
    if (!confirm) return;

    try {
      setIsRollingBack(true);
      await adminPlatformService.rollbackTenantConfig({
        orgId: tenant.id,
        snapshotId: latestSnap.id,
        reason: 'Retour arrière déclenché depuis l’onglet Configuration.',
      });
      alert('Restauration effectuée avec succès.');
    } catch (err: any) {
      alert(`Erreur de restauration : ${err?.message || 'Échec du retour arrière'}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Filtrage des règles affichées
  const displayedRules = OPERATION_RULES.filter((rule) => {
    const matchModule = filterModule === 'all' || rule.moduleKey === filterModule;
    const matchSearch =
      !searchTerm ||
      rule.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchModule && matchSearch;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Configuration Détaillée & Délégation ({OPERATION_RULES.length} règles)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Paramétrez chaque règle d'exploitation et définissez les clés verrouillées par la plateforme ou déléguées au restaurant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRollback}
            disabled={isRollingBack}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
            <span>Restaurer Instantané</span>
          </button>

          {modifiedRules.length > 0 && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer ({modifiedRules.length})</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Configuration mise à jour et enregistrée dans le journal d'audit immuable SHA-256.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barre de filtre & recherche */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher une règle par mot-clé..."
          className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />

        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
        >
          <option value="all">Tous les modules ({MODULE_CATALOG.length})</option>
          {MODULE_CATALOG.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grille des règles opérationnelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {displayedRules.map((rule) => {
          const isEnabled = Boolean(currentRules[rule.key]);
          const isLocked = lockedKeys.has(rule.key);
          const isModified =
            currentRules[rule.key] !== initialRules[rule.key] ||
            lockedKeys.has(rule.key) !== initialLockedKeys.has(rule.key);

          const riskBadgeColor: Record<string, string> = {
            faible: 'bg-slate-800 text-slate-300 border-slate-700',
            moyen: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            eleve: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
            critique: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          };

          return (
            <div
              key={rule.key}
              className={`p-4 rounded-xl border transition-all ${
                isModified
                  ? 'bg-amber-500/5 border-amber-500/40'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-white text-xs">{rule.label}</span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                        riskBadgeColor[rule.risk]
                      }`}
                    >
                      Risque {rule.risk}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 select-all">{rule.key}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Module parent : {rule.moduleKey}</div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Switch Activation de la règle */}
                  <button
                    onClick={() => handleToggleRule(rule.key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      isEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Bouton Délégable / Verrouillé */}
                  <button
                    onClick={() => handleToggleDelegable(rule.key)}
                    title={
                      isLocked
                        ? 'Verrouillé : le restaurant ne peut pas modifier ce réglage'
                        : 'Délégué : le restaurant peut ajuster ce réglage'
                    }
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      isLocked
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{isLocked ? 'Verrouillé' : 'Délégable'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Passerelle E-mail (Plateforme Only) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h4 className="font-bold text-white text-xs flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400" />
          <span>Passerelle E-mail & Alertes Automatisées (Gérée par RestoMaster)</span>
        </h4>
        <p className="text-xs text-slate-400">
          La configuration du Webhook Google Apps Script ou serveur SMTP est réservée à l'administrateur plateforme. Le restaurateur choisit uniquement les destinataires de ses alertes dans son interface.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              URL Webhook de transmission (Google Apps Script / CamMail)
            </label>
            <input
              type="url"
              value={emailWebhookUrl}
              onChange={(e) => setEmailWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">
              Nom d’expéditeur certifié
            </label>
            <input
              type="text"
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
              placeholder="RestoMaster OS Notifications"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Modal de Confirmation & Diff Preview */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Confirmation des modifications ({modifiedRules.length} règles)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Vérifiez le différentiel ci-dessous avant scellement dans le journal d'audit cryptographique.
              </p>
            </div>

            {hasCriticalChanges && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Attention : des règles à risque critique ou élevé sont modifiées.</span>
              </div>
            )}

            {/* Diff Preview */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px]">
              {modifiedRules.map((r) => {
                const wasEnabled = Boolean(initialRules[r.key]);
                const nowEnabled = Boolean(currentRules[r.key]);
                const wasLocked = initialLockedKeys.has(r.key);
                const nowLocked = lockedKeys.has(r.key);

                return (
                  <div key={r.key} className="flex flex-col gap-0.5 border-b border-slate-800/60 pb-1.5">
                    <span className="text-white font-bold">{r.key}</span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>
                        Valeur :{' '}
                        <span className={wasEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                          {wasEnabled ? 'ON' : 'OFF'}
                        </span>{' '}
                        →{' '}
                        <span className={nowEnabled ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                          {nowEnabled ? 'ON' : 'OFF'}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        Délégation :{' '}
                        <span className={wasLocked ? 'text-rose-400' : 'text-emerald-400'}>
                          {wasLocked ? 'Verrouillé' : 'Délégable'}
                        </span>{' '}
                        →{' '}
                        <span className={nowLocked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {nowLocked ? 'Verrouillé' : 'Délégable'}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Saisie obligatoire du motif */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Motif formel de la modification <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex : Réglage du seuil de caisse suite à la demande du gérant..."
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
                  placeholder="Ex : RM-SUP-2026-084"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
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
                <span>Confirmer & Enregistrer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
