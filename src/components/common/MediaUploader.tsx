import React, { useState, useRef } from 'react';
import {
  cloudinaryService,
  CloudinaryUploadOptions,
} from '../../services/media/cloudinaryService';
import { MediaAsset } from '../../types/restaurant';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';

interface MediaUploaderProps {
  options: CloudinaryUploadOptions;
  onUploadSuccess: (asset: MediaAsset) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  helperText?: string;
  buttonOnly?: boolean;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  options,
  onUploadSuccess,
  onUploadError,
  accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
  maxSizeMb = 15,
  label = 'Téléverser un document ou une image',
  helperText = 'Formats supportés : JPG, PNG, WEBP, PDF, Word, Excel (Max 15 Mo)',
  buttonOnly = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUploadedAsset, setLastUploadedAsset] = useState<MediaAsset | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Simulate progress progression
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 200);

      const asset = await cloudinaryService.upload(file, options);

      clearInterval(progressTimer);
      setUploadProgress(100);
      setIsUploading(false);
      setLastUploadedAsset(asset);
      onUploadSuccess(asset);
    } catch (err: any) {
      setIsUploading(false);
      const msg = err.message || 'Échec du téléversement du fichier.';
      setErrorMsg(msg);
      if (onUploadError) onUploadError(msg);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  if (buttonOnly) {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all disabled:opacity-50 ${className}`}
        >
          {isUploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UploadCloud className="w-3.5 h-3.5" />
          )}
          <span>{isUploading ? 'Téléversement...' : label}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {isUploading ? 'Envoi vers Cloudinary...' : label}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
          </div>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {lastUploadedAsset && !isUploading && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold truncate">
              {lastUploadedAsset.originalName} ({Math.round(lastUploadedAsset.size / 1024)} Ko)
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
            Cloudinary ✓
          </span>
        </div>
      )}
    </div>
  );
};
