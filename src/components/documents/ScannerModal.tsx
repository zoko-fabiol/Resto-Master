import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { useToast } from '../../context/ToastContext';
import { DocumentItem } from '../../types/restaurant';
import { formatCurrency } from '../../lib/utils';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const { addDocument, suppliers, settings } = useRestaurant();
  const { showToast } = useToast();

  const [step, setStep] = useState<'capture' | 'preview_confirm'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [capturedFileSize, setCapturedFileSize] = useState<string>('0 KB');
  const [capturedMimeType, setCapturedMimeType] = useState<string>('image/jpeg');

  // Metadata fields
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('facture_fournisseur');
  const [supplierName, setSupplierName] = useState(suppliers[0]?.company || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    const sizeKb = Math.round(file.size / 1024);
    setCapturedFileName(file.name);
    setCapturedFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
    setCapturedMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
      if (!docTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setDocTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      setStep('preview_confirm');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      showToast({
        type: 'warning',
        title: 'Titre manquant',
        message: 'Veuillez renseigner un titre pour le document.',
      });
      return;
    }

    await addDocument({
      title: docTitle.trim(),
      category: docCategory,
      fileUrl: capturedImage || '',
      fileName: capturedFileName || `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileType: capturedMimeType,
      fileSize: capturedFileSize,
      supplierName: docCategory === 'facture_fournisseur' ? supplierName : undefined,
      date: invoiceDate,
      amount: amount > 0 ? amount : undefined,
      ocrExtractedData: invoiceNumber || amount > 0 ? {
        invoiceNumber: invoiceNumber || undefined,
        date: invoiceDate,
        amount: amount > 0 ? `${amount} ${settings.currency}` : undefined,
        supplier: supplierName || undefined,
      } : undefined,
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    showToast({
      type: 'success',
      title: 'Document archivé',
      message: `"${docTitle}" a été enregistré dans la GED comptable.`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Numériseur de Pièces Justificatives & Factures
              </h3>
              <p className="text-[11px] text-slate-500">
                Attachement direct et archivage qualifié dans la GED comptable
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Photographier ou importer une pièce justificative</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Prenez une photo nette avec votre appareil ou importez un document existant (JPG, PNG ou PDF).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Prendre une photo (Caméra)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importer un document / PDF</span>
                  </button>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'preview_confirm' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveDocument} className="space-y-4">
                {/* Document Information Banner */}
                <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Pièce chargée : {capturedFileName || 'Document'} ({capturedFileSize})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('capture')}
                    className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                  >
                    Changer de document
                  </button>
                </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Document image preview */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 h-64">
                      {capturedImage && (
                        <img
                          src={capturedImage}
                          alt="Document scanné"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Right: Extracted metadata form */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Titre du document *
                        </label>
                        <input
                          type="text"
                          required
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Catégorie GED *
                        </label>
                        <select
                          value={docCategory}
                          onChange={(e) => setDocCategory(e.target.value as DocumentItem['category'])}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                        >
                          <option value="facture_fournisseur">Facture Fournisseur</option>
                          <option value="justificatif_depense">Justificatif de Dépense</option>
                          <option value="recu_caisse">Reçu / Ticket Caisse</option>
                          <option value="contrat">Contrat / Bail</option>
                          <option value="administratif">Document Administratif / Hygiène</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Fournisseur détecté
                        </label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            N° Facture
                          </label>
                          <input
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Montant ({settings.currency})
                          </label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-black text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Archiver dans la GED</span>
                    </button>
                  </div>
                </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
