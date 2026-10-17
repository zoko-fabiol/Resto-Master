import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import {
  CalendarDays,
  Plus,
  Users,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  DollarSign,
  Building,
  Phone,
  FileText,
  MapPin,
  Calendar,
  Printer,
} from 'lucide-react';
import { RestaurantEvent } from '../../types/restaurant';

export const EventsView: React.FC = () => {
  const { events, createEvent, updateEventStatus, settings, isRuleEnabled } = useRestaurant();
  const { showToast } = useToast();

  // Règles Opérationnelles (Section 17 Événements & Banquets)
  const isDepositMandatory = isRuleEnabled('event_deposit', true);
  const isQuotesAllowed = isRuleEnabled('event_quotes', true);

  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RestaurantEvent['type']>('seminaire');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [guestCount, setGuestCount] = useState<number>(30);
  const [assignedHallOrZone, setAssignedHallOrZone] = useState('Salle Principale');
  const [menuSelected, setMenuSelected] = useState('Menu Buffet Prestige');
  const [quoteAmount, setQuoteAmount] = useState<number>(600000);
  const [depositAmount, setDepositAmount] = useState<number>(200000);
  const [notes, setNotes] = useState('');

  const filteredEvents = events.filter((e) => {
    const matchType = filterType === 'all' || e.type === filterType;
    const matchSearch =
      !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName || quoteAmount <= 0) {
      showToast({
        type: 'warning',
        title: 'Formulaire incomplet',
        message: 'Veuillez renseigner le titre de l’événement, le client et un montant de devis supérieur à zéro.',
      });
      return;
    }

    if (isDepositMandatory && depositAmount <= 0) {
      showToast({
        type: 'warning',
        title: 'Acompte obligatoire',
        message: 'Selon les règles opérationnelles (Section 17), un acompte est obligatoire pour confirmer la réservation événementielle.',
      });
      return;
    }

    const remainingBalance = Math.max(0, quoteAmount - depositAmount);

    await createEvent({
      title,
      type,
      clientName,
      clientPhone,
      clientEmail: clientEmail || undefined,
      date,
      startTime,
      endTime,
      guestCount,
      assignedHallOrZone,
      menuSelected,
      quoteAmount,
      depositAmount,
      remainingBalance,
      status: depositAmount > 0 ? 'confirme' : 'devis_envoye',
      notes,
    });

    setModalOpen(false);
    // Reset
    setTitle('');
    setClientName('');
    setClientPhone('');
    setQuoteAmount(600000);
    setDepositAmount(200000);
    setNotes('');
  };

  const totalQuotes = events.reduce((sum, e) => sum + e.quoteAmount, 0);
  const totalDeposits = events.reduce((sum, e) => sum + e.depositAmount, 0);
  const totalRemaining = events.reduce((sum, e) => sum + e.remainingBalance, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Événements, Banquets & Service Traiteur</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
              B2B & Cérémonies
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion du cycle événementiel : Devis, acomptes, réservations de salons, buffets et soldes de facturation
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel Événement / Banquet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Devis Événements</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(totalQuotes, settings.currency)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{events.length} événements enregistrés</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-emerald-600">Acomptes Déjà Encaissés</div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalDeposits, settings.currency)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Fonds sécurisés en caisse ou banque</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-rose-600">Soldes à Recouvrer</div>
          <div className="text-xl font-black text-rose-600 mt-1">
            {formatCurrency(totalRemaining, settings.currency)}
          </div>
          <div className="text-[10px] text-rose-500 mt-0.5">À encaisser le jour J ou à terme</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher banquet, client, n°..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'seminaire', label: 'Séminaires' },
            { id: 'mariage', label: 'Mariages' },
            { id: 'cocktail', label: 'Cocktails' },
            { id: 'anniversaire', label: 'Anniversaires' },
            { id: 'catering', label: 'Traiteur' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {evt.eventNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{evt.title}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-slate-700">{evt.clientName}</span>
                  <span>•</span>
                  <span>{evt.clientPhone}</span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 ${
                  evt.status === 'confirme'
                    ? 'bg-emerald-100 text-emerald-800'
                    : evt.status === 'termine'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {evt.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
              <div>
                <div className="text-[10px] text-slate-400">Date & Horaires</div>
                <div className="font-bold text-slate-800 mt-0.5">
                  {evt.date} ({evt.startTime}-{evt.endTime})
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Convives</div>
                <div className="font-bold text-slate-800 mt-0.5">{evt.guestCount} personnes</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Emplacement</div>
                <div className="font-bold text-slate-800 mt-0.5 truncate">{evt.assignedHallOrZone}</div>
              </div>
            </div>

            {/* Financial Status */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">Devis Total TTC</div>
                <div className="font-bold text-slate-900">{formatCurrency(evt.quoteAmount, settings.currency)}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-600">Acompte Versé</div>
                <div className="font-bold text-emerald-700">{formatCurrency(evt.depositAmount, settings.currency)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-rose-600">Reste à Payer</div>
                <div className="font-black text-rose-700">{formatCurrency(evt.remainingBalance, settings.currency)}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="text-[11px] text-slate-400 italic">
                {evt.notes || 'Aucune note particulière'}
              </span>

              <div className="flex items-center gap-1.5">
                {isQuotesAllowed && (
                  <button
                    type="button"
                    onClick={() => {
                      showToast({
                        type: 'info',
                        title: 'Devis Événementiel Officiel',
                        message: `Devis proforma généré pour ${evt.clientName} (${evt.eventNumber}) - ${formatCurrency(evt.quoteAmount, settings.currency)}.`,
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3 h-3 text-slate-600" />
                    <span>Devis</span>
                  </button>
                )}

                {evt.status !== 'termine' && (
                  <button
                    onClick={() => updateEventStatus(evt.id, 'termine')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition-colors cursor-pointer"
                  >
                    Clôturer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nouveau Banquet */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Enregistrer un Nouvel Événement ou Banquet
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Intitulé de l'Événement :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Séminaire annuel Cabinet Afrik Consulting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Type d'Événement :</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="seminaire">Séminaire d'Entreprise</option>
                    <option value="cocktail">Cocktail Dînatoire</option>
                    <option value="mariage">Mariage / Cérémonie</option>
                    <option value="anniversaire">Anniversaire</option>
                    <option value="conference">Conférence</option>
                    <option value="catering">Service Traiteur Extérieur</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre de Convives :</label>
                  <input
                    type="number"
                    min={1}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom du Client / Société :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Direction MTN Cameroon"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Téléphone de Contact :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +237 699 00 11 22"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date :</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Début :</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fin :</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Salle / Zone Affectée :</label>
                <select
                  value={assignedHallOrZone}
                  onChange={(e) => setAssignedHallOrZone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="Salle Principale">Salle Principale (120 places)</option>
                  <option value="Terrasse Panoramique">Terrasse Panoramique (80 places)</option>
                  <option value="VIP Lounge">VIP Lounge (30 places)</option>
                  <option value="Mezzanine">Mezzanine (40 places)</option>
                  <option value="Espace Complet (Privatisation)">Espace Complet (Privatisation)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Montant Devis TTC :</label>
                  <input
                    type="number"
                    min={10000}
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Acompte Reçu :</label>
                  <input
                    type="number"
                    min={0}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes & Exigences Particulières :</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Vidéoprojecteur requis, formule sans porc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
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
                  Créer l'Événement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
