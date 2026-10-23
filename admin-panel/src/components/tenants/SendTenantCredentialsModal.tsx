import React, { useState, useEffect } from 'react';
import {
  Mail,
  X,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Store,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Tenant, DEFAULT_PLANS, Plan } from '@shared';
import { db } from '../../../../src/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { adminPlatformService } from '../../services/adminPlatformService';
import { gasEmailService } from '../../services/gasEmailService';

interface SendTenantCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSent?: (result: { restaurantCode: string; emailSent: boolean }) => void;
}

export const SendTenantCredentialsModal: React.FC<SendTenantCredentialsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSent,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantCode, setRestaurantCode] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [planName, setPlanName] = useState('');
  const [city, setCity] = useState('Douala');
  const [isFromSignup, setIsFromSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Générateur de mot de passe temporaire aléatoire convivial
  const generateRandomPassword = () => {
    const prefixes = ['Resto', 'Master', 'Chef', 'Saveur', 'Table'];
    const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const chars = '#@$!';
    const special = chars[Math.floor(Math.random() * chars.length)];
    return `${pfx}${num}${special}`;
  };

  // Générateur de code boutique / restaurant unique
  const generateBoutiqueCode = (cityName?: string) => {
    const cityLetters = (cityName || city || 'RMS')
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'RMS';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RMS-${cityLetters}-${num}`;
  };

  useEffect(() => {
    if (tenant && isOpen) {
      const raw = tenant as any;
      let initialEmail =
        tenant.owner?.email ||
        raw.ownerEmail ||
        tenant.company?.email ||
        raw.email ||
        raw.applicantEmail ||
        '';
      let initialName =
        tenant.owner?.name ||
        raw.ownerName ||
        raw.applicantName ||
        tenant.company?.name ||
        raw.companyName ||
        'Responsable Restaurant';
      const rName = tenant.company?.name || raw.companyName || tenant.id;
      const cCity = tenant.company?.city || raw.city || 'Douala';
      const existingCode = raw.restaurantCode || generateBoutiqueCode(cCity);
      const matchedPlan = DEFAULT_PLANS.find((p: Plan) => p.id === tenant.planId);

      setRecipientEmail(initialEmail);
      setRecipientName(initialName);
      setRestaurantName(rName);
      setRestaurantCode(existingCode);
      setCity(cCity);
      setPlanName(matchedPlan?.name || 'Formule Professionnelle (Pro)');
      setTemporaryPassword(generateRandomPassword());
      setStatusFeedback(null);
      setShowEmailPreview(false);
      setIsFromSignup(false);

      // Récupération systématique du mail de la demande d'adhésion d'origine (tenant_signups)
      const lookupSignup = async () => {
        try {
          const directReqId = `req_${tenant.id.replace('org_', '')}`;
          const directSnap = await getDoc(doc(db, 'tenant_signups', directReqId));
          if (directSnap.exists()) {
            const sData = directSnap.data();
            if (sData.email) {
              setRecipientEmail(sData.email);
              setIsFromSignup(true);
            }
            if (sData.applicantName) {
              setRecipientName(sData.applicantName);
            }
            return;
          }

          // Recherche par orgId dans la collection tenant_signups
          const q = query(collection(db, 'tenant_signups'), where('orgId', '==', tenant.id));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const sData = qSnap.docs[0].data();
            if (sData.email) {
              setRecipientEmail(sData.email);
              setIsFromSignup(true);
            }
            if (sData.applicantName) {
              setRecipientName(sData.applicantName);
            }
          }
        } catch (e) {
          console.warn('[SendTenantCredentialsModal] Recherche demande signup ignorée:', e);
        }
      };

      lookupSignup();
    }
  }, [tenant, isOpen]);

  if (!isOpen || !tenant) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRegeneratePassword = () => {
    setTemporaryPassword(generateRandomPassword());
  };

  const handleRegenerateCode = () => {
    setRestaurantCode(generateBoutiqueCode(city));
  };

  const handleSendCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusFeedback(null);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setStatusFeedback({ type: 'error', text: 'Veuillez saisir une adresse email de destination valide.' });
      return;
    }
    if (!restaurantCode.trim()) {
      setStatusFeedback({ type: 'error', text: 'Le code restaurant / numéro de boutique est obligatoire.' });
      return;
    }

    try {
      setIsSending(true);
      const res = await adminPlatformService.sendTenantCredentials({
        orgId: tenant.id,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim() || 'Responsable',
        restaurantName: restaurantName.trim(),
        restaurantCode: restaurantCode.trim(),
        temporaryPassword: temporaryPassword.trim(),
        planName,
        city,
        updateUserPassword: true,
      });

      setStatusFeedback({
        type: 'success',
        text: `Identifiants expédiés avec succès à ${recipientEmail} ! ${res.message}`,
      });

      if (onSent) {
        onSent({ restaurantCode: res.restaurantCode, emailSent: res.emailSent });
      }
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        text: `Échec d'expédition : ${err?.message || 'Erreur réseau ou webhook'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Calcul du lien de pré-remplissage pour aperçu
  const clientBaseUrl =
    (import.meta as any).env?.VITE_APP_CLIENT_URL ||
    (window.location.port === '3001' ? `${window.location.protocol}//${window.location.hostname}:3000` : window.location.origin);
  const directLoginUrl = `${clientBaseUrl}/?restaurantCode=${encodeURIComponent(restaurantCode)}&email=${encodeURIComponent(recipientEmail)}`;

  const previewHtml = gasEmailService.buildWelcomeEmailHtml({
    to: recipientEmail || 'gestionnaire@restaurant.cm',
    recipientName: recipientName || 'Responsable',
    restaurantName: restaurantName || 'Restaurant Client',
    restaurantCode: restaurantCode || 'RMS-DLA-0000',
    email: recipientEmail || 'gestionnaire@restaurant.cm',
    password: temporaryPassword || 'Resto9823!',
    planName,
    city,
    loginUrl: directLoginUrl,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5 relative">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Transmission des Identifiants</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  E-MAIL OFFICIEL DESIGNÉ
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Établissement : <strong className="text-white">{restaurantName}</strong> ({tenant.id})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message de statut / feedback */}
        {statusFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
              statusFeedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {statusFeedback.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold">{statusFeedback.type === 'success' ? 'Expédition Réussie !' : 'Erreur'}</div>
              <div>{statusFeedback.text}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendCredentials} className="space-y-4 text-xs">
          {/* Bloc 1 : Coordonnées du Destinataire */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>Destinataire du Restaurant</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nom du Responsable / Adhérent</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex: Claudel Wandji"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Adresse E-mail de Réception *</label>
                  {isFromSignup && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Demande d'adhésion
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Ex: proprietaire@restaurant.cm"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bloc 2 : Identifiants Officiels (Boutique & Mot de passe) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Identifiants de Connexion RestoMaster OS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Numéro de Boutique / Code Restaurant */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Code Boutique / Restaurant</label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regénérer
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={restaurantCode}
                    onChange={(e) => setRestaurantCode(e.target.value.toUpperCase())}
                    placeholder="RMS-DLA-1234"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 font-mono font-bold tracking-wider focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(restaurantCode, 'code')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 p-1 cursor-pointer"
                    title="Copier le code boutique"
                  >
                    {copiedKey === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Numéro unique utilisé pour rattacher les caisses, serveurs et KDS.
                </p>
              </div>

              {/* Mot de Passe Temporaire Aléatoire */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-medium">Mot de passe temporaire</label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Nouveau Aléatoire
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-3.5 pr-16 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sky-300 font-mono font-bold focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(temporaryPassword, 'password')}
                      className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
                      title="Copier le mot de passe"
                    >
                      {copiedKey === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Transmis dans l'e-mail avec consigne de changement à la première connexion.
                </p>
              </div>
            </div>
          </div>

          {/* Lien Direct de Connexion Pré-rempli */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bouton 1-Clic Intégré dans l'E-mail</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Le bouton d'accès du mail ouvrira directement RestoMaster OS avec le code boutique et l'adresse e-mail pré-remplis automatiquement.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400 truncate">
              <span className="shrink-0 text-amber-400 font-bold">Lien :</span>
              <span className="truncate">{directLoginUrl}</span>
            </div>
          </div>

          {/* Toggle Aperçu HTML de l'E-mail */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="text-xs font-bold text-slate-300 hover:text-amber-400 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {showEmailPreview ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-amber-400" />}
              <span>{showEmailPreview ? 'Masquer l’aperçu du mail' : 'Visualiser le design du mail avant envoi'}</span>
            </button>

            {showEmailPreview && (
              <div className="rounded-2xl border border-slate-700 overflow-hidden bg-slate-950 p-1 shadow-inner">
                <iframe
                  title="Aperçu E-mail RestoMaster OS"
                  srcDoc={previewHtml}
                  className="w-full h-80 rounded-xl bg-slate-950 border-0"
                />
              </div>
            )}
          </div>

          {/* Boutons d'Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Fermer
            </button>

            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Expédition en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer les Identifiants par E-mail</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
