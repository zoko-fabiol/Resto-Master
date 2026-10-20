import React, { useState, useMemo } from 'react';
import { RestaurantTable, TableShape, Zone } from '../../types/restaurant';
import { X, Trash2, Hash, Users, Layers, Layout, Compass, Move } from 'lucide-react';
import { useConfirm } from '../ui/ConfirmDialog';
import { findFirstAvailableTablePosition } from './floorPlanPlacement';

interface AddEditTableModalProps {
  initialTable?: RestaurantTable | null;
  existingTables?: RestaurantTable[];
  zones: Zone[];
  activeZoneId: string | 'all';
  restaurantId: string;
  onClose: () => void;
  onSave: (tableData: Partial<RestaurantTable>) => void;
  onDelete?: (tableId: string) => void;
}

export const AddEditTableModal: React.FC<AddEditTableModalProps> = ({
  initialTable,
  existingTables = [],
  zones,
  activeZoneId,
  restaurantId,
  onClose,
  onSave,
  onDelete,
}) => {
  const confirm = useConfirm();
  const isEditing = Boolean(initialTable);

  const defaultZoneId =
    initialTable?.zoneId || (activeZoneId !== 'all' ? activeZoneId : zones[0]?.id || 'salle-1');

  // Détermination de la position intelligente initiale (D-08)
  const initialPos = useMemo(() => {
    if (initialTable && initialTable.x !== undefined && initialTable.y !== undefined) {
      return { x: initialTable.x, y: initialTable.y };
    }
    return findFirstAvailableTablePosition(existingTables, 100, 100);
  }, [initialTable, existingTables]);

  const [number, setNumber] = useState(initialTable?.number || '');
  const [capacity, setCapacity] = useState(initialTable?.capacity || 4);
  const [shape, setShape] = useState<TableShape>(initialTable?.shape || 'carree');
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [x, setX] = useState<number>(initialPos.x);
  const [y, setY] = useState<number>(initialPos.y);
  const [width, setWidth] = useState(
    initialTable?.width || (initialTable?.shape === 'rectangulaire' ? 140 : 100)
  );
  const [height, setHeight] = useState(initialTable?.height || 100);
  const [rotation, setRotation] = useState(initialTable?.rotation || 0);

  const handleShapeChange = (newShape: TableShape) => {
    setShape(newShape);
    if (newShape === 'rectangulaire' || newShape === 'ovale') {
      setWidth(140);
      setHeight(100);
    } else {
      setWidth(100);
      setHeight(100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim()) return;

    const selectedZoneObj = zones.find((z) => z.id === zoneId);
    const zoneName = selectedZoneObj?.name || 'Salle Principale';

    onSave({
      restaurantId,
      number: number.trim(),
      capacity: Number(capacity) || 4,
      shape,
      zoneId,
      zone: zoneName,
      x: Math.round(Number(x) || 100),
      y: Math.round(Number(y) || 100),
      width: Math.max(40, Math.round(Number(width) || 100)),
      height: Math.max(40, Math.round(Number(height) || 100)),
      rotation: ((Math.round(Number(rotation) || 0) % 360) + 360) % 360,
      status: initialTable?.status || 'libre',
      active: true,
      coordVersion: 2,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Propriétés Table ${initialTable?.number}` : 'Ajouter une nouvelle table'}
              </h3>
              <p className="text-xs text-slate-500">Configuration spatiale et dimensionnelle</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-600" />
              <span>Numéro ou identifiant</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: T1, VIP-4, Terrasse 12"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Capacité (convives)</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 2))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Forme</label>
              <select
                value={shape}
                onChange={(e) => handleShapeChange(e.target.value as TableShape)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="carree">Carrée</option>
                <option value="rectangulaire">Rectangulaire</option>
                <option value="ronde">Ronde</option>
                <option value="ovale">Ovale</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Salle / Zone d'affectation</span>
            </label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} ({z.type})
                </option>
              ))}
            </select>
          </div>

          {/* Coordonnées spatiales X / Y (Section 2.3) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <Move className="w-3.5 h-3.5 text-amber-600" />
              <span>Positionnement spatial (Unités 1200 × 800)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Position X (px)</label>
                <input
                  type="number"
                  min="30"
                  max="1170"
                  step="10"
                  value={x}
                  onChange={(e) => setX(parseInt(e.target.value, 10) || 100)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Position Y (px)</label>
                <input
                  type="number"
                  min="30"
                  max="770"
                  step="10"
                  value={y}
                  onChange={(e) => setY(parseInt(e.target.value, 10) || 100)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Dimensions et Angle (Section 2.3) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Largeur (px)</label>
              <input
                type="number"
                min="40"
                max="400"
                step="10"
                value={width}
                onChange={(e) => setWidth(Math.max(40, parseInt(e.target.value, 10) || 100))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Hauteur (px)</label>
              <input
                type="number"
                min="40"
                max="400"
                step="10"
                value={height}
                onChange={(e) => setHeight(Math.max(40, parseInt(e.target.value, 10) || 100))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-600" />
                <span>Angle (°)</span>
              </label>
              <input
                type="number"
                min="0"
                max="359"
                step="15"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10) || 0)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden tabular-nums"
              />
            </div>
          </div>

          {/* Boutons d'angles rapides */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-500">Angles rapides :</span>
            {[0, 45, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setRotation(deg)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors ${
                  rotation === deg
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (initialTable) {
                    const ok = await confirm({
                      title: `Supprimer la table ${initialTable.number} ?`,
                      message: `Êtes-vous sûr de vouloir retirer cette table du plan de salle ?`,
                      confirmLabel: 'Supprimer',
                      variant: 'danger',
                    });
                    if (ok) {
                      onDelete(initialTable.id);
                      onClose();
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                {isEditing ? 'Enregistrer' : 'Créer la table'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
