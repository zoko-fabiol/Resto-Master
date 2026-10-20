import React, { useState } from 'react';
import {
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Tablet,
  User,
  Key,
  Lock,
  Building2,
} from 'lucide-react';
import { UserRole, AccountType } from '../../types/restaurant';
import { ROLE_LABELS } from '../../lib/utils';

export interface CredentialHandoverData {
  name: string;
  email: string;
  role: UserRole;
  accountType?: AccountType;
  assignedTableName?: string;
  temporaryPassword?: string;
  generatedPin?: string;
  title?: string;
}

interface CredentialHandoverModalProps {
  isOpen: boolean;
  data: CredentialHandoverData | null;
  onClose: () => void;
  issuerName?: string;
  issuerEmail?: string;
  restaurantName?: string;
}

export const CredentialHandoverModal: React.FC<CredentialHandoverModalProps> = ({
  isOpen,
  data,
  onClose,
  issuerName = 'Direction du Restaurant',
  issuerEmail = '',
  restaurantName = 'RestoMaster OS',
}) => {
  const [showPassword, setShowPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const roleInfo = ROLE_LABELS[data.role] || { label: data.role, color: 'bg-slate-100 text-slate-800' };
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Header Modal (Écran) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center font-black shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  Document Confidentiel
                </span>
                <span className="text-xs text-slate-400">Affichage Unique</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {data.title || 'Fiche de Remise Sécurisée d’Identifiants'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la Modale */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Avertissement sécurité (Écran) */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 print:hidden">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-0.5">
              <p className="font-bold">Informations strictement confidentielles à usage unique</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Ce mot de passe temporaire et ce code PIN ne seront plus jamais réaffichés en clair. Imprimez immédiatement cette fiche pour remise en main propre au collaborateur ou notez-les en lieu sûr.
              </p>
            </div>
          </div>

          {/* DOCUMENT OFFICIEL IMPRIMABLE (A4 Stylé) */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 print:bg-white print:border-none print:p-0 space-y-6">
            {/* Entête Document Imprimable */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-900" />
                    <span className="font-black text-base uppercase text-slate-900 tracking-tight">
                      {restaurantName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Système de Gestion Intégrée RestoMaster OS • Direction & Sécurité
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-slate-900 text-white tracking-widest inline-block">
                    CONFIDENTIEL
                  </span>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Émis le {dateStr} à {timeStr}
                  </p>
                </div>
              </div>

              <h2 className="text-center font-black text-sm uppercase tracking-wider text-slate-900 mt-4 pt-2 border-t border-slate-200">
                Fiche d'Attribution d'Identifiants & Codes d'Accès Sécurisés
              </h2>
            </div>

            {/* Fiche Bénéficiaire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Bénéficiaire / Borne</span>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  {data.accountType === 'tablette' ? (
                    <Tablet className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <User className="w-4 h-4 text-slate-700" />
                  )}
                  <span>{data.name}</span>
                </div>
                {data.assignedTableName && (
                  <div className="text-amber-700 font-semibold text-[11px]">
                    Borne assignée à : {data.assignedTableName}
                  </div>
                )}
              </div>

              <div className="space-y-1 p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400">Rôle Métier & Privilèges</span>
                <div className="font-bold text-sm text-slate-900">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  {data.accountType === 'tablette' ? 'Mode Kiosk Client Tactile' : 'Accès Applicatif RestoMaster OS'}
                </div>
              </div>
            </div>

            {/* Identifiants Confidentiels */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Codes Confidentiels d'Authentification
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identifiant Email */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Identifiant de Connexion</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(data.email, 'email')}
                      className="text-slate-400 hover:text-slate-800 p-1 rounded print:hidden"
                      title="Copier l'identifiant"
                    >
                      {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-900 mt-1 break-all">
                    {data.email}
                  </div>
                </div>

                {/* Mot de passe temporaire (si fourni) */}
                {data.temporaryPassword && (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Mot de Passe Temporaire</span>
                      </span>
                      <div className="flex items-center gap-1 print:hidden">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-800 p-1 rounded"
                          title={showPassword ? 'Masquer' : 'Afficher'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(data.temporaryPassword!, 'password')}
                          className="text-slate-400 hover:text-slate-800 p-1 rounded"
                          title="Copier le mot de passe"
                        >
                          {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-sm text-amber-900 tracking-wider mt-1 bg-amber-50/50 px-2 py-1 rounded border border-amber-200/50 inline-block">
                      {showPassword ? data.temporaryPassword : '••••••••••••'}
                    </div>
                  </div>
                )}

                {/* Code PIN Serveur (si fourni) */}
                {data.generatedPin && (
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 relative group sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Key className="w-3 h-3 text-indigo-600" />
                        <span>Code PIN Tactile (Déverrouillage Rapide & POS)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(data.generatedPin!, 'pin')}
                        className="text-slate-400 hover:text-slate-800 p-1 rounded print:hidden"
                        title="Copier le code PIN"
                      >
                        {copiedField === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <div className="font-mono font-black text-2xl tracking-widest text-indigo-900 bg-indigo-50/80 px-4 py-1.5 rounded-xl border border-indigo-200 inline-block tabular-nums">
                        {data.generatedPin}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Code secret à composer sur l'écran tactile pour ouvrir la session ou déverrouiller le poste.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Engagement de Confidentialité */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p className="font-bold text-slate-900">Engagement du Titulaire :</p>
              <p>
                1. Les identifiants et codes PIN attribués sont strictement personnels, confidentiels et incessibles.
              </p>
              <p>
                2. Toute transaction, commande, annulation ou mouvement de caisse opéré sous ce profil engage la responsabilité de son titulaire.
              </p>
              <p>
                3. Le mot de passe temporaire doit obligatoirement être modifié dès la première ouverture de session.
              </p>
            </div>

            {/* Bloc d'Émargement & Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300">
              <div className="space-y-10">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Émis & Certifié par</span>
                  <div className="font-bold text-xs text-slate-900 mt-0.5">{issuerName}</div>
                  {issuerEmail && <div className="text-[10px] font-mono text-slate-500">{issuerEmail}</div>}
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-400">
                  Cachet & Signature de la Direction
                </div>
              </div>

              <div className="space-y-10">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Reçu en main propre par</span>
                  <div className="font-bold text-xs text-slate-900 mt-0.5">{data.name}</div>
                  <div className="text-[10px] text-slate-500">Mention manuscrite « Lu et approuvé »</div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-400">
                  Signature du Collaborateur
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de Modale & Actions (Écran) */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Fermer sans imprimer
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer la Fiche de Remise</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              Terminer & Continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
