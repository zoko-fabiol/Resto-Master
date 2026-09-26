import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { StockItem, StockMovement } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { InventoryModal } from './InventoryModal';
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
} from 'lucide-react';

export const StockView: React.FC = () => {
  const { stockItems, stockMovements, addStockMovement, settings } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'reorder' | 'transfers'>('inventory');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Transfer form state
  const [transferSource, setTransferSource] = useState('Magasin Central (Économat)');
  const [transferDest, setTransferDest] = useState('Bar Comptoir');
  const [transferStockId, setTransferStockId] = useState(stockItems[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(5);
  const [transferNotes, setTransferNotes] = useState('');

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
      alert('Veuillez spécifier une quantité valide.');
      return;
    }

    const isNegative =
      movementType === 'sortie_consommation' ||
      movementType === 'perte_gaspillage' ||
      movementType === 'perime';

    const actualQtyChange = isNegative ? -Math.abs(movementQty) : Math.abs(movementQty);

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
              Sous le seuil minimum de réapprovisionnement
            </div>
          </div>
        </div>

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
            onClick={() => setMovementModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Mouvement de Stock</span>
          </button>
          <button
            onClick={() => setInventoryModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Calculator className="w-4 h-4 text-amber-400" />
            <span>Faire l'Inventaire</span>
          </button>
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
                        <div className="font-bold text-slate-900">{item.name}</div>
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

                      <td className="py-3 px-4 text-slate-600">{item.location}</td>

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
                  <option value="sortie_consommation">Sortie Consommation (-)</option>
                  <option value="perte_gaspillage">Perte / Casse / Gaspillage (-)</option>
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

      {/* Inventory Modal */}
      <InventoryModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
      />
    </div>
  );
};
