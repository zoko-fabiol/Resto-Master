import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Product, RecipeIngredient } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { cloudinaryService } from '../../services/media/cloudinaryService';
import {
  MenuSquare,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Utensils,
  DollarSign,
  X,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const MenuView: React.FC = () => {
  const { products, categories, stockItems, createProduct, toggleProductAvailability, settings, activeRestaurant } = useRestaurant();
  const { showToast } = useToast();

  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [price, setPrice] = useState<number>(5000);
  const [costPrice, setCostPrice] = useState<number>(2000);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [destination, setDestination] = useState<'cuisine' | 'bar'>('cuisine');
  const [image, setImage] = useState('');
  const [imagePublicId, setImagePublicId] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Ingredient adding
  const [selectedStockId, setSelectedStockId] = useState(stockItems[0]?.id || '');
  const [ingredientQty, setIngredientQty] = useState<number>(1);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
    const matchQuery =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQuery;
  });

  const handleAddIngredient = () => {
    const stockItem = stockItems.find((s) => s.id === selectedStockId);
    if (!stockItem) return;
    if (ingredients.some((i) => i.stockItemId === stockItem.id)) {
      showToast({
        type: 'warning',
        title: 'Ingrédient déjà présent',
        message: 'Cet ingrédient figure déjà dans la fiche technique de cette recette.',
      });
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        stockItemId: stockItem.id,
        stockItemName: stockItem.name,
        quantityRequired: ingredientQty,
        unit: stockItem.unit,
      },
    ]);
  };

  const handleRemoveIngredient = (stockId: string) => {
    setIngredients((prev) => prev.filter((i) => i.stockItemId !== stockId));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      showToast({
        type: 'warning',
        title: 'Formulaire incomplet',
        message: 'Veuillez renseigner un nom et un prix de vente valide supérieur à zéro.',
      });
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);

    await createProduct({
      name,
      description,
      categoryId,
      categoryName: cat ? cat.name : 'Général',
      price,
      costPrice,
      preparationTimeMinutes: prepTime,
      available: true,
      destination,
      image: image || undefined,
      imageUrl: image || undefined,
      imagePublicId: imagePublicId || undefined,
      ingredients,
      taxApplicable: true,
    });

    setModalOpen(false);
    // Reset
    setName('');
    setDescription('');
    setPrice(5000);
    setCostPrice(2000);
    setImage('');
    setImagePublicId('');
    setIngredients([]);
    showToast('Plat enregistré avec succès avec sa photo Cloudinary !', 'success');
  };

  const handleFileUploadToCloudinary = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP)', 'warning');
      return;
    }

    setIsUploadingImage(true);
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 200);

    try {
      const asset = await cloudinaryService.upload(file, {
        organizationId: activeRestaurant?.organizationId || '',
        restaurantId: activeRestaurant?.id || '',
        category: 'food',
        entityType: 'product',
        confidentialityLevel: 'public',
        tags: ['menu', 'plat', 'restomaster'],
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setImage(asset.secureUrl);
      setImagePublicId(asset.cloudinaryPublicId);
      showToast('Photo hébergée sur Cloudinary avec succès !', 'success');
    } catch (err: any) {
      clearInterval(progressTimer);
      showToast(err.message || 'Erreur lors du téléversement Cloudinary', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 min-w-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un plat ou ingrédient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un Plat / Produit</span>
          </button>
        </div>

        {/* Scrollable Category Segmented Bar */}
        <div className="w-full min-w-0 overflow-x-auto custom-scrollbar pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 pb-1 w-max">
            <button
              onClick={() => setSelectedCat('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                selectedCat === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedCat === c.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid with Recipe Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const margin = p.price - p.costPrice;
          const marginPercent = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-36 bg-slate-100 relative overflow-hidden">
                  <img
                    src={p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                      {p.destination === 'cuisine' ? 'Cuisine' : 'Bar'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-950 backdrop-blur-xs">
                      {p.categoryName}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleProductAvailability(p.id)}
                    className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md transition-all ${
                      p.available
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {p.available ? 'En Vente' : 'Épuisé'}
                  </button>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">{p.name}</h3>
                    <div className="text-sm font-black text-amber-800 shrink-0">
                      {formatCurrency(p.price, settings.currency)}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>

                  {/* Profitability & Prep Time */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {p.preparationTimeMinutes} min
                    </span>
                    <span>
                      Coût revient : <strong>{formatCurrency(p.costPrice, settings.currency)}</strong>
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Marge {marginPercent}%
                    </span>
                  </div>

                  {/* Linked Recipe Ingredients */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" />
                      Fiche technique / Déduction stock :
                    </div>
                    {p.ingredients && p.ingredients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            {ing.stockItemName} : <strong>{ing.quantityRequired} {ing.unit}</strong>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">
                        Aucun ingrédient brut lié (vente directe)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">ID: {p.id}</span>
                <button
                  onClick={() => toggleProductAvailability(p.id)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  {p.available ? 'Rendre Indisponible' : 'Remettre en Vente'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MenuSquare className="w-4 h-4 text-amber-600" />
                Créer un Nouveau Plat ou Cocktail
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom du plat ou boisson *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pavé de Saumon Braisé"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingrédients clés, garniture, cuisson..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catégorie</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Poste de préparation</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value as 'cuisine' | 'bar')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="cuisine">Cuisine (KDS Plats)</option>
                    <option value="bar">Bar (KDS Boissons)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prix de vente TTC *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Coût estimé (Matières)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Temps prép. (min)</label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Photo du Plat avec Upload Cloudinary Réel */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Photo du Plat (Cloudinary CDN)
                </label>

                {image ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-900 group">
                    <img
                      src={image}
                      alt="Aperçu plat"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Photo Cloudinary Active</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImage('');
                        setImagePublicId('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 hover:bg-rose-600 text-white transition-colors"
                      title="Supprimer la photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="p-2 bg-slate-900/90 text-[11px] text-slate-300 flex items-center justify-between">
                      <span className="truncate max-w-[280px] font-mono text-[10px]">{image}</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-amber-400 font-bold hover:underline shrink-0"
                      >
                        Remplacer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUploadToCloudinary(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50/60'
                        : 'border-slate-300 hover:border-amber-500 bg-slate-50/80 hover:bg-white'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUploadToCloudinary(file);
                      }}
                    />

                    {isUploadingImage ? (
                      <div className="py-3 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                        <span className="text-xs font-bold text-slate-800">
                          Téléversement vers Cloudinary en cours... ({uploadProgress}%)
                        </span>
                        <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 flex flex-col items-center justify-center">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 mb-2">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          Cliquez ou glissez une photo du plat ici
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          JPG, PNG ou WebP hébergé automatiquement sur Cloudinary
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recipe / Ingredients composition */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">
                  Fiche Technique / Ingrédients à déduire automatiquement des stocks :
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    {stockItems.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Qté"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(parseFloat(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    Ajouter
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="space-y-1 pt-2">
                    {ingredients.map((ing) => (
                      <div
                        key={ing.stockItemId}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <span>
                          {ing.stockItemName} : <strong>{ing.quantityRequired} {ing.unit}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.stockItemId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Enregistrer Produit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
