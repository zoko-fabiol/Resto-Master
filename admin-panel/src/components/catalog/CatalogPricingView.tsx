import React, { useState, useMemo } from 'react';
import {
  Package,
  Layers,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Tag,
  ShieldCheck,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  CATALOG_PACKS,
  RESTAURANT_TYPES,
  CATALOG_ADDONS,
  DEFAULT_CATALOG_SETTINGS,
  CAPACITY_PRICING,
  PackId,
  RestaurantTypeId,
  BillingCycle,
} from '../../../../shared/catalog/packs';
import { computeQuote } from '../../../../shared/catalog/pricing';
import { resolveEntitlements } from '../../../../shared/catalog/resolver';

export const CatalogPricingView: React.FC = () => {
  // États du simulateur de devis
  const [selectedType, setSelectedType] = useState<RestaurantTypeId>('restaurant_classique');
  const [selectedPack, setSelectedPack] = useState<PackId>('medium');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('mensuel');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(['addon_tables', 'addon_stocks']);
  const [extraTerminals, setExtraTerminals] = useState<number>(0);
  const [extraUsers, setExtraUsers] = useState<number>(0);
  const [extraOrdersBlocks, setExtraOrdersBlocks] = useState<number>(0);

  // Vue onglet interne
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'packs' | 'types' | 'addons'>('simulator');

  // Calcul du devis en temps réel
  const liveQuote = useMemo(() => {
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
    } catch (err) {
      console.error('Erreur calcul devis en direct:', err);
      return null;
    }
  }, [selectedType, selectedPack, selectedCycle, selectedAddons, extraTerminals, extraUsers, extraOrdersBlocks]);

  // Résolution des droits en direct
  const liveEntitlements = useMemo(() => {
    try {
      return resolveEntitlements({
        orgId: 'preview',
        restaurantType: selectedType,
        packId: selectedPack,
        subscribedAddons: selectedAddons,
        capacities: {
          extraTerminals,
          extraUsers,
          extraOrdersBlocks,
        },
      });
    } catch (err) {
      console.error('Erreur résolution droits en direct:', err);
      return null;
    }
  }, [selectedType, selectedPack, selectedAddons, extraTerminals, extraUsers, extraOrdersBlocks]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  return (
    <div className="space-y-6 text-xs antialiased">
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-white">Catalogue Officiel & Moteur Tarifaire</h1>
          </div>
          <p className="text-slate-400 mt-1">
            Les 3 formules officielles (Minimum 25k, Médium 35k, Premium 50k FCFA), les 8 types de restaurants et les options à la carte.
          </p>
        </div>

        {/* Navigation des sous-onglets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('simulator')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'simulator'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Simulateur de Devis
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('packs')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'packs'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Les 3 Packs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('types')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'types'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            8 Types de Restaurant
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('addons')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'addons'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Options à la Carte
          </button>
        </div>
      </div>

      {/* SOUS-ONGLET 1 : SIMULATEUR DE DEVIS EN DIRECT */}
      {activeSubTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panneau de configuration du panier */}
          <div className="lg:col-span-7 space-y-6">
            {/* Étape 1 : Type d'établissement */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black inline-flex items-center justify-center">1</span>
                Type d'établissement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(RESTAURANT_TYPES).map((typeDef) => (
                  <button
                    key={typeDef.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(typeDef.id);
                      setSelectedPack(typeDef.recommendedPack);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedType === typeDef.id
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{typeDef.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {typeDef.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{typeDef.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Étape 2 : Formule / Pack */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black inline-flex items-center justify-center">2</span>
                Formule Contractuelle (Pack)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.values(CATALOG_PACKS).map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPack(pack.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selectedPack === pack.id
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{pack.name}</span>
                        {pack.isPopular && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 uppercase">
                            Populaire
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{pack.tagline}</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80">
                      <span className="text-base font-black text-amber-400 tabular-nums">
                        {pack.priceMonthly.toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className="text-slate-500 text-[10px]"> /mois</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Étape 3 : Cycle de facturation */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black inline-flex items-center justify-center">3</span>
                Cycle d'Engagement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('mensuel')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCycle === 'mensuel'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold">Mensuel</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Sans engagement, paiement mois par mois</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCycle('annuel')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCycle === 'annuel'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Annuel</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      2 mois offerts
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Règle des 10 mois (10x le mensuel)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCycle('a_vie')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCycle === 'a_vie'
                      ? 'bg-purple-500/10 border-purple-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>À Vie (Licence)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                      25x mensuel
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Maintenance 2,4x/an incluse dès l'an 2</div>
                </button>
              </div>
            </div>

            {/* Étape 4 : Options à la carte */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black inline-flex items-center justify-center">4</span>
                  Options à la Carte ({selectedAddons.length} sélectionnée{selectedAddons.length > 1 ? 's' : ''})
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedAddons([])}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Tout désélectionner
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {CATALOG_ADDONS.map((addon) => {
                  const isChecked = selectedAddons.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/60 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAddon(addon.id)}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span className="truncate">{addon.name}</span>
                          <span className="text-amber-400 font-mono text-[11px] font-bold tabular-nums ml-1">
                            +{addon.priceMonthly.toLocaleString('fr-FR')} F
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{addon.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Étape 5 : Capacités supplémentaires */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black inline-flex items-center justify-center">5</span>
                Extensions de Capacité
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-300">Terminaux (+3 000 F/m)</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtraTerminals((p) => Math.max(0, p - 1))}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-white tabular-nums text-sm flex-1 text-center">
                      +{extraTerminals}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraTerminals((p) => p + 1)}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-300">Utilisateurs (+1 000 F/m)</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtraUsers((p) => Math.max(0, p - 1))}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-white tabular-nums text-sm flex-1 text-center">
                      +{extraUsers}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraUsers((p) => p + 1)}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-300">Blocs 5k Cdes (+3 000 F/m)</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtraOrdersBlocks((p) => Math.max(0, p - 1))}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-white tabular-nums text-sm flex-1 text-center">
                      +{extraOrdersBlocks}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraOrdersBlocks((p) => p + 1)}
                      className="w-7 h-7 rounded bg-slate-800 text-white font-bold hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau latéral : Devis Certifié et Upsell intelligent */}
          <div className="lg:col-span-5 space-y-4">
            {liveQuote && (
              <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 space-y-4 shadow-2xl sticky top-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Devis Officiel</span>
                    <h3 className="text-base font-black text-white">{liveQuote.packName}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold uppercase text-[10px]">
                    Cycle : {liveQuote.billingCycle}
                  </span>
                </div>

                {/* Suggestion d'upsell intelligent */}
                {liveQuote.nextPackSuggestion && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-amber-200">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      Suggestion d'Optimisation Commerciale
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {liveQuote.nextPackSuggestion.reason}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedPack(liveQuote.nextPackSuggestion!.suggestedPackId)}
                      className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors"
                    >
                      Passer au pack {liveQuote.nextPackSuggestion.suggestedPackName}
                    </button>
                  </div>
                )}

                {/* Lignes du devis */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {liveQuote.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/40">
                      <div className="text-slate-300">
                        <span>{line.label}</span>
                        {line.quantity > 1 && <span className="text-slate-500 font-mono ml-1">x{line.quantity}</span>}
                      </div>
                      <span className="font-mono font-bold text-white tabular-nums">
                        {line.subtotalHT.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  ))}
                </div>

                {/* Récapitulatif financier */}
                <div className="space-y-1.5 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Sous-total HT</span>
                    <span className="font-mono tabular-nums">{liveQuote.subtotalHT.toLocaleString('fr-FR')} FCFA</span>
                  </div>

                  {liveQuote.annualSavings && liveQuote.annualSavings > 0 && (
                    <div className="flex items-center justify-between text-emerald-400 font-semibold">
                      <span>Économie réalisée (2 mois offerts)</span>
                      <span className="font-mono tabular-nums">-{liveQuote.annualSavings.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}

                  {liveQuote.lifetimeMaintenanceAnnual && (
                    <div className="flex items-center justify-between text-purple-400 text-[11px]">
                      <span>Maintenance annuelle (dès an 2)</span>
                      <span className="font-mono tabular-nums">+{liveQuote.lifetimeMaintenanceAnnual.toLocaleString('fr-FR')} FCFA/an</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-700/80 flex items-baseline justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Montant Total à Régler</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Équivalent : {liveQuote.monthlyEquivalent.toLocaleString('fr-FR')} FCFA / mois
                      </div>
                    </div>
                    <div className="text-xl font-black text-amber-400 font-mono tabular-nums">
                      {liveQuote.finalPayableAmount.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>
                </div>

                {/* Quotas accordés avec ce panier */}
                {liveEntitlements && (
                  <div className="pt-3 border-t border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Plafonds Accordés avec ce Devis
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Caisses</div>
                        <div className="font-mono font-bold text-white tabular-nums text-sm">
                          {liveEntitlements.effectiveLimits.maxTerminals}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Utilisateurs</div>
                        <div className="font-mono font-bold text-white tabular-nums text-sm">
                          {liveEntitlements.effectiveLimits.maxUsers}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Commandes/m</div>
                        <div className="font-mono font-bold text-white tabular-nums text-sm">
                          {liveEntitlements.effectiveLimits.maxOrdersPerMonth.toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOUS-ONGLET 2 : LES 3 PACKS OFFICIELS */}
      {activeSubTab === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(CATALOG_PACKS).map((pack) => (
            <div
              key={pack.id}
              className={`rounded-2xl bg-slate-900/60 border p-6 flex flex-col justify-between space-y-4 ${
                pack.isPopular ? 'border-amber-500/80 shadow-xl relative' : 'border-slate-800'
              }`}
            >
              {pack.isPopular && (
                <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Le Choix Recommandé
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">{pack.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {pack.badge}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{pack.description}</p>

                <div className="py-3 border-y border-slate-800/80">
                  <div className="text-2xl font-black text-amber-400 font-mono tabular-nums">
                    {pack.priceMonthly.toLocaleString('fr-FR')} FCFA
                  </div>
                  <div className="text-[10px] text-slate-500">Par mois HT (Facturation mensuelle)</div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">Plafonds inclus de base :</div>
                  <ul className="space-y-1.5 text-slate-400 text-[11px]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxTerminals} caisse(s) / terminal(aux) tactile(s)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxUsers} comptes utilisateurs (serveurs, cuisiniers, gérants)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxOrdersPerMonth.toLocaleString('fr-FR')} commandes / mois</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pack.limits.maxOutlets} établissement (mono-site)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPack(pack.id);
                    setActiveSubTab('simulator');
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors text-center"
                >
                  Simuler ce pack
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SOUS-ONGLET 3 : 8 TYPES DE RESTAURANT */}
      {activeSubTab === 'types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(RESTAURANT_TYPES).map((typeDef) => (
            <div key={typeDef.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{typeDef.name}</h3>
                  <div className="text-[11px] text-amber-400 font-mono mt-0.5">{typeDef.badge}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                  Recommandé : Pack {typeDef.recommendedPack}
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">{typeDef.description}</p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Modules socles : {typeDef.coreModules.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(typeDef.id);
                    setSelectedPack(typeDef.recommendedPack);
                    setActiveSubTab('simulator');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] underline"
                >
                  Configurer pour ce type &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SOUS-ONGLET 4 : OPTIONS À LA CARTE (ADDONS) */}
      {activeSubTab === 'addons' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATALOG_ADDONS.map((addon) => (
              <div key={addon.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{addon.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-[10px] tabular-nums">
                    {addon.priceMonthly.toLocaleString('fr-FR')} F/m
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{addon.description}</p>
                <div className="text-[10px] text-slate-500 font-mono uppercase">
                  Catégorie : {addon.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
