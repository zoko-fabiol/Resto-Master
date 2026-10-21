import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import {
  Bike,
  Plus,
  MapPin,
  Phone,
  Clock,
  Search,
  CheckCircle2,
  Navigation,
  FileText,
  User,
  AlertTriangle,
} from 'lucide-react';
import { DeliveryOrder } from '../../types/restaurant';

export const DeliveryView: React.FC = () => {
  const { deliveries, createDelivery, updateDeliveryStatus, settings, isRuleEnabled } = useRestaurant();
  const { showToast } = useToast();

  // Règles Opérationnelles (Section 15 Livraison & Courses)
  const isProofRequired = isRuleEnabled('delivery_proof', true);
  const isDriverAssignmentAllowed = isRuleEnabled('delivery_driver_assignment', true);
  const isDeliveryFeesAllowed = isRuleEnabled('delivery_fees', true);
  const isOnlineOrderAllowed = isRuleEnabled('delivery_online_order', true);
  const isDeliveryZonesAllowed = isRuleEnabled('delivery_zones', true);
  const isTrackingAllowed = isRuleEnabled('delivery_tracking', true);
  const isCustomerNotifsAllowed = isRuleEnabled('delivery_customer_notifications', true);
  const isWebOrdersAllowed = isRuleEnabled('delivery_web_orders', true);

  const [modalOpen, setModalOpen] = useState(false);
  const [proofModalDeliveryId, setProofModalDeliveryId] = useState<string | null>(null);
  const [momoRef, setMomoRef] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [city, setCity] = useState(settings.city || 'Yaoundé');
  const [quartier, setQuartier] = useState('Bastos');
  const [repere, setRepere] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [deliveryPersonName, setDeliveryPersonName] = useState('Alain Mbarga (Moto 1)');
  const [orderNumber, setOrderNumber] = useState(`CMD-${Date.now().toString().slice(-6)}`);
  const [paymentStatus, setPaymentStatus] = useState<DeliveryOrder['paymentStatus']>('paye_a_la_livraison');

  const filteredDeliveries = deliveries.filter((d) => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      d.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.quartier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.repere.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !repere) {
      showToast({
        type: 'warning',
        title: 'Champs obligatoires',
        message: 'Veuillez renseigner le nom, le téléphone et un repère / lieu-dit précis pour le coursier.',
      });
      return;
    }

    await createDelivery({
      orderId: `ord-deliv-${Date.now()}`,
      orderNumber,
      clientName,
      clientPhone,
      city,
      quartier,
      repere,
      instructions: instructions || undefined,
      deliveryFee,
      deliveryPersonName,
      departureTime: new Date().toTimeString().slice(0, 5),
      paymentStatus,
      status: 'CONFIRMEE',
    });

    setModalOpen(false);
    setClientName('');
    setClientPhone('');
    setRepere('');
    setInstructions('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Module Livraisons Urbaines (Cameroun)</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              Repères & Coursiers Moto
            </span>
            {isWebOrdersAllowed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Passerelle Web Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Adresses adaptées au contexte local : Ville, Quartier, Carrefour & Repère géographique précis
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Course / Livraison</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher quartier, repère, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Toutes les courses' },
            { id: 'CONFIRMEE', label: 'Confirmées' },
            { id: 'EN_COURS_LIVRAISON', label: 'En cours de route' },
            { id: 'LIVREE', label: 'Livrées' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeliveries.map((deliv) => (
          <div
            key={deliv.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {deliv.deliveryNumber}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{deliv.clientName}</h3>
                  <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-semibold">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{deliv.clientPhone}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                    deliv.status === 'LIVREE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : deliv.status === 'EN_COURS_LIVRAISON'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {deliv.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Local Cameroonian Address Box */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-start gap-1.5 font-bold text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <span>
                    {deliv.city} • Quartier {deliv.quartier}
                  </span>
                </div>
                <div className="pl-5 text-slate-600 text-[11px] leading-snug">
                  <strong>Repère :</strong> {deliv.repere}
                </div>
                {deliv.instructions && (
                  <div className="pl-5 text-slate-500 italic text-[11px]">
                    Note : {deliv.instructions}
                  </div>
                )}
              </div>

              {/* Logistics & Payment */}
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-slate-600">
                  <Bike className="w-3.5 h-3.5 text-slate-400" />
                  <span>{deliv.deliveryPersonName || 'Non assigné'}</span>
                </div>
                <div className="font-bold text-slate-900">
                  Frais : {formatCurrency(deliv.deliveryFee, settings.currency)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                deliv.paymentStatus === 'prepaye_momo'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {deliv.paymentStatus === 'prepaye_momo' ? 'Prépayé Mobile Money' : 'À payer à la livraison'}
              </span>

              {deliv.status !== 'LIVREE' && (
                <button
                  onClick={() => {
                    if (deliv.status === 'CONFIRMEE') {
                      updateDeliveryStatus(deliv.id, 'EN_COURS_LIVRAISON');
                    } else if (isProofRequired) {
                      setProofModalDeliveryId(deliv.id);
                    } else {
                      updateDeliveryStatus(deliv.id, 'LIVREE');
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {deliv.status === 'CONFIRMEE' ? 'Départ coursier' : 'Confirmer livrée'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nouvelle Livraison */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Enregistrer une Commande en Livraison
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom du Destinataire :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. Jean-Paul Mbarga"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Téléphone Appel / WhatsApp :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 699 11 22 33"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ville :</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Douala">Douala</option>
                    <option value="Kribi">Kribi</option>
                    <option value="Bafoussam">Bafoussam</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quartier :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bastos, Akwa, Biyem-Assi"
                    value={quartier}
                    onChange={(e) => setQuartier(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Repère / Lieu-dit (Essentiel pour le livreur) :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: En face station Total, carrefour express, barrière noire"
                  value={repere}
                  onChange={(e) => setRepere(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructions complémentaires :</label>
                <input
                  type="text"
                  placeholder="Ex: Appeler dès l'arrivée, monter au 2ème étage..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {isDriverAssignmentAllowed && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Livreur Assigné :</label>
                    <select
                      value={deliveryPersonName}
                      onChange={(e) => setDeliveryPersonName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Alain Mbarga (Moto 1)">Alain Mbarga (Moto 1)</option>
                      <option value="Serge Nono (Moto 2)">Serge Nono (Moto 2)</option>
                      <option value="Partenaire Coursier Express">Partenaire Coursier Express</option>
                    </select>
                  </div>
                )}

                {isDeliveryFeesAllowed && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Frais de Course (FCFA) :</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mode de Paiement :</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="paye_a_la_livraison">Paiement à la livraison (Espèces / MoMo sur place)</option>
                  <option value="prepaye_momo">Déjà prépayé par Orange Money / MoMo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Lancer la Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preuve de Livraison Obligatoire */}
      {proofModalDeliveryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Preuve de Livraison Obligatoire
            </h3>
            <p className="text-xs text-slate-500">
              Selon les règles opérationnelles (Section 15), veuillez saisir la référence de transaction MoMo/OM ou le code signature du client.
            </p>
            <input
              type="text"
              required
              placeholder="Ex: Réf MoMo CI260929.1234..."
              value={momoRef}
              onChange={(e) => setMomoRef(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProofModalDeliveryId(null)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (proofModalDeliveryId) {
                    updateDeliveryStatus(proofModalDeliveryId, 'LIVREE');
                    showToast({
                      type: 'success',
                      title: 'Livraison clôturée',
                      message: `Preuve enregistrée (${momoRef || 'Code validé'}).`,
                    });
                    setProofModalDeliveryId(null);
                    setMomoRef('');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
              >
                Valider la livraison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
