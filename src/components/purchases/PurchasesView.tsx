import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Supplier, PurchaseOrder, PurchaseOrderItem } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  PackageCheck,
  Building,
  Phone,
  Mail,
  Receipt,
  Clock,
  X,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PurchasesView: React.FC = () => {
  const {
    suppliers,
    purchaseOrders,
    stockItems,
    createPurchaseOrder,
    receivePurchaseOrder,
    createSupplier,
    settings,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = useState('');

  // New PO form
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [expectedDate, setExpectedDate] = useState('');

  // Item selector inside PO modal
  const [targetStockId, setTargetStockId] = useState(stockItems[0]?.id || '');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemPrice, setItemPrice] = useState<number>(1000);

  // New Supplier form
  const [supCompany, setSupCompany] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supProducts, setSupProducts] = useState('');

  const handleAddItemToPo = () => {
    const stock = stockItems.find((s) => s.id === targetStockId);
    if (!stock) return;

    if (poItems.some((i) => i.stockItemId === stock.id)) {
      alert('Cet article est déjà dans la commande.');
      return;
    }

    setPoItems((prev) => [
      ...prev,
      {
        stockItemId: stock.id,
        stockItemName: stock.name,
        quantity: itemQty,
        unitPrice: itemPrice,
        total: itemQty * itemPrice,
        unit: stock.unit,
      },
    ]);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Veuillez ajouter au moins une ligne d’article.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    const totalAmount = poItems.reduce((s, i) => s + i.total, 0);

    await createPurchaseOrder({
      supplierId: selectedSupplierId,
      supplierName: supplier ? supplier.company : 'Fournisseur',
      date: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: expectedDate || undefined,
      items: poItems,
      totalAmount,
      status: 'envoyee',
    });

    setPoModalOpen(false);
    setPoItems([]);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPoId) return;

    await receivePurchaseOrder(receivingPoId, invoiceNumberInput);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    setReceivingPoId(null);
    setInvoiceNumberInput('');
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCompany || !supPhone) {
      alert('Veuillez renseigner le nom de la société et le téléphone.');
      return;
    }

    await createSupplier({
      company: supCompany,
      name: supName,
      phone: supPhone,
      email: supEmail,
      address: supAddress,
      productsSupplied: supProducts ? supProducts.split(',').map((p) => p.trim()) : [],
    });

    setSupplierModalOpen(false);
    setSupCompany('');
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupProducts('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bons de Commande ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'suppliers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Répertoire Fournisseurs ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSupplierModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Fournisseur</span>
          </button>
          <button
            onClick={() => setPoModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
          >
            <Truck className="w-4 h-4" />
            <span>Créer Bon de Commande</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">N° Bon</th>
                  <th className="py-3 px-4">Fournisseur</th>
                  <th className="py-3 px-4">Date Émission</th>
                  <th className="py-3 px-4">Articles & Volumes</th>
                  <th className="py-3 px-4">Montant Total</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => {
                  const isReceived = po.status === 'recue';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {po.orderNumber}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{po.supplierName}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">{po.date}</td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          {po.items.map((i) => `${i.quantity} ${i.unit} ${i.stockItemName}`).join(', ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatCurrency(po.totalAmount, settings.currency)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isReceived ? 'Marchandise Reçue' : 'En Attente Livraison'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isReceived ? (
                          <button
                            onClick={() => setReceivingPoId(po.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Réceptionner</span>
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 font-mono">
                            <Receipt className="w-3 h-3 text-slate-400" />
                            <span>{po.invoiceNumber || 'Facture liée'}</span>
                          </div>
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

      {/* Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{sup.company}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">Contact : {sup.name}</div>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Produits fournis :</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sup.productsSupplied.map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Achats cumulés :</span>
                  <div className="font-bold text-slate-800">
                    {formatCurrency(sup.totalPurchases, settings.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px]">Solde dû :</span>
                  <div
                    className={`font-black ${
                      sup.currentBalanceDue > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(sup.currentBalanceDue, settings.currency)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receive Order Confirm Modal */}
      {receivingPoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                Valider Réception Marchandises
              </h3>
              <button onClick={() => setReceivingPoId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              La validation de cette livraison incrémentera instantanément les stocks réels et enregistrera la facture dans les dettes fournisseurs.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Numéro de facture du bon de livraison / fournisseur :
              </label>
              <input
                type="text"
                placeholder="Ex: FAC-2026-9812"
                value={invoiceNumberInput}
                onChange={(e) => setInvoiceNumberInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceivingPoId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                Confirmer la Réception
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {poModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">Émettre un Bon de Commande Fournisseur</h3>
              <button onClick={() => setPoModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Fournisseur</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company} ({s.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date livraison prévue</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Add item to PO */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">Ajouter un produit à commander :</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={targetStockId}
                      onChange={(e) => {
                        setTargetStockId(e.target.value);
                        const s = stockItems.find((item) => item.id === e.target.value);
                        if (s) setItemPrice(s.purchasePrice);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qté"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseFloat(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddItemToPo}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                    >
                      + Ligne
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {poItems.length > 0 && (
                  <div className="divide-y divide-slate-200 pt-2">
                    {poItems.map((item) => (
                      <div key={item.stockItemId} className="py-1.5 flex items-center justify-between text-xs">
                        <div>
                          <strong>{item.quantity} {item.unit}</strong> • {item.stockItemName}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(item.total, settings.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPoItems((prev) => prev.filter((i) => i.stockItemId !== item.stockItemId))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Valider Bon de Commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Supplier Modal */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Nouveau Fournisseur</h3>
              <button onClick={() => setSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Raison sociale / Société *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Primeurs & Fraîcheur SARL"
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nom du contact</label>
                <input
                  type="text"
                  placeholder="Ex: M. Jean Dubois"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Produits fournis (séparés par des virgules)</label>
                <input
                  type="text"
                  placeholder="Ex: Poissons frais, Gambas, Huîtres"
                  value={supProducts}
                  onChange={(e) => setSupProducts(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Créer Fournisseur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
