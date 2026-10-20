import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import {
  Key,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface ChangeMyPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeMyPinModal: React.FC<ChangeMyPinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateCurrentUserPin, verifyCurrentUserPin } = useAuth();
  const { userAccounts, updateUserAccount, addAuditLog } = useRestaurant();
  const { showToast, playAudioChime } = useToast();

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setErrorMsg('');
      setShowPins(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Générer un code PIN aléatoire 4 chiffres
  const handleGeneratePin = () => {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(candidate);
    setConfirmPin(candidate);
    setShowPins(true);
    setErrorMsg('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Vérification de l'ancien PIN si l'utilisateur en possédait déjà un
    if (currentUser.hasPin) {
      const isOldValid = await verifyCurrentUserPin(oldPin);
      if (!isOldValid) {
        setErrorMsg('L\'ancien code PIN saisi est incorrect.');
        playAudioChime('error');
        return;
      }
    }

    // 2. Format 4 chiffres
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setErrorMsg('Le nouveau code PIN doit comporter exactement 4 chiffres.');
      playAudioChime('warning');
      return;
    }

    // 3. Confirmation identique
    if (newPin !== confirmPin) {
      setErrorMsg('Les deux nouveaux codes PIN ne correspondent pas.');
      playAudioChime('warning');
      return;
    }

    setIsSubmitting(true);
    try {
      // Mise à jour sécurisée via AuthContext (hachage PBKDF2)
      await updateCurrentUserPin(newPin);

      // Mise à jour dans RestaurantContext si le compte existe dans la liste
      const matchedAccount = userAccounts.find(
        (a) => a.id === currentUser.id || a.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (matchedAccount) {
        await updateUserAccount(matchedAccount.id, { hasPin: true });
      }

      // Audit log
      addAuditLog(
        'Modification Code PIN Personnel',
        'Personnel',
        `${currentUser.name} (${currentUser.role}) a mis à jour son code PIN personnel de connexion.`,
        currentUser.id
      );

      playAudioChime('success');
      showToast('Votre code PIN a été modifié avec succès.', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la mise à jour du code PIN.');
      playAudioChime('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Modifier mon Code PIN
              </h3>
              <p className="text-[11px] text-slate-500">
                Sécurisez votre accès RestoMaster
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profil Récap */}
        <div className="my-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-amber-500/30 shrink-0">
              {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : 'RM'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{currentUser.email}</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
            {currentUser.role}
          </span>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Ancien PIN (si l'utilisateur en possède un) */}
          {currentUser.hasPin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ancien Code PIN (Actuel)
              </label>
              <input
                type={showPins ? 'text' : 'password'}
                maxLength={4}
                required
                placeholder="••••"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center tracking-widest text-lg font-bold outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          )}

          {/* Nouveau PIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Nouveau Code PIN (4 chiffres)
              </label>
              <button
                type="button"
                onClick={handleGeneratePin}
                className="text-[10px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-amber-600" />
                <span>Générer un PIN</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                maxLength={4}
                required
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center tracking-widest text-lg font-bold outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPins ? 'Masquer' : 'Afficher'}
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmation du Nouveau PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmer le Nouveau Code PIN
            </label>
            <input
              type={showPins ? 'text' : 'password'}
              maxLength={4}
              required
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono text-center tracking-widest text-lg font-bold outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 ${
                confirmPin && confirmPin !== newPin ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
              }`}
            />
          </div>

          {/* Messages de validation */}
          {errorMsg ? (
            <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : newPin.length === 4 && newPin === confirmPin ? (
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Nouveau code PIN valide et confirmé</span>
            </div>
          ) : null}

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newPin.length !== 4 || newPin !== confirmPin}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all ${
                isSubmitting || newPin.length !== 4 || newPin !== confirmPin
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
              }`}
            >
              {isSubmitting ? 'Enregistrement...' : 'Valider le PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
