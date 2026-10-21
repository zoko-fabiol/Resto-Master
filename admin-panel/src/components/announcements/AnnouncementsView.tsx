import React, { useState } from 'react';
import { Megaphone, Plus, Send, AlertTriangle, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { PlatformAnnouncement, adminPlatformService } from '../../services/adminPlatformService';

interface AnnouncementsViewProps {
  announcements: PlatformAnnouncement[];
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ announcements }) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'maintenance' | 'nouveaute' | 'urgent'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      await adminPlatformService.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        type,
      });
      setShowModal(false);
      setTitle('');
      setMessage('');
      alert('Annonce diffusée avec succès à tous les restaurants.');
    } catch (err: any) {
      alert(`Erreur : ${err?.message || 'Échec'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeBadge: Record<string, { label: string; color: string }> = {
    info: { label: 'Information', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    maintenance: { label: 'Maintenance Planifiée', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    nouveaute: { label: 'Nouvelle Fonctionnalité', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    urgent: { label: 'Urgent', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            Diffusion d’Annonces & Messages Plateforme ({announcements.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Diffuser des messages système ou avertir d’une maintenance à l’ensemble des restaurants connectés.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Annonce</span>
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => {
          const badge = typeBadge[ann.type] || typeBadge.info;

          return (
            <div
              key={ann.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">{ann.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  {new Date(ann.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>

              <p className="text-slate-300 leading-relaxed">{ann.message}</p>

              <div className="pt-2 text-[10px] text-slate-500">
                Publié par <span className="text-slate-400 font-medium">{ann.createdBy}</span>
              </div>
            </div>
          );
        })}

        {announcements.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic bg-slate-900/40 rounded-2xl border border-slate-800">
            Aucune annonce en cours de diffusion.
          </div>
        )}
      </div>

      {/* Modal Nouvelle Annonce */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Diffuser une Annonce</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Type d'annonce</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="info">Information générale</option>
                  <option value="maintenance">Maintenance planifiée</option>
                  <option value="nouveaute">Nouvelle fonctionnalité</option>
                  <option value="urgent">Alerte urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Titre du message *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mise à jour du module fiscal DGI 2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contenu détaillé *</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Une opération de maintenance aura lieu ce dimanche de 02h à 04h..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Publication...' : 'Publier et Diffuser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
