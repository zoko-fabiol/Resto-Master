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
  Sparkles,
  FileText,
  X,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const { addDocument, suppliers, settings } = useRestaurant();
  const { showToast } = useToast();

  const [step, setStep] = useState<'capture' | 'preview_ocr' | 'confirm'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  // Extracted metadata fields (modifiable)
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('facture_fournisseur');
  const [supplierName, setSupplierName] = useState(suppliers[0]?.company || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCapturedImage(result);
        simulateOcrExtraction(result, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateCameraCapture = () => {
    // Sample high-quality document invoice capture
    const sampleDoc = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900&auto=format&fit=crop&q=80';
    setCapturedImage(sampleDoc);
    simulateOcrExtraction(sampleDoc, 'capture_camera_document.jpg');
  };

  const simulateOcrExtraction = (imgUrl: string, fileName: string) => {
    setIsProcessingOcr(true);
    setStep('preview_ocr');

    setTimeout(() => {
      // Simulate OCR intelligent extraction from document image
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const randAmount = Math.floor(30000 + Math.random() * 120000);
      const chosenSupplier = suppliers[Math.floor(Math.random() * suppliers.length)]?.company || 'Boucherie du Littoral';

      setDocTitle(`Facture ${chosenSupplier} #${randNum}`);
      setSupplierName(chosenSupplier);
      setInvoiceNumber(`FAC-2026-${randNum}`);
      setAmount(randAmount);
      setIsProcessingOcr(false);
    }, 1200);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) {
      showToast({
        type: 'warning',
        title: 'Titre manquant',
        message: 'Veuillez renseigner un titre pour le document numérisé.',
      });
      return;
    }

    await addDocument({
      title: docTitle,
      category: docCategory,
      fileUrl: capturedImage || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=900',
      fileName: `${docTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      fileType: 'application/pdf',
      fileSize: '680 KB',
      supplierName: docCategory === 'facture_fournisseur' ? supplierName : undefined,
      date: invoiceDate,
      amount: amount > 0 ? amount : undefined,
      ocrExtractedData: {
        invoiceNumber,
        date: invoiceDate,
        amount: `${amount} ${settings.currency}`,
        supplier: supplierName,
      },
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
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
                Numériseur & Scanner de Factures / Pièces
              </h3>
              <p className="text-[11px] text-slate-500">
                Capture caméra, amélioration du contraste et reconnaissance OCR automatique
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
                  <h4 className="font-bold text-sm text-slate-900">Prendre une photo ou importer un fichier</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Positionnez le document bien à plat avec un bon éclairage. Les bords seront recadrés automatiquement.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button
                    onClick={simulateCameraCapture}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturer avec la Caméra</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importer un document / PDF</span>
                  </button>

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

          {step === 'preview_ocr' && (
            <div className="space-y-4">
              {isProcessingOcr ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
                  <div className="font-bold text-sm text-slate-800">
                    Analyse OCR du document en cours...
                  </div>
                  <p className="text-xs text-slate-500">
                    Détection automatique du fournisseur, date, montant et numéro de facture
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveDocument} className="space-y-4">
                  {/* Document preview & OCR Badge */}
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Données extraites par OCR (vérifiez et ajustez si besoin)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('capture')}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Reprendre photo
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
