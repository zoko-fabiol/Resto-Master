import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Mail, CheckCircle2, Clock, Layers, RefreshCw } from 'lucide-react';
import { Tenant } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';

interface OutletsTabProps {
  tenant: Tenant;
}

export const OutletsTab: React.FC<OutletsTabProps> = ({ tenant }) => {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsub = adminPlatformService.subscribeToTenantOutlets(tenant.id, (list) => {
      setOutlets(list);
      setIsLoading(false);
    });
    return () => unsub();
  }, [tenant.id]);

  return (
    <div className="space-y-6 text-xs">
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Établissements & Succursales ({outlets.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Points de vente physiques rattachés à cette organisation multi-sites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Plafond : {tenant.limits?.maxOutlets || 1} succursale(s) autorisée(s)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {outlets.map((outlet) => (
          <div
            key={outlet.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {outlet.name ? outlet.name.slice(0, 2).toUpperCase() : 'SUC'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{outlet.name}</h4>
                  <div className="text-[11px] font-mono text-slate-400">ID: {outlet.id}</div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                {outlet.status || 'Actif'}
              </span>
            </div>

            <div className="space-y-2 text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  {outlet.address || 'Adresse non renseignée'}, {outlet.city || tenant.company?.city}
                </span>
              </div>
              {outlet.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono">{outlet.phone}</span>
                </div>
              )}
              {outlet.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{outlet.email}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Profil : {outlet.configurationProfile || 'restaurant_classique'}</span>
              </span>
              <span className="font-mono text-slate-500">
                Créé le {outlet.createdAt ? new Date(outlet.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
              </span>
            </div>
          </div>
        ))}

        {outlets.length === 0 && !isLoading && (
          <div className="col-span-2 p-12 text-center text-slate-500 italic bg-slate-900/40 rounded-2xl border border-slate-800">
            Aucun établissement physique distinct encore créé pour cette organisation.
          </div>
        )}

        {isLoading && (
          <div className="col-span-2 p-12 text-center text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
            Chargement des établissements...
          </div>
        )}
      </div>
    </div>
  );
};
