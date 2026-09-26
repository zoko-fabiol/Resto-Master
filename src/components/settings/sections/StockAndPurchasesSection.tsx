import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Package, Truck, Save, CheckCircle2 } from 'lucide-react';

interface Props {
  subTab: 'stock' | 'achats';
}

export const StockAndPurchasesSection: React.FC<Props> = ({ subTab }) => {
  const { addAuditLog } = useRestaurant();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [stockOptions, setStockOptions] = useState<Record<string, boolean>>({
    stock_gestion: true,
    stock_by_outlet: true,
    stock_by_location: true,
    stock_lots: true,
    stock_expiry_dates: true,
    stock_fifo: false,
    stock_fefo: true,
    stock_inventory: true,
    stock_disallow_negative: true,
    stock_low_alert: true,
    stock_expiry_alert: true,
    stock_transfers: true,
    stock_losses: true,
    stock_breakage: true,
    stock_adjustments: true,
    stock_production: true,
    stock_recipe_cost: true,
  });

  const [achatsOptions, setAchatsOptions] = useState<Record<string, boolean>>({
    achats_purchase_requests: true,
    achats_validation: true,
    achats_purchase_orders: true,
    achats_reception: true,
    achats_supplier_invoices: true,
    achats_supplier_returns: true,
    achats_supplier_comparison: true,
    achats_price_history: true,
    achats_approval: true,
  });

  const toggleOption = (key: string, isStock: boolean) => {
    if (isStock) {
      setStockOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    } else {
      setAchatsOptions((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSave = () => {
    setSavedSuccess(true);
    addAuditLog('Mise à jour options', 'Paramètres', `Paramètres ${subTab.toUpperCase()} enregistrés`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

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
        { key: 'stock_gestion', label: 'Gestion stock globale' },
        { key: 'stock_by_outlet', label: 'Stock par établissement' },
        { key: 'stock_by_location', label: 'Stock par emplacement (Cave, Chambre froide, Économat)' },
        { key: 'stock_lots', label: 'Suivi rigoureux par numéros de Lots' },
        { key: 'stock_expiry_dates', label: 'Dates d’expiration (DLC)' },
        { key: 'stock_fifo', label: 'Méthode FIFO (First In, First Out)' },
        { key: 'stock_fefo', label: 'Méthode FEFO (First Expired, First Out - Recommandé Restauration)' },
        { key: 'stock_inventory', label: 'Inventaires physiques tournants' },
        { key: 'stock_disallow_negative', label: 'Blocage du stock négatif' },
        { key: 'stock_low_alert', label: 'Alertes stock faible' },
        { key: 'stock_expiry_alert', label: 'Alertes expiration imminente (7 jours)' },
        { key: 'stock_transfers', label: 'Transferts inter-magasins / succursales' },
        { key: 'stock_losses', label: 'Gestion des pertes & avaries' },
        { key: 'stock_breakage', label: 'Gestion de la casse' },
        { key: 'stock_adjustments', label: 'Ajustements manuels de stock' },
        { key: 'stock_production', label: 'Ordres de fabrication / Production cuisine' },
        { key: 'stock_recipe_cost', label: 'Fiches techniques & Coût matière unitaire' },
      ]
    : [
        { key: 'achats_purchase_requests', label: 'Demandes d’achat (DA)' },
        { key: 'achats_validation', label: 'Validation achat hiérarchique' },
        { key: 'achats_purchase_orders', label: 'Bons de commande officiels (BC)' },
        { key: 'achats_reception', label: 'Bons de réception physique (BR)' },
        { key: 'achats_supplier_invoices', label: 'Enregistrement factures fournisseurs' },
        { key: 'achats_supplier_returns', label: 'Bons de retours fournisseurs' },
        { key: 'achats_supplier_comparison', label: 'Comparaison des prix fournisseurs' },
        { key: 'achats_price_history', label: 'Historique d’évolution des prix' },
        { key: 'achats_approval', label: 'Seuil d’approbation obligatoire (Manager / Direction)' },
      ];

  const currentOptions = isStock ? stockOptions : achatsOptions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" /> Enregistré
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {items.map((item) => {
          const checked = currentOptions[item.key] ?? false;

          return (
            <label
              key={item.key}
              onClick={() => toggleOption(item.key, isStock)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? 'border-amber-400/80 bg-amber-50/30'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {}}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
              />
              <span className={`font-semibold ${checked ? 'text-slate-950 font-bold' : 'text-slate-700'}`}>
                {item.label}
              </span>
            </label>
          );
        })}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          {items.filter((i) => currentOptions[i.key]).length} sur {items.length} options activées
        </span>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer les paramètres</span>
        </button>
      </div>
    </div>
  );
};
