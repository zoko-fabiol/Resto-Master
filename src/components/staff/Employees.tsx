import React, { useState, useRef } from 'react';
import { useRhAppData } from '../../hooks/useFirestore';
import { RhEmployee, RhAppDataPayload } from '../../types/restaurant';
import { saveRhAppData } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, Edit2, Trash2, Filter, 
  Upload, Save, X, Phone, MapPin, 
  User, CreditCard, CalendarDays, Users, UserX, RotateCcw, UserMinus, UserCheck,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { SITES } from '../../config/constants';
import { showToast } from '../ui/Toast';
import XLSXStyle from 'xlsx-js-style';
const { read, utils } = XLSXStyle;
import { useExports } from '../../hooks/useExports';
import { ExportButton } from '../ExportButton';
import { ExportPersonnelModal } from './ExportPersonnelModal';
import { Modal } from '../ui/Modal';
import { useBatchMode } from '../../hooks/useBatchMode';
import { logAction } from '../../services/logService';
import { SearchInput } from '../ui/SearchInput';
import { matchesSearch } from '../../utils/searchHelpers';
import { useConfirm } from '../ui/ConfirmDialog';
import { useSortableData } from '../../hooks/useSortableData';


// --- EMPLOYEES COMPONENT ---

export const Employees: React.FC = () => {
  const { hasAccess } = useAuth();
  const confirm = useConfirm();
  const [isBatchMode, toggleBatchMode] = useBatchMode();
  const rhData = useRhAppData();
  
  const employees = rhData?.employees || [];
  const attendance = rhData?.attendance || {};
  const payrollExtras = rhData?.payrollExtras || {};
  const visibleSundays = rhData?.visibleSundays || [];

  // State
  const [activeSubTab, setActiveSubTab] = useState<'actifs' | 'licencies'>('actifs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'permanent' | 'temporaire'>('all');
  
  const [showModal, setShowModal] = useState(false);

  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const [selectedEmp, setSelectedEmp] = useState<RhEmployee | null>(null);

  // Form State — vide par défaut
  const [formNom, setFormNom] = useState('');
  const [formPrenom, setFormPrenom] = useState('');
  const [formSite, setFormSite] = useState('');
  const [formType, setFormType] = useState<'permanent' | 'temporaire'>('permanent');
  const [formSalaireBase, setFormSalaireBase] = useState<number | ''>('');
  const [formContact, setFormContact] = useState('');
  const [formStatut, setFormStatut] = useState<'actif' | 'renvoye'>('actif');
  const [formDateRenvoi, setFormDateRenvoi] = useState('');
  const [formDateEmbauche, setFormDateEmbauche] = useState('');

  // Refs for Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ACTIONS ---

  const openAddModal = () => {
    if (!hasAccess('employes', 'add')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    setModalMode('create');
    setSelectedEmp(null);
    setFormNom('');
    setFormPrenom('');
    setFormSite('');
    setFormType('permanent');
    setFormSalaireBase('');
    setFormContact('');
    setFormStatut('actif');
    setFormDateRenvoi('');
    setFormDateEmbauche(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (emp: RhEmployee) => {
    if (!hasAccess('employes', 'edit')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    setModalMode('edit');
    setSelectedEmp(emp);
    setFormNom(emp.nom);
    setFormPrenom(emp.prenom);
    setFormSite(emp.site);
    setFormType((emp.type === 'temporaire' ? 'temporaire' : 'permanent'));
    setFormSalaireBase(emp.salaireBase);
    setFormContact(emp.contact);
    setFormStatut((emp.statut === 'renvoye' ? 'renvoye' : 'actif'));
    setFormDateRenvoi(emp.dateRenvoi || '');
    setFormDateEmbauche(emp.dateEmbauche || '');
    setShowModal(true);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNom || !formPrenom || !formSite) {
      showToast('Veuillez remplir tous les champs obligatoires.', 'warning');
      return;
    }

    const payload: RhEmployee = {
      id: modalMode === 'edit' && selectedEmp ? selectedEmp.id : Date.now(),
      nom: formNom.trim(),
      prenom: formPrenom.trim(),
      site: formSite,
      type: formType,
      salaireBase: Number(formSalaireBase),
      contact: formContact.trim(),
      statut: formStatut,
      dateRenvoi: formStatut === 'renvoye' ? (formDateRenvoi || new Date().toISOString().split('T')[0]) : null,
      dateEmbauche: formDateEmbauche || null
    };

    let updatedEmployees = [...employees];
    if (modalMode === 'edit') {
      updatedEmployees = updatedEmployees.map(emp => emp.id === payload.id ? payload : emp);
      showToast('Profil modifié avec succès.', 'success');
    } else {
      // Check duplicate
      const isDup = updatedEmployees.some(emp => 
        emp.nom.toUpperCase() === payload.nom.toUpperCase() && 
        emp.prenom.toUpperCase() === payload.prenom.toUpperCase()
      );
      if (isDup) {
        showToast('Cet employé existe déjà.', 'warning');
        return;
      }
      updatedEmployees.push(payload);
      showToast('Employé ajouté avec succès.', 'success');
    }

    const value: RhAppDataPayload = {
      employees: updatedEmployees,
      attendance,
      payrollExtras,
      visibleSundays
    };

    await saveRhAppData(value);
    
    if (modalMode === 'edit') {
      await logAction('update', 'rh', `Profil de l'employé '${payload.nom} ${payload.prenom}' mis à jour (Site: ${payload.site}, Salaire: ${payload.salaireBase} F)`, payload.id);
    } else {
      await logAction('create', 'rh', `Nouvel employé '${payload.nom} ${payload.prenom}' créé (Site: ${payload.site}, Type: ${payload.type}, Salaire: ${payload.salaireBase} F)`, payload.id);
    }

    if (modalMode === 'create' && isBatchMode) {
      showToast('Employé ajouté avec succès (Saisie à la chaîne).', 'success');
      setFormNom('');
      setFormPrenom('');
      setFormContact('');
      setFormSalaireBase(0);
      setTimeout(() => {
        const el = document.getElementById('emp-nom') as HTMLInputElement;
        if (el) el.focus();
      }, 100);
    } else {
      setShowModal(false);
    }
  };

  const deleteEmployee = async (id: string | number) => {
    if (!hasAccess('employes', 'delete')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Supprimer cet employé ?',
      message: 'Voulez-vous vraiment supprimer définitivement cet employé du personnel ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (ok) {
      const targetEmp = employees.find(e => e.id === id);
      const updatedEmployees = employees.filter(emp => emp.id !== id);
      const value: RhAppDataPayload = {
        employees: updatedEmployees,
        attendance,
        payrollExtras,
        visibleSundays
      };
      await saveRhAppData(value);
      await logAction('delete', 'rh', `Employé '${targetEmp?.nom} ${targetEmp?.prenom}' (ID: ${id}) supprimé définitivement`, id);
      showToast('Employé supprimé.', 'success');
    }
  };

  const dismissEmployee = async (emp: RhEmployee) => {
    if (!hasAccess('employes', 'edit')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Licencier l\'employé ?',
      message: `Voulez-vous licencier ${emp.nom} ${emp.prenom} ? Il/Elle sera transféré(e) dans la section Licenciés et retiré(e) des effectifs actifs.`,
      confirmLabel: 'Confirmer le départ',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (ok) {
      const updatedEmployees = employees.map(e => 
        e.id === emp.id 
          ? { ...e, statut: 'renvoye' as const, dateRenvoi: new Date().toISOString().split('T')[0] } 
          : e
      );
      const value: RhAppDataPayload = {
        employees: updatedEmployees,
        attendance,
        payrollExtras,
        visibleSundays
      };
      await saveRhAppData(value);
      await logAction('update', 'rh', `Employé '${emp.nom} ${emp.prenom}' marqué comme Licencié / Fin de contrat`, emp.id);
      showToast(`${emp.nom} ${emp.prenom} a été transféré(e) dans les licenciés.`, 'info');
    }
  };

  const rehireEmployee = async (emp: RhEmployee) => {
    if (!hasAccess('employes', 'edit')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Réintégrer l\'employé ?',
      message: `Voulez-vous réintégrer ${emp.nom} ${emp.prenom} dans les effectifs actifs ?`,
      confirmLabel: 'Réintégrer',
      cancelLabel: 'Annuler',
      variant: 'normal',
    });
    if (ok) {
      const updatedEmployees = employees.map(e => 
        e.id === emp.id 
          ? { ...e, statut: 'actif' as const, dateRenvoi: null } 
          : e
      );
      const value: RhAppDataPayload = {
        employees: updatedEmployees,
        attendance,
        payrollExtras,
        visibleSundays
      };
      await saveRhAppData(value);
      await logAction('update', 'rh', `Employé '${emp.nom} ${emp.prenom}' réintégré dans les effectifs actifs`, emp.id);
      showToast(`${emp.nom} ${emp.prenom} a été réintégré(e) dans les effectifs actifs !`, 'success');
    }
  };

  // --- FILTERS & SEARCH ---

  const activeCount = employees.filter(e => e.statut !== 'renvoye').length;
  const dismissedCount = employees.filter(e => e.statut === 'renvoye').length;

  const filteredEmployees = employees.filter(emp => {
    const isDismissed = emp.statut === 'renvoye';
    if (activeSubTab === 'actifs' && isDismissed) return false;
    if (activeSubTab === 'licencies' && !isDismissed) return false;

    const matchSearch = 
      matchesSearch(`${emp.nom} ${emp.prenom}`, searchTerm) ||
      matchesSearch(emp.contact, searchTerm) ||
      matchesSearch(emp.site, searchTerm) ||
      matchesSearch(emp.type, searchTerm);
    
    const matchesSite = filterSite ? emp.site === filterSite : true;
    const matchesType = filterType === 'all' ? true : emp.type === filterType;

    return matchSearch && matchesSite && matchesType;
  });

  const { sortedItems: sortedEmployees, requestSort, sortConfig } = useSortableData(filteredEmployees, { key: 'nom', direction: 'asc' });

  // --- EXCEL FILE IMPORT ---

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasAccess('employes', 'add')) {
      showToast('Opération non autorisée en lecture seule.', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Headers: Nom, Prénom, Site, Salaire Base, Contact, Type
        const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[];
        if (rows.length <= 1) {
          showToast('Le fichier Excel est vide ou invalide.', 'warning');
          return;
        }

        const headers = rows[0].map((h: string) => String(h).trim().toUpperCase());
        const nomIdx = headers.indexOf('NOM');
        const prenomIdx = headers.indexOf('PRENOM');
        const siteIdx = headers.indexOf('SITE');
        const salaireIdx = headers.indexOf('SALAIRE BASE') !== -1 ? headers.indexOf('SALAIRE BASE') : headers.indexOf('SALAIRE');
        const contactIdx = headers.indexOf('CONTACT');
        const typeIdx = headers.indexOf('TYPE');

        if (nomIdx === -1 || prenomIdx === -1 || siteIdx === -1) {
          showToast('Colonnes requises manquantes dans le fichier (Nom, Prénom, Site).', 'error');
          return;
        }

        let addedCount = 0;
        let dupCount = 0;
        const currentEmployees = [...employees];
        const now = Date.now();

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const nom = String(row[nomIdx] || '').trim();
          const prenom = String(row[prenomIdx] || '').trim();
          const site = String(row[siteIdx] || '').trim();
          
          if (!nom || !prenom || !site) continue;

          const baseSalary = salaireIdx !== -1 ? Number(row[salaireIdx] || 0) : 0;
          const contact = contactIdx !== -1 ? String(row[contactIdx] || '').trim() : '';
          const rawType = typeIdx !== -1 ? String(row[typeIdx] || '').trim().toLowerCase() : 'permanent';
          const type: 'permanent' | 'temporaire' = rawType.includes('temp') || rawType.includes('jour') ? 'temporaire' : 'permanent';

          const isDuplicate = currentEmployees.some(emp => 
            emp.nom.toUpperCase() === nom.toUpperCase() && 
            emp.prenom.toUpperCase() === prenom.toUpperCase()
          );

          if (isDuplicate) {
            dupCount++;
            continue;
          }

          currentEmployees.push({
            id: now + i,
            nom,
            prenom,
            site,
            type,
            salaireBase: baseSalary,
            contact,
            statut: 'actif',
            dateRenvoi: null,
            dateEmbauche: new Date().toISOString().split('T')[0]
          });
          addedCount++;
        }

        if (addedCount > 0) {
          const value: RhAppDataPayload = {
            employees: currentEmployees,
            attendance,
            payrollExtras,
            visibleSundays
          };
          await saveRhAppData(value);
          showToast(`${addedCount} employés importés ! (${dupCount} doublons ignorés)`, 'success');
        } else {
          showToast('Aucun nouvel employé importé (doublons ou données manquantes).', 'warning');
        }
      } catch (err) {
        showToast('Erreur lors du traitement du fichier Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const [showExportModal, setShowExportModal] = useState(false);
  const { exportPersonnelPDF, exportPersonnelDOCX, exportPersonnelXLSX } = useExports();

  return (
    <div className="flex flex-col gap-6 animate-fade-scale">
      
      {/* Sub-Tabs Bar: Actifs vs Licenciés */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('actifs')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeSubTab === 'actifs'
              ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Effectifs Actifs</span>
          <span className={`px-2 py-0.5 text-xs font-mono font-extrabold rounded-full ${
            activeSubTab === 'actifs' ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('licencies')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeSubTab === 'licencies'
              ? 'bg-red-700 text-white shadow-md shadow-red-700/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Licenciés & Anciens Employés</span>
          <span className={`px-2 py-0.5 text-xs font-mono font-extrabold rounded-full ${
            activeSubTab === 'licencies' ? 'bg-red-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {dismissedCount}
          </span>
        </button>
      </div>
      
      {/* Action Header panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher un employé..."
            className="flex-1 max-w-xs min-w-[200px]"
          />

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="bg-transparent border-0 py-1.5 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="" className="dark:bg-slate-900">Tous les sites</option>
              {SITES.map(site => <option key={site} value={site} className="dark:bg-slate-900">{site}</option>)}
            </select>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-transparent border-0 py-1.5 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-900">Tous les contrats</option>
              <option value="permanent" className="dark:bg-slate-900">Permanent</option>
              <option value="temporaire" className="dark:bg-slate-900">Temporaire</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasAccess('employes', 'add') && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary py-2 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 rounded-xl"
                title="Importer depuis Excel"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImport}
                className="hidden"
              />
            </>
          )}

          <ExportButton 
            pdfLabel="Document"
            onPDF={() => setShowExportModal(true)} 
            onXLSX={() => exportPersonnelXLSX({ 
              site: filterSite, 
              type: filterType, 
              statut: activeSubTab === 'licencies' ? 'renvoye' : undefined 
            })} 
          />

          {hasAccess('employes', 'add') && (
            <button onClick={openAddModal} className="btn-primary py-2 px-3.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          )}
        </div>

      </div>

      {/* Main List display (Responsive: table on desktop, cards on mobile) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                <th className="table-header text-center w-12">N°</th>
                <th onClick={() => requestSort('nom')} className="table-header-sortable">
                  <div className="flex items-center justify-between">
                    <span>Nom Complet</span>
                    {sortConfig?.key === 'nom' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th onClick={() => requestSort('site')} className="table-header-sortable text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Site</span>
                    {sortConfig?.key === 'site' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th onClick={() => requestSort('type')} className="table-header-sortable text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Type Contrat</span>
                    {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th onClick={() => requestSort('salaireBase')} className="table-header-sortable text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Salaire Base / Taux</span>
                    {sortConfig?.key === 'salaireBase' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th onClick={() => requestSort('statut')} className="table-header-sortable text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Statut</span>
                    {sortConfig?.key === 'statut' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th onClick={() => requestSort('contact')} className="table-header-sortable">
                  <div className="flex items-center justify-between">
                    <span>Contact</span>
                    {sortConfig?.key === 'contact' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-brand" /> : <ArrowDown className="w-3 h-3 text-brand" />) : <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />}
                  </div>
                </th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    <p className="font-semibold mb-1">Aucun employé trouvé.</p>
                    {(searchTerm || filterSite || filterType !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setFilterSite(''); setFilterType('all'); }}
                        className="text-xs text-brand hover:underline font-bold"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp, index) => (
                  <tr key={emp.id} className="table-row">
                    <td className="table-cell text-center font-mono text-xs text-slate-400 font-extrabold">{index + 1}</td>
                    <td className="table-cell font-semibold text-slate-800 dark:text-slate-100">
                      {emp.nom} {emp.prenom}
                    </td>
                    <td className="table-cell text-center">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-medium text-xs text-slate-700 dark:text-slate-300">
                        {emp.site}
                      </span>
                    </td>
                    <td className="table-cell text-center font-medium">
                      {emp.type === 'permanent' ? 'Permanent' : 'Temporaire'}
                    </td>
                    <td className="table-cell text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {emp.salaireBase.toLocaleString()} F
                    </td>
                    <td className="table-cell text-center">
                      <span className={`px-2.5 py-1 rounded-full text-3xs font-extrabold uppercase ${
                        emp.statut === 'actif' 
                          ? 'bg-emerald-500/10 text-emerald-600' 
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {emp.statut === 'actif' ? 'Actif' : 'Fin contrat'}
                      </span>
                    </td>
                    <td className="table-cell font-mono text-xs">{emp.contact}</td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1 text-slate-400 hover:text-brand dark:hover:text-brand-light transition-colors"
                          title="Modifier l'employé"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {emp.statut === 'actif' ? (
                          <button
                            onClick={() => dismissEmployee(emp)}
                            className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                            title="Licencier / Transférer aux archives"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => rehireEmployee(emp)}
                            className="p-1 text-emerald-500 hover:text-emerald-700 transition-colors"
                            title="Réintégrer dans les effectifs actifs"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => deleteEmployee(emp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD GRID */}
        <div className="md:hidden grid grid-cols-1 gap-4 p-4">
          {filteredEmployees.length === 0 ? (
            <p className="text-center text-sm italic text-slate-400 py-6">Aucun employé trouvé.</p>
          ) : (
            filteredEmployees.map((emp, index) => (
              <div 
                key={emp.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 relative"
              >
                {/* Status indicator top right */}
                <span className={`absolute top-4 right-4 px-2 py-0.5 rounded-full text-4xs font-extrabold uppercase ${
                  emp.statut === 'actif' 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : 'bg-red-500/10 text-red-600'
                }`}>
                  {emp.statut === 'actif' ? 'Actif' : 'Fin Contrat'}
                </span>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-3xs font-extrabold rounded-md">#{index + 1}</span>
                  <User className="w-4 h-4 text-brand" />
                  <span className="font-bold text-slate-800 dark:text-white">{emp.nom} {emp.prenom}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{emp.site}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span className="capitalize">{emp.type === 'permanent' ? 'Permanent' : 'Temporaire'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="font-mono font-semibold">{emp.salaireBase.toLocaleString()} F</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono">{emp.contact || 'N/A'}</span>
                  </div>
                </div>

                {/* Edit/Licencier/Delete Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 flex items-center justify-end gap-3">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Modifier
                  </button>

                  {emp.statut === 'actif' ? (
                    <button
                      onClick={() => dismissEmployee(emp)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Licencier
                    </button>
                  ) : (
                    <button
                      onClick={() => rehireEmployee(emp)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Réintégrer
                    </button>
                  )}

                  <button
                    onClick={() => deleteEmployee(emp.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* MODAL ADD/EDIT EMPLOYEE */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? 'Ajouter un employé' : 'Modifier le profil'}
        size="lg"
        showBatchToggle={modalMode === 'create'}
        batchMode={isBatchMode}
        onBatchModeChange={toggleBatchMode}
      >
            <form onSubmit={saveEmployee} className="p-6 flex flex-col gap-4">

              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nom <span className="text-red-500">*</span></label>
                  <input
                    id="emp-nom"
                    type="text"
                    required
                    value={formNom}
                    onChange={e => setFormNom(e.target.value)}
                    className="form-input"
                    placeholder="ex. NJOYA"
                  />
                </div>
                <div>
                  <label className="form-label">Prénom <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formPrenom}
                    onChange={e => setFormPrenom(e.target.value)}
                    className="form-input"
                    placeholder="ex. Ibrahim"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Site <span className="text-red-500">*</span></label>
                  <select
                    value={formSite}
                    onChange={e => setFormSite(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Sélectionner un site...</option>
                    {SITES.map(site => <option key={site} value={site}>{site}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Contrat / Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="permanent">Permanent (CDD/CDI)</option>
                    <option value="temporaire">Temporaire / Journalier</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    {formType === 'permanent' ? 'Salaire de Base (FCFA)' : 'Taux Journalier (FCFA)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formSalaireBase}
                    onChange={e => setFormSalaireBase(e.target.value === '' ? '' : Number(e.target.value))}
                    className="form-input font-mono font-semibold"
                    placeholder="Ex: 150000"
                  />
                </div>
                <div>
                  <label className="form-label">Contact (Téléphone)</label>
                  <input
                    type="tel"
                    value={formContact}
                    onChange={e => setFormContact(e.target.value)}
                    className="form-input font-mono"
                    placeholder="ex. 699000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date Embauche</label>
                  <input
                    type="date"
                    value={formDateEmbauche}
                    onChange={e => setFormDateEmbauche(e.target.value)}
                    className="form-input"
                  />
                </div>
                {modalMode === 'edit' && (
                  <div>
                    <label className="form-label">Statut Contrat</label>
                    <select
                      value={formStatut}
                      onChange={e => setFormStatut(e.target.value as any)}
                      className="form-input"
                    >
                      <option value="actif">Actif</option>
                      <option value="renvoye">Renvoyé / Fin Contrat</option>
                    </select>
                  </div>
                )}
              </div>

              {formStatut === 'renvoye' && (
                <div>
                  <label className="form-label text-red-500">Date Fin Contrat</label>
                  <input
                    type="date"
                    required
                    value={formDateRenvoi}
                    onChange={e => setFormDateRenvoi(e.target.value)}
                    className="form-input border-red-200 focus:ring-red-400/40 focus:border-red-500"
                  />
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  <Save className="w-4.5 h-4.5" />
                  Sauvegarder
                </button>
              </div>

            </form>
      </Modal>
      {showExportModal && (
        <ExportPersonnelModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={(selectedCols, customCols) =>
            exportPersonnelPDF({
              exportColumns: selectedCols,
              customColumns: customCols,
              filters: { 
                site: filterSite, 
                type: filterType, 
                statut: activeSubTab === 'licencies' ? 'renvoye' : undefined 
              },
            })
          }
          onExportDocx={(selectedCols, customCols) =>
            exportPersonnelDOCX({
              exportColumns: selectedCols,
              customColumns: customCols,
              filters: { 
                site: filterSite, 
                type: filterType, 
                statut: activeSubTab === 'licencies' ? 'renvoye' : undefined 
              },
            })
          }
        />
      )}

    </div>
  );
};
