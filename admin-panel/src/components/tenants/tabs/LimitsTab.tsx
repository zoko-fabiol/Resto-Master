import React, { useState } from 'react';
import { Gauge, Save, Store, Monitor, Users, ShoppingBag } from 'lucide-react';
import { Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface LimitsTabProps {
  tenant: Tenant;
}

export const LimitsTab: React.FC<LimitsTabProps> = ({ tenant }) => {
  const [maxOutlets, setMaxOutlets] = useState(tenant.limits?.maxOutlets || 1);
  const [maxUsers, setMaxUsers] = useState(tenant.limits?.maxUsers || 5);
  const [maxTerminals, setMaxTerminals] = useState(tenant.limits?.maxTerminals || 2);
  const [maxOrdersPerMonth, setMaxOrdersPerMonth] = useState(tenant.limits?.maxOrdersPerMonth || 5000);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveLimits = async () => {
    const reason = prompt('Motif obligatoire de l’ajustement des limites contractuelles :');
    if (!reason || reason.trim().length < 5) {
      alert('Un motif explicite est obligatoire.');
      return;
    }

    try {
      setIsSaving(true);
      await adminPlatformService.updateTenantEntitlements({
        orgId: tenant.id,
        reason: reason.trim(),
      });
      alert('Limites contractuelles enregistrées avec succès.');
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec de sauvegarde'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const limitsConfig = [
    {
      label: 'Points de Vente / Établissements',
      value: maxOutlets,
      setter: setMaxOutlets,
      icon: Store,
      desc: 'Nombre d’adresses physiques ou filiales rattachées à ce compte.',
      step: 1,
      min: 1,
      max: 50,
    },
    {
      label: 'Terminaux POS & Caisses Fixes',
      value: maxTerminals,
      setter: setMaxTerminals,
      icon: Monitor,
      desc: 'Nombre maximal d’écrans et tablettes connectés simultanément.',
      step: 1,
      min: 1,
      max: 100,
    },
    {
      label: 'Comptes Utilisateurs & Collaborateurs',
      value: maxUsers,
      setter: setMaxUsers,
      icon: Users,
      desc: 'Comptes actifs autorisés dans l’équipe (serveurs, cuisiniers, managers).',
      step: 1,
      min: 1,
      max: 200,
    },
    {
      label: 'Commandes Mensuelles Incluses',
      value: maxOrdersPerMonth,
      setter: setMaxOrdersPerMonth,
      icon: ShoppingBag,
      desc: 'Plafond mensuel de transactions certifiées par le serveur.',
      step: 500,
      min: 500,
      max: 500000,
    },
  ];

  return (
    <div className="space-y-6 text-xs">
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            Limites Contractuelles & Capacités
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Plafonds imposés par la formule ou convenus par dérogation commerciale.
          </div>
        </div>

        <button
          onClick={handleSaveLimits}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les Limites'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {limitsConfig.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-base font-black text-amber-400 tabular-nums">
                    {item.value.toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-3">
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <input
                  type="number"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={item.value}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-20 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-center font-bold"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
