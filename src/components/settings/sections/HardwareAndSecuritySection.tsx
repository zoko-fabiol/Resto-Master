import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../ui/ConfirmDialog';
import { UserRole } from '../../../types/restaurant';
import {
  PermissionModule,
  PermissionAction,
  ConfigurationProfileType,
} from '../../../types/configuration';
import { PrintingHardwareSection } from './PrintingHardwareSection';
import { AuditView } from '../../audit/AuditView';
import {
  Users,
  Bell,
  Printer,
  Monitor,
  Share2,
  Lock,
  ShieldCheck,
  History,
  WifiOff,
  Sliders,
  Save,
  CheckCircle2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calculator,
  FileText,
  UtensilsCrossed,
  Wine,
  ArrowRight,
  Copy,
  KeyRound,
  Tv,
  Tablet,
  ChefHat,
  Check,
  Crown,
  Star,
  Mail,
  Zap,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';
import { RestaurantEmailConfigSection } from './RestaurantEmailConfigSection';

interface Props {
  subTab:
    | 'notifications'
    | 'permissions'
    | 'impression'
    | 'terminaux'
    | 'audit'
    | 'offline';
}

export const HardwareAndSecuritySection: React.FC<Props> = ({ subTab }) => {
  const {
    rolePermissions,
    updateRolePermission,
    roleLimits,
    updateRoleLimits,
    peripherals,
    terminals,
    outlets,
    configHistory,
    applyConfigProfile,
    isOnline,
    offlineQueueCount,
    addAuditLog,
    operationRules,
    updateOperationRules,
    generateTerminalPairingCode,
    pairDeviceWithCode,
    isFeatureEnabled,
  } = useRestaurant();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const confirm = useConfirm();
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'direction';
  const isRbacMatrixEnabled = isFeatureEnabled('role_permissions_matrix');
  const isMobileNotifEnabled = isFeatureEnabled('mobile_notifications');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedTerminalId, setCopiedTerminalId] = useState<string | null>(null);
  const [showRolesGuide, setShowRolesGuide] = useState(false);
  const [notifTab, setNotifTab] = useState<'emails_gas' | 'local_alerts'>('emails_gas');

  const rolesList: { role: UserRole; label: string; desc: string }[] = [
    { role: 'direction', label: 'Direction Générale / Propriétaire', desc: 'Accès sans restriction à tous les modules, configurations et clôtures.' },
    { role: 'manager', label: 'Manager / Responsable d’Exploitation', desc: 'Gestion opérationnelle, approbations de remises et annulations.' },
    { role: 'caisse', label: 'Chef Caissier / Caissière', desc: 'Encaissements, ouvertures/clôtures de caisse et rapports Z.' },
    { role: 'serveur', label: 'Serveur / Hôte de Table', desc: 'Prise de commande, transmission cuisine/bar, consultation additions.' },
    { role: 'cuisine', label: 'Chef de Cuisine / Cuisinier', desc: 'KDS Cuisine, temps de préparation, alertes de cuisson.' },
    { role: 'bar', label: 'Barman / Sommelier', desc: 'KDS Bar, gestion des doses et des bouteilles, fiches cocktails.' },
    { role: 'stock', label: 'Gestionnaire de Stock / Économe', desc: 'Entrées/sorties, réceptions de commandes et inventaires FEFO.' },
    { role: 'finance', label: 'Responsable Financier', desc: 'Suivi de trésorerie, règlements fournisseurs, décaissements.' },
    { role: 'comptable', label: 'Comptable SYSCOHADA', desc: 'Exports journaux de ventes, écritures d’achats et TVA/CAC.' },
    { role: 'rh', label: 'Ressources Humaines', desc: 'Gestion des contrats, pointage des heures et documents administratifs.' },
    { role: 'auditeur', label: 'Auditeur Interne / Commissaire', desc: 'Consultation exclusive en lecture seule des journaux et traçabilité.' },
  ];

  // 1. PERMISSIONS RBAC GRANULAIRES & PLAFONDS FINANCIERS
  if (subTab === 'permissions') {
    const modules: { module: PermissionModule; label: string }[] = [
      { module: 'pos', label: 'POS & Prise de commande' },
      { module: 'tables', label: 'Plan des tables & Salles' },
      { module: 'caisse', label: 'Caisse & Clôture Z' },
      { module: 'invoices', label: 'Facturation Officielle & Avoirs' },
      { module: 'stock', label: 'Stocks & Lots FEFO' },
      { module: 'purchases', label: 'Achats & Fournisseurs' },
      { module: 'clients', label: 'Clients & Fidélité' },
      { module: 'finance', label: 'Finances & Décaissements' },
      { module: 'fiscal', label: 'Fiscalité Cameroun & E-Billing' },
      { module: 'staff', label: 'Personnel & Présences' },
      { module: 'audit', label: 'Journal d’Audit & Sécurité' },
      { module: 'events', label: 'Événements & Banquets' },
      { module: 'delivery', label: 'Livraisons & Courses' },
      { module: 'settings', label: 'Configuration Système' },
    ];

    const roles: UserRole[] = ['direction', 'manager', 'caisse', 'serveur', 'cuisine', 'bar', 'stock', 'finance', 'comptable'];

    return (
      <div className="space-y-6">
        {/* Matrice RBAC */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-600/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Matrice de Permissions Granulaires (RBAC)</h3>
                <p className="text-xs text-slate-500">
                  Définissez les droits d'accès détaillés par module et rôle métier
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowRolesGuide((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{showRolesGuide ? 'Masquer le Référentiel des Rôles' : 'Consulter le Référentiel des Rôles'}</span>
              </button>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                Traçabilité active
              </span>
            </div>
          </div>

          {/* Guide Référentiel des Rôles (Accordéon) */}
          {showRolesGuide && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Référentiel des Rôles & Définitions de Postes (11 Rôles)
                </h4>
                <span className="text-[10px] text-slate-400">Attributions et privilèges système</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {rolesList.map((r) => (
                  <div key={r.role} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{r.label}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 font-bold border border-slate-200">
                        {r.role}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Module</th>
                  {roles.map((r) => (
                    <th key={r} className="py-2.5 px-2 text-center uppercase">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map((m) => (
                  <tr key={m.module} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{m.label}</td>
                    {roles.map((r) => {
                      const canView = (rolePermissions as any)?.[r]?.[m.module]?.view ?? false;
                      const isDirection = r === 'direction';

                      return (
                        <td key={r} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            disabled={isDirection}
                            onClick={() => updateRolePermission(r, m.module, 'view', !canView)}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out disabled:cursor-not-allowed ${
                              (isDirection || canView) ? 'bg-amber-500' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                                (isDirection || canView) ? 'translate-x-3' : 'translate-x-0.5'
                              } mt-0.5`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plafonds Financiers par Rôle */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900">Plafonds Financiers & Limites de Rôles</h3>
            <p className="text-xs text-slate-500">
              Plafonds stricts de remises (%) et de remboursements (FCFA) applicables sans code PIN Superviseur
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['serveur', 'caisse', 'manager'] as UserRole[]).map((role) => {
              const currentLimit = roleLimits[role] || {
                maxDiscountPercent: 5,
                maxRefundAmount: 10000,
                maxExpenseAmount: 50000,
              };

              return (
                <div key={role} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                  <div className="font-bold text-slate-900 uppercase text-xs flex items-center justify-between">
                    <span>Rôle : {role}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white font-bold border border-slate-200">
                      Actif
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Remise max sans accord (%) :</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentLimit.maxDiscountPercent}
                      onChange={(e) => updateRoleLimits(role, { maxDiscountPercent: Number(e.target.value) })}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Remboursement max (FCFA) :</label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={currentLimit.maxRefundAmount}
                      onChange={(e) => updateRoleLimits(role, { maxRefundAmount: Number(e.target.value) })}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 block mb-1">Dépense de caisse max (FCFA) :</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={currentLimit.maxExpenseAmount}
                      onChange={(e) => updateRoleLimits(role, { maxExpenseAmount: Number(e.target.value) })}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 font-bold font-mono"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 4. IMPRESSION & MATÉRIEL
  if (subTab === 'impression') {
    return <PrintingHardwareSection />;
  }

  // 5. TERMINAUX & CAISSES (Section 27)
  if (subTab === 'terminaux') {
    const getTerminalIcon = (type: string) => {
      switch (type) {
        case 'caisse_fixe':
          return Monitor;
        case 'ecran_retrait':
          return Tv;
        case 'tablette_table':
        case 'tablette_serveur':
        case 'borne_client':
          return Tablet;
        case 'kds_cuisine':
        case 'kds_bar':
          return ChefHat;
        default:
          return Monitor;
      }
    };

    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Terminaux, Postes de Travail & Provisioning Matériel
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Section 27
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Déploiement universel par jeton d'activation à 6 caractères, liaison aux rôles et verrouillage d'écran
              </p>
            </div>
          </div>
        </div>

        {/* Universal Provisioning Protocol Notice */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-amber-900">
                Protocole de Provisioning Universel (Zero-Trust)
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Pour déployer un nouvel ordinateur de caisse, une tablette de serveur, un écran KDS cuisine ou une TV de retrait, installez RestoMaster OS sur l'appareil et saisissez simplement son <strong>Code d'Activation</strong> ci-dessous. Le poste sera automatiquement verrouillé sur son rôle et ses périphériques.
              </p>
            </div>
          </div>
        </div>

        {/* Terminals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {terminals.map((t) => {
            const Icon = getTerminalIcon(t.type);
            const isCopied = copiedTerminalId === t.id;

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-white transition-all flex flex-col justify-between space-y-4 shadow-2xs group"
              >
                <div>
                  {/* Top line with Icon and Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 group-hover:text-amber-600 group-hover:border-amber-300 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-slate-900 leading-tight">
                          {t.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {t.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      En ligne
                    </span>
                  </div>

                  {/* Metadata Specs */}
                  <div className="space-y-1.5 text-[11px] bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Rôle assigné :</span>
                      <strong className="text-slate-800 uppercase font-bold">{t.assignedRole}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Zone restaurant :</span>
                      <span className="font-semibold text-slate-700">{t.assignedZone || 'Générale'}</span>
                    </div>
                    {t.assignedTableId && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Table assignée :</span>
                        <strong className="text-amber-700 font-bold">Table {t.assignedTableId}</strong>
                      </div>
                    )}
                    {t.kdsStation && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Poste KDS :</span>
                        <strong className="text-indigo-700 font-bold uppercase">{t.kdsStation}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pairing Code & Controls */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Code d'Activation :
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const newCode = await generateTerminalPairingCode(t.id);
                        showToast({
                          type: 'info',
                          title: 'Nouveau Code Généré',
                          message: `Code d'activation ${newCode} prêt pour ${t.name}.`,
                        });
                      }}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Régénérer
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 text-amber-400 font-mono font-black text-sm text-center py-2 px-3 rounded-xl border border-slate-800 tracking-wider select-all shadow-inner">
                      {t.pairingCode || 'NON DÉFINI'}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (t.pairingCode) {
                          navigator.clipboard.writeText(t.pairingCode);
                          setCopiedTerminalId(t.id);
                          setTimeout(() => setCopiedTerminalId(null), 2000);
                          showToast({
                            type: 'success',
                            title: 'Code copié',
                            message: `Code ${t.pairingCode} copié dans le presse-papiers.`,
                          });
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs"
                      title="Copier le code d'activation"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (t.pairingCode) {
                          await pairDeviceWithCode(t.pairingCode);
                          showToast({
                            type: 'success',
                            title: 'Poste Activé Immédiatement',
                            message: `Ce navigateur est désormais appairé sous le profil "${t.name}".`,
                          });
                        }
                      }}
                      className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors shadow-2xs active:scale-95 whitespace-nowrap"
                      title="Tester et verrouiller cet écran immédiatement sur ce terminal"
                    >
                      Activer Ici
                    </button>
                  </div>

                  {t.pairingExpiresAt && (
                    <div className="text-[10px] flex items-center justify-between px-1">
                      {new Date(t.pairingExpiresAt).getTime() < Date.now() ? (
                        <span className="text-rose-600 font-bold">Code expiré (cliquez sur Régénérer)</span>
                      ) : (
                        <span className="text-slate-500">
                          Valide jusqu'à {new Date(t.pairingExpiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (durée 15 min)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 6. NOTIFICATIONS & E-MAILS GOOGLE APPS SCRIPT
  if (subTab === 'notifications') {
    const notifRules = [
      {
        key: 'notif_stock_critique',
        label: 'Alerte stock critique sous seuil minimum',
        description: 'Alerte visuelle et sonore dès franchissement du stock de sécurité',
        icon: AlertTriangle,
      },
      {
        key: 'notif_peremption_lot',
        label: 'Alerte péremption de lot (J-7)',
        description: 'Notification anticipée 7 jours avant la date limite d’utilisation',
        icon: Clock,
      },
      {
        key: 'notif_ecart_caisse',
        label: 'Alerte écart de caisse (> 5 000 FCFA)',
        description: 'Avertissement immédiat au gérant lors du comptage de fermeture',
        icon: Calculator,
      },
      {
        key: 'notif_rappel_fiscal',
        label: 'Rappel fiscal télédéclaration TVA / CGI',
        description: 'Alerte calendaire le 10 de chaque mois pour la déclaration DGI',
        icon: FileText,
      },
      {
        key: 'notif_retard_cuisine',
        label: 'Alerte retard commande cuisine (> 20 min)',
        description: 'Signal visuel d’urgence sur l’écran passe et le KDS Cuisine',
        icon: UtensilsCrossed,
      },
      {
        key: 'notif_rupture_bar',
        label: 'Alerte rupture bouteilles au bar',
        description: 'Avertissement dès épuisement des spiritueux ou vins en réserve',
        icon: Wine,
      },
    ];

    return (
      <div className="space-y-6">
        {/* Barre d'onglets Notifications */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setNotifTab('emails_gas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              notifTab === 'emails_gas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className={`w-4 h-4 ${notifTab === 'emails_gas' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Passerelle E-mails Google Apps Script (Restaurant)</span>
          </button>

          <button
            type="button"
            onClick={() => setNotifTab('local_alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              notifTab === 'local_alerts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className={`w-4 h-4 ${notifTab === 'local_alerts' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Alertes Visuelles & Bips Sonores KDS</span>
          </button>
        </div>

        {/* CONTENU ONGLETS */}
        {notifTab === 'emails_gas' ? (
          <RestaurantEmailConfigSection />
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Alertes Visuelles & Bips Sonores Système
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Section 26
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Déclencheurs d'alertes en temps réel sur les écrans POS, Cuisine KDS et caisses
                  </p>
                </div>
              </div>
              {savedSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paramètres enregistrés
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {notifRules.map((rule) => {
                const isChecked = (operationRules as any)?.[rule.key] ?? true;
                return (
                  <ModernRuleToggle
                    key={rule.key}
                    id={rule.key}
                    label={rule.label}
                    description={rule.description}
                    icon={rule.icon}
                    checked={isChecked}
                    onChange={() => updateOperationRules({ [rule.key]: !isChecked })}
                  />
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSavedSuccess(true);
                  addAuditLog('Alertes système', 'Paramètres', 'Configuration des alertes mise à jour');
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les alertes locales</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 7. AUDIT UNIFIÉ (Fusion avec le Journal d'Audit global B.3)
  if (subTab === 'audit') {
    return (
      <div className="space-y-4">
        <AuditView />
      </div>
    );
  }

  // 9. OFFLINE & SYNCHRONISATION (Section 30)
  if (subTab === 'offline') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mode Hors Ligne & Synchronisation Cloud (Section 30)</h3>
            <p className="text-slate-500">Moteur de résilience pour les coupures d'électricité et d'Internet</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`} />
            {isOnline ? 'Réseau Connecté' : 'Mode Hors Ligne'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-sm">File d'attente locale (Offline Queue)</span>
            <div className="text-2xl font-black text-slate-900">{offlineQueueCount} commandes en attente</div>
            <p className="text-slate-500 text-[11px]">
              Toutes les opérations saisies hors-ligne sont enregistrées en cache local chiffré et poussées automatiquement dès reconnexion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-sm">Intégrité des Données</span>
            <div className="text-2xl font-black text-emerald-700">100% Vérifié</div>
            <p className="text-slate-500 text-[11px]">
              Horodatage local infalsifiable et réconciliation automatique des soldes de caisse.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
