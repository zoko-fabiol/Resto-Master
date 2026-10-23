import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  FileText,
  Sliders,
  DollarSign,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  CATALOG_PACKS,
  CATALOG_ADDONS,
  PackId,
  BillingCycle,
  AddonDefinition,
} from '../../../../shared/catalog/packs';
import { computeQuote, QuoteResult } from '../../../../shared/catalog/pricing';
import { cloudFunctionsService } from '../../../services/functions/cloudFunctionsService';

export const RestaurantSubscriptionSection: React.FC = () => {
  const { tenant, entitlements, updateSettings, settings, terminals, employees, orders } = useRestaurant();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isRenewing, setIsRenewing] = useState<boolean>(false);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annuel');
  const [selectedPack, setSelectedPack] = useState<PackId>((tenant?.packId as PackId) || 'medium');
  const [selectedAddons, setSelectedAddons] = useState<string[]>(tenant?.subscribedAddons || []);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccessRef, setOrderSuccessRef] = useState<string | null>(null);

  // Synchroniser les addons initiaux
  useEffect(() => {
    if (tenant?.subscribedAddons) {
      setSelectedAddons(tenant.subscribedAddons);
    }
    if (tenant?.packId && (tenant.packId === 'minimum' || tenant.packId === 'medium' || tenant.packId === 'premium')) {
      setSelectedPack(tenant.packId);
    }
  }, [tenant?.subscribedAddons, tenant?.packId]);

  // Recalcul du devis certifié serveur/pricing dès modification du panier d'options
  useEffect(() => {
    try {
      const q = computeQuote({
        restaurantType: (tenant?.restaurantType as any) || 'restaurant_classique',
        packId: selectedPack,
        billingCycle: selectedCycle,
        selectedAddonIds: selectedAddons,
      });
      setQuote(q);
    } catch (err) {
      console.warn('Erreur calcul devis abonnement:', err);
    }
  }, [selectedPack, selectedCycle, selectedAddons, tenant?.restaurantType]);

  const packDef = CATALOG_PACKS[selectedPack] || CATALOG_PACKS.medium;
  const currentPackDef = CATALOG_PACKS[(tenant?.packId as PackId) || 'medium'] || CATALOG_PACKS.medium;

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

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
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
        setOrderSuccessRef(res.paymentReference || 'RM-ORDRE');
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

  const filteredAddons = CATALOG_ADDONS.filter((addon) => {
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
              Modifiez votre pack de base ou optez pour une formule supérieure pour augmenter vos quotas.
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

            return (
              <div
                key={pId}
                onClick={() => setSelectedPack(pId)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {pack.badge}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
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
              Personnalisez votre système en activant les modules spécifiques à votre activité.
            </p>
          </div>

          {/* Filtres par catégorie */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'Toutes' },
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
            const isSubscribed = selectedAddons.includes(addon.id);

            return (
              <div
                key={addon.id}
                onClick={() => toggleAddon(addon.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSubscribed
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {addon.category}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isSubscribed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {addon.priceMonthly.toLocaleString('fr-FR')} FCFA/m
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {addon.name}
                    {isSubscribed && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {addon.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isSubscribed ? 'Option activée' : 'Cliquer pour ajouter'}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isSubscribed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSubscribed && <CheckCircle2 className="w-3.5 h-3.5" />}
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
