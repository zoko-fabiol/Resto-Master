import React, { useState, useMemo } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import {
  CalendarDays,
  Plus,
  Users,
  Clock,
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
  const {
    events,
    createEvent,
    updateEventStatus,
    settings,
    isRuleEnabled,
    isFeatureEnabled,
    zones,
    tables,
  } = useRestaurant();
  const { showToast } = useToast();

  // Règles Opérationnelles (Section 17 Événements & Banquets)
  const isCateringBanquetAllowed = isFeatureEnabled('events_banquets') || isFeatureEnabled('catering_banquet');
  const isEventActive = isRuleEnabled('event_active', true);
  const isDepositMandatory = isRuleEnabled('event_deposit', true);
  const isQuotesAllowed = isRuleEnabled('event_quotes', true);
  const isCustomMenusAllowed = isRuleEnabled('event_custom_menus', true);
  const isBanquetAllowed = isRuleEnabled('event_banquet', true);
  const isHallAllowed = isRuleEnabled('event_hall', true);
  const isPlanningAllowed = isRuleEnabled('event_planning', true);
  const isEventBillingAllowed = isRuleEnabled('event_billing', true);

  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Récupération dynamique des salles et zones réelles depuis la base de données
  const dynamicZones = useMemo(() => {
    const zoneList: Array<{ id: string; name: string; tablesCount: number; capacity: number }> = [];

    if (zones && zones.length > 0) {
      zones.forEach((z) => {
        const zoneTables = tables.filter((t) => t.zone === z.name || t.zoneId === z.id);
        const capacity = zoneTables.reduce((sum, t) => sum + (t.capacity || 0), 0) || z.capacity || 0;
        zoneList.push({
          id: z.id,
          name: z.name,
          tablesCount: zoneTables.length,
          capacity,
        });
      });
    }

    // Récupérer également les zones distinctes configurées sur les tables
    const tableZoneNames = Array.from(new Set(tables.map((t) => t.zone).filter(Boolean)));
    tableZoneNames.forEach((name) => {
      if (!zoneList.some((z) => z.name.toLowerCase() === name.toLowerCase())) {
        const zoneTables = tables.filter((t) => t.zone === name);
        const capacity = zoneTables.reduce((sum, t) => sum + (t.capacity || 0), 0);
        zoneList.push({
          id: name,
          name,
          tablesCount: zoneTables.length,
          capacity,
        });
      }
    });

    return zoneList;
  }, [zones, tables]);

  const totalRestaurantCapacity = useMemo(() => {
    return tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  }, [tables]);

  // Form State — 100% vide à l'ouverture, aucune valeur factice pré-remplie
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RestaurantEvent['type']>('seminaire');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [guestCount, setGuestCount] = useState<number | ''>('');
  const [assignedHallOrZone, setAssignedHallOrZone] = useState('');
  const [menuSelected, setMenuSelected] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const filteredEvents = events.filter((e) => {
    const matchType = filterType === 'all' || e.type === filterType;
    const matchSearch =
      !searchQuery ||
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.eventNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numQuote = typeof quoteAmount === 'number' ? quoteAmount : parseFloat(quoteAmount || '0');
    const numDeposit = typeof depositAmount === 'number' ? depositAmount : parseFloat(depositAmount || '0');
    const numGuests = typeof guestCount === 'number' ? guestCount : parseInt(guestCount || '0', 10);

    if (!title.trim() || !clientName.trim() || numQuote <= 0) {
      showToast({
        type: 'warning',
        title: 'Formulaire incomplet',
        message: 'Veuillez renseigner le titre de l’événement, le nom du client et un montant de devis supérieur à zéro.',
      });
      return;
    }

    if (!assignedHallOrZone) {
      showToast({
        type: 'warning',
        title: 'Salle / Zone non sélectionnée',
        message: 'Veuillez sélectionner la salle ou zone réelle du restaurant pour cet événement.',
      });
      return;
    }

    if (isDepositMandatory && numDeposit <= 0) {
      showToast({
        type: 'warning',
        title: 'Acompte obligatoire',
        message: 'Selon les règles opérationnelles (Section 17), un acompte est obligatoire pour confirmer la réservation événementielle.',
      });
      return;
    }

    const remainingBalance = Math.max(0, numQuote - numDeposit);

    await createEvent({
      title: title.trim(),
      type,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim() || undefined,
      date,
      startTime: startTime || '',
      endTime: endTime || '',
      guestCount: numGuests > 0 ? numGuests : 1,
      assignedHallOrZone,
      menuSelected: menuSelected.trim() || undefined,
      quoteAmount: numQuote,
      depositAmount: numDeposit,
      remainingBalance,
      status: numDeposit > 0 ? 'confirme' : 'devis_envoye',
      notes: notes.trim() || undefined,
    });

    setModalOpen(false);
    // Réinitialisation complète des champs
    setTitle('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setGuestCount('');
    setStartTime('');
    setEndTime('');
    setAssignedHallOrZone('');
    setMenuSelected('');
    setQuoteAmount('');
    setDepositAmount('');
    setNotes('');
  };

  const totalQuotes = events.reduce((sum, e) => sum + (e.quoteAmount || 0), 0);
  const totalDeposits = events.reduce((sum, e) => sum + (e.depositAmount || 0), 0);
  const totalRemaining = events.reduce((sum, e) => sum + (e.remainingBalance || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<CalendarDays className="w-5 h-5" />}
        title="Événements & Banquets"
        subtitle="Gestion du cycle événementiel : devis, acomptes, réservations de salons, buffets et soldes de facturation"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
            B2B & Cérémonies
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            onClick={() => setModalOpen(true)}
            icon={Plus}
          >
            Nouvel Événement / Banquet
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Total Devis Événements</div>
          <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">
            {formatCurrency(totalQuotes, settings.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{events.length} événements enregistrés</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-emerald-600">Acomptes Déjà Encaissés</div>
          <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
            {formatCurrency(totalDeposits, settings.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Fonds sécurisés en caisse ou banque</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-rose-600">Soldes à Recouvrer</div>
          <div className="text-xl font-black text-rose-600 mt-1 tabular-nums">
            {formatCurrency(totalRemaining, settings.currency)}
          </div>
          <div className="text-xs text-rose-500 mt-0.5">À encaisser le jour J ou à terme</div>
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
                {(evt.status || 'devis_envoye').replace('_', ' ')}
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
                    placeholder="Ex: 50"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value === '' ? '' : Number(e.target.value))}
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
                    placeholder="Ex: +237 6XX XX XX XX"
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
                <label className="font-bold text-slate-700 block mb-1">Salle / Zone Affectée (Base de Données) :</label>
                <select
                  value={assignedHallOrZone}
                  onChange={(e) => setAssignedHallOrZone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  required
                >
                  <option value="">Sélectionner une salle / zone réelle...</option>
                  {dynamicZones.map((z) => (
                    <option key={z.id} value={z.name}>
                      {z.name} ({z.tablesCount} table{z.tablesCount > 1 ? 's' : ''} • {z.capacity} places réelles)
                    </option>
                  ))}
                  {tables.length > 0 && (
                    <option value="Privatisation Globale">
                      Privatisation Globale ({tables.length} tables • {totalRestaurantCapacity} places au total)
                    </option>
                  )}
                  <option value="Autre Espace (Préciser en notes)">Autre Espace (Préciser en notes)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Montant Devis TTC :</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ex: 500000"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Acompte Reçu :</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
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
