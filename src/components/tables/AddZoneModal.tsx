import React, { useState } from 'react';
import { Zone, ZoneType } from '../../types/restaurant';
import { X, Layers, Sparkles } from 'lucide-react';

interface AddZoneModalProps {
  restaurantId: string;
  existingZonesCount: number;
  onClose: () => void;
  onSave: (zone: Omit<Zone, 'id'>) => void;
}

export const AddZoneModal: React.FC<AddZoneModalProps> = ({
  restaurantId,
  existingZonesCount,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ZoneType>('salle_principale');
  const [capacity, setCapacity] = useState(40);
  const [color, setColor] = useState('#f59e0b');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      restaurantId,
      name: name.trim(),
      type,
      capacity: Number(capacity) || 30,
      color,
      active: true,
      displayOrder: existingZonesCount + 1,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Créer une Salle / Zone</h3>
              <p className="text-xs text-slate-500">Organisation spatiale des espaces du restaurant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Nom de la Zone</label>
            <input
              type="text"
              required
              placeholder="Ex: Rooftop, Salle VIP, Terrasse Bar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Type d'espace</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ZoneType)}
                className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 mt-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="salle_principale">Salle principale</option>
                <option value="terrasse">Terrasse</option>
                <option value="vip">VIP / Privilège</option>
                <option value="bar">Bar & Comptoir</option>
                <option value="salon_prive">Salon privé</option>
                <option value="climatisee">Climatisée</option>
                <option value="exterieure">Extérieure</option>
                <option value="rooftop">Rooftop</option>
                <option value="evenementielle">Salle événementielle</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Capacité totale</label>
              <input
                type="number"
                min="5"
                max="500"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value, 10) || 30))}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Couleur d'identification</label>
            <div className="flex items-center gap-2 mt-2">
              {['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-white ring-2 ring-slate-900' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
          >
            Créer l'Espace
          </button>
        </div>
      </form>
    </div>
  );
};
