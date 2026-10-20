import React, { useState, useMemo } from 'react';
import { Product, StockItem, Order } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { EditRecipeFormulaModal } from './EditRecipeFormulaModal';
import {
  ChefHat,
  Wine,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Search,
  Edit3,
  Layers,
  ChevronDown,
  ChevronUp,
  Plus,
  Percent,
  X,
} from 'lucide-react';

export interface LimitingIngredient {
  name: string;
  currentStock: number;
  required: number;
  unit: string;
  coversSustained: number;
}

export interface AnalyzedRecipe {
  product: Product;
  hasRecipe: boolean;
  portionYield: number;
  ingredientsDetails: {
    stockItemId: string;
    stockItemName: string;
    quantityRequired: number;
    unit: string;
    costPerUnit?: number;
    currentStock: number;
    unitPrice: number;
    lineCost: number;
    coversSustained: number;
  }[];
  costPerPortion: number;
  margin: number;
  foodCostPct: number;
  theoreticalRemaining: number | null;
  limitingIng: LimitingIngredient | null;
  coversToday: number;
  status: 'optimal' | 'tension' | 'rupture' | 'no_recipe';
}

interface RecipesYieldTabProps {
  products: Product[];
  stockItems: StockItem[];
  orders: Order[];
  currency: string;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
}

export const RecipesYieldTab: React.FC<RecipesYieldTabProps> = ({
  products,
  stockItems,
  orders,
  currency,
  onUpdateProduct,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cuisine' | 'bar' | 'rupture' | 'tension'>('all');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [selectedProductToEdit, setSelectedProductToEdit] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFormulaModalOpen, setNewFormulaModalOpen] = useState(false);
  const [selectedProductForNewFormula, setSelectedProductForNewFormula] = useState<string>('');

  // 1. Couverts réalisés aujourd'hui (depuis les commandes actives du jour)
  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const todayOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'annulee' && isToday(o.createdAt));
  }, [orders]);

  const coversMadeTodayByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of todayOrders) {
      if (order.items) {
        for (const item of order.items) {
          const pId = item.productId || item.id;
          map[pId] = (map[pId] || 0) + (item.quantity || 1);
        }
      }
    }
    return map;
  }, [todayOrders]);

  // 2. Calcul détaillé des fiches techniques, rendements et facteurs limitants
  const analyzedRecipes: AnalyzedRecipe[] = useMemo(() => {
    return products.map((product) => {
      const ingredients = product.ingredients || [];
      const hasRecipe = ingredients.length > 0;
      const portionYield = product.portionYield || 1;

      let totalBatchCost = 0;
      let minPortions = hasRecipe ? 999999 : 0;
      let limitingIng: LimitingIngredient | null = null;

      const ingredientsDetails = ingredients.map((ing) => {
        const stock = stockItems.find(
          (s) => s.id === ing.stockItemId || s.name.toLowerCase() === ing.stockItemName.toLowerCase()
        );
        const currentStock = stock ? stock.currentQuantity : 0;
        const unitPrice = stock ? stock.purchasePrice : ing.costPerUnit || 0;
        const lineCost = ing.quantityRequired * unitPrice;
        totalBatchCost += lineCost;

        const coversSustained = ing.quantityRequired > 0
          ? Math.floor(currentStock / ing.quantityRequired) * portionYield
          : 999999;

        if (coversSustained < minPortions) {
          minPortions = coversSustained;
          limitingIng = {
            name: ing.stockItemName,
            currentStock,
            required: ing.quantityRequired,
            unit: ing.unit,
            coversSustained,
          };
        }

        return {
          ...ing,
          currentStock,
          unitPrice,
          lineCost,
          coversSustained,
        };
      });

      const costPerPortion = hasRecipe && portionYield > 0
        ? totalBatchCost / portionYield
        : product.costPrice || 0;

      const margin = (product.price || 0) - costPerPortion;
      const foodCostPct = product.price > 0 ? (costPerPortion / product.price) * 100 : 0;
      const theoreticalRemaining = hasRecipe ? minPortions : null;
      const coversToday = coversMadeTodayByProduct[product.id] || 0;

      let status: 'optimal' | 'tension' | 'rupture' | 'no_recipe' = 'optimal';
      if (!hasRecipe) {
        status = 'no_recipe';
      } else if (theoreticalRemaining === 0) {
        status = 'rupture';
      } else if (theoreticalRemaining !== null && theoreticalRemaining <= 5) {
        status = 'tension';
      }

      return {
        product,
        hasRecipe,
        portionYield,
        ingredientsDetails,
        costPerPortion,
        margin,
        foodCostPct,
        theoreticalRemaining,
        limitingIng,
        coversToday,
        status,
      };
    });
  }, [products, stockItems, coversMadeTodayByProduct]);

  // Statistiques globales
  const totalCoversToday = useMemo(() => {
    return Object.values(coversMadeTodayByProduct).reduce((sum, n) => sum + n, 0);
  }, [coversMadeTodayByProduct]);

  const activeRecipesCount = analyzedRecipes.filter((r) => r.hasRecipe).length;
  const ruptureCount = analyzedRecipes.filter((r) => r.status === 'rupture').length;
  const tensionCount = analyzedRecipes.filter((r) => r.status === 'tension').length;

  // Filtrage
  const filteredRecipes = useMemo(() => {
    return analyzedRecipes.filter(({ product, hasRecipe, status, ingredientsDetails }) => {
      // Type filter
      if (filterType === 'cuisine' && product.destination !== 'cuisine') return false;
      if (filterType === 'bar' && product.destination !== 'bar') return false;
      if (filterType === 'rupture' && status !== 'rupture') return false;
      if (filterType === 'tension' && status !== 'tension') return false;

      // Text search
      if (!search) return true;
      const q = search.toLowerCase();
      const matchName = product.name.toLowerCase().includes(q);
      const matchCat = (product.categoryName || '').toLowerCase().includes(q);
      const matchIng = ingredientsDetails.some((i) => i.stockItemName.toLowerCase().includes(q));
      return matchName || matchCat || matchIng;
    });
  }, [analyzedRecipes, filterType, search]);

  const handleOpenEdit = (product: Product) => {
    setSelectedProductToEdit(product);
    setIsEditModalOpen(true);
  };

  const productsWithoutRecipe = useMemo(() => {
    return products.filter((p) => !p.ingredients || p.ingredients.length === 0);
  }, [products]);

  const handleCreateNewFormula = () => {
    const prod = products.find((p) => p.id === selectedProductForNewFormula) || productsWithoutRecipe[0];
    if (prod) {
      setSelectedProductToEdit(prod);
      setIsEditModalOpen(true);
      setNewFormulaModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Couverts Réalisés Aujourd'hui */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-md">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-xs font-black uppercase tracking-wider">Couverts Réalisés Aujourd'hui</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black">{totalCoversToday}</div>
            <div className="text-xs text-amber-100 mt-0.5">
              Plats & boissons servis ce jour (temps réel POS)
            </div>
          </div>
        </div>

        {/* Metric 2: Fiches Techniques Actives */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Fiches Techniques BOM</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {activeRecipesCount} / {products.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Recettes connectées aux sorties de stock
            </div>
          </div>
        </div>

        {/* Metric 3: Alertes Rupture */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ruptures Immédiates</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">{ruptureCount} recettes</div>
            <div className="text-xs text-slate-500 mt-0.5">
              0 couvert réalisable avec les stocks actuels
            </div>
          </div>
        </div>

        {/* Metric 4: En Tension */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">En Tension Critique</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-600">{tensionCount} recettes</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Moins de 5 couverts restants en réserve
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher recette, cocktail, ingrédient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes ({analyzedRecipes.length})
          </button>
          <button
            onClick={() => setFilterType('cuisine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterType === 'cuisine'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Cuisine</span>
          </button>
          <button
            onClick={() => setFilterType('bar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterType === 'bar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Bar & Boissons</span>
          </button>
          <button
            onClick={() => setFilterType('rupture')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterType === 'rupture'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span>Ruptures</span>
            {ruptureCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900">
                {ruptureCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterType('tension')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              filterType === 'tension'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>En Tension</span>
            {tensionCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900">
                {tensionCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Button: Add New Formula */}
        {productsWithoutRecipe.length > 0 && (
          <button
            onClick={() => setNewFormulaModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Assigner Fiche Technique</span>
          </button>
        )}
      </div>

      {/* Main Recipes Yield Grid / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            Aucune fiche technique ne correspond aux critères sélectionnés.
          </div>
        ) : (
          filteredRecipes.map((item) => {
            const {
              product,
              hasRecipe,
              portionYield,
              ingredientsDetails,
              costPerPortion,
              margin,
              foodCostPct,
              theoreticalRemaining,
              limitingIng,
              coversToday,
              status,
            } = item;

            const isExpanded = expandedRecipeId === product.id;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  status === 'rupture'
                    ? 'border-rose-200 bg-rose-50/20'
                    : status === 'tension'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Product Info & Destination Tag */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            product.destination === 'bar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {product.destination === 'bar' ? 'Bar & Boisson' : 'Cuisine'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {product.categoryName}
                        </span>
                        {product.portionYield && product.portionYield > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Batch {product.portionYield} portions
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        {product.name}
                      </h3>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>
                          Prix Vente :{' '}
                          <strong className="text-slate-900">
                            {formatCurrency(product.price, currency)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Coût Portion :{' '}
                          <strong className="text-slate-900">
                            {formatCurrency(costPerPortion, currency)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Marge :{' '}
                          <strong className="text-emerald-600">
                            {formatCurrency(margin, currency)}
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Ratio Food Cost :{' '}
                          <strong
                            className={
                              foodCostPct > 40
                                ? 'text-rose-600'
                                : foodCostPct > 30
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {foodCostPct.toFixed(1)}%
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Real-time Covers Indicators & Actions */}
                  <div className="flex items-center gap-3 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {/* Couverts servis ce jour */}
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Couverts Aujourd'hui
                      </span>
                      <div className="inline-flex items-center gap-1.5 mt-0.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="text-base font-black text-slate-900">
                          {coversToday}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">servis ce service</span>
                    </div>

                    {/* Couverts théoriques restants */}
                    <div className="text-center sm:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Rendement Restant
                      </span>
                      <div className="mt-0.5">
                        {theoreticalRemaining === null ? (
                          <span className="text-xs font-bold text-slate-400">
                            Non configuré
                          </span>
                        ) : theoreticalRemaining === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-xs shadow-xs animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            0 couvert (Rupture)
                          </span>
                        ) : theoreticalRemaining <= 5 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-xs shadow-xs">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {theoreticalRemaining} couverts (Tension)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {theoreticalRemaining} couverts
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        selon stocks réels
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                        title="Modifier les ingrédients et le grammage de la recette"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Modifier Fiche</span>
                      </button>

                      {hasRecipe && (
                        <button
                          onClick={() =>
                            setExpandedRecipeId(isExpanded ? null : product.id)
                          }
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Détail des ingrédients"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Limiting Ingredient Alert Strip */}
                {limitingIng && (status === 'rupture' || status === 'tension') && (
                  <div
                    className={`px-4 sm:px-5 py-2 text-xs flex items-center justify-between border-t ${
                      status === 'rupture'
                        ? 'bg-rose-100/70 border-rose-200 text-rose-900 font-bold'
                        : 'bg-amber-100/70 border-amber-200 text-amber-900 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Facteur Bloquant : <strong>{limitingIng.name}</strong> — Stock actuel :{' '}
                        {limitingIng.currentStock} {limitingIng.unit} (Besoin unitaire :{' '}
                        {limitingIng.required} {limitingIng.unit})
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/60">
                      Plafond : {limitingIng.coversSustained} portion(s)
                    </span>
                  </div>
                )}

                {/* Expanded Ingredients Details Table */}
                {isExpanded && hasRecipe && (
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>Détail de la Formule & Autonomie par Ingrédient</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Rendement par préparation : {portionYield} portion(s)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                            <th className="py-2.5 px-3">Ingrédient</th>
                            <th className="py-2.5 px-3 text-center">Quantité Formule</th>
                            <th className="py-2.5 px-3 text-center">Stock Disponible</th>
                            <th className="py-2.5 px-3 text-right">Prix Achat HT</th>
                            <th className="py-2.5 px-3 text-right">Coût Ligne</th>
                            <th className="py-2.5 px-3 text-center">Autonomie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ingredientsDetails.map((ing) => {
                            const isLimiting = limitingIng ? limitingIng.name === ing.stockItemName : false;
                            return (
                              <tr
                                key={ing.stockItemId}
                                className={`hover:bg-slate-50/50 ${
                                  isLimiting ? 'bg-amber-50/40 font-semibold' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">
                                      {ing.stockItemName}
                                    </span>
                                    {isLimiting && (
                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                                        Limiteur
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono">
                                  {ing.quantityRequired} {ing.unit}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`font-bold ${
                                      ing.currentStock <= 0
                                        ? 'text-rose-600'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    {ing.currentStock} {ing.unit}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-right text-slate-600">
                                  {formatCurrency(ing.unitPrice, currency)} / {ing.unit}
                                </td>

                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  {formatCurrency(ing.lineCost, currency)}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                      ing.coversSustained === 0
                                        ? 'bg-rose-100 text-rose-800'
                                        : ing.coversSustained <= 5
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-50 text-emerald-800'
                                    }`}
                                  >
                                    {ing.coversSustained} couverts
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Edit Recipe Formula */}
      <EditRecipeFormulaModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProductToEdit(null);
        }}
        product={selectedProductToEdit}
        stockItems={stockItems}
        currency={currency}
        onSave={onUpdateProduct}
      />

      {/* Modal: Assign New Formula to Product */}
      {newFormulaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                Choisir un produit sans fiche technique
              </h3>
              <button
                onClick={() => setNewFormulaModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Produit / Cocktail au menu *
                </label>
                <select
                  value={selectedProductForNewFormula || productsWithoutRecipe[0]?.id || ''}
                  onChange={(e) => setSelectedProductForNewFormula(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  {productsWithoutRecipe.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.destination === 'bar' ? 'Bar' : 'Cuisine'}] {p.name} ({p.categoryName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewFormulaModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewFormula}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Ouvrir l'éditeur de recette
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
