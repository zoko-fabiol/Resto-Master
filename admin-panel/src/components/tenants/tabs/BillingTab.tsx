import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Clock, CheckCircle2, AlertTriangle, Calendar, Receipt } from 'lucide-react';
import { Tenant, DEFAULT_PLANS, Plan } from '@shared';
import { adminPlatformService } from '../../../services/adminPlatformService';
import { db } from '../../../../../src/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface BillingTabProps {
  tenant: Tenant;
}

export const BillingTab: React.FC<BillingTabProps> = ({ tenant }) => {
  const plan = DEFAULT_PLANS.find((p: Plan) => p.id === tenant.planId);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [amountFcfa, setAmountFcfa] = useState<number>(plan?.priceFcfaMonthly || 50000);
  const [periodMonths, setPeriodMonths] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>('virement_bancaire');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Écoute de l'historique des règlements
  useEffect(() => {
    const collRef = collection(db, 'tenants', tenant.id, 'payments');
    const q = query(collRef, orderBy('recordedAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn('Erreur écoute payments:', err);
      }
    );
    return () => unsub();
  }, [tenant.id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountFcfa || amountFcfa <= 0) return;

    try {
      setIsSubmitting(true);
      await adminPlatformService.recordTenantPayment({
        orgId: tenant.id,
        amountFcfa,
        periodMonths,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowPaymentModal(false);
      setReference('');
      setNotes('');
      alert('Paiement enregistré avec succès. Le compte du restaurant est désormais actif.');
    } catch (err: any) {
      alert(`Erreur d'enregistrement : ${err?.message || 'Échec'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendTrial = async () => {
    const daysStr = prompt('Nombre de jours de prolongation de l’essai gratuit :', '7');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return;

    try {
      const now = new Date();
      const currentEnds = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : now;
      const base = currentEnds.getTime() > now.getTime() ? currentEnds : now;
      const newEnds = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

      await adminPlatformService.updateTenantEntitlements({
        orgId: tenant.id,
        reason: `Prolongation commerciale de l'essai gratuit de ${days} jours`,
      });
      alert(`Période d’essai prolongée avec succès de ${days} jours.`);
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec'}`);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formule Actuelle */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Formule Contractuelle</div>
            <div className="text-base font-bold text-white mt-1">{plan?.name || tenant.planId}</div>
            <div className="text-amber-400 font-mono text-sm font-black mt-0.5 tabular-nums">
              {plan?.priceFcfaMonthly?.toLocaleString('fr-FR')} FCFA / mois
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            Engagement : Facturation mensuelle ou annuelle au choix
          </div>
        </div>

        {/* Échéance / Statut */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Statut d'Abonnement</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-white capitalize">{tenant.status}</span>
              {tenant.status === 'actif' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {tenant.status === 'essai' && <Clock className="w-4 h-4 text-amber-400" />}
              {tenant.status === 'impaye' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
            </div>
          </div>
          <div className="text-[11px] text-slate-400">
            {tenant.status === 'essai' && tenant.trialEndsAt && (
              <span>Expire le {new Date(tenant.trialEndsAt).toLocaleDateString('fr-FR')}</span>
            )}
            {tenant.status === 'actif' && (
              <span className="text-emerald-400">Accès complet et synchronisé</span>
            )}
          </div>
        </div>

        {/* Actions Rapides Facturation */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Gestion Commerciale</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Enregistrer un Règlement</span>
            </button>

            {tenant.status === 'essai' && (
              <button
                onClick={handleExtendTrial}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Prolonger l'Essai Gratuit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historique des Règlements Enregistrés */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Historique des Règlements Reçus ({payments.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Date & Réf</th>
                <th className="pb-3 font-semibold">Montant Réglé</th>
                <th className="pb-3 font-semibold">Période</th>
                <th className="pb-3 font-semibold">Mode de Paiement</th>
                <th className="pb-3 font-semibold">Enregistré Par</th>
                <th className="pb-3 font-semibold">Validité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3">
                    <div className="font-medium text-white">
                      {new Date(p.recordedAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">{p.reference || 'SANS_REF'}</div>
                  </td>
                  <td className="py-3 font-bold text-emerald-400 font-mono tabular-nums">
                    {p.amountFcfa?.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="py-3 text-slate-300">{p.periodMonths} mois</td>
                  <td className="py-3 capitalize text-slate-300">
                    {p.paymentMethod?.replace('_', ' ') || 'Virement'}
                  </td>
                  <td className="py-3 text-slate-400 font-mono text-[11px]">{p.recordedBy}</td>
                  <td className="py-3 text-slate-400 font-mono text-[11px]">
                    {p.validUntil ? new Date(p.validUntil).toLocaleDateString('fr-FR') : 'N/A'}
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    Aucun paiement enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'Enregistrement de Règlement */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Enregistrer un Règlement</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Montant perçu (FCFA) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={amountFcfa}
                  onChange={(e) => setAmountFcfa(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Durée couverte (mois)</label>
                <select
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value={1}>1 Mois</option>
                  <option value={3}>3 Mois (Trimestre)</option>
                  <option value={6}>6 Mois (Semestre)</option>
                  <option value={12}>12 Mois (Annuel avec remise)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mode de règlement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="virement_bancaire">Virement Bancaire</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="mtn_momo">MTN Mobile Money</option>
                  <option value="especes">Espèces (En main propre / Agence)</option>
                  <option value="cheque">Chèque d’entreprise certifié</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Référence transaction / Chèque</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: VIR-20261021-0091"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notes internes (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Justificatif reçu par WhatsApp, compte réactivé..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {isSubmitting ? 'Validation...' : 'Valider le Paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
