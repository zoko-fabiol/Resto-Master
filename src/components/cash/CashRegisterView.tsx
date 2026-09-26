import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { CashMovement } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import {
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const CashRegisterView: React.FC = () => {
  const {
    cashSession,
    cashMovements,
    recordCashMovement,
    closeCashRegister,
    openCashRegister,
    settings,
  } = useRestaurant();

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [openingModalOpen, setOpeningModalOpen] = useState(false);

  // Movement Form
  const [movType, setMovType] = useState<CashMovement['type']>('entree');
  const [movAmount, setMovAmount] = useState<number>(10000);
  const [movReason, setMovReason] = useState('');

  // Closing Form
  const [countedTotal, setCountedTotal] = useState<number>(cashSession.expectedTotal);
  const [closingNotes, setClosingNotes] = useState('');

  // Opening Form
  const [initialFloat, setInitialFloat] = useState<number>(100000);

  const variance = countedTotal - cashSession.expectedTotal;
  const isVarianceSignificant = Math.abs(variance) > settings.minCashVarianceAlert;

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movAmount <= 0 || !movReason) {
      alert('Veuillez renseigner un montant positif et le motif.');
      return;
    }
    await recordCashMovement(movType, movAmount, movReason);
    setMovementModalOpen(false);
    setMovReason('');
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVarianceSignificant && !closingNotes) {
      alert('Un écart significatif a été détecté. Une justification obligatoire est requise pour clôturer.');
      return;
    }

    await closeCashRegister(countedTotal, closingNotes);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    setClosingModalOpen(false);
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await openCashRegister(initialFloat, 'Ouverture du service');
    setOpeningModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Session Status Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
              cashSession.status === 'ouverte' ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            {cashSession.status === 'ouverte' ? (
              <Unlock className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Session de Caisse : {cashSession.status === 'ouverte' ? 'Active & En Cours' : 'Clôturée'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  cashSession.status === 'ouverte'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {cashSession.status === 'ouverte' ? 'Ouverte' : 'Fermée'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ouverte par <strong>{cashSession.openedBy}</strong> le {formatDateTime(cashSession.openedAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {cashSession.status === 'ouverte' ? (
            <>
              <button
                onClick={() => setMovementModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
              >
                <Coins className="w-4 h-4" />
                <span>Entrée / Sortie Espèces</span>
              </button>
              <button
                onClick={() => {
                  setCountedTotal(cashSession.expectedTotal);
                  setClosingModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Clôturer la Caisse</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpeningModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
            >
              <Unlock className="w-4 h-4" />
              <span>Ouvrir Nouvelle Session de Caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* Numerical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Espèces Théorique
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(cashSession.expectedTotal, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Montant attendu dans le tiroir-caisse</div>
        </div>

        {/* Initial Float */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Fond de Caisse Initial
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">
            {formatCurrency(cashSession.initialFloat, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Fourni à l'ouverture du service</div>
        </div>

        {/* Total Encaissements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Total Entrées & Encaissements
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            +{formatCurrency(cashSession.totalCashIn, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Ventes au comptoir et règlements</div>
        </div>

        {/* Total Décaissements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
            Total Sorties & Décaissements
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            -{formatCurrency(cashSession.totalCashOut, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dépenses urgentes & remboursements</div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-900">
            Journal des Flux de Caisse de la Session
          </div>
          <span className="text-xs text-slate-500">
            {cashMovements.length} opérations enregistrées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Heure</th>
                <th className="py-3 px-4">Type Opération</th>
                <th className="py-3 px-4">Motif / Justification</th>
                <th className="py-3 px-4">Montant</th>
                <th className="py-3 px-4">Caissier / Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashMovements.map((cm) => {
                const isPositive = cm.type === 'entree' || cm.type === 'encaissement_vente';
                return (
                  <tr key={cm.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {cm.timestamp.slice(11, 16)}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {cm.type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">{cm.reason}</td>

                    <td className="py-3 px-4 font-black">
                      <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                        {isPositive ? '+' : '-'}
                        {formatCurrency(cm.amount, settings.currency)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-semibold">{cm.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Modal */}
      {movementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Mouvement de Caisse Manuel</h3>
              <button onClick={() => setMovementModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordMovement} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Type de flux *</label>
                <select
                  value={movType}
                  onChange={(e) => setMovType(e.target.value as CashMovement['type'])}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                >
                  <option value="entree">Entrée de fonds / Apport espèces (+)</option>
                  <option value="sortie">Sortie d'espèces / Achat urgent (-)</option>
                  <option value="avance">Avance sur salaire (-)</option>
                  <option value="remboursement">Remboursement client (-)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Montant *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={movAmount}
                  onChange={(e) => setMovAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-black rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motif obligatoire *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Achat d'urgence menthe fraîche et glaçons au marché"
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  Enregistrer Opération
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Closing Session Modal */}
      {closingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-600" />
                Clôture Journalière de Caisse
              </h3>
              <button onClick={() => setClosingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-600 font-semibold">Montant théorique attendu :</span>
              <span className="text-base font-black text-slate-900">
                {formatCurrency(cashSession.expectedTotal, settings.currency)}
              </span>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Montant physique réellement compté (Billets + Pièces) *
                </label>
                <input
                  type="number"
                  required
                  value={countedTotal}
                  onChange={(e) => setCountedTotal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300"
                />
              </div>

              {/* Variance display */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  variance === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="font-semibold">
                  {variance === 0 ? 'Caisse parfaitement équilibrée' : 'Écart constaté :'}
                </span>
                <span className="font-black text-sm">
                  {variance > 0 ? '+' : ''}
                  {formatCurrency(variance, settings.currency)}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isVarianceSignificant ? 'Justification obligatoire de l’écart *' : 'Observations de clôture'}
                </label>
                <textarea
                  rows={2}
                  required={isVarianceSignificant}
                  placeholder="Justification des erreurs de monnaie, remises ou billets suspects..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                >
                  Confirmer la Clôture Définitive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Opening Session Modal */}
      {openingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-600" />
                Ouverture d'une Session de Caisse
              </h3>
              <button onClick={() => setOpeningModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Fond de caisse initial (Monnaie physique disponible) *
                </label>
                <input
                  type="number"
                  required
                  value={initialFloat}
                  onChange={(e) => setInitialFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-black rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpeningModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                >
                  Ouvrir la Caisse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
