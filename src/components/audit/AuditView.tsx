import React, { useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { formatDateTime } from '../../lib/utils';
import { ShieldAlert, Search, Filter, Clock, User, Layers } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { auditLogs } = useRestaurant();
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchModule = selectedModule === 'all' || log.module === selectedModule;
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase());
    return matchModule && matchSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher action, utilisateur, détail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700"
          >
            <option value="all">Tous les modules</option>
            <option value="POS">POS & Ventes</option>
            <option value="Tables">Tables & Plan de salle</option>
            <option value="Cuisine">Cuisine KDS</option>
            <option value="Caisse">Caisse</option>
            <option value="Stocks">Stocks & Inventaires</option>
            <option value="Achats">Achats & Fournisseurs</option>
            <option value="Finances">Finances & Dépenses</option>
            <option value="Paramètres">Paramètres</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {auditLogs.length} événements sécurisés consignés
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Utilisateur & Rôle</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Action Réalisée</th>
                <th className="py-3 px-4">Détails de l'Opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {log.module}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-800">{log.action}</td>

                  <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
