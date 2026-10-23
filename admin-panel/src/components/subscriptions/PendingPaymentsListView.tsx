import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Receipt,
  Search,
  Filter,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { db } from '../../../../src/lib/firebase';
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { cloudFunctionsService } from '../../../../src/services/functions/cloudFunctionsService';
import { CATALOG_PACKS, PackId } from '../../../../shared/catalog/packs';

interface SubscriptionOrder {
  id: string;
  orgId: string;
  paymentReference: string;
  packId: PackId;
  billingCycle: 'mensuel' | 'annuel' | 'a_vie';
  payableAmountFcfa: number;
  status: 'paiement_en_attente' | 'paiement_a_verifier' | 'valide' | 'rejete';
  paymentProof?: {
    paymentMethod: string;
    transactionReference: string;
    payerNotes?: string;
    proofUrl?: string;
    declaredAt: string;
    declaredByEmail: string;
  };
  createdAt: string;
  createdByEmail: string;
}

export const PendingPaymentsListView: React.FC = () => {
  const [orders, setOrders] = useState<SubscriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paiement_a_verifier' | 'paiement_en_attente'>('all');

  // États pour les modales d'action
  const [validatingOrder, setValidatingOrder] = useState<SubscriptionOrder | null>(null);
  const [cashierNotes, setCashierNotes] = useState('');
  const [actualAmountReceived, setActualAmountReceived] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rejectingOrder, setRejectingOrder] = useState<SubscriptionOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Écoute en direct des commandes d'abonnement
  useEffect(() => {
    const collRef = collection(db, 'subscription_orders');
    const q = query(collRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SubscriptionOrder));
        setOrders(items);
        setLoading(false);
      },
      (err) => {
        console.warn('[PendingPayments] Erreur écoute commandes:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrg = o.orgId?.toLowerCase().includes(q);
      const matchRef = o.paymentReference?.toLowerCase().includes(q);
      const matchTx = o.paymentProof?.transactionReference?.toLowerCase().includes(q);
      const matchEmail = o.createdByEmail?.toLowerCase().includes(q);
      return matchOrg || matchRef || matchTx || matchEmail;
    }
    return true;
  });

  const handleOpenValidateModal = (order: SubscriptionOrder) => {
    setValidatingOrder(order);
    setActualAmountReceived(order.payableAmountFcfa);
    setCashierNotes(`Encaissement certifié conforme sur relevé bancaire/MoMo le ${new Date().toLocaleDateString('fr-FR')}`);
  };

  const handleConfirmValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingOrder) return;

    try {
      setIsSubmitting(true);
      await cloudFunctionsService.validateSubscriptionPayment({
        orderId: validatingOrder.id,
        cashierNotes: cashierNotes.trim() || undefined,
        actualAmountReceivedFcfa: actualAmountReceived || undefined,
      });

      alert(`Paiement de ${validatingOrder.payableAmountFcfa.toLocaleString('fr-FR')} FCFA validé avec succès. L'abonnement est désormais actif.`);
      setValidatingOrder(null);
    } catch (err: any) {
      alert(`Erreur de validation : ${err?.message || 'Échec de l\'activation'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingOrder || !rejectionReason.trim()) return;

    try {
      setIsSubmitting(true);
      await cloudFunctionsService.rejectSubscriptionPayment({
        orderId: rejectingOrder.id,
        rejectionReason: rejectionReason.trim(),
      });

      alert('Justificatif rejeté. Le restaurant a été réinvité à renseigner son paiement.');
      setRejectingOrder(null);
      setRejectionReason('');
    } catch (err: any) {
      alert(`Erreur de rejet : ${err?.message || 'Échec'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs antialiased">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-white">Validation des Règlements d'Abonnement</h1>
          </div>
          <p className="text-slate-400 mt-1">
            Vérifiez les virements, transactions Orange Money et MTN MoMo déclarés par les restaurants clients avant activation.
          </p>
        </div>

        {/* Filtres de statut */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence, orgId..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs w-56 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tous les états</option>
            <option value="paiement_a_verifier">À vérifier prioritairement</option>
            <option value="paiement_en_attente">En attente de virement</option>
          </select>
        </div>
      </div>

      {/* Tableau des règlements */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Référence / Date</th>
              <th className="py-3 px-4 font-semibold">Restaurant (OrgId)</th>
              <th className="py-3 px-4 font-semibold">Formule & Cycle</th>
              <th className="py-3 px-4 font-semibold">Montant Exigé</th>
              <th className="py-3 px-4 font-semibold">Justificatif Reçu</th>
              <th className="py-3 px-4 font-semibold">Statut</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredOrders.map((order) => {
              const pack = CATALOG_PACKS[order.packId] || CATALOG_PACKS.medium;
              const hasProof = Boolean(order.paymentProof);

              return (
                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Référence et date */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-amber-400">{order.paymentReference}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(order.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </td>

                  {/* Restaurant */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{order.orgId}</div>
                    <div className="text-[10px] text-slate-400">{order.createdByEmail}</div>
                  </td>

                  {/* Pack & Cycle */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{pack.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {order.billingCycle}
                      </span>
                    </div>
                  </td>

                  {/* Montant exigé */}
                  <td className="py-3 px-4 font-mono font-black text-white tabular-nums text-sm">
                    {order.payableAmountFcfa.toLocaleString('fr-FR')} FCFA
                  </td>

                  {/* Justificatif */}
                  <td className="py-3 px-4">
                    {order.paymentProof ? (
                      <div className="space-y-0.5">
                        <div className="font-semibold text-emerald-400 capitalize flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{order.paymentProof.paymentMethod.replace('_', ' ')}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-300">
                          Réf: {order.paymentProof.transactionReference}
                        </div>
                        {order.paymentProof.payerNotes && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs" title={order.paymentProof.payerNotes}>
                            "{order.paymentProof.payerNotes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[11px] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>En attente de virement</span>
                      </div>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase inline-flex items-center gap-1 ${
                        order.status === 'paiement_a_verifier'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : order.status === 'valide'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : order.status === 'rejete'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {order.status === 'paiement_a_verifier'
                        ? 'À Valider'
                        : order.status === 'valide'
                        ? 'Validé & Actif'
                        : order.status === 'rejete'
                        ? 'Rejeté'
                        : 'En Attente'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    {order.status !== 'valide' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenValidateModal(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-colors"
                        >
                          Valider
                        </button>
                        {hasProof && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingOrder(order);
                              setRejectionReason('');
                            }}
                            className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[11px] transition-colors"
                          >
                            Rejeter
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredOrders.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                  Aucune commande de règlement trouvée dans cette sélection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Validation */}
      {validatingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Valider l'Encaissement Client</span>
              </div>
              <button onClick={() => setValidatingOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmValidation} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Restaurant : <span className="text-white font-bold">{validatingOrder.orgId}</span></div>
                <div className="text-[11px] text-slate-400">Référence RM : <span className="text-amber-400 font-mono font-bold">{validatingOrder.paymentReference}</span></div>
                <div className="text-[11px] text-slate-400">Montant attendu : <span className="text-white font-mono font-bold">{validatingOrder.payableAmountFcfa.toLocaleString('fr-FR')} FCFA</span></div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Montant réel perçu (FCFA) *</label>
                <input
                  type="number"
                  required
                  value={actualAmountReceived}
                  onChange={(e) => setActualAmountReceived(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Annotations administratives & comptables</label>
                <textarea
                  value={cashierNotes}
                  onChange={(e) => setCashierNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setValidatingOrder(null)} className="px-4 py-2 text-slate-400 hover:text-white">Annuler</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Validation...' : 'Valider & Activer le Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rejet */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <span>Rejeter le Justificatif de Paiement</span>
              </div>
              <button onClick={() => setRejectingOrder(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmRejection} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motif explicite du rejet (visible par le client) *</label>
                <textarea
                  required
                  minLength={5}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Référence transaction introuvable sur le compte bancaire, montant incomplet..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRejectingOrder(null)} className="px-4 py-2 text-slate-400 hover:text-white">Annuler</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-md shadow-rose-500/20"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Confirmer le Rejet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
