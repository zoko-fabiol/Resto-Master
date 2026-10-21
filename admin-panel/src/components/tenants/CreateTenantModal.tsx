import React, { useState } from 'react';
import { Building2, X, CheckCircle2, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { adminPlatformService } from '../../services/adminPlatformService';
import { CONFIGURATION_PROFILES, DEFAULT_PLANS, Plan, ConfigurationProfileDefinition } from '@shared';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (orgId: string) => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [legalForm, setLegalForm] = useState<'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE'>('SARL');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [city, setCity] = useState('Douala');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+237 ');
  const [email, setEmail] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('+237 ');

  const [planId, setPlanId] = useState<'plan_starter' | 'plan_pro' | 'plan_enterprise'>('plan_pro');
  const [profileType, setProfileType] = useState<string>('restaurant_classique');
  const [channel, setChannel] = useState<'stable' | 'beta'>('stable');
  const [reason, setReason] = useState('Création manuelle par Super Admin');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ orgId: string; passwordResetLink: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim() || !city.trim() || !address.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      setError('Veuillez remplir tous les champs obligatoires marqués d’un astérisque.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminPlatformService.createTenant({
        companyName: companyName.trim(),
        legalName: legalName.trim() || companyName.trim(),
        legalForm,
        taxId: taxId.trim(),
        rccm: rccm.trim(),
        city: city.trim(),
        country: 'Cameroun',
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim() || ownerEmail.trim(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPhone: ownerPhone.trim(),
        planId,
        profileType,
        channel,
        currency: 'FCFA',
        reason: reason.trim(),
      });

      setCreatedResult({
        orgId: res.orgId,
        passwordResetLink: res.passwordResetLink,
      });

      if (onCreated) onCreated(res.orgId);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création du restaurant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyResetLink = () => {
    if (!createdResult?.passwordResetLink) return;
    navigator.clipboard.writeText(createdResult.passwordResetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nouveau Restaurant Client</h2>
              <p className="text-xs text-slate-400">Provisionnement complet de l’espace SaaS et profil initial.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {createdResult ? (
          /* Confirmation et Lien de Premier Accès */
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Établissement Créé avec Succès !</h3>
              <p className="text-xs text-slate-400 mt-1">
                Identifiant du restaurant :{' '}
                <span className="font-mono text-amber-400 font-bold">{createdResult.orgId}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Lien de premier accès sécurisé pour le propriétaire :
              </div>
              <div className="text-[11px] font-mono text-slate-400 break-all bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                {createdResult.passwordResetLink}
              </div>
              <p className="text-[10px] text-slate-500">
                Transmettez ce lien au propriétaire pour qu'il définisse son mot de passe en toute sécurité.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={copyResetLink}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Lien copié dans le presse-papier' : 'Copier le lien d’accès'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          /* Formulaire de saisie */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Section 1 : Entreprise */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2.5">
                1. Informations sur l'Établissement
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom commercial *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Le Gourmet de Bonanjo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Forme juridique</label>
                  <select
                    value={legalForm}
                    onChange={(e) => setLegalForm(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="SARL">SARL</option>
                    <option value="ETS">ETS (Entreprise Individuelle)</option>
                    <option value="SAS">SAS</option>
                    <option value="SA">SA</option>
                    <option value="GIC">GIC</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ville d'implantation *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Douala"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Adresse précise *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rue des Palmiers, Bonanjo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Numéro NIU (Fisc)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="M052100012345A"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Téléphone établissement</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 : Propriétaire */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2.5">
                2. Propriétaire / Directeur Général
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Jean-Pierre Kamdem"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email de connexion *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="jp.kamdem@restaurant.cm"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Numéro WhatsApp / Mobile</label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Canal de version</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="stable">Stable (Recommandé)</option>
                    <option value="beta">Bêta (Fonctionnalités avancées en avant-première)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3 : Formule SaaS & Profil Initial */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2.5">
                3. Formule SaaS & Profil d'Exploitation Initial
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Formule contractuelle</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {DEFAULT_PLANS.map((plan: Plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.priceFcfaMonthly.toLocaleString('fr-FR')} FCFA/m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Profil métier pré-configuré</label>
                  <select
                    value={profileType}
                    onChange={(e) => setProfileType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-amber-500"
                  >
                    {CONFIGURATION_PROFILES.map((prof: ConfigurationProfileDefinition) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.name} ({prof.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Création en cours...' : 'Créer et Provisionner'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
