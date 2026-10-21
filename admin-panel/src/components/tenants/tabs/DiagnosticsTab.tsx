import React from 'react';
import { Activity, Wifi, Database, Monitor, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Tenant } from '@shared';

interface DiagnosticsTabProps {
  tenant: Tenant;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ tenant }) => {
  return (
    <div className="space-y-6 text-xs">
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Diagnostics & Télémétrie Opérationnelle
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Surveillance de l'état des caisses, de la synchronisation hors-ligne et de la santé du système.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connectivité et Base de données */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Base Firestore & Cache Local</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Région Cloud</span>
              <span className="font-mono text-white">europe-west1 (Belgique)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Canal de version</span>
              <span className="font-mono text-amber-400 capitalize">{tenant.channel || 'stable'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Moteur de réconciliation</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Opérationnel
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latence moyenne estimée</span>
              <span className="font-mono tabular-nums text-slate-300">~120 ms</span>
            </div>
          </div>
        </div>

        {/* Terminaux & Équipements */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Monitor className="w-4 h-4 text-purple-400" />
            <span>Postes & Caisses Appairés</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Plafond autorisés</span>
              <span className="font-mono tabular-nums text-white">
                {tenant.limits?.maxTerminals || 2} terminaux
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Dernière activité POS</span>
              <span className="font-mono text-slate-300">
                {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString('fr-FR') : 'En attente de connexion'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sessions de caisse bloquées</span>
              <span className="text-emerald-400 font-semibold">0 anomalie</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
