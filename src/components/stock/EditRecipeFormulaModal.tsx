import React, { useState, useEffect } from 'react';
import { Product, RecipeIngredient, StockItem } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Plus,
  Trash2,
  ChefHat,
  Wine,
  Save,
  Layers,
  Scale,
  Percent,
} from 'lucide-react';

interface EditRecipeFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  stockItems: StockItem[];
  currency: string;
  onSave: (productId: string, updates: Partial<Product>) => Promise<void>;
}

export const EditRecipeFormulaModal: React.FC<EditRecipeFormulaModalProps> = ({
  isOpen,
  onClose,
  product,
  stockItems,
  currency,
  onSave,
}) => {
  const { showToast } = useToast();

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [portionYield, setPortionYield] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Form for adding new ingredient
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [addQty, setAddQty] = useState<number>(0.1);

  useEffect(() => {
    if (product) {
      setIngredients(product.ingredients || []);
      setPortionYield(product.portionYield || 1);
      setSellingPrice(product.price || 0);
      if (stockItems.length > 0 && !selectedStockId) {
        setSelectedStockId(stockItems[0].id);
      }
    }
  }, [product, stockItems]);

  if (!isOpen || !product) return null;

  const handleAddIngredient = () => {
    if (!selectedStockId || addQty <= 0) {
      showToast({
        type: 'warning',
        title: 'Ingrédient invalide',
        message: 'Sélectionnez un article et une quantité supérieure à zéro.',
      });
      return;
    }

    const stockItem = stockItems.find((s) => s.id === selectedStockId);
    if (!stockItem) return;

    // Check if already in recipe
    if (ingredients.some((i) => i.stockItemId === stockItem.id)) {
      showToast({
        type: 'warning',
        title: 'Déjà présent',
        message: 'Cet ingrédient est déjà dans la formule. Ajustez son grammage directement.',
      });
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
        quantityRequired: addQty,
        unit: stockItem.unit,
        costPerUnit: stockItem.purchasePrice,
      },
    ]);

    setAddQty(0.1);
  };

  const handleUpdateQty = (stockItemId: string, newQty: number) => {
    if (newQty <= 0) return;
    setIngredients((prev) =>
      prev.map((ing) => (ing.stockItemId === stockItemId ? { ...ing, quantityRequired: newQty } : ing))
    );
  };

  const handleRemoveIngredient = (stockItemId: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.stockItemId !== stockItemId));
  };

  // Calculations
  const totalBatchCost = ingredients.reduce((sum, ing) => {
    const stock = stockItems.find((s) => s.id === ing.stockItemId);
    const unitPrice = stock ? stock.purchasePrice : ing.costPerUnit || 0;
    return sum + ing.quantityRequired * unitPrice;
  }, 0);

  const costPerPortion = portionYield > 0 ? totalBatchCost / portionYield : totalBatchCost;
  const marginPerPortion = sellingPrice - costPerPortion;
  const foodCostPct = sellingPrice > 0 ? (costPerPortion / sellingPrice) * 100 : 0;

  // Theoretical remaining portions based on stock
  const ingredientCoverLimits = ingredients.map((ing) => {
    const stock = stockItems.find((s) => s.id === ing.stockItemId);
    const availableQty = stock ? stock.currentQuantity : 0;
    const portions = ing.quantityRequired > 0
      ? Math.floor(availableQty / ing.quantityRequired) * portionYield
      : 999999;
    return {
      name: ing.stockItemName,
      unit: ing.unit,
      availableQty,
      requiredQty: ing.quantityRequired,
      portions,
    };
  });

  const theoreticalRemaining = ingredientCoverLimits.length > 0
    ? Math.min(...ingredientCoverLimits.map((l) => l.portions))
    : 0;

  const limitingIng = ingredientCoverLimits.length > 0
    ? ingredientCoverLimits.reduce((prev, curr) => (curr.portions < prev.portions ? curr : prev))
    : null;

  const handleSaveFormula = async () => {
    setIsSaving(true);
    try {
      await onSave(product.id, {
        ingredients,
        portionYield: Math.max(1, portionYield),
        costPrice: Math.round(costPerPortion),
      });

      showToast({
        type: 'success',
        title: 'Fiche Technique mise à jour',
        message: `La recette pour "${product.name}" a été actualisée (${ingredients.length} ingrédients, coût portion: ${formatCurrency(costPerPortion, currency)}).`,
      });
      onClose();
    } catch {
      showToast({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible de synchroniser la fiche technique.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStockItemObj = stockItems.find((s) => s.id === selectedStockId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                product.destination === 'bar'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {product.destination === 'bar' ? (
                <Wine className="w-6 h-6" />
              ) : (
                <ChefHat className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    product.destination === 'bar'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {product.destination === 'bar' ? 'Bar & Boissons' : 'Cuisine & Plats'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {product.categoryName}
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-0.5">
                Fiche Technique : {product.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key KPI Indicators Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Coût Portion (Food Cost)
              </span>
              <div className="text-lg font-black text-slate-900 mt-1">
                {formatCurrency(costPerPortion, currency)}
              </div>
              <span className="text-[10px] text-slate-400">
                sur {formatCurrency(sellingPrice, currency)} PV
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Marge Brute / Portion
              </span>
              <div className="text-lg font-black text-emerald-600 mt-1">
                {formatCurrency(marginPerPortion, currency)}
              </div>
              <span className="text-[10px] text-slate-400">
                Gain net par commande
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Ratio Food Cost
                </span>
                <Percent className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div
                className={`text-lg font-black mt-1 ${
                  foodCostPct > 40
                    ? 'text-rose-600'
                    : foodCostPct > 30
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {foodCostPct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400">
                {foodCostPct <= 30 ? 'Rentabilité optimale' : 'Vérifier grammages'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                theoreticalRemaining === 0
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : theoreticalRemaining <= 5
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                Couverts Restants Possibles
              </span>
              <div className="text-lg font-black mt-1">
                {ingredients.length === 0 ? '—' : `${theoreticalRemaining} couverts`}
              </div>
              <span className="text-[10px] truncate block opacity-75">
                {limitingIng && theoreticalRemaining < 999999
                  ? `Limité par ${limitingIng.name}`
                  : 'Stocks adéquats'}
              </span>
            </div>
          </div>

          {/* Portion Yield Batch Configuration */}
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Rendement de la Préparation / Recette
                </div>
                <div className="text-[11px] text-slate-500">
                  Nombre de couverts / verres servis avec cette formule complète
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Portions :</label>
              <input
                type="number"
                min="1"
                step="1"
                value={portionYield}
                onChange={(e) => setPortionYield(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1.5 text-xs font-black text-center rounded-xl border border-indigo-200 bg-white shadow-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Composition de la Recette ({ingredients.length} ingrédients)</span>
              </h3>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                Aucun ingrédient associé à cette fiche technique. Ajoutez le premier ingrédient ci-dessous.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3">Ingrédient Magasin</th>
                      <th className="py-2.5 px-3 text-center">Quantité / Recette</th>
                      <th className="py-2.5 px-3 text-center">Stock Actuel</th>
                      <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                      <th className="py-2.5 px-3 text-right">Coût Matière</th>
                      <th className="py-2.5 px-3 text-center">Couverts Max</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ingredients.map((ing) => {
                      const stock = stockItems.find((s) => s.id === ing.stockItemId);
                      const unitPrice = stock ? stock.purchasePrice : ing.costPerUnit || 0;
                      const lineCost = ing.quantityRequired * unitPrice;
                      const currentStock = stock ? stock.currentQuantity : 0;
                      const maxCovers = ing.quantityRequired > 0
                        ? Math.floor(currentStock / ing.quantityRequired) * portionYield
                        : 0;
                      const isLimiting = limitingIng?.name === ing.stockItemName;

                      return (
                        <tr
                          key={ing.stockItemId}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isLimiting ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{ing.stockItemName}</span>
                              {isLimiting && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                                  Facteur Limitant
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Réf : {ing.stockItemId}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0.001"
                                value={ing.quantityRequired}
                                onChange={(e) =>
                                  handleUpdateQty(ing.stockItemId, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-200 bg-white"
                              />
                              <span className="text-[11px] font-medium text-slate-500">
                                {ing.unit}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-bold ${
                                currentStock <= 0 ? 'text-rose-600' : 'text-slate-700'
                              }`}
                            >
                              {currentStock} {ing.unit}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatCurrency(unitPrice, currency)} / {ing.unit}
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {formatCurrency(lineCost, currency)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-full ${
                                maxCovers === 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : maxCovers <= 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {maxCovers}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(ing.stockItemId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Retirer cet ingrédient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Ingredient Subform */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              + Ajouter un ingrédient ou spiritueux à la formule
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Article en stock (Magasin / Cave)
                </label>
                <select
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                >
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.currentQuantity} {s.unit} dispo — {formatCurrency(s.purchasePrice, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Quantité ({selectedStockItemObj?.unit || 'unité'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={addQty}
                  onChange={(e) => setAddQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="text-xs text-slate-500">
            Coût unitaire révisé :{' '}
            <strong className="text-slate-900">
              {formatCurrency(costPerPortion, currency)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveFormula}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la Fiche Technique'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
