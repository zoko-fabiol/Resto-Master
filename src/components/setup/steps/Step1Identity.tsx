import React from 'react';
import { Building2, MapPin, Phone, Mail, FileText, Globe } from 'lucide-react';

export interface SetupIdentityData {
  name: string;
  legalName: string;
  legalForm: 'SARL' | 'SA' | 'SAS' | 'ETS' | 'GIC' | 'AUTRE';
  city: string;
  neighborhood: string;
  address: string;
  phone: string;
  email: string;
  niu: string;
  rccm: string;
  currency: 'FCFA' | 'EUR' | 'USD';
  slogan?: string;
}

interface Step1IdentityProps {
  data: SetupIdentityData;
  onChange: (fields: Partial<SetupIdentityData>) => void;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({ data, onChange }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 antialiased py-2">
      {/* Titre et présentation de l'étape */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
          <Building2 className="w-3.5 h-3.5" />
          <span>Chapitre 1 sur 5</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Identité & Coordonnées de votre Établissement
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Ces informations figureront sur vos tickets de caisse, factures officielles et rapports fiscaux.
        </p>
      </div>

      {/* Formulaire en grille aérée */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nom Commercial */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-bold text-slate-300">
            Nom Commercial de l'Établissement <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            required
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Le Bistrot Gourmand Bonapriso"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner font-medium"
          />
        </div>

        {/* Raison Sociale / Dénomination Juridique */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Raison Sociale Officielle
          </label>
          <input
            type="text"
            value={data.legalName}
            onChange={(e) => onChange({ legalName: e.target.value })}
            placeholder="Ex: Le Bistrot Gourmand SARL"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Forme Juridique */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">Forme Juridique</label>
          <select
            value={data.legalForm}
            onChange={(e) => onChange({ legalForm: e.target.value as any })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-colors font-medium cursor-pointer"
          >
            <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
            <option value="SA">SA (Société Anonyme)</option>
            <option value="SAS">SAS (Société par Actions Simplifiée)</option>
            <option value="ETS">ETS (Entreprise Individuelle / Établissement)</option>
            <option value="GIC">GIC (Groupe d'Initiative Commune)</option>
            <option value="AUTRE">Autre forme légale</option>
          </select>
        </div>

        {/* Ville */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Ville d'Implantation <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            required
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Ex: Douala"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Quartier */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">Quartier & Secteur</label>
          <input
            type="text"
            value={data.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            placeholder="Ex: Bonapriso, Rue des Palmiers"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Adresse Physique Complète */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-bold text-slate-300">
            Adresse Physique Complète <span className="text-amber-400">*</span>
          </label>
          <input
            type="text"
            required
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Ex: Rue des Palmiers, Bonapriso, face Clinique de la Vallée, Douala"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Téléphone Principal */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Téléphone de Contact & Caisse <span className="text-amber-400">*</span>
          </label>
          <input
            type="tel"
            required
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="Ex: +237 670 12 34 56"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* E-mail de Contact */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            E-mail Professionnel <span className="text-amber-400">*</span>
          </label>
          <input
            type="email"
            required
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="Ex: direction@bistrotgourmand.cm"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Numéro Identifiant Unique (NIU) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">
            Numéro d'Identifiant Unique (NIU / DGI)
          </label>
          <input
            type="text"
            value={data.niu}
            onChange={(e) => onChange({ niu: e.target.value.toUpperCase() })}
            placeholder="Ex: M082612345678A"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner uppercase"
          />
        </div>

        {/* RCCM */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300">Registre du Commerce (RCCM)</label>
          <input
            type="text"
            value={data.rccm}
            onChange={(e) => onChange({ rccm: e.target.value.toUpperCase() })}
            placeholder="Ex: RC/DLA/2026/B/1420"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner uppercase"
          />
        </div>
      </div>
    </div>
  );
};
