import React from 'react';
import { Store, CheckCircle2, Sparkles, Layers, ShieldCheck, Star } from 'lucide-react';
import {
  RESTAURANT_TYPES,
  CATALOG_PACKS,
  RestaurantTypeId,
  PackId,
  BillingCycle,
} from '../../../../shared/catalog/packs';

interface Step2BusinessProfileAndPackProps {
  selectedType: RestaurantTypeId;
  onSelectType: (typeId: RestaurantTypeId) => void;
  selectedPack: PackId;
  onSelectPack: (packId: PackId) => void;
  selectedCycle: BillingCycle;
  onSelectCycle: (cycle: BillingCycle) => void;
}

export const Step2BusinessProfileAndPack: React.FC<Step2BusinessProfileAndPackProps> = ({
  selectedType,
  onSelectType,
  selectedPack,
  onSelectPack,
  selectedCycle,
  onSelectCycle,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 antialiased py-2">
      {/* En-tête du chapitre 2 */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
          <Store className="w-3.5 h-3.5" />
          <span>Chapitre 2 sur 5</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Votre Activité & Votre Formule d'Abonnement
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Sélectionnez la typologie qui correspond à votre établissement pour activer les modules recommandés, puis choisissez votre formule.
        </p>
      </div>

      {/* SECTION 1 : Les 8 Types de Restaurant */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          1. Quel type d'établissement gérez-vous ?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(RESTAURANT_TYPES).map((typeDef) => {
            const isSelected = selectedType === typeDef.id;
            return (
              <button
                key={typeDef.id}
                type="button"
                onClick={() => {
                  onSelectType(typeDef.id);
                  onSelectPack(typeDef.recommendedPack);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-xs text-white line-clamp-1">{typeDef.name}</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {typeDef.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {typeDef.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">Recommandé :</span>
                  <span className="font-bold text-amber-400 font-mono">Pack {typeDef.recommendedPack}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 : Les 3 Formules d'Abonnement */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          2. Choisissez votre formule officielle RestoMaster OS
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(CATALOG_PACKS).map((pack) => {
            const isSelected = selectedPack === pack.id;
            return (
              <div
                key={pack.id}
                onClick={() => onSelectPack(pack.id)}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/15 to-slate-900/90 border-amber-500 shadow-xl ring-2 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {pack.isPopular && (
                  <span className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                    Recommandé
                  </span>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-white">{pack.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      {pack.badge}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{pack.description}</p>

                  <div className="py-2.5 border-y border-slate-800/80">
                    <div className="text-xl font-black text-amber-400 font-mono tabular-nums">
                      {pack.priceMonthly.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Par mois HT</div>
                  </div>

                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxTerminals} caisse(s) tactile(s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxUsers} comptes utilisateurs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxOrdersPerMonth.toLocaleString('fr-FR')} commandes / mois</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div
                    className={`py-1.5 text-center rounded-xl font-bold text-xs transition-colors ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? 'Formule sélectionnée' : 'Choisir cette formule'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3 : Cycle d'engagement */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          3. Périodicité d'engagement & Remise
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onSelectCycle('mensuel')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCycle === 'mensuel'
                ? 'bg-amber-500/10 border-amber-500 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-bold text-white text-xs">Mensuel</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Paiement chaque mois, sans engagement</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectCycle('annuel')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCycle === 'annuel'
                ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-white text-xs">
              <span>Annuel (Recommandé)</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">
                2 mois offerts
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Règle des 10 mois (10x le mensuel pour 12 mois)</div>
          </button>

          <button
            type="button"
            onClick={() => onSelectCycle('a_vie')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCycle === 'a_vie'
                ? 'bg-purple-500/10 border-purple-500 text-white shadow-md'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-white text-xs">
              <span>À Vie (Licence Finale)</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">
                25x mensuel
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Propriété perpétuelle (Maintenance annuelle 2.4x)</div>
          </button>
        </div>
      </div>
    </div>
  );
};
