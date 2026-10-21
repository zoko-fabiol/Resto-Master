import React, { useState } from 'react';
import {
  Utensils,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { cloudFunctionsService } from '../../services/functions/cloudFunctionsService';
import { DEFAULT_PLANS } from '../../../shared/types/plans';

// TEMPORAIRE : ce formulaire public sera remplacé par une création de compte
// authentifiée avec vérification d'e-mail et App Check.
interface RestaurantSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestaurantSignupModal: React.FC<RestaurantSignupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [legalForm, setLegalForm] = useState<'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE'>('SARL');
  const [city, setCity] = useState('Douala');
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [desiredPlanId, setDesiredPlanId] = useState('plan_pro');
  const [estimatedTables, setEstimatedTables] = useState<number>(15);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedSignupId, setSubmittedSignupId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!companyName.trim() || !applicantName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    setLoading(true);

    try {
      const res = await cloudFunctionsService.submitSignup({
        companyName: companyName.trim(),
        legalForm,
        city: city.trim(),
        country: 'Cameroun',
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        applicantName: applicantName.trim(),
        desiredPlanId,
        estimatedTables,
      });

      setSubmittedSignupId(res.signupId);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Erreur lors de la soumission de votre demande. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedSignupId(null);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Demande d'Ouverture d'Établissement</h2>
              <p className="text-xs text-slate-400">Rejoignez la plateforme RestoMaster OS</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {submittedSignupId ? (
            /* Écran de Confirmation & Attente d'examen */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Demande Enregistrée avec Succès !</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Votre dossier pour l'établissement <strong className="text-white">{companyName}</strong> a été transmis à la direction de la plateforme RestoMaster sous la référence :
              </p>
              <div className="inline-block px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-400 font-bold">
                {submittedSignupId}
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 text-left space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Prochaines étapes :</span>
                </div>
                <p>1. Notre équipe commerciale examine votre configuration et valide votre plan.</p>
                <p>2. Vous recevrez un e-mail à <span className="text-white font-medium">{email}</span> contenant le lien d'initialisation de votre compte Propriétaire.</p>
                <p>3. Votre essai gratuit de 14 jours débutera dès votre première connexion.</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  Fermer et revenir à la connexion
                </button>
              </div>
            </div>
          ) : (
            /* Formulaire d'inscription */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Établissement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nom du restaurant / bar *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Le Grill du Palais"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Forme juridique
                  </label>
                  <select
                    value={legalForm}
                    onChange={(e) => setLegalForm(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="SARL">SARL</option>
                    <option value="SAS">SAS</option>
                    <option value="SA">SA</option>
                    <option value="ETS">Établissement (ETS)</option>
                    <option value="GIC">GIC</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
              </div>

              {/* Ville & Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ville d'implantation *</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                    <option value="Kribi">Kribi</option>
                    <option value="Garoua">Garoua</option>
                    <option value="Autre">Autre ville</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre estimé de tables
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={estimatedTables}
                    onChange={(e) => setEstimatedTables(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Responsable & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nom & Prénom du responsable *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Ex: Jean-Paul Mbarga"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Téléphone / WhatsApp *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white tabular-nums placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Adresse e-mail professionnelle *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@votre-restaurant.cm"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Choix du plan */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-300">
                  Formule souhaitée (Essai gratuit 14 jours inclus)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEFAULT_PLANS.map((plan) => (
                    <label
                      key={plan.id}
                      className={`relative flex flex-col p-3 rounded-2xl border cursor-pointer transition text-left ${
                        desiredPlanId === plan.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={desiredPlanId === plan.id}
                        onChange={() => setDesiredPlanId(plan.id)}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-white">{plan.name}</span>
                      <span className="text-xs text-amber-400 font-extrabold mt-1 tabular-nums">
                        {plan.priceFcfaMonthly.toLocaleString('fr-FR')} FCFA/m
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {plan.limits.maxOutlets} resto • {plan.limits.maxTerminals} terminaux
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transmission en cours...</span>
                    </>
                  ) : (
                    <span>Envoyer la demande</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
