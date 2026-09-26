import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Product, OrderItem } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Utensils,
  Send,
  CreditCard,
  User,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PosViewProps {
  initialTableId?: string;
  onOpenPayment: (orderId: string) => void;
}

export const PosView: React.FC<PosViewProps> = ({ initialTableId, onOpenPayment }) => {
  const {
    products,
    categories,
    tables,
    customers,
    createOrder,
    settings,
    orders,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>(initialTableId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderType, setOrderType] = useState<'sur_place' | 'a_emporter' | 'livraison'>('sur_place');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProforma, setIsProforma] = useState(false);
  const [companyBillingName, setCompanyBillingName] = useState('');
  const [companyBillingNiu, setCompanyBillingNiu] = useState('');

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchQuery =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          destination: product.destination,
          status: 'en_attente',
          folio: 1, // Folio 1 par défaut (Prise en charge entreprise / principal)
        },
      ];
    });
  };

  const toggleItemFolio = (itemId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, folio: (item.folio || 1) === 1 ? 2 : 1 }
          : item
      )
    );
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountAmount = Math.round((rawSubtotal * discountPercent) / 100);
  const subtotalAfterDiscount = rawSubtotal - discountAmount;
  const taxAmount = Math.round((subtotalAfterDiscount * settings.taxRate) / 100);
  const grandTotal = subtotalAfterDiscount + taxAmount;

  // Selected table object
  const currentTable = tables.find((t) => t.id === selectedTableId);
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Submit order to Kitchen / Bar
  const handleSendOrder = async (payDirectly = false) => {
    if (cart.length === 0) {
      alert('Veuillez ajouter au moins un produit à la commande.');
      return;
    }

    if (orderType === 'sur_place' && !selectedTableId) {
      alert('Veuillez sélectionner une table pour une commande sur place.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrder = await createOrder({
        type: orderType,
        tableId: orderType === 'sur_place' ? selectedTableId : undefined,
        tableName: orderType === 'sur_place' && currentTable ? currentTable.number : undefined,
        customerId: selectedCustomerId || undefined,
        customerName: currentCustomer ? currentCustomer.name : undefined,
        items: cart,
        subtotal: subtotalAfterDiscount,
        tax: taxAmount,
        discount: discountAmount,
        total: grandTotal,
        notes: orderNotes,
        isProforma,
        companyBillingName: companyBillingName || undefined,
        companyBillingNiu: companyBillingNiu || undefined,
      });

      // trigger confetti animation
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      // Clear cart
      setCart([]);
      setOrderNotes('');
      setDiscountPercent(0);

      if (payDirectly) {
        onOpenPayment(createdOrder.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left 7-8 Columns: Menu & Products */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Top Control Bar: Search & Order Type */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un plat, boisson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* Order Type Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-center">
            <button
              onClick={() => setOrderType('sur_place')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'sur_place'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sur place
            </button>
            <button
              onClick={() => setOrderType('a_emporter')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'a_emporter'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              À emporter
            </button>
            <button
              onClick={() => setOrderType('livraison')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'livraison'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Livraison
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="w-full min-w-0 overflow-x-auto pb-1 custom-scrollbar">
          <div className="flex items-center gap-1.5 w-max">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tous les articles
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id);

            return (
              <div
                key={product.id}
                onClick={() => product.available && addToCart(product)}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                  product.available
                    ? 'border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
                    : 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                } ${inCart ? 'ring-2 ring-amber-500 border-amber-500' : ''}`}
              >
                {/* Product Image */}
                <div className="h-28 bg-slate-100 relative overflow-hidden">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs">
                    {product.destination === 'cuisine' ? 'Cuisine' : 'Bar'}
                  </span>
                  {inCart && (
                    <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {inCart.quantity}
                    </span>
                  )}
                  {!product.available && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                      Épuisé
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{product.description}</p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      {formatCurrency(product.price, settings.currency)}
                    </span>
                    <button
                      disabled={!product.available}
                      className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 4-5 Columns: POS Order Cart & Checkout */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full sticky top-20">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                Commande en cours
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {cart.reduce((s, i) => s + i.quantity, 0)} articles
              </span>
            </div>

            {/* Table & Customer Assignment Selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Table Selector */}
              {orderType === 'sur_place' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Table</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="">Sélectionner table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.number} ({t.zone}) - {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Selector */}
              <div className={`space-y-1 ${orderType !== 'sur_place' ? 'col-span-2' : ''}`}>
                <label className="text-[10px] font-bold uppercase text-slate-400">Client / Compte</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                >
                  <option value="">Client de passage (Anonyme)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.loyaltyPoints} pts)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cart Items Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[360px] divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Votre panier est vide.<br />Cliquez sur les articles pour les ajouter.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="pt-2.5 first:pt-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.productName}</div>
                      <div className="text-[10px] text-slate-400">
                        {formatCurrency(item.unitPrice, settings.currency)} / unité
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Qty Stepper */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-slate-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total line */}
                      <span className="text-xs font-black text-slate-900 min-w-[65px] text-right">
                        {formatCurrency(item.unitPrice * item.quantity, settings.currency)}
                      </span>

                      {/* Delete */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Item Specific Note & Folio Selector */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Instructions (cuisson, sauce...)"
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="flex-1 px-2 py-1 text-[11px] rounded-lg bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => toggleItemFolio(item.id)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all shrink-0 ${
                        (item.folio || 1) === 1
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                      title="Changer de Folio (Folio 1: Société, Folio 2: Extra personnel)"
                    >
                      {(item.folio || 1) === 1 ? 'Folio 1 (Société)' : 'Folio 2 (Extra)'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer & Financial Summary */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl space-y-3">
            {/* Cameroon Special Options: Proforma & Company Billing */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isProforma}
                    onChange={(e) => setIsProforma(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Facture Proforma (Devis)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Raison Sociale Société (Optionnel)"
                  value={companyBillingName}
                  onChange={(e) => setCompanyBillingName(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded-lg bg-white border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="NIU Entreprise (Ex: M01...)"
                  value={companyBillingNiu}
                  onChange={(e) => setCompanyBillingNiu(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded-lg bg-white border border-slate-200 font-mono"
                />
              </div>
            </div>

            {/* General Order Notes */}
            <input
              type="text"
              placeholder="Note générale de la commande..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200"
            />

            {/* Price Calculations */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Sous-total HT</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(rawSubtotal, settings.currency)}
                </span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-500" />
                  Remise
                </span>
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPercent(pct)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        discountPercent === pct
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {pct === 0 ? '0%' : `-${pct}%`}
                    </button>
                  ))}
                  {discountPercent > 0 && (
                    <span className="text-rose-600 font-bold ml-1">
                      -{formatCurrency(discountAmount, settings.currency)}
                    </span>
                  )}
                </div>
              </div>

              {settings.taxRate > 0 && (
                <>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>TVA Cameroun (17,50%)</span>
                    <span>{formatCurrency(Math.round((subtotalAfterDiscount * 17.5) / 100), settings.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>CAC (10% de TVA = 1,75%)</span>
                    <span>{formatCurrency(taxAmount - Math.round((subtotalAfterDiscount * 17.5) / 100), settings.currency)}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                <span>Total TTC ({settings.taxRate}%)</span>
                <span className="text-amber-700">
                  {formatCurrency(grandTotal, settings.currency)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={isSubmitting || cart.length === 0}
                onClick={() => handleSendOrder(false)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Envoyer Cuisine</span>
              </button>

              <button
                disabled={isSubmitting || cart.length === 0}
                onClick={() => handleSendOrder(true)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Encaisser Direct</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
