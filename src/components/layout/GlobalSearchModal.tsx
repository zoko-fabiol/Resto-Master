import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatCurrency } from '../../lib/utils';
import {
  Search,
  X,
  ShoppingBag,
  Utensils,
  Package,
  Users,
  Truck,
  FileText,
  DollarSign,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigateTo: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  navigateTo,
}) => {
  const [query, setQuery] = useState('');
  const { orders, tables, products, stockItems, customers, suppliers, documents, expenses, settings } = useRestaurant();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle search
        onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search results grouping
  const matchedOrders = q
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.tableName && o.tableName.toLowerCase().includes(q))
      )
    : [];

  const matchedTables = q
    ? tables.filter(
        (t) =>
          t.number.toLowerCase().includes(q) ||
          t.zone.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q)
      )
    : [];

  const matchedProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : [];

  const matchedStocks = q
    ? stockItems.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      )
    : [];

  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      )
    : [];

  const matchedSuppliers = q
    ? suppliers.filter(
        (s) =>
          s.company.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.productsSupplied.some((p) => p.toLowerCase().includes(q))
      )
    : [];

  const matchedDocs = q
    ? documents.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.supplierName && d.supplierName.toLowerCase().includes(q))
      )
    : [];

  const hasAnyResults =
    matchedOrders.length > 0 ||
    matchedTables.length > 0 ||
    matchedProducts.length > 0 ||
    matchedStocks.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedSuppliers.length > 0 ||
    matchedDocs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
          <Search className="w-5 h-5 text-amber-600 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher une commande, client, table, produit, stock, fournisseur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-slate-200 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!q && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tapez un mot-clé pour lancer la recherche transversale dans toute la base.
            </div>
          )}

          {q && !hasAnyResults && (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucun résultat trouvé pour "{query}".
            </div>
          )}

          {/* Orders */}
          {matchedOrders.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" /> Commandes ({matchedOrders.length})
              </div>
              <div className="space-y-1">
                {matchedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      navigateTo('pos');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-amber-50/70 cursor-pointer border border-transparent hover:border-amber-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {o.orderNumber} — {o.tableName || 'À emporter'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {o.items.length} articles • Serveur : {o.serverName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(o.total, settings.currency)}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {matchedProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-indigo-500" /> Menu & Plats ({matchedProducts.length})
              </div>
              <div className="space-y-1">
                {matchedProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      navigateTo('menu');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.categoryName}</div>
                    </div>
                    <div className="text-xs font-bold text-indigo-700">
                      {formatCurrency(p.price, settings.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Items */}
          {matchedStocks.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-500" /> Matières & Stocks ({matchedStocks.length})
              </div>
              <div className="space-y-1">
                {matchedStocks.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      navigateTo('stock');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{s.name}</div>
                      <div className="text-[11px] text-slate-500">Emplacement : {s.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {s.currentQuantity} {s.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">Seuil min : {s.minThreshold} {s.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" /> Clients ({matchedCustomers.length})
              </div>
              <div className="space-y-1">
                {matchedCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      navigateTo('clients');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.phone}</div>
                    </div>
                    <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {c.loyaltyPoints} pts fidélité
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers */}
          {matchedSuppliers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-orange-500" /> Fournisseurs ({matchedSuppliers.length})
              </div>
              <div className="space-y-1">
                {matchedSuppliers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      navigateTo('purchases');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{s.company}</div>
                      <div className="text-[11px] text-slate-500">Contact : {s.name} ({s.phone})</div>
                    </div>
                    <div className="text-right text-[11px] text-slate-600">
                      Solde dû : <span className="font-bold text-red-600">{formatCurrency(s.currentBalanceDue, settings.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {matchedDocs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-500" /> Documents & Factures ({matchedDocs.length})
              </div>
              <div className="space-y-1">
                {matchedDocs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => {
                      navigateTo('documents');
                      onClose();
                    }}
                    className="p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{d.title}</div>
                      <div className="text-[11px] text-slate-500">Catégorie : {d.category}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">{d.fileSize}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
