import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import {
  Bike,
  Plus,
  MapPin,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryOrder } from '../../types/restaurant';
import {
  PageShell,
  PageHeader,
  PageToolbar,
  FilterChips,
  SearchInput,
  Badge,
  Button,
  Field,
  FormGrid,
  TextInput,
  Select,
  Modal,
  EmptyState,
} from '../ui';

const PAYMENT_STATUSES: ReadonlyArray<DeliveryOrder['paymentStatus']> = [
  'paye_a_la_livraison',
  'prepaye_momo',
];

function isPaymentStatus(value: string): value is DeliveryOrder['paymentStatus'] {
  return (PAYMENT_STATUSES as ReadonlyArray<string>).includes(value);
}

export const DeliveryView: React.FC = () => {
  const { deliveries, createDelivery, updateDeliveryStatus, settings, isRuleEnabled, employees } = useRestaurant();
  const { showToast } = useToast();

  // Règles Opérationnelles (Section Livraison & Courses)
  const isProofRequired = isRuleEnabled('delivery_proof', true);
  const isDriverAssignmentAllowed = isRuleEnabled('delivery_driver_assignment', true);
  const isDeliveryFeesAllowed = isRuleEnabled('delivery_fees', true);
  const isWebOrdersAllowed = isRuleEnabled('delivery_web_orders', true);

  const [modalOpen, setModalOpen] = useState(false);
  const [proofModalDeliveryId, setProofModalDeliveryId] = useState<string | null>(null);
  const [momoRef, setMomoRef] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State — 100% vide à l'ouverture
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [city, setCity] = useState(settings.city || 'Yaoundé');
  const [quartier, setQuartier] = useState('');
  const [repere, setRepere] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number | ''>('');
  const [deliveryPersonName, setDeliveryPersonName] = useState('');
  const [orderNumber] = useState(`CMD-${Date.now().toString().slice(-6)}`);
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

    const numDeliveryFee = typeof deliveryFee === 'number' ? deliveryFee : parseFloat(deliveryFee || '0');

    await createDelivery({
      orderId: `ord-deliv-${Date.now()}`,
      orderNumber,
      clientName,
      clientPhone,
      city,
      quartier,
      repere,
      instructions: instructions || undefined,
      deliveryFee: isNaN(numDeliveryFee) ? 0 : numDeliveryFee,
      deliveryPersonName: deliveryPersonName || 'Non assigné',
      departureTime: new Date().toTimeString().slice(0, 5),
      paymentStatus,
      status: 'CONFIRMEE',
    });

    setModalOpen(false);
    setClientName('');
    setClientPhone('');
    setQuartier('');
    setRepere('');
    setInstructions('');
    setDeliveryFee('');
    setDeliveryPersonName('');
  };

  return (
    <PageShell>
      <PageHeader
        icon={<Bike className="w-5 h-5" aria-hidden="true" />}
        title="Livraisons"
        subtitle="Adresses adaptées au contexte local : ville, quartier, carrefour et repère géographique précis."
        badge={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info">Repères & coursiers moto</Badge>
            {isWebOrdersAllowed && (
              <Badge variant="success" dot>
                Passerelle web active
              </Badge>
            )}
          </div>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            Nouvelle course
          </Button>
        }
        className="!mb-0"
      />

      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Rechercher quartier, repère, client…"
          className="w-full sm:w-80"
        />
        <FilterChips
          ariaLabel="Filtrer les courses par statut"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { id: 'all', label: 'Toutes' },
            { id: 'CONFIRMEE', label: 'Confirmées' },
            { id: 'EN_COURS_LIVRAISON', label: 'En route' },
            { id: 'LIVREE', label: 'Livrées' },
          ]}
        />
      </PageToolbar>

      {filteredDeliveries.length === 0 ? (
        <EmptyState
          title="Aucune course à afficher"
          description="Créez une nouvelle course ou modifiez vos filtres."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeliveries.map((deliv) => (
            <article
              key={deliv.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="brand" className="font-mono tabular-nums">
                      {deliv.deliveryNumber}
                    </Badge>
                    <h2 className="font-bold text-slate-900 text-base mt-1">{deliv.clientName}</h2>
                    <div className="text-sm text-slate-600 flex items-center gap-1.5 mt-0.5 font-semibold tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>{deliv.clientPhone}</span>
                    </div>
                  </div>

                  <Badge
                    variant={
                      deliv.status === 'LIVREE'
                        ? 'success'
                        : deliv.status === 'EN_COURS_LIVRAISON'
                          ? 'info'
                          : 'warning'
                    }
                    dot
                  >
                    {deliv.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1.5">
                  <div className="flex items-start gap-1.5 font-bold text-slate-900">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      {deliv.city} • Quartier {deliv.quartier}
                    </span>
                  </div>
                  <div className="pl-5 text-slate-600 leading-snug">
                    <strong>Repère :</strong> {deliv.repere}
                  </div>
                  {deliv.instructions && (
                    <div className="pl-5 text-slate-500 italic">Note : {deliv.instructions}</div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Bike className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <span>{deliv.deliveryPersonName || 'Non assigné'}</span>
                  </div>
                  <div className="font-bold text-slate-900 tabular-nums">
                    Frais : {formatCurrency(deliv.deliveryFee, settings.currency)}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Badge variant={deliv.paymentStatus === 'prepaye_momo' ? 'success' : 'warning'}>
                  {deliv.paymentStatus === 'prepaye_momo' ? 'Prépayé Mobile Money' : 'À payer à la livraison'}
                </Badge>

                {deliv.status !== 'LIVREE' && (
                  <Button
                    variant="success"
                    size="md"
                    className="min-h-[44px]"
                    onClick={() => {
                      if (deliv.status === 'CONFIRMEE') {
                        updateDeliveryStatus(deliv.id, 'EN_COURS_LIVRAISON');
                      } else if (isProofRequired) {
                        setProofModalDeliveryId(deliv.id);
                      } else {
                        updateDeliveryStatus(deliv.id, 'LIVREE');
                      }
                    }}
                  >
                    {deliv.status === 'CONFIRMEE' ? 'Départ coursier' : 'Confirmer livrée'}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Nouvelle Livraison */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Enregistrer une commande en livraison"
        icon={<Bike className="w-5 h-5" aria-hidden="true" />}
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nom du destinataire" required>
            <TextInput
              placeholder="Ex : M. Jean-Paul Mbarga"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </Field>

          <Field label="Téléphone (appel / WhatsApp)" required>
            <TextInput
              type="tel"
              inputMode="tel"
              placeholder="Ex : 699 11 22 33"
              className="tabular-nums"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </Field>

          <FormGrid columns={2}>
            <Field label="Ville">
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="Yaoundé">Yaoundé</option>
                <option value="Douala">Douala</option>
                <option value="Kribi">Kribi</option>
                <option value="Bafoussam">Bafoussam</option>
              </Select>
            </Field>

            <Field label="Quartier" required>
              <TextInput
                placeholder="Ex : Bastos, Akwa, Biyem-Assi"
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
              />
            </Field>
          </FormGrid>

          <Field
            label="Repère / lieu-dit"
            helpText="Essentiel pour le livreur."
            required
          >
            <TextInput
              placeholder="Ex : En face station Total, carrefour express, barrière noire"
              value={repere}
              onChange={(e) => setRepere(e.target.value)}
            />
          </Field>

          <Field label="Instructions complémentaires">
            <TextInput
              placeholder="Ex : Appeler dès l'arrivée, monter au 2ème étage…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </Field>

          <FormGrid columns={2}>
            {isDriverAssignmentAllowed && (
              <Field label="Livreur assigné">
                <Select
                  value={deliveryPersonName}
                  onChange={(e) => setDeliveryPersonName(e.target.value)}
                >
                  <option value="">Sélectionner un coursier...</option>
                  {employees
                    .filter((emp) => emp.status === 'actif')
                    .map((emp) => (
                      <option key={emp.id} value={`${emp.fullName} (${emp.role})`}>
                        {emp.fullName} ({emp.role})
                      </option>
                    ))}
                  <option value="Partenaire Coursier Moto Externe">Partenaire Coursier Moto Externe</option>
                </Select>
              </Field>
            )}

            {isDeliveryFeesAllowed && (
              <Field label="Frais de course (FCFA)">
                <TextInput
                  type="number"
                  min={0}
                  step={250}
                  placeholder="Ex : 1500"
                  value={deliveryFee}
                  onChange={(e) =>
                    setDeliveryFee(e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value) || 0)))
                  }
                />
              </Field>
            )}
          </FormGrid>

          <Field label="Mode de paiement">
            <Select
              value={paymentStatus}
              onChange={(e) => {
                if (isPaymentStatus(e.target.value)) setPaymentStatus(e.target.value);
              }}
            >
              <option value="paye_a_la_livraison">Paiement à la livraison (espèces / MoMo sur place)</option>
              <option value="prepaye_momo">Déjà prépayé par Orange Money / MoMo</option>
            </Select>
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="touch" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="touch">
              Lancer la course
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Preuve de Livraison Obligatoire */}
      <Modal
        isOpen={proofModalDeliveryId !== null}
        onClose={() => setProofModalDeliveryId(null)}
        title="Preuve de livraison obligatoire"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Selon les règles opérationnelles, saisissez la référence de transaction MoMo / OM ou le code signature
            du client.
          </p>
          <Field label="Référence ou code signature" required>
            <TextInput
              placeholder="Ex : Réf MoMo CI260929.1234…"
              className="tabular-nums"
              value={momoRef}
              onChange={(e) => setMomoRef(e.target.value)}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="touch" onClick={() => setProofModalDeliveryId(null)}>
              Annuler
            </Button>
            <Button
              variant="success"
              size="touch"
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
            >
              Valider la livraison
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};
