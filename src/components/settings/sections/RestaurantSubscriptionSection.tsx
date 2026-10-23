import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  Sliders,
  DollarSign,
  Smartphone,
  TrendingUp,
  FileText,
  Info,
} from 'lucide-react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  CATALOG_PACKS,
  CATALOG_ADDONS,
  RESTAURANT_TYPES,
  PackId,
  BillingCycle,
  RestaurantTypeId,
  AddonDefinition,
} from '../../../../shared/catalog/packs';
import { computeQuote, QuoteResult } from '../../../../shared/catalog/pricing';
import { cloudFunctionsService } from '../../../services/functions/cloudFunctionsService';

/**
 * Mappe un planId hérité ou non normalisé vers les 3 packs officiels du catalogue
 */
const resolveTenantPackId = (t: any): PackId => {
  if (t?.packId === 'minimum' || t?.packId === 'medium' || t?.packId === 'premium') {
    return t.packId;
  }
  if (t?.planId === 'plan_starter' || t?.planId === 'starter' || t?.planId === 'minimum') {
    return 'minimum';
  }
  if (t?.planId === 'plan_enterprise' || t?.planId === 'enterprise' || t?.planId === 'premium') {
    return 'premium';
  }
  return 'medium';
};

export const RestaurantSubscriptionSection: React.FC = () => {
  const { tenant, entitlements, terminals, employees, orders } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const currentPackId = useMemo(() => resolveTenantPackId(tenant), [tenant]);
  const currentPackDef = CATALOG_PACKS[currentPackId] || CATALOG_PACKS.medium;

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(
    (tenant?.billingCycle as BillingCycle) || 'annuel'
  );
  const [selectedPack, setSelectedPack] = useState<PackId>(currentPackId);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(tenant?.subscribedAddons || []);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Synchroniser les paramètres dès réception des données distantes du tenant
  useEffect(() => {
    const resolved = resolveTenantPackId(tenant);
    setSelectedPack(resolved);

    if (
      tenant?.billingCycle &&
      (tenant.billingCycle === 'mensuel' ||
        tenant.billingCycle === 'annuel' ||
        tenant.billingCycle === 'a_vie')
    ) {
      setSelectedCycle(tenant.billingCycle as BillingCycle);
    }
    if (tenant?.subscribedAddons) {
      setSelectedAddons(tenant.subscribedAddons);
    }
  }, [tenant?.packId, tenant?.planId, tenant?.billingCycle, tenant?.subscribedAddons]);

  // Déterminer les modules socles et paliers inclus d'office selon le type de restaurant et pack actif
  const restaurantType: RestaurantTypeId =
    (tenant?.restaurantType as RestaurantTypeId) || 'restaurant_classique';
  const typeDef = RESTAURANT_TYPES[restaurantType] || RESTAURANT_TYPES.restaurant_classique;

  const includedModulesInCurrentTier = useMemo(() => {
    return new Set<string>([
      ...typeDef.coreModules,
      ...(typeDef.tierModules[currentPackId] || []),
    ]);
  }, [typeDef, currentPackId]);

  // Vérifier si un add-on est déjà inclus d'office ou activé par l'admin via entitlements
  const isAddonIncluded = (addon: AddonDefinition): boolean => {
    // 1. Inclus d'office selon le profil établissement et le pack actuel
    if (addon.moduleKey && includedModulesInCurrentTier.has(addon.moduleKey)) {
      return true;
    }
    // 2. Activé directement dans les entitlements du tenant (overrides admin de plateforme)
    if (addon.moduleKey && entitlements?.modules && entitlements.modules[addon.moduleKey] === true) {
      return true;
    }
    // 3. Fonctionnalité KDS ou autre activée dans entitlements.features
    if (addon.featureKey && entitlements?.features && entitlements.features[addon.featureKey]?.status === 'ACTIVÉ') {
      return true;
    }
    return false;
  };

  const isAddonSubscribed = (addon: AddonDefinition): boolean => {
    return Boolean(
      tenant?.subscribedAddons?.includes(addon.id) ||
      tenant?.subscribedAddons?.includes(addon.key)
    );
  };

  // Recalcul du devis certifié serveur/pricing dès modification du panier d'options
  useEffect(() => {
    try {
      const q = computeQuote({
        restaurantType,
        packId: selectedPack,
        billingCycle: selectedCycle,
        selectedAddonIds: selectedAddons,
      });
      setQuote(q);
    } catch (err) {
      console.warn('Erreur calcul devis abonnement:', err);
    }
  }, [selectedPack, selectedCycle, selectedAddons, restaurantType]);

  const packDef = CATALOG_PACKS[selectedPack] || CATALOG_PACKS.medium;

  // Calcul des jours restants
  const endsAtDate = tenant?.subscriptionEndsAt ? new Date(tenant.subscriptionEndsAt) : null;
  const daysRemaining = endsAtDate
    ? Math.max(0, Math.ceil((endsAtDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  // Quotas effectifs
  const effectiveLimits = entitlements?.effectiveLimits || {
    maxTerminals: currentPackDef.limits.maxTerminals,
    maxUsers: currentPackDef.limits.maxUsers,
    maxOrdersPerMonth: currentPackDef.limits.maxOrdersPerMonth,
  };

  const currentTerminalsCount = terminals?.length || 1;
  const currentUsersCount = employees?.length || 1;
  const currentOrdersCount = orders?.length || 0;

  const toggleAddon = (addon: AddonDefinition) => {
    if (isAddonIncluded(addon)) {
      showToast({
        type: 'info',
        title: 'Option Déjà Incluse',
        message: `"${addon.name}" est déjà incluse sans surcoût dans votre formule active RestoMaster ${currentPackDef.name}.`,
      });
      return;
    }

    setSelectedAddons((prev) =>
      prev.includes(addon.id) ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
    );
  };

  const handleApplyOrder = async () => {
    try {
      setIsSubmittingOrder(true);
      const res = await cloudFunctionsService.submitSubscriptionOrder({
        packId: selectedPack,
        billingCycle: selectedCycle,
        selectedAddons,
      });

      if (res?.orderId) {
        showToast({
          type: 'success',
          title: 'Commande Enregistrée !',
          message: `Référence ${res.paymentReference}. Procédez au règlement par virement ou Mobile Money pour validation.`,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Échec de la commande',
        message: err.message || 'Impossible d enregistrer la commande d abonnement.',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const includedCount = useMemo(() => {
    return CATALOG_ADDONS.filter(isAddonIncluded).length;
  }, [includedModulesInCurrentTier, entitlements]);

  const filteredAddons = CATALOG_ADDONS.filter((addon) => {
    if (activeCategory === 'included') return isAddonIncluded(addon);
    if (activeCategory === 'all') return true;
    return addon.category === activeCategory;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. CARTE RÉCAPITULATIF DE L'ABONNEMENT ACTIF */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Formule Active
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {tenant?.status === 'actif' ? 'En Service Certifié' : tenant?.status || 'Actif'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {includedCount} modules inclus actifs
                </span>
                {tenant?.billingCycle && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
                    Cycle {tenant.billingCycle}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                RestoMaster {currentPackDef.name}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                {currentPackDef.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Échéance
              </div>
              <div className="text-base font-bold text-white tabular-nums">
                {endsAtDate ? endsAtDate.toLocaleDateString('fr-FR') : 'Licence Active'}
              </div>
              {daysRemaining !== null && (
                <div className="text-[11px] font-medium text-amber-300">
                  {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Jauges de consommation des quotas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Postes / Caisses */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold">Caisses & Tablettes</span>
              <span className="font-bold text-white tabular-nums">
                {currentTerminalsCount} / {effectiveLimits.maxTerminals}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentTerminalsCount / effectiveLimits.maxTerminals) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-2">
              Plafond matériel synchronisé
            </div>
          </div>

          {/* Collaborateurs */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold">Collaborateurs</span>
              <span className="font-bold text-white tabular-nums">
                {currentUsersCount} / {effectiveLimits.maxUsers}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentUsersCount / effectiveLimits.maxUsers) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-2">
              Comptes avec code PIN sécurisé
            </div>
          </div>

          {/* Commandes du mois */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold">Ventes ce mois</span>
              <span className="font-bold text-white tabular-nums">
                {currentOrdersCount} / {effectiveLimits.maxOrdersPerMonth}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (currentOrdersCount / effectiveLimits.maxOrdersPerMonth) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-2">
              Remise à zéro automatique chaque 1er du mois
            </div>
          </div>
        </div>
      </div>

      {/* 2. SÉLECTION DES FORMULES & EXTENSIONS D'ABONNEMENT */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Évolution de Formule & Cycle de Facturation
            </h3>
            <p className="text-xs text-slate-400">
              Votre formule actuelle est mise en avant. Vous pouvez simuler un passage à une formule supérieure ou modifier votre cycle.
            </p>
          </div>

          {/* Sélecteur de cycle */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0">
            {(['mensuel', 'annuel', 'a_vie'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setSelectedCycle(cycle)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCycle === cycle
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cycle === 'mensuel' && 'Mensuel'}
                {cycle === 'annuel' && 'Annuel (2 mois offerts)'}
                {cycle === 'a_vie' && 'Licence À vie'}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Cartes de Packs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(CATALOG_PACKS) as PackId[]).map((pId) => {
            const pack = CATALOG_PACKS[pId];
            const isSelected = selectedPack === pId;
            const isCurrentPack = currentPackId === pId;

            return (
              <div
                key={pId}
                onClick={() => setSelectedPack(pId)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isCurrentPack
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/40'
                    : isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {pack.badge}
                    </span>
                    {isCurrentPack ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Formule Actuelle
                      </span>
                    ) : isSelected ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Simulation
                      </span>
                    ) : null}
                  </div>
                  <h4 className="text-lg font-bold text-white tracking-tight">{pack.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pack.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="text-xl font-black text-white tabular-nums">
                      {pack.priceMonthly.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-400">FCFA/mois</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/40 text-[11px] text-slate-400 space-y-1">
                  <div>✓ {pack.limits.maxTerminals} poste{pack.limits.maxTerminals > 1 ? 's' : ''} / caisse</div>
                  <div>✓ {pack.limits.maxUsers} collaborateurs</div>
                  <div>✓ {pack.limits.maxOrdersPerMonth.toLocaleString('fr-FR')} commandes/mois</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOUTIQUE D'OPTIONS À LA CARTE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Boutique des Modules & Options à la Carte
            </h3>
            <p className="text-xs text-slate-400">
              Les modules inclus dans votre formule actuelle apparaissent cochés en vert. Vous pouvez ajouter des options complémentaires.
            </p>
          </div>

          {/* Filtres par catégorie */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Toutes les options' },
              { id: 'included', label: `Incluses dans mon offre (${includedCount})` },
              { id: 'production', label: 'Production' },
              { id: 'service', label: 'Service' },
              { id: 'gestion', label: 'Gestion' },
              { id: 'hygiene', label: 'Hygiène' },
              { id: 'finance', label: 'Finance' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grille des addons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAddons.map((addon) => {
            const isIncluded = isAddonIncluded(addon);
            const isSubscribed = isAddonSubscribed(addon);
            const isSelectedInCart = selectedAddons.includes(addon.id) || selectedAddons.includes(addon.key);

            // Statut effectif de l'option
            const isActive = isIncluded || isSubscribed;

            return (
              <div
                key={addon.id}
                onClick={() => toggleAddon(addon)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isIncluded
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                    : isSubscribed
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : isSelectedInCart
                    ? 'bg-blue-950/20 border-blue-500/40'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {addon.category}
                    </span>
                    {isIncluded ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Inclus dans l'offre
                      </span>
                    ) : isSubscribed ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {addon.priceMonthly.toLocaleString('fr-FR')} FCFA/m (Souscrit)
                      </span>
                    ) : isSelectedInCart ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {addon.priceMonthly.toLocaleString('fr-FR')} FCFA/m
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {addon.priceMonthly.toLocaleString('fr-FR')} FCFA/m
                      </span>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {addon.name}
                    {isIncluded ? (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                        ACTIF
                      </span>
                    ) : isSubscribed ? (
                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">
                        OPTION
                      </span>
                    ) : isSelectedInCart ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400">
                        AJOUTÉ
                      </span>
                    ) : null}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {addon.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium ${
                      isIncluded
                        ? 'text-emerald-400 font-bold flex items-center gap-1'
                        : isSubscribed
                        ? 'text-amber-400 font-semibold'
                        : isSelectedInCart
                        ? 'text-blue-300 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {isIncluded
                      ? '✓ Inclus & Opérationnel'
                      : isSubscribed
                      ? '✓ Option souscrite active'
                      : isSelectedInCart
                      ? 'Option sélectionnée pour devis'
                      : 'Cliquer pour ajouter au panier'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isIncluded
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : isSubscribed
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : isSelectedInCart
                        ? 'bg-blue-500 border-blue-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {(isIncluded || isSubscribed || isSelectedInCart) && (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DEVIS SERVEUR CERTIFIÉ & VALIDATION DE LA COMMANDE */}
      {quote && (
        <div className="bg-linear-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              Devis Certifié Serveur
            </div>
            <div className="text-2xl md:text-3xl font-black text-white tabular-nums">
              {quote.finalPayableAmount.toLocaleString('fr-FR')} FCFA
              <span className="text-xs font-normal text-slate-400 ml-2">
                pour cycle {selectedCycle}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Comprend le pack {CATALOG_PACKS[selectedPack].name} et {selectedAddons.length} option{selectedAddons.length > 1 ? 's' : ''} à la carte.
              {quote.annualSavings && quote.annualSavings > 0 ? (
                <span className="text-emerald-400 font-bold ml-1">
                  (Économie de {quote.annualSavings.toLocaleString('fr-FR')} FCFA).
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleApplyOrder}
              disabled={isSubmittingOrder}
              className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {isSubmittingOrder ? 'Validation...' : 'Valider la Commande d’Abonnement'}
            </button>
          </div>
        </div>
      )}

      {/* 5. COORDONNÉES OFFICIELLES DE PAIEMENT & ASSISTANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile Money */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
            <Smartphone className="w-4 h-4" />
            Règlement Mobile Money (Cameroun)
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div>
              <strong className="text-white">Orange Money :</strong> #150*47*CODE_MARCHAND# ou <strong>+237 690 00 00 00</strong>
            </div>
            <div>
              <strong className="text-white">MTN MoMo :</strong> *126*4*CODE_MARCHAND# ou <strong>+237 670 12 34 56</strong>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Précisez toujours votre identifiant restaurant ou référence de commande lors de la transaction.
            </div>
          </div>
        </div>

        {/* Virement Bancaire */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
            <CreditCard className="w-4 h-4" />
            Virement Bancaire & Chèque
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div>
              <strong className="text-white">Banques partenaires :</strong> BICEC Cameroun / Afriland First Bank
            </div>
            <div>
              <strong className="text-white">Bénéficiaire :</strong> RestoMaster OS / SAS Cameroun Hospitality
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              Les validations administratives sont effectuées sous 24h ouvrées dès réception du relevé.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
