import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { SupervisorPinModal } from '../auth/SupervisorPinModal';
import {
  Tv,
  Clock,
  Sparkles,
  CheckCircle2,
  Flame,
  Volume2,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Radio,
  Settings,
} from 'lucide-react';

interface CustomerOrderDisplayViewProps {
  onExit?: () => void;
}

export const CustomerOrderDisplayView: React.FC<CustomerOrderDisplayViewProps> = ({ onExit }) => {
  const { orders, settings } = useRestaurant();
  const { playAudioChime } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [prevReadyOrderCount, setPrevReadyOrderCount] = useState(0);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders:
  // "in_prep": nouveau, envoye, en_preparation
  // "ready": pret
  const inPrepOrders = useMemo(() => {
    return orders
      .filter(
        (o) =>
          o.status === 'nouveau' ||
          o.status === 'envoye' ||
          o.status === 'en_preparation'
      )
      .slice(0, 16);
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'pret').slice(0, 16);
  }, [orders]);

  // Audio alert when a new order becomes ready
  useEffect(() => {
    if (readyOrders.length > prevReadyOrderCount) {
      playAudioChime('kitchen');
    }
    setPrevReadyOrderCount(readyOrders.length);
  }, [readyOrders.length, prevReadyOrderCount, playAudioChime]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header */}
      <header className="h-20 px-8 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        {/* Left: Brand & TV badge */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/20">
            {settings.name.charAt(0) || 'R'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
              {settings.name}
            </h1>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>Affichage Retrait des Commandes (Display TV)</span>
            </p>
          </div>
        </div>

        {/* Center: Live instruction */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-800/60 border border-slate-700/60 px-5 py-2.5 rounded-full text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Veuillez vous présenter au comptoir dès que votre numéro s'affiche en vert</span>
        </div>

        {/* Right: Clock & Actions */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white tracking-wider">
              {currentTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-[11px] text-slate-400 capitalize">
              {currentTime.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Plein Écran"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowSupervisorModal(true)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
            title="Quitter le mode affichage TV (PIN Superviseur)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Dual Columns Screen */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left Column: EN PRÉPARATION (Jaune / Ambre) */}
        <div className="bg-slate-900/60 border-2 border-amber-500/30 rounded-3xl p-6 flex flex-col shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-wide">
                  En Préparation
                </h2>
                <p className="text-xs text-slate-400">Vos plats mijotent en cuisine</p>
              </div>
            </div>
            <span className="text-sm font-black px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {inPrepOrders.length} en cours
            </span>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3.5 content-start pr-1 custom-scrollbar">
            {inPrepOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500 text-sm italic">
                Toutes les commandes sont prêtes !
              </div>
            ) : (
              inPrepOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-slate-800/80 border border-amber-500/20 rounded-2xl p-4 text-center shadow-lg hover:border-amber-400/50 transition-all flex flex-col justify-center"
                >
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Bon / Bip
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight">
                    #{ord.orderNumber.replace(/^[A-Za-z]+-/, '')}
                  </div>
                  {ord.tableName && (
                    <div className="text-[11px] font-bold text-slate-400 mt-1">
                      {ord.tableName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: PRÊT AU COMPTOIR (Vert Émeraude Vif) */}
        <div className="bg-slate-900/60 border-2 border-emerald-500/40 rounded-3xl p-6 flex flex-col shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-emerald-400 uppercase tracking-wide">
                  Prêt au Comptoir
                </h2>
                <p className="text-xs text-slate-400">Veuillez récupérer votre plateau</p>
              </div>
            </div>
            <span className="text-sm font-black px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {readyOrders.length} prêts
            </span>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3.5 content-start pr-1 custom-scrollbar">
            {readyOrders.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500 text-sm italic">
                En attente des prochaines sorties de cuisine...
              </div>
            ) : (
              readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-gradient-to-b from-emerald-950/60 to-slate-900 border-2 border-emerald-400 rounded-2xl p-4 text-center shadow-xl shadow-emerald-500/10 animate-pulse flex flex-col justify-center"
                >
                  <div className="text-xs font-black text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Prêt</span>
                  </div>
                  <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-300 tracking-tight">
                    #{ord.orderNumber.replace(/^[A-Za-z]+-/, '')}
                  </div>
                  {ord.tableName && (
                    <div className="text-xs font-black text-white mt-1 bg-emerald-900/60 py-0.5 rounded-lg border border-emerald-500/30">
                      {ord.tableName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Info Ticker */}
      <footer className="h-12 px-8 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="font-semibold text-slate-300">
            Système d'Appel Retrait Client Automatisé • RestoMaster QSR
          </span>
        </div>
        <div className="font-mono text-slate-500">
          Station TV #{settings.id || 'DISPLAY-01'}
        </div>
      </footer>

      {/* Supervisor PIN Modal to Exit or Unpair */}
      <SupervisorPinModal
        isOpen={showSupervisorModal}
        onClose={() => setShowSupervisorModal(false)}
        onSuccess={() => {
          setShowSupervisorModal(false);
          if (onExit) onExit();
        }}
        title="Quitter l'Affichage Retrait TV"
        description="Saisissez le code PIN Superviseur (Direction ou Manager) pour quitter le mode plein écran TV."
      />
    </div>
  );
};
