import React, { useState } from 'react';
import { Printer, Users, Plus, Trash2, KeyRound, Monitor, Check } from 'lucide-react';
import { UserRole } from '../../../types/restaurant';

export interface SetupStaffMember {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}

export interface SetupHardwareData {
  receiptPrinterWidth: '80mm' | '58mm';
  kitchenDisplayMode: 'ecran_kds' | 'imprimante_tickets' | 'aucun';
  barDisplayMode: 'ecran_kds' | 'imprimante_tickets' | 'aucun';
  staffMembers: SetupStaffMember[];
}

interface Step4HardwareAndStaffProps {
  data: SetupHardwareData;
  onChange: (fields: Partial<SetupHardwareData>) => void;
  maxUsersAllowed: number;
}

export const Step4HardwareAndStaff: React.FC<Step4HardwareAndStaffProps> = ({
  data,
  onChange,
  maxUsersAllowed,
}) => {
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('serveur');
  const [newStaffPin, setNewStaffPin] = useState('');

  const handleAddStaff = () => {
    if (!newStaffName.trim() || newStaffPin.length !== 4) return;
    if (data.staffMembers.length >= maxUsersAllowed) return;

    const newMember: SetupStaffMember = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      role: newStaffRole,
      pin: newStaffPin,
    };

    onChange({
      staffMembers: [...data.staffMembers, newMember],
    });

    setNewStaffName('');
    setNewStaffPin('');
  };

  const handleRemoveStaff = (id: string) => {
    onChange({
      staffMembers: data.staffMembers.filter((m) => m.id !== id),
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 antialiased py-2">
      {/* En-tête */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
          <Printer className="w-3.5 h-3.5" />
          <span>Chapitre 4 sur 5</span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Matériel de Caisse & Équipe Initiale
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Configurez le format de vos tickets thermiques et ajoutez les premiers collaborateurs qui utiliseront le système avec leur code PIN.
        </p>
      </div>

      {/* SECTION 1 : Matériel et Périphériques */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
          Format des Tickets & Affichage Cuisine
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Largeur ticket */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Format Ticket Caisse</label>
            <select
              value={data.receiptPrinterWidth}
              onChange={(e) => onChange({ receiptPrinterWidth: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium cursor-pointer"
            >
              <option value="80mm">Standard 80 mm (Recommandé)</option>
              <option value="58mm">Compact 58 mm (Mini-imprimante)</option>
            </select>
          </div>

          {/* Mode cuisine */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Production Cuisine</label>
            <select
              value={data.kitchenDisplayMode}
              onChange={(e) => onChange({ kitchenDisplayMode: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium cursor-pointer"
            >
              <option value="ecran_kds">Écran tactile KDS</option>
              <option value="imprimante_tickets">Bons imprimés en cuisine</option>
              <option value="aucun">Pas de transmission séparée</option>
            </select>
          </div>

          {/* Mode bar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Production Bar</label>
            <select
              value={data.barDisplayMode}
              onChange={(e) => onChange({ barDisplayMode: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium cursor-pointer"
            >
              <option value="ecran_kds">Écran tactile KDS Bar</option>
              <option value="imprimante_tickets">Bons imprimés au bar</option>
              <option value="aucun">Géré directement au comptoir</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2 : Équipe et Codes PIN */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Collaborateurs Initiaux ({data.staffMembers.length} / {maxUsersAllowed})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {maxUsersAllowed - data.staffMembers.length} place(s) disponible(s)
          </span>
        </div>

        {/* Formulaire d'ajout rapide */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="sm:col-span-5">
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Nom du collaborateur (ex: Samuel E.)"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value as any)}
              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            >
              <option value="serveur">Serveur</option>
              <option value="caisse">Caissier</option>
              <option value="cuisine">Cuisinier</option>
              <option value="bar">Barman</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="password"
              maxLength={4}
              pattern="\d{4}"
              value={newStaffPin}
              onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN 4 ch."
              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs text-center font-mono font-bold tracking-widest placeholder-slate-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddStaff}
              disabled={!newStaffName.trim() || newStaffPin.length !== 4 || data.staffMembers.length >= maxUsersAllowed}
              className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>
        </div>

        {/* Liste des membres ajoutés */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {data.staffMembers.map((member) => (
            <div
              key={member.id}
              className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">{member.name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    Rôle : <span className="text-amber-400 font-medium">{member.role}</span> • Code PIN : ****
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveStaff(member.id)}
                className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {data.staffMembers.length === 0 && (
            <div className="py-6 text-center text-slate-500 text-xs italic">
              Aucun employé supplémentaire ajouté. Votre compte Direction est déjà configuré comme superviseur principal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
