import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogOut, Bell, Clock, User, Sparkles } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminHeader: React.FC = () => {
  const { currentAdmin, logout } = useAdminAuth();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Africa/Douala',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date())
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    platform_owner: { label: 'Propriétaire Plateforme', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    platform_admin: { label: 'Super Administrateur', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    support: { label: 'Ingénieur Support', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    billing: { label: 'Gestionnaire Facturation', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    viewer: { label: 'Observateur', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  };

  const roleInfo = currentAdmin?.role
    ? roleLabelMap[currentAdmin.role] || { label: currentAdmin.role, color: 'bg-slate-800 text-slate-300 border-slate-700' }
    : { label: 'Admin', color: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <header className="h-16 px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
      {/* Horloge serveur & statut plateforme */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono tabular-nums text-slate-200">{time || '00:00:00'}</span>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">WAT (GMT+1)</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-300">Firebase europe-west1</span>
        </div>
      </div>

      {/* Profil Admin & Déconnexion */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 pr-3 border-r border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20">
            {currentAdmin?.name ? currentAdmin.name.slice(0, 2).toUpperCase() : 'SA'}
          </div>

          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{currentAdmin?.name || 'Super Administrateur'}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate max-w-[180px]">
              {currentAdmin?.email}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Déconnexion sécurisée"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
