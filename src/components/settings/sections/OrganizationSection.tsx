import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Building2,
  Building,
  Save,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Shield,
  Plus,
  Users,
  Layers,
  ArrowRight,
  Globe,
  Coins,
  Store,
} from 'lucide-react';

export const OrganizationSection: React.FC = () => {
  const { organization, updateOrganization, outlets, changeActiveRestaurant, selectedOutletId } = useRestaurant();
  const { currentUser } = useAuth();

  const [name, setName] = useState(organization?.name || 'GROUPE NOURISH & DELIGHT CAMEROUN');
  const [legalName, setLegalName] = useState(
    organization?.legalName || "SOCIÉTÉ D'EXPLOITATION HÔTELIÈRE ET DE RESTAURATION DU CAMEROUN SA"
  );
  const [taxId, setTaxId] = useState(organization?.taxId || 'M012012345678A');
  const [rccm, setRccm] = useState(organization?.rccm || 'RC/YAO/2024/B/1894');
  const [headquartersAddress, setHeadquartersAddress] = useState(
    organization?.headquartersAddress || 'Boulevard du 20 Mai, Yaoundé, Cameroun'
  );
  const [city, setCity] = useState(organization?.city || 'Yaoundé');
  const [email, setEmail] = useState(organization?.email || 'direction@nourish-delight.cm');
  const [phone, setPhone] = useState(organization?.phone || '+237 699 00 11 22');
  const [currency, setCurrency] = useState<'FCFA' | 'EUR' | 'USD' | 'CAD' | 'GBP'>(
    organization?.currency || 'FCFA'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrganization({
      name,
      legalName,
      taxId,
      rccm,
      headquartersAddress,
      city,
      email,
      phone,
      currency,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-amber-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-900/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{organization?.name || 'Groupe / Organisation'}</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Niveau Central Groupe
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Gestion de l'entité mère, gouvernance multi-établissements, consolidation comptable et répartition des accès utilisateurs au Cameroun.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white">
            {outlets.length} Établissements Rattachés
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Organization Profile Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <span>Profil Légal de l'Organisation</span>
            </h3>
            {savedSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                <CheckCircle className="w-4 h-4" /> Modifications enregistrées
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Nom commercial du Groupe</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Raison Sociale / Entité Juridique</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">NIU du Groupe (Numéro d'Identifiant Unique)</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full font-mono text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Registre du Commerce (RCCM)</label>
              <input
                type="text"
                value={rccm}
                onChange={(e) => setRccm(e.target.value)}
                className="w-full font-mono text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Adresse du Siège Social</label>
              <input
                type="text"
                value={headquartersAddress}
                onChange={(e) => setHeadquartersAddress(e.target.value)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Ville du Siège</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Email de la Direction</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Téléphone Siège</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Devise Principale</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 mt-1 focus:ring-2 focus:ring-amber-500"
              >
                <option value="FCFA">FCFA (XAF - Franc CFA CEMAC)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="USD">USD ($ - Dollar US)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Zone Économique & Fiscale</label>
              <input
                type="text"
                disabled
                value="Cameroun / CEMAC (SYSCOHADA & CGI 2026)"
                className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-xl px-3 py-2.5 mt-1"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les paramètres du Groupe</span>
            </button>
          </div>
        </form>

        {/* Right: Outlets & Sites in this Group */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-600" />
                <span>Sites du Groupe ({outlets.length})</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
              {outlets.map((outlet) => {
                const isActive = outlet.id === selectedOutletId;
                return (
                  <div
                    key={outlet.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-amber-400 bg-amber-50/60 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{outlet.name}</span>
                          {outlet.isMain && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                              Siège
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {outlet.city} • {outlet.neighborhood || outlet.address}
                          </span>
                        </div>
                        {outlet.niu && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            NIU: {outlet.niu}
                          </div>
                        )}
                      </div>

                      {isActive ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                          Actif
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeActiveRestaurant(outlet.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs shrink-0"
                        >
                          <span>Basculer</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Central Governance Policies */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold flex items-center gap-2 text-amber-400">
              <Shield className="w-4 h-4" />
              <span>Gouvernance & Sécurité Groupe</span>
            </h4>
            <ul className="text-[11px] text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Isolation stricte des données de commande et de caisse par établissement.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Rôles transversaux (Direction / Comptable) avec accès consolidé multi-sites.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Journal d'audit centralisé avec horodatage certifié de chaque opération.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
