import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminLoginScreen: React.FC = () => {
  const { loginStep1, verifyMfa, registerInitialSuperadmin, mfaPending, isLoading } = useAdminAuth();
  const [authMode, setAuthMode] = useState<'login' | 'setup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getFrenchErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Adresse email ou mot de passe incorrect. Si ce compte n\'a pas encore été créé, utilisez l\'onglet "Amorcer le compte Fondateur" ci-dessous.';
      case 'auth/email-already-in-use':
        return 'Un compte existe déjà avec cette adresse email. Veuillez utiliser l\'onglet Connexion.';
      case 'auth/weak-password':
        return 'Le mot de passe doit comporter au moins 6 caractères.';
      case 'auth/too-many-requests':
        return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants.';
      default:
        return err?.message || 'Erreur lors de l’authentification.';
    }
  };

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
      setError(getFrenchErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Veuillez renseigner un email et un mot de passe.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      setSubmitting(true);
      await registerInitialSuperadmin(email, password, fullName);
    } catch (err: any) {
      setError(getFrenchErrorMessage(err));
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

  const handleQuickMfaFill = async () => {
    setTotpCode('123456');
    try {
      setSubmitting(true);
      await verifyMfa('123456');
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
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 mb-3 font-black text-2xl">
            RM
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-400 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            CONSOLE CENTRALE PLATEFORME
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">RestoMaster Admin Panel</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Gestion à distance des restaurants, déploiement des fonctionnalités et supervision SaaS.
          </p>
        </div>

        {/* Switch Mode Login / Setup */}
        {!mfaPending && (
          <div className="flex items-center p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('setup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'setup'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Initialiser Fondateur
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!mfaPending ? (
          authMode === 'login' ? (
            /* Mode 1 : Connexion standard */
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
            /* Mode 2 : Premier démarrage / Création Fondateur */
            <form onSubmit={handleSetupSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                Initialisez le premier compte <strong>Super Administrateur Fondateur (platform_owner)</strong> pour piloter la plateforme à distance.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nom complet du Fondateur
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Fondateur RestoMaster"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@restomaster.os"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mot de passe (min. 6 caractères)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{submitting ? 'Création en cours...' : 'Initialiser et Accéder à la Console'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )
        ) : (
          /* Step 2 : Code TOTP MFA à 6 chiffres */
          <form onSubmit={handleStep2Mfa} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">Vérification en 2 Étapes (MFA)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Saisissez le code de sécurité à 6 chiffres pour valider votre accès Super Administrateur.
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

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 text-center">
              💡 Code d'accès rapide de démonstration : <strong>123456</strong>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleQuickMfaFill}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer border border-slate-700"
              >
                Code Rapide 123456
              </button>
              <button
                type="submit"
                disabled={submitting || totpCode.length !== 6}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{submitting ? 'Vérification...' : 'Valider'}</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Console d'Administration RestoMaster OS — Chiffrement TLS 1.3 & Zero-Trust</span>
        </div>
      </div>
    </div>
  );
};
