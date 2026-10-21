import React, { useState } from 'react';
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Database,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface DiagnosticsTabProps {
  tenant: Tenant;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ tenant }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any | null>(null);

  const handleRunLiveDiagnostics = async () => {
    try {
      setIsRunning(true);
      const res = await adminPlatformService.runDiagnostics({ orgId: tenant.id });
      setDiagnosticsResult(res.diagnostics);
    } catch (err: any) {
      alert(`Erreur d'audit diagnostic : ${err?.message || 'Échec de connexion serveur'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const currentScore = diagnosticsResult?.healthScore ?? tenant.healthScore ?? 100;
  const scoreBadgeColor =
    currentScore >= 80
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : currentScore >= 50
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  return (
    <div className="space-y-6 text-xs">
      {/* Header and trigger */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Diagnostics & Télémétrie Opérationnelle</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit de conformité fiscale (CGI 2026), contrôle des caisses, des périphériques et détection des anomalies.
          </p>
        </div>

        <button
          onClick={handleRunLiveDiagnostics}
          disabled={isRunning}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 self-start sm:self-auto"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Audit en cours...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Lancer le Diagnostic Serveur</span>
            </>
          )}
        </button>
      </div>

      {/* Global Health Score Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Score de Santé & Intégrité Système</div>
          <div className="text-2xl font-black text-white mt-1 tabular-nums">
            {currentScore} / 100
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {currentScore >= 80
              ? 'Établissement conforme et opérationnel pour le service'
              : currentScore >= 50
              ? 'Points d\'attention ou paramètres incomplets détectés'
              : 'Anomalies critiques bloquantes pour l\'exploitation'}
          </div>
        </div>

        <div className={`px-4 py-2 rounded-2xl border font-bold text-sm ${scoreBadgeColor}`}>
          {currentScore >= 80 ? 'CONFORME' : currentScore >= 50 ? 'ATTENTION' : 'CRITIQUE'}
        </div>
      </div>

      {/* Real Server Checks Result */}
      {diagnosticsResult && (
        <div className="space-y-3">
          <h4 className="font-bold text-white text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Résultats de l'Audit Serveur ({diagnosticsResult.checks?.length || 0} points inspectés)</span>
          </h4>

          <div className="space-y-2">
            {diagnosticsResult.checks?.map((check: any, idx: number) => {
              const isOk = check.passed;
              const isWarning = check.severity === 'warning';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                    isOk
                      ? 'bg-slate-900/40 border-slate-800'
                      : isWarning
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-rose-500/10 border-rose-500/20'
                  }`}
                >
                  <div className="mt-0.5">
                    {isOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{check.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {check.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{check.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Infrastructure Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Firestore Database */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
            <Database className="w-4 h-4 text-blue-400" />
            <span>Infrastructure Base Firestore</span>
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
              <span className="text-slate-400">Scellement Piste d'Audit</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Chaînage SHA-256 Actif
              </span>
            </div>
          </div>
        </div>

        {/* Postes & Terminaux */}
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
              <span className="text-slate-400">Mode de suspension</span>
              <span className="font-mono text-slate-300">
                {tenant.suspensionMode === 'full_block'
                  ? 'Blocage total'
                  : tenant.suspensionMode === 'read_only'
                  ? 'Lecture seule'
                  : 'Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
