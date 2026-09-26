import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
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
} from 'lucide-react';

interface ReservationsViewProps {
  onSeatGuest: (reservationId: string, tableId: string) => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({ onSeatGuest }) => {
  const { reservations, tables, createReservation, updateReservationStatus } = useRestaurant();

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
      alert('Veuillez renseigner le nom et le téléphone du client.');
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

    setModalOpen(false);
    // Reset form
    setCustomerName('');
    setPhone('');
    setEmail('');
    setSpecialRequests('');
    setTableId('');
  };

  return (
    <div className="space-y-6 pb-12">
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

        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Réservation</span>
        </button>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
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
                                  alert('Aucune table libre disponible actuellement.');
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <Utensils className="w-3 h-3" />
                              <span>Installer</span>
                            </button>
                          )}

                          {res.status !== 'annulee' && res.status !== 'terminee' && (
                            <button
                              onClick={() => updateReservationStatus(res.id, 'annulee')}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Annuler la réservation"
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Affecter une table (Optionnel)</label>
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
