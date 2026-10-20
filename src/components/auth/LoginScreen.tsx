import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Utensils, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithEmail, sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Mode réinitialisation mot de passe
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const getFrenchAuthErrorMessage = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Adresse e-mail ou mot de passe incorrect.';
      case 'auth/user-disabled':
        return 'Ce compte utilisateur a été désactivé par l\'administration.';
      case 'auth/network-request-failed':
        return 'Connexion réseau impossible. Veuillez vérifier votre accès Internet.';
      case 'auth/too-many-requests':
        return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants avant de réessayer.';
      default:
        return error?.message || 'Erreur d\'authentification. Veuillez vérifier vos identifiants.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Veuillez renseigner votre adresse e-mail et votre mot de passe.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(getFrenchAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Veuillez saisir votre adresse e-mail.');
      return;
    }

    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(getFrenchAuthErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Conteneur principal */}
      <div className="w-full max-w-md relative z-10">
        {/* En-tête / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-xl shadow-amber-500/20 text-slate-950 mb-4 ring-1 ring-amber-400/30">
            <Utensils className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            RestoMaster <span className="text-amber-400">OS</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Système d'exploitation intégré pour restaurants & établissements
          </p>
        </div>

        {/* Carte de Connexion */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {!isResetMode ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Connexion Sécurisée</h2>
                <p className="text-xs text-slate-400">
                  Accédez à votre espace de gestion avec vos identifiants autorisés.
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Champ Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300">
                  Adresse e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="direction@votre-restaurant.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setResetEmail(email);
                      setErrorMessage('');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bouton de Connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vérification des accès...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Se connecter à la plateforme</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Formulaire Réinitialisation Mot de passe */
            <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setResetError('');
                    setResetSuccess(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour à la connexion</span>
                </button>
                <h2 className="text-lg font-bold text-white mb-1">Réinitialiser le mot de passe</h2>
                <p className="text-xs text-slate-400">
                  Saisissez l'adresse e-mail associée à votre compte pour recevoir un lien sécurisé.
                </p>
              </div>

              {resetSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    Un lien de réinitialisation a été envoyé à votre adresse e-mail. Veuillez consulter votre boîte de réception.
                  </span>
                </div>
              )}

              {resetError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-300">
                  Adresse e-mail du compte
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="direction@votre-restaurant.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <span>Envoyer les instructions</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Mentions de sécurité et absence d'inscription publique */}
        <div className="mt-6 text-center text-xs text-slate-500">
          <p>
            Plateforme réservée au personnel autorisé. Tout accès non habilité est consigné dans le journal d'audit.
          </p>
        </div>
      </div>
    </div>
  );
};
