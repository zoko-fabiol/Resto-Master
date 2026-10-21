import React, { useState } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { Reservation, ReservationStatus } from '../../types/restaurant';
import { RESERVATION_STATUS_MAP, formatDateTime } from '../../lib/utils';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Phone,
  CheckCircle2,
  XCircle,
  Utensils,
  Search,
  Filter,
  X,
  Wand2,
} from 'lucide-react';

interface ReservationsViewProps {
  onSeatGuest: (reservationId: string, tableId: string) => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onSeatGuest }) => {
  const {
    reservations,
    tables,
    createReservation,
    updateReservationStatus,
    updateTableStatus,
    isRuleEnabled,
  } = useRestaurant();
  const { showToast } = useToast();

  // Règles Opérationnelles (Section 16 Réservations)
  const isDepositRequired = isRuleEnabled('res_deposit', true);
  const isNoShowAllowed = isRuleEnabled('res_noshow', true);
  const isWaitlistAllowed = isRuleEnabled('res_waitlist', true);
  const isOnlineResAllowed = isRuleEnabled('res_online', true);
  const isAutoConfirmAllowed = isRuleEnabled('res_auto_confirm', true);
  const isRemindersAllowed = isRuleEnabled('res_reminders', true);
  const isAvailabilityAllowed = isRuleEnabled('res_availability', true);

  const [depositReceived, setDepositReceived] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('20:00');
  const [guestCount, setGuestCount] = useState(2);
  const [tableId, setTableId] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Suggérer la meilleure table libre adaptée à la taille du groupe (Section 7 du Guide)
  const handleSuggestTable = (count: number) => {
    const freeTables = tables.filter((t) => t.status === 'libre');
    const suited = freeTables
      .filter((t) => t.capacity >= count)
      .sort((a, b) => a.capacity - b.capacity);

    if (suited.length > 0) {
      setTableId(suited[0].id);
      showToast({
        type: 'success',
        title: 'Table suggérée automatiquement',
        message: `Table ${suited[0].number} (${suited[0].zone || 'Salle'}) recommandée pour ${count} convives (${suited[0].capacity} places).`,
      });
    } else if (freeTables.length > 0) {
      setTableId(freeTables[0].id);
      showToast({
        type: 'warning',
        title: 'Capacité approximative',
        message: `Aucune table de taille exacte libre. Table ${freeTables[0].number} (${freeTables[0].capacity} places) suggérée.`,
      });
    } else {
      showToast({
        type: 'warning',
        title: 'Aucune table disponible',
        message: 'Toutes les tables sont actuellement occupées ou réservées.',
      });
    }
  };

  // Annuler et libérer immédiatement la table associée (Section 7 du Guide)
  const handleCancelReservation = async (res: Reservation) => {
    await updateReservationStatus(res.id, 'annulee');
    if (res.tableId) {
      const table = tables.find((t) => t.id === res.tableId);
      if (table && table.status === 'reservee') {
        await updateTableStatus(table.id, 'libre');
      }
    }
    showToast({
      type: 'info',
      title: 'Réservation annulée',
      message: `Réservation de ${res.customerName} annulée. La table associée est de nouveau disponible.`,
    });
  };

  const filteredReservations = reservations.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchQuery =
      !searchQuery ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.tableName && r.tableName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchQuery;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone) {
      showToast({
        type: 'warning',
        title: 'Champs manquants',
        message: 'Veuillez renseigner au minimum le nom et le téléphone du client.',
      });
      return;
    }

    if (isDepositRequired && guestCount >= 6 && !depositReceived) {
      showToast({
        type: 'warning',
        title: 'Acompte obligatoire',
        message: 'Pour les groupes de 6 personnes ou plus, la réception d’un acompte de garantie est obligatoire.',
      });
      return;
    }

    const assignedTable = tables.find((t) => t.id === tableId);

    await createReservation({
      customerName,
      phone,
      email: email || undefined,
      date,
      time,
      guestCount,
      tableId: tableId || undefined,
      tableName: assignedTable ? assignedTable.number : undefined,
      status: 'confirmee',
      specialRequests: specialRequests || undefined,
    });

    // Marquer la table comme réservée sur le plan de salle
    if (tableId) {
      await updateTableStatus(tableId, 'reservee');
    }

    setModalOpen(false);
    // Reset form
    setCustomerName('');
    setPhone('');
    setEmail('');
    setSpecialRequests('');
    setTableId('');
    setDepositReceived(false);

    showToast({
      type: 'success',
      title: 'Réservation confirmée',
      message: `Réservation pour ${customerName} enregistrée le ${date} à ${time}.`,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<Calendar className="w-5 h-5" />}
        title="Réservations"
        subtitle="Gestion des tables réservées, arrivées des clients et politique d'acomptes"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
            {filteredReservations.length} réservation(s)
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            onClick={() => setModalOpen(true)}
            icon={Plus}
          >
            Nouvelle Réservation
          </Button>
        }
      />

      {/* Top Header & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700"
          >
            <option value="all">Tous les statuts</option>
            <option value="confirmee">Confirmée</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours (Arrivée)</option>
            <option value="terminee">Terminée</option>
            <option value="annulee">Annulée</option>
          </select>
        </div>

        <Button
          variant="primary"
          size="touch"
          onClick={() => setModalOpen(true)}
          icon={Plus}
        >
          Nouvelle Réservation
        </Button>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
                <th className="py-3 px-4">Client & Contact</th>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Convives</th>
                <th className="py-3 px-4">Table Assignée</th>
                <th className="py-3 px-4">Demande Particulière</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucune réservation trouvée pour cette recherche.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const statusInfo = RESERVATION_STATUS_MAP[res.status];
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{res.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{res.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{res.date}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{res.time}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{res.guestCount} personnes</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {res.tableName ? (
                          <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            {res.tableName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non assignée</span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="truncate text-slate-600">
                          {res.specialRequests || '—'}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {res.status === 'confirmee' && (
                            <button
                              onClick={() => {
                                const targetTable = res.tableId || tables.find((t) => t.status === 'libre')?.id;
                                if (targetTable) {
                                  onSeatGuest(res.id, targetTable);
                                } else {
                                  showToast({
                                    type: 'warning',
                                    title: 'Aucune table libre',
                                    message: 'Toutes les tables sont actuellement occupées ou réservées.',
                                  });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Utensils className="w-3 h-3" />
                              <span>Installer</span>
                            </button>
                          )}

                          {isNoShowAllowed && res.status === 'confirmee' && (
                            <button
                              onClick={() => handleCancelReservation(res)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] border border-rose-200"
                              title="Déclarer No-Show et libérer la table"
                            >
                              No-Show
                            </button>
                          )}

                          {res.status !== 'annulee' && res.status !== 'terminee' && (
                            <button
                              onClick={() => handleCancelReservation(res)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Annuler la réservation et libérer la table"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reservation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Nouvelle Réservation
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nom du client *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: M. Paul Biya"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+237 6XX XX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Heure</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Convives</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Affecter une table (Optionnel)</label>
                  <button
                    type="button"
                    onClick={() => handleSuggestTable(guestCount)}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
                  >
                    <Wand2 className="w-3 h-3 text-amber-500" />
                    <span>Suggérer table adaptée ({guestCount}p)</span>
                  </button>
                </div>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                >
                  <option value="">Aucune table présélectionnée</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.number} ({t.zone}) - {t.capacity} places - {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Demande particulière ou note</label>
                <textarea
                  rows={2}
                  placeholder="Anniversaire, table au calme, préférence vin..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                />
              </div>

              {isDepositRequired && guestCount >= 6 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-900">
                    Acompte de groupe obligatoire (≥ 6 convives)
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Selon la politique opérationnelle (Section 16), un acompte de garantie est requis pour les grands groupes.
                  </p>
                  <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={depositReceived}
                      onChange={(e) => setDepositReceived(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Acompte de garantie bien perçu (Cash / MoMo)</span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                >
                  Enregistrer Réservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
