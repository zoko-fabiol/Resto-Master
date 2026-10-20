import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Delete,
  Clock,
  Sparkles,
  UserCheck,
  AlertCircle,
  Building2,
  LogOut,
} from 'lucide-react';

interface PinLockScreenProps {
  onUnlockSuccess?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlockSuccess }) => {
  const { unlockSessionWithPin, isSessionLocked, logout, currentUser, setIsSessionLocked } = useAuth();
  const { activeRestaurant, currentDeviceProfile } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Horloge en temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Détection automatique quand 4 chiffres sont saisis
  useEffect(() => {
    if (pin.length === 4 && !isVerifying) {
      handleValidate(pin);
    }
  }, [pin, isVerifying]);

  // Support clavier physique pour déverrouiller la session
  useEffect(() => {
    if (!isSessionLocked || isVerifying) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionLocked, isVerifying, pin]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6 && !isVerifying) {
      setPin((prev) => prev + num);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    if (!isVerifying) {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    if (!isVerifying) {
      setPin('');
      setErrorMsg('');
    }
  };

  const handleValidate = async (pinToTest: string) => {
    setIsVerifying(true);
    setErrorMsg('');

    try {
      // Déverrouillage sécurisé par Cloud Function (vérification PBKDF2 et détection lockout)
      const res = await unlockSessionWithPin(pinToTest, currentDeviceProfile?.terminalId);

      if (res.success && res.user) {
        playAudioChime('success');
        showToast(`Session déverrouillée : Bienvenue ${res.user.name}`, 'success');
        setPin('');
        setErrorMsg('');
        if (onUnlockSuccess) onUnlockSuccess();
        return;
      }

      // Échec de validation
      playAudioChime('warning');
      setIsShaking(true);
      setErrorMsg(res.message || 'Code PIN incorrect. Veuillez vérifier et réessayer.');
      setTimeout(() => {
        setPin('');
        setIsShaking(false);
      }, 600);
    } catch (err: any) {
      playAudioChime('warning');
      setIsShaking(true);
      setErrorMsg(err?.message || 'Erreur lors de la validation du code PIN.');
      setTimeout(() => {
        setPin('');
        setIsShaking(false);
      }, 600);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isSessionLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-white select-none animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm flex flex-col items-center relative z-10 space-y-6">
        {/* En-tête : Restaurant & Horodatage précis */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-amber-400 font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>{activeRestaurant?.name || 'RestoMaster OS'}</span>
          </div>

          {/* Horloge géante */}
          <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-slate-100">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xs text-slate-400 font-medium capitalize">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Titre & Message */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 text-slate-950 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-white">Session Verrouillée</h2>
          <p className="text-xs text-slate-400">
            Composez votre <span className="text-amber-400 font-bold">Code PIN Personnel</span> pour accéder au système
          </p>
        </div>

        {/* PIN Indicators (Puces 4 chiffres) */}
        <div
          className={`flex items-center gap-4 py-2 transition-transform duration-200 ${
            isShaking ? 'translate-x-2 animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400/50'
                    : 'bg-slate-800 border-2 border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Message d'erreur si échec */}
        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pavé Numérique Tactile 0-9 (Format Caisse / Smartphone) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800 hover:border-slate-700 text-2xl font-bold font-mono transition-all duration-150 flex items-center justify-center shadow-md shadow-black/40 hover:scale-105 active:scale-95"
            >
              {digit}
            </button>
          ))}

          {/* Ligne inférieure : Effacer, 0, Valider */}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl bg-slate-900/40 hover:bg-slate-800/70 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all flex flex-col items-center justify-center hover:scale-105 active:scale-95"
            title="Effacer tout"
          >
            <Delete className="w-5 h-5 mb-0.5" />
            <span>C</span>
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800 hover:border-slate-700 text-2xl font-bold font-mono transition-all duration-150 flex items-center justify-center shadow-md shadow-black/40 hover:scale-105 active:scale-95"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-slate-900/40 hover:bg-slate-800/70 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all flex items-center justify-center hover:scale-105 active:scale-95"
            title="Effacer le dernier chiffre"
          >
            ←
          </button>
        </div>

        {/* Actions alternatives de secours */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          {currentUser && currentUser.role === 'superadmin' && (
            <button
              type="button"
              onClick={() => {
                setIsSessionLocked(false);
                showToast('Session déverrouillée avec privilèges Super Administrateur', 'info');
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Déverrouiller (Superadmin)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => logout()}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>

      {/* Footer Sécurité RestoMaster */}
      <div className="absolute bottom-4 text-center text-[10px] text-slate-600 font-mono">
        RestoMaster OS • Authentification Sécurisée ISO-PIN • Traçabilité Horodatée
      </div>
    </div>
  );
};
