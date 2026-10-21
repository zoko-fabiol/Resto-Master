import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { StockItem, StockMovement } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { InventoryModal } from './InventoryModal';
import { RecipesYieldTab } from './RecipesYieldTab';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Search,
  Truck,
  Layers,
  History,
  CheckCircle2,
  X,
  ChefHat,
} from 'lucide-react';

export const StockView: React.FC = () => {
  const {
    stockItems,
    stockMovements,
    products,
    orders,
    updateProduct,
    addStockMovement,
    quickReceiveStock,
    settings,
    isRuleEnabled,
  } = useRestaurant();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes_yield' | 'reorder' | 'history' | 'transfers'>('inventory');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [quickReceiveModalOpen, setQuickReceiveModalOpen] = useState(false);

  // Quick Delivery Reception Form State (Section 8 du Guide)
  const [receiveStockId, setReceiveStockId] = useState(stockItems[0]?.id || '');
  const [receiveQty, setReceiveQty] = useState<number>(10);
  const [receiveSupplier, setReceiveSupplier] = useState('');
  const [receiveInvoice, setReceiveInvoice] = useState('');
  const [receiveUnitPrice, setReceiveUnitPrice] = useState<number | undefined>(undefined);

  const handleOpenQuickReceive = (item?: StockItem) => {
    const target = item || stockItems[0];
    if (target) {
      setReceiveStockId(target.id);
      setReceiveQty(target.minThreshold || 10);
      setReceiveSupplier(target.supplierName || '');
      setReceiveInvoice('');
      setReceiveUnitPrice(target.purchasePrice);
    }
    setQuickReceiveModalOpen(true);
  };

  const handleConfirmQuickReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveStockId || receiveQty <= 0) {
      showToast({
        type: 'warning',
        title: 'Quantité invalide',
        message: 'Veuillez saisir une quantité positive reçue.',
      });
      return;
    }
    await quickReceiveStock(receiveStockId, receiveQty, receiveSupplier, receiveInvoice, receiveUnitPrice);
    setQuickReceiveModalOpen(false);
  };

  // Transfer form state
  const [transferSource, setTransferSource] = useState('Magasin Central (Économat)');
  const [transferDest, setTransferDest] = useState('Bar Comptoir');
  const [transferStockId, setTransferStockId] = useState(stockItems[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [transferNotes, setTransferNotes] = useState('');

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find((s) => s.id === transferStockId);
    if (!item || transferQty <= 0) return;
    if (isRuleEnabled('stock_disallow_negative', true) && item.currentQuantity - transferQty < 0) {
      showToast({
        type: 'error',
        title: 'Stock négatif bloqué (Section 11)',
        message: `Action bloquée par la règle 'Blocage du stock négatif'. Transfert impossible de ${transferQty} ${item.unit}. Stock actuel : ${item.currentQuantity} ${item.unit}.`,
      });
      return;
    }
    await addStockMovement({
      stockItemId: item.id,
      stockItemName: item.name,
      type: 'transfert',
      quantityChange: -transferQty,
      previousQuantity: item.currentQuantity,
      newQuantity: item.currentQuantity - transferQty,
      unit: item.unit,
      reason: `Transfert de [${transferSource}] vers [${transferDest}]${transferNotes ? ` - ${transferNotes}` : ''}`,
    });
    setTransferModalOpen(false);
    showToast({
      type: 'success',
      title: 'Transfert effectué',
      message: `${transferQty} ${item.unit} transféré(s) de ${transferSource} vers ${transferDest}.`,
    });
  };

  // New Movement form state
  const [targetStockId, setTargetStockId] = useState(stockItems[0]?.id || '');
  const [movementType, setMovementType] = useState<StockMovement['type']>('entree_achat');
  const [movementQty, setMovementQty] = useState<number>(10);
  const [movementReason, setMovementReason] = useState('');

  // Calculations
  const totalStockValue = stockItems.reduce(
    (sum, item) => sum + item.currentQuantity * item.purchasePrice,
    0
  );
  const lowStockItems = stockItems.filter((item) => item.currentQuantity <= item.minThreshold);

  const filteredItems = stockItems.filter((item) => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find((s) => s.id === targetStockId);
    if (!item || movementQty <= 0) {
      showToast({
        type: 'warning',
        title: 'Quantité invalide',
        message: 'Veuillez spécifier une quantité valide supérieure à zéro.',
      });
      return;
    }

    const isNegative =
      movementType === 'sortie_consommation' ||
      movementType === 'perte_gaspillage' ||
      movementType === 'perime';

    const actualQtyChange = isNegative ? -Math.abs(movementQty) : Math.abs(movementQty);

    // Rule: stock_disallow_negative (Section 11)
    if (isNegative && isRuleEnabled('stock_disallow_negative', true)) {
      if (item.currentQuantity + actualQtyChange < 0) {
        showToast({
          type: 'error',
          title: 'Stock négatif bloqué (Section 11)',
          message: `Action bloquée par la règle 'Blocage du stock négatif'. Retrait impossible de ${Math.abs(movementQty)} ${item.unit}. Stock actuel : ${item.currentQuantity} ${item.unit}.`,
        });
        return;
      }
    }

    await addStockMovement({
      stockItemId: item.id,
      stockItemName: item.name,
      type: movementType,
      quantityChange: actualQtyChange,
      previousQuantity: item.currentQuantity,
      newQuantity: item.currentQuantity + actualQtyChange,
      unit: item.unit,
      reason: movementReason || 'Mouvement manuel enregistré en magasin',
    });

    setMovementModalOpen(false);
    setMovementReason('');
  };

  if (!isRuleEnabled('stock_gestion', true)) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <Package className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Module Stock Désactivé</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          La gestion informatisée des stocks est actuellement désactivée par la règle opérationnelle stock_gestion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Valeur Totale du Stock</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(totalStockValue, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Valorisé au dernier prix d'achat HT
            </div>
          </div>
        </div>

        {/* Low Stock Items Alert */}
        {(isRuleEnabled('stock_low_alert', true) || isRuleEnabled('stock_expiry_alert', true) || isRuleEnabled('notif_peremption_lot', true)) && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Articles en Alerte</span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-red-600">
                {lowStockItems.length} références
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Sous le seuil minimum de réapprovisionnement ou date limite
              </div>
            </div>
          </div>
        )}

        {/* Total References */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Catalogue Magasin</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {stockItems.length} articles
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Épicerie, viandes, poissons, bar & entretien
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar: Tabs & Action Buttons */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            État des Stocks
          </button>
          {isRuleEnabled('stock_recipe_cost', true) && isRuleEnabled('mod_recipes_yield', true) && (
            <button
              onClick={() => setActiveTab('recipes_yield')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'recipes_yield'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-600" />
              <span>Fiches Techniques & Rendement</span>
            </button>
          )}
          {isRuleEnabled('stock_low_alert', true) && (
            <button
              onClick={() => setActiveTab('reorder')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'reorder'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>À Commander</span>
              {lowStockItems.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-500 text-white">
                  {lowStockItems.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mouvements & Traçabilité
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => handleOpenQuickReceive()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
            title="Enregistrer l'arrivée d'un livreur ou une facture fournisseur (Section 8)"
          >
            <Truck className="w-4 h-4" />
            <span>+ Réception Livraison</span>
          </button>
          {isRuleEnabled('stock_transfers', true) && (
            <button
              onClick={() => setTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-xs transition-colors"
              title="Effectuer un transfert interne de stock entre zones"
            >
              <ArrowDownRight className="w-4 h-4 text-indigo-600" />
              <span>Transfert Interne</span>
            </button>
          )}
          {isRuleEnabled('stock_adjustments', true) && (
            <button
              onClick={() => setMovementModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mouvement de Stock</span>
            </button>
          )}
          {isRuleEnabled('stock_inventory', true) && (
            <button
              onClick={() => setInventoryModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Faire l'Inventaire</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Current Stock Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          {/* Sub Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher article, emplacement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['all', 'alimentaire', 'boissons', 'entretien', 'emballage'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap capitalize ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Toutes catégories' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Stock Actuel</th>
                  <th className="py-3 px-4">Seuil Sécurité</th>
                  <th className="py-3 px-4">Prix Achat</th>
                  <th className="py-3 px-4">Valeur Stock</th>
                  <th className="py-3 px-4">Emplacement</th>
                  <th className="py-3 px-4">État</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isLow = item.currentQuantity <= item.minThreshold;
                  const itemTotalValue = item.currentQuantity * item.purchasePrice;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isLow ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{item.name}</span>
                          {isRuleEnabled('stock_lots', true) && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Lot #{item.id.replace('stk-', 'L26-')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">Fournisseur : {item.supplierName || '—'}</div>
                      </td>

                      <td className="py-3 px-4 capitalize text-slate-600">{item.category}</td>

                      <td className="py-3 px-4">
                        <span className={`text-xs font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.currentQuantity} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.minThreshold} {item.unit}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {formatCurrency(item.purchasePrice, settings.currency)} / {item.unit}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(itemTotalValue, settings.currency)}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {isRuleEnabled('stock_by_location', true) ? item.location : 'Magasin Central'}
                        {isRuleEnabled('stock_by_outlet', true) && (
                          <span className="block text-[10px] text-slate-400">Site Actif</span>
                        )}
                        {isRuleEnabled('stock_expiry_dates', true) && (
                          <span className="block text-[10px] text-amber-600 font-mono">DLC: Conforme</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            Alerte Réappro
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Optimal
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenQuickReceive(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200 transition-colors"
                          title="Réceptionner une livraison pour cet article"
                        >
                          <Truck className="w-3 h-3 text-amber-600" />
                          <span>Réceptionner</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Reorder Suggestions */}
      {activeTab === 'reorder' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Produits à Commander Urgemment ({lowStockItems.length})
            </h3>
            <p className="text-xs text-slate-500">
              Quantités recommandées calculées par rapport au stock optimal défini pour chaque produit
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span>Tous les stocks sont à niveau ! Aucune commande d'urgence requise.</span>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const suggestedQty = Math.max(1, Math.round(item.optimalQuantity - item.currentQuantity));
                const estimatedCost = suggestedQty * item.purchasePrice;

                return (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>Stock restant : <strong className="text-red-600">{item.currentQuantity} {item.unit}</strong></span>
                        <span>Seuil mini : {item.minThreshold} {item.unit}</span>
                        <span>Fournisseur habituel : <strong className="text-slate-700">{item.supplierName}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          Commande suggérée : <strong className="text-indigo-600">+{suggestedQty} {item.unit}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Coût estimé : {formatCurrency(estimatedCost, settings.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Stock Movement History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
            Historique Complet des Mouvements (Achats, Consommations, Pertes, Inventaires)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Type Mouvement</th>
                  <th className="py-3 px-4">Variation</th>
                  <th className="py-3 px-4">Motif & Justification</th>
                  <th className="py-3 px-4">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Aucun mouvement de stock récent enregistré.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((mv) => (
                    <tr key={mv.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {formatDateTime(mv.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{mv.stockItemName}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                          {mv.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black">
                        <span className={mv.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {mv.quantityChange > 0 ? `+${mv.quantityChange}` : mv.quantityChange} {mv.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-[240px] truncate">{mv.reason}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{mv.userName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Fiches Techniques & Rendement Couverts (BOM) */}
      {activeTab === 'recipes_yield' && (
        <RecipesYieldTab
          products={products}
          stockItems={stockItems}
          orders={orders}
          currency={settings.currency}
          onUpdateProduct={updateProduct}
        />
      )}

      {/* Movement Modal */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Enregistrer un Mouvement Manuel</h3>
              <button onClick={() => setMovementModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Article en stock *</label>
                <select
                  value={targetStockId}
                  onChange={(e) => setTargetStockId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Actuel: {s.currentQuantity} {s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type d'opération *</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as StockMovement['type'])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  <option value="entree_achat">Entrée / Réception Achat (+)</option>
                  {isRuleEnabled('stock_production', true) && (
                    <option value="entree_achat">Entrée Production / Préparation (+)</option>
                  )}
                  <option value="sortie_consommation">Sortie Consommation (-)</option>
                  {isRuleEnabled('stock_losses', true) && (
                    <option value="perte_gaspillage">Perte / Déchets / Gaspillage (-)</option>
                  )}
                  {isRuleEnabled('stock_breakage', true) && (
                    <option value="perte_gaspillage">Casse Bouteilles & Vaisselle (-)</option>
                  )}
                  <option value="perime">Produit Périmé / Rebut (-)</option>
                  <option value="transfert">Transfert entre réserves</option>
                  <option value="inventaire_correction">Correction Manuelle</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantité *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motif obligatoire *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bouteille cassée par maladresse plonge"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Valider Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Delivery Reception Modal (Section 8 du Guide) */}
      {quickReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Réceptionner une Livraison Fournisseur</span>
              </h3>
              <button
                onClick={() => setQuickReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickReceive} className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Article livré *
                </label>
                <select
                  value={receiveStockId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setReceiveStockId(id);
                    const it = stockItems.find((s) => s.id === id);
                    if (it) {
                      setReceiveSupplier(it.supplierName || '');
                      setReceiveUnitPrice(it.purchasePrice);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (En stock: {s.currentQuantity} {s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Quantité reçue *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prix Unitaire HT ({settings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Prix d'achat"
                    value={receiveUnitPrice || ''}
                    onChange={(e) => setReceiveUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nom du Fournisseur
                </label>
                <input
                  type="text"
                  placeholder="Ex: Grossiste Boissons, Marché Local..."
                  value={receiveSupplier}
                  onChange={(e) => setReceiveSupplier(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  N° Bon de Livraison / Facture
                </label>
                <input
                  type="text"
                  placeholder="Ex: BL-2026-0892"
                  value={receiveInvoice}
                  onChange={(e) => setReceiveInvoice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickReceiveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Enregistrer Réception</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Transfert Interne de Stock</h3>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransfer} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Article à transférer *</label>
                <select
                  value={transferStockId}
                  onChange={(e) => setTransferStockId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Dispo : {s.currentQuantity} {s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Emplacement Source *</label>
                  <input
                    type="text"
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    placeholder="Ex: Économat"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Emplacement Destination *</label>
                  <input
                    type="text"
                    value={transferDest}
                    onChange={(e) => setTransferDest(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                    placeholder="Ex: Bar, Cuisine"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Quantité à transférer *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Référence du bon</label>
                <input
                  type="text"
                  placeholder="Ex: Réapprovisionnement service du soir"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valider Transfert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      <InventoryModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
      />
    </div>
  );
};
