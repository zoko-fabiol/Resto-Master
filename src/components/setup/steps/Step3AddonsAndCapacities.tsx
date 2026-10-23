import React, { useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  TrendingUp,
  Tag,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  CATALOG_ADDONS,
  PackId,
  RestaurantTypeId,
  BillingCycle,
} from '../../../../shared/catalog/packs';
import { computeQuote, QuoteResult } from '../../../../shared/catalog/pricing';

interface Step3AddonsAndCapacitiesProps {
  selectedType: RestaurantTypeId;
  selectedPack: PackId;
  selectedCycle: BillingCycle;
  selectedAddons: string[];
  onToggleAddon: (addonId: string) => void;
  extraTerminals: number;
  onChangeExtraTerminals: (val: number) => void;
  extraUsers: number;
  onChangeExtraUsers: (val: number) => void;
  extraOrdersBlocks: number;
  onChangeExtraOrdersBlocks: (val: number) => void;
  onSelectPack: (packId: PackId) => void;
}

export const Step3AddonsAndCapacities: React.FC<Step3AddonsAndCapacitiesProps> = ({
  selectedType,
  selectedPack,
  selectedCycle,
  selectedAddons,
  onToggleAddon,
  extraTerminals,
  onChangeExtraTerminals,
  extraUsers,
  onChangeExtraUsers,
  extraOrdersBlocks,
  onChangeExtraOrdersBlocks,
  onSelectPack,
}) => {
  // Calcul en direct du devis certifié
  const quote: QuoteResult | null = useMemo(() => {
    try {
      return computeQuote({
        restaurantType: selectedType,
        packId: selectedPack,
        billingCycle: selectedCycle,
        selectedAddonIds: selectedAddons,
        capacities: {
          extraTerminals,
          extraUsers,
          extraOrdersBlocks,
        },
      });
    } catch {
      return null;
    }
  }, [selectedType, selectedPack, selectedCycle, selectedAddons, extraTerminals, extraUsers, extraOrdersBlocks]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 antialiased py-2">
      {/* En-tête */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
          <Package className="w-3.5 h-3.5" />
          <span>Chapitre 3 sur 5</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Options à la Carte & Extension de Capacité
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Personnalisez votre formule en ajoutant uniquement les modules dont votre établissement a besoin. Le devis est calculé instantanément.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne de gauche : sélection des options */}
        <div className="lg:col-span-7 space-y-5">
          {/* Options à la carte */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Options Fonctionnelles Disponibles
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {selectedAddons.length} sélectionnée{selectedAddons.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
              {CATALOG_ADDONS.map((addon) => {
                const isChecked = selectedAddons.includes(addon.id);
                return (
                  <label
                    key={addon.id}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-amber-500/10 border-amber-500/70 text-white shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleAddon(addon.id)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate">{addon.name}</span>
                        <span className="text-amber-400 font-mono font-bold tabular-nums ml-1">
                          +{addon.priceMonthly.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{addon.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Capacités supplémentaires */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Postes & Volumes Supplémentaires
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Terminaux */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300">Caisses (+3k F/m)</div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onChangeExtraTerminals(Math.max(0, extraTerminals - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-white tabular-nums text-sm">+{extraTerminals}</span>
                  <button
                    type="button"
                    onClick={() => onChangeExtraTerminals(extraTerminals + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Utilisateurs */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300">Employés (+1k F/m)</div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onChangeExtraUsers(Math.max(0, extraUsers - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-white tabular-nums text-sm">+{extraUsers}</span>
                  <button
                    type="button"
                    onClick={() => onChangeExtraUsers(extraUsers + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Blocs commandes */}
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-300">Blocs 5k (+3k F/m)</div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onChangeExtraOrdersBlocks(Math.max(0, extraOrdersBlocks - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-white tabular-nums text-sm">+{extraOrdersBlocks}</span>
                  <button
                    type="button"
                    onClick={() => onChangeExtraOrdersBlocks(extraOrdersBlocks + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne de droite : Devis instantané certifié */}
        <div className="lg:col-span-5">
          {quote && (
            <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 space-y-4 shadow-xl sticky top-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">Devis Certifié</div>
                  <div className="text-base font-black text-white">{quote.packName}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold uppercase">
                  {quote.billingCycle}
                </span>
              </div>

              {/* Suggestion d'upsell intelligent */}
              {quote.nextPackSuggestion && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Astuce d'Économie</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {quote.nextPackSuggestion.reason}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectPack(quote.nextPackSuggestion!.suggestedPackId)}
                    className="mt-1 w-full py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Passer au pack {quote.nextPackSuggestion.suggestedPackName}
                  </button>
                </div>
              )}

              {/* Lignes du devis */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {quote.lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/40">
                    <span className="text-slate-300 truncate max-w-[200px]">{line.label}</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {line.subtotalHT.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                ))}
              </div>

              {/* Total et économie */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                {quote.annualSavings && quote.annualSavings > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                    <span>Remise annuelle (2 mois offerts)</span>
                    <span className="font-mono tabular-nums">-{quote.annualSavings.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700/80 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-300">Total à Régler</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Équiv. {quote.monthlyEquivalent.toLocaleString('fr-FR')} FCFA / mois
                    </div>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono tabular-nums">
                    {quote.finalPayableAmount.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
