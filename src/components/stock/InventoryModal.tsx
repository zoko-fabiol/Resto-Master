import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import { StockItem, InventoryItemCheck } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import { X, CheckCircle2, AlertTriangle, Calculator, FileCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const { stockItems, submitInventoryAudit, settings } = useRestaurant();
  const { currentUser } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [actualQuantities, setActualQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    stockItems.forEach((s) => {
      init[s.id] = s.currentQuantity;
    });
    return init;
  });

  const [justifications, setJustifications] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const filteredItems = stockItems.filter(
    (s) => selectedCategory === 'all' || s.category === selectedCategory
  );

  // Compute items check
  const checks: InventoryItemCheck[] = filteredItems.map((item) => {
    const actual = actualQuantities[item.id] !== undefined ? actualQuantities[item.id] : item.currentQuantity;
    const variance = Math.round((actual - item.currentQuantity) * 100) / 100;
    const varianceValue = Math.round(variance * item.purchasePrice);

    return {
      stockItemId: item.id,
      stockItemName: item.name,
      theoreticalQty: item.currentQuantity,
      actualQty: actual,
      variance,
      varianceValue,
      unit: item.unit,
      justification: justifications[item.id] || '',
    };
  });

  const totalVarianceValue = checks.reduce((sum, c) => sum + c.varianceValue, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if any negative variance lacks justification
    const missingJustification = checks.some(
      (c) => c.variance < 0 && (!c.justification || c.justification.trim() === '')
    );

    if (missingJustification) {
      alert('Veuillez renseigner une justification pour tous les écarts négatifs (pertes, casse, etc.).');
      return;
    }

    await submitInventoryAudit({
      date: new Date().toISOString().slice(0, 10),
      zoneOrCategory: selectedCategory === 'all' ? 'Inventaire Général' : `Catégorie : ${selectedCategory}`,
      conductedBy: currentUser?.name || 'Responsable Stock',
      items: checks,
      totalVarianceValue,
      status: 'valide',
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              Inventaire Physique & Contrôle des Écarts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Saisissez le stock réel compté en réserve. Les régularisations seront automatiquement générées.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Category & Total Variance Banner */}
        <div className="p-4 bg-amber-50/60 border-b border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">Filtrer zone / rayon :</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-white font-semibold text-slate-800"
            >
              <option value="all">Tout le stock ({stockItems.length} articles)</option>
              <option value="alimentaire">Alimentaire & Épicerie</option>
              <option value="boissons">Boissons & Bar</option>
              <option value="entretien">Entretien</option>
              <option value="emballage">Emballages</option>
            </select>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-600 font-medium">Valorisation totale de l'écart :</div>
            <div
              className={`text-sm font-black ${
                totalVarianceValue < 0 ? 'text-red-600' : totalVarianceValue > 0 ? 'text-emerald-600' : 'text-slate-900'
              }`}
            >
              {totalVarianceValue > 0 ? '+' : ''}
              {formatCurrency(totalVarianceValue, settings.currency)}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col justify-between space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Article</th>
                  <th className="py-2.5 px-3">Stock Théorique</th>
                  <th className="py-2.5 px-3">Stock Réel Compté</th>
                  <th className="py-2.5 px-3">Écart</th>
                  <th className="py-2.5 px-3">Valeur Écart</th>
                  <th className="py-2.5 px-3">Motif / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {checks.map((c) => (
                  <tr key={c.stockItemId} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{c.stockItemName}</div>
                      <div className="text-[10px] text-slate-400">Unité : {c.unit}</div>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {c.theoreticalQty} {c.unit}
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={actualQuantities[c.stockItemId] ?? c.theoreticalQty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setActualQuantities((prev) => ({ ...prev, [c.stockItemId]: val }));
                        }}
                        className="w-24 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 text-slate-900 bg-white"
                      />
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          c.variance < 0
                            ? 'bg-rose-100 text-rose-800'
                            : c.variance > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'text-slate-500'
                        }`}
                      >
                        {c.variance > 0 ? `+${c.variance}` : c.variance} {c.unit}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {formatCurrency(c.varianceValue, settings.currency)}
                    </td>

                    <td className="py-2.5 px-3">
                      {c.variance !== 0 ? (
                        <input
                          type="text"
                          required={c.variance < 0}
                          placeholder={c.variance < 0 ? 'Justification requise (casse, coulage...)' : 'Optionnel'}
                          value={justifications[c.stockItemId] || ''}
                          onChange={(e) =>
                            setJustifications((prev) => ({
                              ...prev,
                              [c.stockItemId]: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-300"
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Conforme</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 -mx-4 -mb-4 p-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
            >
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>Valider & Ajuster le Stock Réel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
