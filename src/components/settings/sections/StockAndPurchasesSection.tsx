import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import {
  Package,
  Truck,
  Save,
  CheckCircle2,
  Building,
  MapPin,
  Layers,
  Calendar,
  ArrowRightLeft,
  Clock,
  Calculator,
  ShieldAlert,
  AlertTriangle,
  BellRing,
  Trash2,
  Flame,
  Sliders,
  UtensilsCrossed,
  Coins,
  FileText,
  CheckCheck,
  FileCheck,
  PackageCheck,
  Receipt,
  CornerUpLeft,
  BarChart3,
  History,
  Shield,
  Search,
} from 'lucide-react';
import { ModernRuleToggle } from './ModernRuleToggle';
import { StickyActionBar, SearchInput } from '../../ui';

interface Props {
  subTab: 'stock' | 'achats';
}

export const StockAndPurchasesSection: React.FC<Props> = ({ subTab }) => {
  const { operationRules, updateOperationRules, addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [options, setOptions] = useState<Record<string, boolean>>(operationRules);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setOptions(operationRules);
  }, [operationRules]);

  const toggleOption = (key: string) => {
    setOptions((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      // Exclusivité mutuelle FIFO / FEFO (Invariants métier restauration)
      if (key === 'stock_fifo' && nextVal) {
        next.stock_fefo = false;
      } else if (key === 'stock_fefo' && nextVal) {
        next.stock_fifo = false;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateOperationRules(options);
      setSavedSuccess(true);
      addAuditLog('Mise à jour options', 'Paramètres', `Paramètres ${subTab.toUpperCase()} enregistrés`);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Calcul du nombre d'options modifiées non enregistrées
  const dirtyCount = Object.keys(options).filter(
    (k) => (options[k] ?? false) !== (operationRules[k] ?? false)
  ).length;

  const isStock = subTab === 'stock';
  const Icon = isStock ? Package : Truck;
  const title = isStock
    ? 'Configuration Stocks, Lots & Fiches Techniques'
    : 'Configuration Achats & Gestion Fournisseurs';
  const description = isStock
    ? 'Traçabilité des denrées périssables, méthodes FEFO, alertes et inventaires (Section 11)'
    : 'Cycle d’approvisionnement, bons de commande et contrôles légaux (Section 12)';

  const items = isStock
    ? [
        {
          key: 'stock_gestion',
          label: 'Gestion stock globale',
          description: 'Suivi centralisé des stocks et valorisation PMP/HT',
          icon: Package,
        },
        {
          key: 'stock_by_outlet',
          label: 'Stock par établissement',
          description: 'Découpage du stock par restaurant ou succursale',
          icon: Building,
        },
        {
          key: 'stock_by_location',
          label: 'Stock par emplacement',
          description: 'Gestion Cave, Chambre Froide, Économat et Réserves',
          icon: MapPin,
        },
        {
          key: 'stock_lots',
          label: 'Suivi rigoureux par numéros de Lots',
          description: 'Traçabilité unitaire par numéro de lot d’arrivage',
          icon: Layers,
        },
        {
          key: 'stock_expiry_dates',
          label: 'Dates d’expiration (DLC)',
          description: 'Gestion rigoureuse des dates limites de consommation',
          icon: Calendar,
        },
        {
          key: 'stock_fifo',
          label: 'Méthode FIFO (First In, First Out)',
          description: 'Sortie des articles selon la date de réception physique',
          icon: ArrowRightLeft,
        },
        {
          key: 'stock_fefo',
          label: 'Méthode FEFO (Recommandé Restauration)',
          description: 'Sortie prioritaire des denrées aux DLC les plus courtes',
          icon: Clock,
          badge: 'FEFO Actif',
        },
        {
          key: 'stock_inventory',
          label: 'Inventaires physiques tournants',
          description: 'Comptages physiques périodiques et fiches d’écart',
          icon: Calculator,
        },
        {
          key: 'stock_disallow_negative',
          label: 'Blocage du stock négatif',
          description: 'Interdiction stricte de déstocker en dessous de zéro',
          icon: ShieldAlert,
          badge: 'Bloquant',
        },
        {
          key: 'stock_low_alert',
          label: 'Alertes stock faible',
          description: 'Notification dès franchissement du seuil minimum',
          icon: AlertTriangle,
        },
        {
          key: 'stock_expiry_alert',
          label: 'Alertes expiration imminente (7 jours)',
          description: 'Alerte visuelle pour denrées périssables sous 7 jours',
          icon: BellRing,
        },
        {
          key: 'stock_transfers',
          label: 'Transferts inter-magasins / succursales',
          description: 'Bons de transfert entre magasins et points de vente',
          icon: Truck,
        },
        {
          key: 'stock_losses',
          label: 'Gestion des pertes & avaries',
          description: 'Enregistrement des denrées avariées ou perdues',
          icon: Trash2,
        },
        {
          key: 'stock_breakage',
          label: 'Gestion de la casse',
          description: 'Déclaration des bouteilles cassées et casse vaisselle',
          icon: Flame,
        },
        {
          key: 'stock_adjustments',
          label: 'Ajustements manuels de stock',
          description: 'Corrections exceptionnelles d’inventaire avec motif',
          icon: Sliders,
        },
        {
          key: 'stock_production',
          label: 'Ordres de fabrication / Production cuisine',
          description: 'Ordres de préparation cuisine et transformation matière',
          icon: UtensilsCrossed,
        },
        {
          key: 'stock_recipe_cost',
          label: 'Fiches techniques & Coût matière',
          description: 'Calcul du ratio coût matière sur fiches techniques',
          icon: Coins,
        },
      ]
    : [
        {
          key: 'achats_purchase_requests',
          label: 'Demandes d’achat (DA)',
          description: 'Expression préalable des besoins par les chefs de poste',
          icon: FileText,
        },
        {
          key: 'achats_validation',
          label: 'Validation achat hiérarchique',
          description: 'Circuit d’approbation avant engagement de dépenses',
          icon: CheckCheck,
        },
        {
          key: 'achats_purchase_orders',
          label: 'Bons de commande officiels (BC)',
          description: 'Édition de bons de commande officiels fournisseurs',
          icon: FileCheck,
        },
        {
          key: 'achats_reception',
          label: 'Bons de réception physique (BR)',
          description: 'Contrôle quantitatif et qualitatif à la livraison',
          icon: PackageCheck,
        },
        {
          key: 'achats_supplier_invoices',
          label: 'Enregistrement factures fournisseurs',
          description: 'Rapprochement des factures d’achat et bons de livraison',
          icon: Receipt,
        },
        {
          key: 'achats_supplier_returns',
          label: 'Bons de retours fournisseurs',
          description: 'Gestion des litiges et retours de marchandises',
          icon: CornerUpLeft,
        },
        {
          key: 'achats_supplier_comparison',
          label: 'Comparaison des prix fournisseurs',
          description: 'Analyse comparée des tarifs et mercuriale fournisseurs',
          icon: BarChart3,
        },
        {
          key: 'achats_price_history',
          label: 'Historique d’évolution des prix',
          description: 'Suivi chronologique des variations tarifaires d’achat',
          icon: History,
        },
        {
          key: 'achats_approval',
          label: 'Seuil d’approbation obligatoire (Manager)',
          description: 'Validation Direction obligatoire au-delà de 100 000 FCFA',
          icon: Shield,
          badge: '> 100k FCFA',
        },
      ];

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900">{title}</h3>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {isStock ? 'Section 11' : 'Section 12'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une règle..."
              />
            </div>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-xs animate-in fade-in shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paramètres enregistrés
              </span>
            )}
          </div>
        </div>

        {/* Modern Rule Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const isChildStockOption = isStock && item.key !== 'stock_gestion';
            const isMasterStockDisabled = isChildStockOption && !options.stock_gestion;
            const isSensitive = item.key === 'stock_disallow_negative';

            return (
              <ModernRuleToggle
                key={item.key}
                id={item.key}
                label={item.label}
                description={item.description}
                badge={item.badge}
                icon={item.icon}
                checked={options[item.key] ?? false}
                onChange={() => toggleOption(item.key)}
                disabled={isMasterStockDisabled}
                disabledReason="Nécessite d'abord l'activation de la Gestion stock globale"
                isSensitive={isSensitive}
                sensitiveWarning="Le blocage du stock négatif interdira strictement la validation d'une commande si un ingrédient ou produit passe sous zéro."
              />
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {items.filter((i) => options[i.key]).length} sur {items.length} options actives
          </span>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
          </button>
        </div>
      </div>

      {/* Barre d'action collante lors de modifications non enregistrées */}
      <StickyActionBar
        dirtyCount={dirtyCount}
        onSave={handleSave}
        onCancel={() => setOptions(operationRules)}
        isSaving={isSaving}
        saveLabel="Enregistrer les paramètres"
      />
    </>
  );
};
