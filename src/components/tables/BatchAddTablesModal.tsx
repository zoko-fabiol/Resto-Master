import React, { useState } from 'react';
import { RestaurantTable, TableShape, Zone } from '../../types/restaurant';
import { X, Layers, Grid, Hash, Users, ArrowRight } from 'lucide-react';
import { computeBatchTablePositions } from './floorPlanPlacement';

interface BatchAddTablesModalProps {
  zones: Zone[];
  activeZoneId: string | 'all';
  existingTables: RestaurantTable[];
  onClose: () => void;
  onAddBatch: (tables: Omit<RestaurantTable, 'id'>[]) => void;
}

export const BatchAddTablesModal: React.FC<BatchAddTablesModalProps> = ({
  zones,
  activeZoneId,
  existingTables,
  onClose,
  onAddBatch,
}) => {
  const defaultZoneId = activeZoneId !== 'all' ? activeZoneId : zones[0]?.id || 'salle-1';
  const defaultZone = zones.find((z) => z.id === defaultZoneId);

  const [prefix, setPrefix] = useState('T');
  const [startNumber, setStartNumber] = useState(() => {
    // Determine next reasonable starting number based on existing tables
    const numericTableNumbers = existingTables
      .map((t) => parseInt(t.number.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    const maxNumber = numericTableNumbers.length > 0 ? Math.max(...numericTableNumbers) : 0;
    return maxNumber + 1;
  });
  const [count, setCount] = useState(6);
  const [capacity, setCapacity] = useState(4);
  const [shape, setShape] = useState<TableShape>('carree');
  const [layout, setLayout] = useState<'grille' | 'ligne' | 'colonne'>('grille');
  const [targetZoneId, setTargetZoneId] = useState(defaultZoneId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count <= 0) return;

    const targetZoneObj = zones.find((z) => z.id === targetZoneId);
    const zoneName = targetZoneObj?.name || defaultZone?.name || 'Salle Principale';

    const positions = computeBatchTablePositions(count, layout, shape);
    const newTables: Omit<RestaurantTable, 'id'>[] = positions.map((pos, idx) => ({
      number: `${prefix}${startNumber + idx}`,
      capacity,
      shape,
      status: 'libre',
      zoneId: targetZoneId,
      zone: zoneName,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      rotation: 0,
      active: true,
      coordVersion: 2,
    }));

    onAddBatch(newTables);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Génération par lot de tables</h3>
              <p className="text-xs text-slate-500">
                Créez et disposez instantanément plusieurs tables sur le plan 2D vectoriel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
                <span>Préfixe de numérotation</span>
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ex: T, VIP, BAR"
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Numéro de départ</label>
              <input
                type="number"
                min="1"
                max="999"
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Nombre de tables</label>
              <input
                type="number"
                min="1"
                max="30"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1)))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Capacité par table</span>
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 2))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Forme géométrique</label>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value as TableShape)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="carree">Carrée (100 x 100)</option>
                <option value="rectangulaire">Rectangulaire (140 x 100)</option>
                <option value="ronde">Ronde (100 x 100)</option>
                <option value="ovale">Ovale (140 x 100)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Disposition spatiale</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as 'grille' | 'ligne' | 'colonne')}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="grille">Grille (lignes x colonnes)</option>
                <option value="ligne">Ligne horizontale</option>
                <option value="colonne">Colonne verticale</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Salle / Zone d'affectation</span>
            </label>
            <select
              value={targetZoneId}
              onChange={(e) => setTargetZoneId(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.type})
                </option>
              ))}
            </select>
          </div>

          {/* Preview pill */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">
                Génération de <strong className="font-bold">{count} tables</strong> ({prefix}
                {startNumber} à {prefix}
                {startNumber + count - 1})
              </span>
            </div>
            <span className="font-bold tabular-nums text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg">
              {count * capacity} places
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Générer les tables</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
