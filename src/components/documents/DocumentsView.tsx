import React, { useState } from 'react';
import { PageHeader, Button } from '../ui';
import { useRestaurant } from '../../context/RestaurantContext';
import { DocumentItem } from '../../types/restaurant';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ScannerModal } from './ScannerModal';
import {
  FolderLock,
  Scan,
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  Building,
  DollarSign,
  X,
} from 'lucide-react';

export const DocumentsView: React.FC = () => {
  const { documents, settings } = useRestaurant();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchCat = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchSearch =
      !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.supplierName && doc.supplierName.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête standardisé de la vue */}
      <PageHeader
        icon={<FolderLock className="w-5 h-5" />}
        title="Documents & GED"
        subtitle="Gestion électronique des documents : factures scannées, contrats, attestations et justificatifs"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
            {documents.length} document(s)
          </span>
        }
        actions={
          <Button
            variant="primary"
            size="touch"
            onClick={() => setScannerOpen(true)}
            icon={Scan}
          >
            Scanner un Document
          </Button>
        }
      />

      {/* Top Header & Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher facture, contrat, tiers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({documents.length})
            </button>
            {[
              { id: 'facture_fournisseur', label: 'Factures' },
              { id: 'contrat', label: 'Contrats' },
              { id: 'administratif', label: 'Administratif' },
              { id: 'justificatif_depense', label: 'Justificatifs' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="touch"
          onClick={() => setScannerOpen(true)}
          icon={Scan}
        >
          Scanner un Document
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-amber-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                  {doc.category.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3">
                <h4 className="font-bold text-sm text-slate-900 line-clamp-2">{doc.title}</h4>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{doc.fileName}</div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date : {doc.date}</span>
                </div>
                {doc.supplierName && (
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fournisseur : {doc.supplierName}</span>
                  </div>
                )}
                {doc.amount && (
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    <span>Montant : {formatCurrency(doc.amount, settings.currency)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">{doc.fileSize}</span>
              <button
                onClick={() => setViewDoc(doc)}
                className="flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-800"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Aperçu Document</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{viewDoc.title}</h3>
                <div className="text-xs text-slate-500">{viewDoc.fileName} • {viewDoc.fileSize}</div>
              </div>
              <button onClick={() => setViewDoc(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-80 flex items-center justify-center">
                <img
                  src={viewDoc.fileUrl}
                  alt={viewDoc.title}
                  className="w-full h-full object-contain"
                />
              </div>

              {viewDoc.ocrExtractedData && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-800">Métadonnées OCR extraites :</div>
                  <pre className="font-mono text-[11px] text-slate-600 overflow-x-auto">
                    {JSON.stringify(viewDoc.ocrExtractedData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setViewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      <ScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
};
