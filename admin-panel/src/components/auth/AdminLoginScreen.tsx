import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminLoginScreen: React.FC = () => {
  const { loginStep1, verifyMfa, mfaPending, isLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe administrateur.');
      return;
    }

    try {
      setSubmitting(true);
      await loginStep1(email, password);
    } catch (err: any) {
      setError(err?.message || 'Identifiants invalides ou privilèges insuffisants.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Mfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!totpCode || totpCode.trim().length !== 6) {
      setError('Veuillez saisir le code de vérification à 6 chiffres.');
      return;
    }

    try {
      setSubmitting(true);
      await verifyMfa(totpCode);
    } catch (err: any) {
      setError(err?.message || 'Code de sécurité invalide.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 mb-4 font-black text-2xl">
            RM
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            CONSOLE CENTRALE PLATFORME
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">RestoMaster Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Gestion à distance des restaurants, déploiement des fonctionnalités et supervision SaaS.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!mfaPending ? (
          /* Step 1 : Email + Mot de passe */
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Adresse email administrateur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restomaster.os"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mot de passe sécurisé
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Authentification...' : 'Continuer vers la console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Step 2 : Code TOTP MFA à 6 chiffres */
          <form onSubmit={handleStep2Mfa} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">Vérification en 2 Étapes (MFA)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Saisissez le code de sécurité à 6 chiffres généré par votre application d'authentification.
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full py-3.5 text-center text-2xl tracking-[0.5em] font-mono bg-slate-950 border border-slate-800 rounded-xl text-amber-400 placeholder-slate-700 focus:outline-hidden focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || totpCode.length !== 6}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Vérification...' : 'Valider et Accéder'}</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Accès strictement réservé aux administrateurs RestoMaster OS</span>
        </div>
      </div>
    </div>
  );
};
