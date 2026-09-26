import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Thermometer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
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

  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form State
  const [category, setCategory] = useState<HygieneCheck['category']>('temperature');
  const [equipmentOrZone, setEquipmentOrZone] = useState('Chambre Froide Positive (+2°C / +4°C)');
  const [inspectorName, setInspectorName] = useState('Chef Marc Ndongo');
  const [measuredValue, setMeasuredValue] = useState('+3.0°C');
  const [thresholdOrStandard, setThresholdOrStandard] = useState('Entre +0°C et +4°C');
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
    setCorrectiveAction('');
    setNotes('');
  };

  const conformesCount = hygieneChecks.filter((c) => c.result === 'conforme').length;
  const nonConformesCount = hygieneChecks.filter((c) => c.result !== 'conforme').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Hygiène, Salubrité & Contrôles HACCP</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Sécurité Alimentaire
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des températures de la chaîne du froid, qualité des huiles de friture et plans de nettoyage
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Relevé de Contrôle</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Relevés Réalisés</div>
          <div className="text-xl font-black text-slate-900 mt-1">{hygieneChecks.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Frigos, congélateurs, huiles et zones</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-emerald-600">Points 100% Conformes</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{conformesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Respect des seuils réglementaires</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-rose-600">Anomalies / Actions Requises</div>
          <div className="text-xl font-black text-rose-600 mt-1">{nonConformesCount}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Actions correctives obligatoires</div>
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
              <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
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
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setCategory(cat);
                    if (cat === 'temperature') {
                      setEquipmentOrZone('Chambre Froide Positive (+2°C / +4°C)');
                      setThresholdOrStandard('Entre +0°C et +4°C');
                      setMeasuredValue('+3.0°C');
                    } else if (cat === 'huile_friture') {
                      setEquipmentOrZone('Friteuse Double Cuve Cuisine');
                      setThresholdOrStandard('Taux composés polaires < 25%');
                      setMeasuredValue('15%');
                    } else if (cat === 'nettoyage') {
                      setEquipmentOrZone('Plan de Travail Boucherie & Poissons');
                      setThresholdOrStandard('Désinfection virucide / bactéricide');
                      setMeasuredValue('Propre');
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg"
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
