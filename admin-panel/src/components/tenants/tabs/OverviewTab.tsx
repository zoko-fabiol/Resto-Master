import React from 'react';
import { Building2, User, MapPin, Phone, Mail, FileText, Calendar, ShieldCheck, HeartPulse } from 'lucide-react';
import { Tenant, DEFAULT_PLANS, Plan } from '@shared';

interface OverviewTabProps {
  tenant: Tenant;
  onSendCredentials?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tenant, onSendCredentials }) => {
  const plan = DEFAULT_PLANS.find((p: Plan) => p.id === tenant.planId);

  return (
    <div className="space-y-6 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fiche Société */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Identité de l'Entreprise</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-slate-300">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Nom Commercial</div>
              <div className="font-bold text-white text-sm mt-0.5">{tenant.company?.name || tenant.id}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Forme Juridique</div>
              <div className="font-semibold text-white mt-0.5">{tenant.company?.legalForm || 'SARL'}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Raison Sociale Légale</div>
              <div className="font-medium mt-0.5">{tenant.company?.legalName || tenant.company?.name}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Identifiant Unique (NIU)</div>
              <div className="font-mono text-amber-400 font-semibold mt-0.5">
                {tenant.company?.taxId || 'Non renseigné'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">RCCM (Commerce)</div>
              <div className="font-mono mt-0.5">{tenant.company?.rccm || 'Non renseigné'}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Devise d'Exploitation</div>
              <div className="font-bold text-emerald-400 mt-0.5">{tenant.currency || 'FCFA'}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                {tenant.company?.headquartersAddress || 'Siège non renseigné'}, {tenant.company?.city} ({tenant.company?.country || 'Cameroun'})
              </span>
            </div>
            {tenant.company?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-mono">{tenant.company.phone}</span>
              </div>
            )}
            {tenant.company?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{tenant.company.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fiche Propriétaire & Compte */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-white font-bold text-sm">
              <User className="w-4 h-4 text-amber-400" />
              <span>Propriétaire & Gestionnaire du Compte</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Nom du Titulaire</div>
                <div className="font-bold text-white text-sm mt-0.5">{tenant.owner?.name}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Email de Connexion (Auth)</div>
                <div className="font-mono text-slate-200 mt-0.5">{tenant.owner?.email}</div>
              </div>

              {tenant.owner?.phone && (
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Téléphone Direct</div>
                  <div className="font-mono text-slate-200 mt-0.5">{tenant.owner.phone}</div>
                </div>
              )}

              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">UID Firebase Auth</div>
                <div className="font-mono text-[11px] text-slate-500 mt-0.5 break-all">
                  {tenant.owner?.uid || 'En attente de rattachement'}
                </div>
              </div>

              {onSendCredentials && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onSendCredentials}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Envoyer les Identifiants par E-mail</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Créé le {new Date(tenant.createdAt).toLocaleDateString('fr-FR')}</span>
            <span className="capitalize">Source : {tenant.creationSource?.replace('_', ' ') || 'admin'}</span>
          </div>
        </div>
      </div>

      {/* Santé et État de Service */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">Indice de Santé Opérationnelle</div>
            <div className="text-slate-400 text-[11px]">
              Dernière activité détectée : {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString('fr-FR') : 'Non renseigné'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-black text-emerald-400 tabular-nums">
              {tenant.healthScore || 98}/100
            </div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">EXCELLENT ÉTAT</div>
          </div>
        </div>
      </div>
    </div>
  );
};
