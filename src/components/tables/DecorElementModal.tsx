import React, { useState } from 'react';
import { DecorElement, DecorType, Zone } from '../../types/restaurant';
import { X, Trash2, Box, Sparkles } from 'lucide-react';

interface DecorElementModalProps {
  initialElement?: DecorElement | null;
  zoneId: string;
  zones: Zone[];
  restaurantId: string;
  onClose: () => void;
  onSave: (element: DecorElement) => void;
  onDelete?: (id: string) => void;
}

const DECOR_PRESETS: Record<
  DecorType,
  { label: string; defaultWidth: number; defaultHeight: number; icon: string; defaultColor: string }
> = {
  mur: { label: 'Mur Architectural', defaultWidth: 200, defaultHeight: 16, icon: '🧱', defaultColor: '#475569' },
  comptoir: { label: 'Comptoir Service', defaultWidth: 160, defaultHeight: 40, icon: '🍱', defaultColor: '#b45309' },
  bar: { label: 'Bar & Tabourets', defaultWidth: 220, defaultHeight: 60, icon: '🍸', defaultColor: '#78350f' },
  porte: { label: 'Porte Battante (Arc 90°)', defaultWidth: 60, defaultHeight: 60, icon: '🚪', defaultColor: '#64748b' },
  colonne: { label: 'Pilier / Colonne', defaultWidth: 40, defaultHeight: 40, icon: '🏛️', defaultColor: '#334155' },
  entree: { label: 'Entrée Principale', defaultWidth: 100, defaultHeight: 30, icon: '🚪', defaultColor: '#10b981' },
  escalier: { label: 'Escalier', defaultWidth: 80, defaultHeight: 120, icon: '🪜', defaultColor: '#475569' },
  fenetre: { label: 'Baie Vitrée / Fenêtre', defaultWidth: 140, defaultHeight: 12, icon: '🪟', defaultColor: '#38bdf8' },
  plante: { label: 'Végétation / Plante', defaultWidth: 40, defaultHeight: 40, icon: '🌿', defaultColor: '#059669' },
};

export const DecorElementModal: React.FC<DecorElementModalProps> = ({
  initialElement,
  zoneId,
  zones,
  restaurantId,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(initialElement);

  const [type, setType] = useState<DecorType>(initialElement?.type || 'mur');
  const [name, setName] = useState(initialElement?.name || DECOR_PRESETS[initialElement?.type || 'mur'].label);
  const [label, setLabel] = useState(initialElement?.label || '');
  const [width, setWidth] = useState(initialElement?.width || DECOR_PRESETS[initialElement?.type || 'mur'].defaultWidth);
  const [height, setHeight] = useState(initialElement?.height || DECOR_PRESETS[initialElement?.type || 'mur'].defaultHeight);
  const [rotation, setRotation] = useState(initialElement?.rotation || 0);
  const [color, setColor] = useState(initialElement?.color || DECOR_PRESETS[initialElement?.type || 'mur'].defaultColor);
  const [targetZoneId, setTargetZoneId] = useState(initialElement?.zoneId || zoneId);

  const handleTypeChange = (newType: DecorType) => {
    setType(newType);
    const preset = DECOR_PRESETS[newType];
    setName(preset.label);
    setWidth(preset.defaultWidth);
    setHeight(preset.defaultHeight);
    setColor(preset.defaultColor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const element: DecorElement = {
      id: initialElement?.id || `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      restaurantId,
      zoneId: targetZoneId,
      type,
      name: name.trim() || DECOR_PRESETS[type].label,
      label: label.trim() || undefined,
      x: initialElement?.x ?? 200,
      y: initialElement?.y ?? 200,
      width: Math.max(10, width),
      height: Math.max(10, height),
      rotation,
      color,
      createdAt: initialElement?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(element);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? 'Modifier l\'élément de décor' : 'Ajouter un élément de décor'}
              </h3>
              <p className="text-xs text-slate-500">Murs, bar, comptoir, portes, piliers et repères visuels</p>
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
          <div>
            <label className="text-xs font-semibold text-slate-700">Type d'élément architectural</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {(Object.keys(DECOR_PRESETS) as DecorType[]).map((dt) => {
                const preset = DECOR_PRESETS[dt];
                const isSelected = type === dt;
                return (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => handleTypeChange(dt)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg mb-1">{preset.icon}</span>
                    <span className="text-[11px] truncate max-w-full text-center">{preset.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Nom interne</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comptoir principal"
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Texte affiché sur le plan</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: BAR, CUISINE, ACCUEIL"
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Largeur (px)</label>
              <input
                type="number"
                min="10"
                max="800"
                step="5"
                value={width}
                onChange={(e) => setWidth(Math.max(10, parseInt(e.target.value, 10) || 10))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Hauteur (px)</label>
              <input
                type="number"
                min="10"
                max="800"
                step="5"
                value={height}
                onChange={(e) => setHeight(Math.max(10, parseInt(e.target.value, 10) || 10))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Rotation</label>
              <select
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="0">0°</option>
                <option value="45">45°</option>
                <option value="90">90°</option>
                <option value="135">135°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Zone / Salle</label>
              <select
                value={targetZoneId}
                onChange={(e) => setTargetZoneId(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Couleur d'accent</label>
              <div className="flex items-center gap-1.5 mt-1.5">
                {['#475569', '#78350f', '#b45309', '#059669', '#0284c7', '#dc2626'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c ? 'scale-125 border-white ring-2 ring-slate-900' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (initialElement) {
                    onDelete(initialElement.id);
                    onClose();
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
                {isEditing ? 'Mettre à jour' : 'Ajouter au plan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
