import React, { useState, useEffect } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { useAuth } from '../../context/AuthContext';
import {
  Thermometer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Search,
  Flame,
  Shield,
  Clock,
  User,
} from 'lucide-react';
import { HygieneCheck } from '../../types/restaurant';

export const HygieneView: React.FC = () => {
  const { hygieneChecks, addHygieneCheck } = useRestaurant();
  const { currentUser } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State — 100% vide à l'ouverture
  const [category, setCategory] = useState<HygieneCheck['category']>('temperature');
  const [equipmentOrZone, setEquipmentOrZone] = useState('');
  const [inspectorName, setInspectorName] = useState(currentUser?.name || '');

  useEffect(() => {
    if (currentUser?.name && !inspectorName) {
      setInspectorName(currentUser.name);
    }
  }, [currentUser?.name]);
  const [measuredValue, setMeasuredValue] = useState('');
  const [thresholdOrStandard, setThresholdOrStandard] = useState('');
  const [result, setResult] = useState<HygieneCheck['result']>('conforme');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [notes, setNotes] = useState('');

  const filteredChecks = hygieneChecks.filter(
    (c) => filterCategory === 'all' || c.category === filterCategory
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    await addHygieneCheck({
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      category,
      equipmentOrZone,
      inspectorName,
      measuredValue: measuredValue || undefined,
      thresholdOrStandard,
      result,
      correctiveAction: correctiveAction || undefined,
      notes: notes || undefined,
    });

    setModalOpen(false);
    setEquipmentOrZone('');
    setMeasuredValue('');
    setThresholdOrStandard('');
    setCorrectiveAction('');
    setNotes('');
  };

  const conformesCount = hygieneChecks.filter((c) => c.result === 'conforme').length;
  const nonConformesCount = hygieneChecks.filter((c) => c.result !== 'conforme').length;

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<Shield className="w-5 h-5" />}
        title="Hygiène & Normes HACCP"
        subtitle="Suivi des températures de la chaîne du froid, qualité des huiles de friture et plans de nettoyage"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            Sécurité Alimentaire
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            onClick={() => setModalOpen(true)}
            icon={Plus}
          >
            Nouveau Relevé de Contrôle
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-400">Total Relevés Réalisés</div>
          <div className="text-xl font-black text-slate-900 mt-1 tabular-nums">{hygieneChecks.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Frigos, congélateurs, huiles et zones</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-emerald-600">Points 100% Conformes</div>
          <div className="text-xl font-black text-emerald-700 mt-1 tabular-nums">{conformesCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Respect des seuils réglementaires</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-rose-600">Anomalies / Actions Requises</div>
          <div className="text-xl font-black text-rose-600 mt-1 tabular-nums">{nonConformesCount}</div>
          <div className="text-xs text-rose-500 mt-0.5">Actions correctives obligatoires</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {[
          { id: 'all', label: 'Tous les contrôles' },
          { id: 'temperature', label: 'Chaîne du Froid (Températures)' },
          { id: 'huile_friture', label: 'Huiles de Friture' },
          { id: 'nettoyage', label: 'Nettoyage & Désinfection' },
          { id: 'reception_marchandise', label: 'Contrôles Réception' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterCategory(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterCategory === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Checks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b border-slate-200">
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Catégorie</th>
                <th className="py-2.5 px-3">Équipement / Emplacement</th>
                <th className="py-2.5 px-3">Valeur Mesurée</th>
                <th className="py-2.5 px-3">Seuil Réglementaire</th>
                <th className="py-2.5 px-3">Inspecteur</th>
                <th className="py-2.5 px-3">Résultat</th>
                <th className="py-2.5 px-3">Action Corrective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChecks.map((check) => (
                <tr key={check.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {check.date} {check.time}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="capitalize font-semibold text-slate-700">
                      {check.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    {check.equipmentOrZone}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {check.measuredValue || 'Vérifié'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {check.thresholdOrStandard}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">
                    {check.inspectorName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        check.result === 'conforme'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {check.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 italic text-[11px]">
                    {check.correctiveAction || check.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Relevé */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Enregistrer un Contrôle Sanitaire / Température
            </h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Catégorie de Contrôle :</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="temperature">Chaîne du Froid (Température)</option>
                  <option value="huile_friture">Contrôle Huile de Friture</option>
                  <option value="nettoyage">Nettoyage & Désinfection</option>
                  <option value="reception_marchandise">Contrôle à la Réception</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Équipement ou Emplacement :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Chambre froide positive, Poste Bar, Plan découpe..."
                  value={equipmentOrZone}
                  onChange={(e) => setEquipmentOrZone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valeur Mesurée :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: +3.0°C ou 15%"
                    value={measuredValue}
                    onChange={(e) => setMeasuredValue(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Seuil / Tolérance :</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Entre 0°C et +4°C"
                    value={thresholdOrStandard}
                    onChange={(e) => setThresholdOrStandard(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Résultat :</label>
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="conforme">Conforme (OK)</option>
                    <option value="non_conforme">Non Conforme (Alerte)</option>
                    <option value="action_requise">Action Requise</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Responsable Contrôle :</label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {result !== 'conforme' && (
                <div>
                  <label className="font-bold text-rose-700 block mb-1">
                    Action Corrective Immédiate :
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Réglage thermostat, vidange de l'huile..."
                    value={correctiveAction}
                    onChange={(e) => setCorrectiveAction(e.target.value)}
                    className="w-full p-2 border border-rose-300 bg-rose-50 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observations :</label>
                <textarea
                  rows={2}
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
                  Enregistrer le Contrôle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
