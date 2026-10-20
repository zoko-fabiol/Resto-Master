import React, { useState } from 'react';
import { useRestaurant } from '../../../context/RestaurantContext';
import { Building, Save, CheckCircle2, Plus, Phone, MapPin, Globe, Sparkles, X } from 'lucide-react';
import { Outlet } from '../../../types/configuration';

interface Props {
  subTab: 'general' | 'etablissement';
}

export const GeneralAndOutletsSection: React.FC<Props> = ({ subTab }) => {
  const {
    settings,
    updateSettings,
    outlets,
    selectedOutletId,
    setSelectedOutletId,
    addOutlet,
    organization,
  } = useRestaurant();

  // General Identity
  const [name, setName] = useState(settings.name);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [currency, setCurrency] = useState(settings.currency || 'FCFA');
  const [timeZone, setTimeZone] = useState(settings.timeZone || 'Africa/Douala (GMT+1)');
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (settings) {
      if (settings.name) setName(settings.name);
      if (settings.slogan) setSlogan(settings.slogan);
      if (settings.address) setAddress(settings.address);
      if (settings.phone) setPhone(settings.phone);
      if (settings.email) setEmail(settings.email);
      if (settings.currency) setCurrency(settings.currency);
      if (settings.timeZone) setTimeZone(settings.timeZone);
    }
  }, [settings]);

  // New Outlet Form State
  const [showNewOutletModal, setShowNewOutletModal] = useState(false);
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletCity, setNewOutletCity] = useState('');
  const [newOutletAddress, setNewOutletAddress] = useState('');
  const [newOutletPhone, setNewOutletPhone] = useState('');

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      name,
      slogan,
      address,
      phone,
      email,
      currency,
      timeZone,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim()) return;

    const created: Outlet = {
      id: `out-${Date.now()}`,
      organizationId: organization?.id || '',
      name: newOutletName.trim(),
      commercialName: newOutletName.trim(),
      city: newOutletCity.trim(),
      address: newOutletAddress.trim(),
      phone: newOutletPhone.trim(),
      isMain: outlets.length === 0,
      active: true,
      operationalProfile: 'restaurant_classique',
    };

    addOutlet(created);
    setShowNewOutletModal(false);
    setNewOutletName('');
    setNewOutletAddress('');
  };

  const [currentSubTab, setCurrentSubTab] = useState<'general' | 'etablissement'>(subTab || 'general');

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentSubTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSubTab === 'general'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4 text-amber-400" />
          <span>Identité Commerciale & Devise</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentSubTab('etablissement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentSubTab === 'etablissement'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-500" />
          <span>Succursales & Points de Vente</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-black">
            {outlets.length}
          </span>
        </button>
      </div>

      {currentSubTab === 'general' ? (
        <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Paramètres Généraux de l'Établissement</h3>
            <p className="text-xs text-slate-500">
              Identité commerciale, raison sociale, devise principale et coordonnées de contact
            </p>
          </div>
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Modifications enregistrées
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nom commercial de l'établissement :</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Slogan commercial :</label>
            <input
              type="text"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Téléphone de contact standard :</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">E-mail de facturation / direction :</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Adresse physique / Quartier & Ville :</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Devise d'exploitation :</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:outline-none"
            >
              <option value="FCFA">Franc CFA BEAC (XAF / FCFA)</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar US ($)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Fuseau horaire système :</label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium focus:bg-white focus:outline-none"
            >
              <option value="Africa/Douala (GMT+1)">Afrique Centrale — Douala, Yaoundé (GMT+1)</option>
              <option value="Africa/Libreville (GMT+1)">Afrique Centrale — Libreville (GMT+1)</option>
              <option value="Africa/Brazzaville (GMT+1)">Afrique Centrale — Brazzaville (GMT+1)</option>
              <option value="Africa/Kinshasa (GMT+1)">Afrique Centrale — Kinshasa (GMT+1)</option>
              <option value="Africa/Lagos (GMT+1)">Afrique de l'Ouest — Lagos (GMT+1)</option>
              <option value="Africa/Abidjan (GMT+0)">Afrique de l'Ouest — Abidjan (GMT+0)</option>
              <option value="Africa/Dakar (GMT+0)">Afrique de l'Ouest — Dakar (GMT+0)</option>
              <option value="UTC">Temps Universel Coordonné (UTC)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer l'identité</span>
          </button>
        </div>
      </form>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Gestion Multi-Établissements & Succursales</h3>
          <p className="text-xs text-slate-500">
            Configurez vos différents restaurants, bars lounge ou points de vente avec numérotation et stocks séparés
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewOutletModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une Succursale</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlets.map((outlet) => {
          const isSelected = outlet.id === selectedOutletId;

          return (
            <div
              key={outlet.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{outlet.name}</h4>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[10px] text-slate-500 font-medium">{outlet.city}</span>
                        {(outlet.commercialName || outlet.legalName) && (
                          <span className="text-[10px] text-slate-600 font-semibold">
                            • {outlet.commercialName || outlet.legalName} {outlet.legalForm ? `(${outlet.legalForm})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {outlet.operationalProfile && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {outlet.operationalProfile.replace('_', ' ')}
                      </span>
                    )}
                    {outlet.isMain && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        Siège
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {outlet.address} {outlet.postalBox ? `(BP ${outlet.postalBox})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{outlet.phone}</span>
                    </div>
                    {outlet.timezone && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {outlet.timezone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    outlet.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {outlet.active ? 'Actif' : 'Inactif'}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedOutletId(outlet.id)}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? 'Établissement Actif' : 'Sélectionner'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showNewOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateOutlet}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Nouvel Établissement / Succursale</h3>
              <button
                type="button"
                onClick={() => setShowNewOutletModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nom de la succursale :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Restaurant Principal"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ville :</label>
                <select
                  value={newOutletCity}
                  onChange={(e) => setNewOutletCity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                >
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Douala">Douala</option>
                  <option value="Kribi">Kribi</option>
                  <option value="Bafoussam">Bafoussam</option>
                  <option value="Garoua">Garoua</option>
                  <option value="Limbé">Limbé</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Adresse & Quartier :</label>
                <input
                  type="text"
                  placeholder="ex: Rue Tobie Kuoh, Bonapriso"
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Téléphone direct :</label>
                <input
                  type="text"
                  placeholder="+237 6XX XX XX XX"
                  value={newOutletPhone}
                  onChange={(e) => setNewOutletPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewOutletModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Créer l'Établissement
              </button>
            </div>
          </form>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
