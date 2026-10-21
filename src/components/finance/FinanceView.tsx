import React, { useState } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Expense, PaymentMethod } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  TrendingUp,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  PieChart,
  ShieldCheck,
  X,
  FileText,
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const { expenses, orders, createExpense, approveExpense, settings } = useRestaurant();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form state
  const [amount, setAmount] = useState<number>(50000);
  const [category, setCategory] = useState<Expense['category']>('achats_alimentaires');
  const [beneficiary, setBeneficiary] = useState('');
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('virement');

  // Calculations
  const totalRevenues = orders
    .filter((o) => o.status === 'payee')
    .reduce((sum, o) => sum + o.total, 0);

  const totalExpenses = expenses
    .filter((e) => e.status === 'payee' || e.status === 'validee')
    .reduce((sum, e) => sum + e.amount, 0);

  const netEstimatedResult = totalRevenues - totalExpenses;

  // Breakdown by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  const filteredExpenses = expenses.filter(
    (e) => selectedCategory === 'all' || e.category === selectedCategory
  );

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !beneficiary || !reason) {
      showToast({
        type: 'warning',
        title: 'Champs obligatoires',
        message: 'Veuillez renseigner le montant, le bénéficiaire et le motif de la dépense.',
      });
      return;
    }

    await createExpense({
      date: new Date().toISOString().slice(0, 10),
      amount,
      category,
      beneficiary,
      reason,
      paymentMethod,
      status: 'en_attente',
    });

    setModalOpen(false);
    setBeneficiary('');
    setReason('');
    setAmount(50000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<DollarSign className="w-5 h-5" />}
        title="Finances & Dépenses"
        subtitle="Suivi des décaissements, charges opérationnelles et résultat d'exploitation prévisionnel"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            Gestion de Trésorerie
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            onClick={() => setModalOpen(true)}
            icon={Plus}
          >
            Saisir une Dépense
          </Button>
        }
      />

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Recettes Réalisées */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Recettes Encaissées</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 tabular-nums">
              +{formatCurrency(totalRevenues, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Toutes les ventes payées en caisse
            </div>
          </div>
        </div>

        {/* Dépenses Validées */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Charges & Achats</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700 tabular-nums">
              -{formatCurrency(totalExpenses, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Approvisionnements, salaires et charges
            </div>
          </div>
        </div>

        {/* Résultat d'Exploitation Estimé */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Résultat Estimé Net</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tabular-nums ${
                netEstimatedResult >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netEstimatedResult, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Indicateur de gestion interne en continu
            </div>
          </div>
        </div>
      </div>

      {/* Header & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes catégories
          </button>
          {[
            { id: 'achats_alimentaires', label: 'Alimentaire' },
            { id: 'boissons', label: 'Boissons' },
            { id: 'salaires', label: 'Salaires' },
            { id: 'loyer', label: 'Loyer' },
            { id: 'electricite_eau', label: 'Énergie / Eau' },
            { id: 'maintenance', label: 'Maintenance' },
            { id: 'transport', label: 'Transport' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="touch"
          onClick={() => setModalOpen(true)}
          icon={Plus}
        >
          Saisir une Dépense
        </Button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Bénéficiaire / Fournisseur</th>
                <th className="py-3 px-4">Motif de la Dépense</th>
                <th className="py-3 px-4">Règlement</th>
                <th className="py-3 px-4">Montant</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Approbation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-600 font-mono">{exp.date}</td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                      {exp.category.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-800">{exp.beneficiary}</td>

                  <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">{exp.reason}</td>

                  <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                    {exp.paymentMethod}
                  </td>

                  <td className="py-3 px-4 font-black text-slate-900">
                    {formatCurrency(exp.amount, settings.currency)}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        exp.status === 'payee'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : exp.status === 'validee'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : exp.status === 'en_attente'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                    >
                      {exp.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {exp.status === 'en_attente' ? (
                      <button
                        onClick={() => approveExpense(exp.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Valider</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {exp.approvedBy ? `Par ${exp.approvedBy}` : 'Validé'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Enregistrer une Charge / Dépense</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Montant de la charge *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catégorie budgétaire *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold"
                >
                  <option value="achats_alimentaires">Achats alimentaires & ingrédients</option>
                  <option value="boissons">Boissons & alcools</option>
                  <option value="salaires">Salaires & charges personnel</option>
                  <option value="loyer">Loyer local restaurant</option>
                  <option value="electricite_eau">Énergie, électricité, eau, gaz</option>
                  <option value="maintenance">Maintenance cuisine, clim & réparations</option>
                  <option value="transport">Transport & logistique</option>
                  <option value="autre">Autre dépense générale</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bénéficiaire / Tiers *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Eneo Cameroun, Propriétaire, Fournisseur..."
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motif précis *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ex: Facture électricité chambre froide et climatisation salle mois en cours"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mode de règlement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="virement">Virement bancaire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="especes">Espèces (Tiroir caisse)</option>
                  <option value="carte">Carte d'entreprise</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Soumettre Dépense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
