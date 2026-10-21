import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, ExternalLink, Calendar, Search } from 'lucide-react';
import { PlatformAuditLog, Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';
import { db } from '../../../../../src/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface AuditTabProps {
  tenant: Tenant;
}

export const AuditTab: React.FC<AuditTabProps> = ({ tenant }) => {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);

  useEffect(() => {
    const collRef = collection(db, 'platform_audit_logs');
    const q = query(
      collRef,
      where('targetOrgId', '==', tenant.id),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformAuditLog)));
      },
      (err) => {
        console.warn('Erreur écoute platform_audit_logs pour tenant:', err);
      }
    );

    return () => unsub();
  }, [tenant.id]);

  return (
    <div className="space-y-4 text-xs">
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Journal d’Audit Cryptographique Dédié ({logs.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historique infalsifiable de toutes les modifications apportées à cet établissement (chaînage SHA-256).
          </p>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
          Preuve Immuable
        </span>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Date & Heure</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Détail</th>
                <th className="py-3 px-4 font-semibold">Motif Obligatoire</th>
                <th className="py-3 px-4 font-semibold">Auteur</th>
                <th className="py-3 px-4 font-semibold text-right">Hash SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : 'Récent'}
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{log.action}</td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.detail}>
                    {log.detail}
                  </td>
                  <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate" title={log.reason}>
                    "{log.reason}"
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{log.actorEmail}</td>
                  <td className="py-3 px-4 text-right font-mono text-[10px] text-emerald-400" title={log.sha256Hash}>
                    {log.sha256Hash ? `${log.sha256Hash.slice(0, 10)}…` : 'HASH_OK'}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    Aucune action d'administration enregistrée pour ce restaurant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
