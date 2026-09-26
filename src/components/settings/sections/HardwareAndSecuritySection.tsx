import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { UserRole } from '../../../types/restaurant';
import {
  PermissionModule,
  PermissionAction,
  ConfigurationProfileType,
} from '../../../types/configuration';
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
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react';

interface Props {
  subTab:
    | 'personnel'
    | 'notifications'
    | 'impression'
    | 'terminaux'
    | 'integrations'
    | 'securite'
    | 'permissions'
    | 'audit'
    | 'offline'
    | 'avance';
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
    resetToDemoData,
    addAuditLog,
  } = useRestaurant();

  const [savedSuccess, setSavedSuccess] = useState(false);

  // 1. PERSONNEL & RÔLES (Section 24)
  if (subTab === 'personnel') {
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

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Personnel, Rôles & Niveaux d’Accès (Section 24)</h3>
          <p className="text-xs text-slate-500">
            Définition des privilèges, attributions par établissement, caisses et modules autorisés
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rolesList.map((r) => (
            <div key={r.role} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{r.label}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white font-bold border border-slate-200">
                  {r.role}
                </span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. PERMISSIONS RBAC GRANULAIRES (Section 25)
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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Matrice de Permissions Granulaires (RBAC) (Section 25)</h3>
            <p className="text-xs text-slate-500">
              Définissez les droits d'accès détaillés par module et rôle métier
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
            Traçabilité active
          </span>
        </div>

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
                        <input
                          type="checkbox"
                          checked={isDirection || canView}
                          disabled={isDirection}
                          onChange={(e) => updateRolePermission(r, m.module, 'view', e.target.checked)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer disabled:opacity-60"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. SÉCURITÉ & PLAFONDS
  if (subTab === 'securite') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Plafonds Financiers & Règles d'Autorisation</h3>
          <p className="text-xs text-slate-500">
            Plafonds de remise et de remboursement sans approbation managériale
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
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. IMPRESSION & MATÉRIEL
  if (subTab === 'impression') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Imprimantes Thermiques & Tiroirs-Caisses</h3>
            <p className="text-xs text-slate-500">
              Paramétrage des imprimantes 80mm/58mm réseau IP, Bluetooth et tiroir automatique
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {peripherals.map((p) => (
            <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{p.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Connecté
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Type : {p.type} • Connexion : {p.connectionType} • IP/Port : {p.address}:{p.port || 9100}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. TERMINAUX & CAISSES
  if (subTab === 'terminaux') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Terminaux, Caisses & Postes de Travail</h3>
          <p className="text-xs text-slate-500">
            Affectation des caisses fixes, tablettes serveurs et écrans KDS par établissement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {terminals.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{t.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  En ligne
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Type : {t.type} • Zone : {t.assignedZone} • Rôle affecté : <strong className="uppercase">{t.assignedRole}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. NOTIFICATIONS
  if (subTab === 'notifications') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Notifications & Alertes Système</h3>
          <p className="text-slate-500">Canaux de diffusion pour les alertes stocks, caisse et fiscales</p>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Alerte stock critique sous le seuil minimum (immédiate)' },
            { label: 'Alerte péremption de lot (7 jours avant expiration)' },
            { label: 'Alerte écart de caisse > 5 000 FCFA lors du comptage' },
            { label: 'Rappel fiscal déclaration TVA / CGI (le 10 de chaque mois)' },
            { label: 'Notification commande en retard en cuisine (> 20 min)' },
          ].map((n, i) => (
            <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input type="checkbox" defaultChecked={true} className="w-4 h-4 rounded text-amber-600" />
              <span className="font-semibold text-slate-800">{n.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // 7. INTÉGRATIONS
  if (subTab === 'integrations') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Intégrations & Passerelles Externes</h3>
          <p className="text-slate-500">Connecteurs API avec les services tiers et l'administration</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Passerelle MTN MoMo Pay', status: 'Connecté', desc: 'API MoMo Open avec notification USSD et encaissements.' },
            { title: 'Passerelle Orange Money Web', status: 'Connecté', desc: 'API Orange Money #150# et QR Codes Max it.' },
            { title: 'Télé-déclaration DGI E-Billing', status: 'Prêt', desc: 'Format d’exportation conforme et archivage légal 10 ans.' },
            { title: 'Sauvegarde Cloud Firestore', status: 'Actif', desc: 'Synchronisation temps réel et redondance multi-zones.' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {item.status}
                </span>
              </div>
              <p className="text-slate-600 text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. AUDIT DE CONFIGURATION (Section 29)
  if (subTab === 'audit') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Journal d’Audit des Modifications de Configuration</h3>
            <p className="text-slate-500">Historique horodaté des activations, suspensions et règles modifiées</p>
          </div>
          <span className="font-mono text-slate-500 text-[11px] font-bold">
            {configHistory.length} entrées
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {configHistory.map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{item.action}</span>
                  <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-mono uppercase">
                    {item.category}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{item.detail}</p>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Par <strong>{item.user}</strong> le {item.timestamp.slice(0, 10)} à {item.timestamp.slice(11, 16)}
                </div>
              </div>

              {item.newValue && (
                <div className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 shrink-0 inline-flex items-center gap-1.5">
                  {item.oldValue && (
                    <>
                      <span>{item.oldValue}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
                    </>
                  )}
                  <span>{item.newValue}</span>
                </div>
              )}
            </div>
          ))}
        </div>
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

  // 10. AVANCÉ & PROFILS PRÉDÉFINIS (Section 31)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">Paramètres Avancés & Profils Métier (1-Clic)</h3>
        <p className="text-slate-500">Déployez instantanément un modèle d'exploitation adapté à votre établissement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            id: 'restaurant_classique' as ConfigurationProfileType,
            title: 'Restaurant Classique & Grillades',
            desc: 'Service à table, cuisine chaude, bar lounge, facturation TVA et clôture de caisse standard.',
          },
          {
            id: 'bar_lounge' as ConfigurationProfileType,
            title: 'Bar Lounge & Cave à Vins',
            desc: 'Cocktails, gestion bouteilles/verres, cartes boissons et ambiance lounge.',
          },
          {
            id: 'fast_food' as ConfigurationProfileType,
            title: 'Fast-Food & Vente à Emporter',
            desc: 'Commandes rapides au comptoir, click & collect et livraisons moto.',
          },
          {
            id: 'evenementiel_traiteur' as ConfigurationProfileType,
            title: 'Traiteur, Banquets & Cérémonies',
            desc: 'Devis complets, gestion des acomptes et factures laser A5 entreprises.',
          },
        ].map((p) => (
          <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{p.title}</h4>
              <p className="text-slate-600 mt-1 leading-relaxed">{p.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Appliquer le profil "${p.title}" ?`)) {
                  applyConfigProfile(p.id);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
            >
              <span>Appliquer ce profil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (confirm('Réinitialiser toutes les données aux valeurs de démonstration ?')) {
              resetToDemoData();
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 border border-rose-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Réinitialisation d'usine</span>
        </button>
      </div>
    </div>
  );
};
