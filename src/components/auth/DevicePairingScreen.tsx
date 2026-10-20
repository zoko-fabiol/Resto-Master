import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import {
  Monitor,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Tv,
  Tablet,
  ChefHat,
  Receipt,
  Building,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DevicePairingScreenProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DevicePairingScreen: React.FC<DevicePairingScreenProps> = ({ onSuccess, onCancel }) => {
  const { terminals, pairDeviceWithCode, settings, currentDeviceProfile, unpairCurrentDevice } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  const [inputCode, setInputCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePair = async (codeToUse?: string) => {
    const code = (codeToUse || inputCode).trim().toUpperCase();
    if (!code) {
      setErrorMessage("Veuillez saisir un code d'appairage valide.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const profile = await pairDeviceWithCode(code);
      if (profile) {
        playAudioChime('success');
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
        });
        showToast(
          `Terminal appairé avec succès : ${profile.terminalName} (${profile.type})`,
          'success'
        );
        if (onSuccess) onSuccess();
      } else {
        playAudioChime('tap');
        setErrorMessage("Code d'appairage incorrect ou expiré. Vérifiez la console Super Admin.");
      }
    } catch {
      setErrorMessage("Erreur lors de l'activation du terminal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shadow-amber-500/20">
            RM
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide uppercase">
              RestoMaster OS • Provisioning Matériel
            </h2>
            <p className="text-[11px] text-slate-400">{settings.name} — Architecture Multi-Postes</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sécurité Normes ISO / Fiscale 2026</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>

      {/* Main Activation Box */}
      <div className="max-w-xl mx-auto w-full my-8 text-center flex flex-col items-center">
        {/* Device Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/15 animate-pulse">
            <Monitor className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-900 text-amber-400 p-2 rounded-xl shadow-lg border border-slate-700">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
          Appairage du Terminal
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
          Pour installer ce terminal sur le réseau du restaurant, saisissez le <strong>code d’activation à 6 caractères</strong> généré depuis le poste Direction Générale.
        </p>

        {/* Current Paired Terminal Banner */}
        {currentDeviceProfile && (
          <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Poste Actuellement Appairé :</div>
              <div className="text-sm font-black text-white">{currentDeviceProfile.terminalName} ({currentDeviceProfile.type})</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await unpairCurrentDevice();
                showToast('Ce terminal a été désappairé avec succès.', 'info');
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Désappairer ce terminal
            </button>
          </div>
        )}

        {/* Input Form */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="relative">
            <input
              type="text"
              autoFocus
              maxLength={12}
              placeholder="Ex: CSH-101 ou TAB-001"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePair();
              }}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-500 text-center font-mono font-black text-2xl tracking-widest text-white rounded-2xl py-4 px-4 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting || !inputCode.trim()}
            onClick={() => handlePair()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Validation...' : 'Activer et Verrouiller ce Poste'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4 gap-2">
        <div>
          RestoMaster Enterprise Provisioning Protocol • v2.6.0
        </div>
        <div>
          Protection inviolable par certificat de terminal et clé Super Admin
        </div>
      </div>
    </div>
  );
};
