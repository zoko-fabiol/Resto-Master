import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Lock, Delete, X, AlertTriangle } from 'lucide-react';

interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supervisor?: any) => void;
  title?: string;
  description?: string;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Autorisation Superviseur / Admin requise',
  description = 'Veuillez saisir votre Code PIN Manager ou Direction pour autoriser cette action.',
}) => {
  const { verifySupervisorPin } = useAuth();
  const { showToast, playAudioChime } = useToast();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (pin.length === 4) {
      handleValidate(pin);
    }
  }, [pin]);

  // Support complet du clavier physique (chiffres 0-9, pavé numérique, Backspace, Escape, Suppr)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Delete' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const handleValidate = (pinToTest: string) => {
    const res = verifySupervisorPin(pinToTest);
    if (res.success) {
      playAudioChime('success');
      showToast(`Autorisation accordée par ${res.user?.name || 'Superviseur'}`, 'success');
      onSuccess(res.user);
      onClose();
    } else {
      playAudioChime('error');
      setIsShaking(true);
      setErrorMsg('Code PIN Superviseur incorrect ou droits insuffisants.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ${
          isShaking ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
              <p className="text-xs text-slate-400">Sécurité & Contrôle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center">
          <p className="text-xs text-center text-slate-300 mb-4">{description}</p>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-3 mb-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-amber-400 scale-110 shadow-lg shadow-amber-400/50 ring-2 ring-amber-400/30'
                      : 'bg-slate-700 border border-slate-600'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg mb-4 text-center">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* NumPad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-100 font-semibold text-lg border border-slate-700/50 shadow-sm transition-all"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-medium text-xs border border-slate-700/30 active:scale-95 transition-all flex items-center justify-center"
            >
              Effacer
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-100 font-semibold text-lg border border-slate-700/50 shadow-sm transition-all"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 active:scale-95 border border-slate-700/30 transition-all flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 text-[11px] text-slate-500 text-center">
            Codes Démo Superviseur : <span className="text-amber-400 font-mono">1111</span> (Direction) ou{' '}
            <span className="text-amber-400 font-mono">2222</span> (Manager)
          </div>
        </div>
      </div>
    </div>
  );
};
