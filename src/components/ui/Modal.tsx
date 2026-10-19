// ============================================================
// src/components/ui/Modal.tsx
// Modale accessible, moderne et réutilisable pour RestoMaster OS
// ============================================================

import React, { useEffect } from 'react';
import { X, Layers } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  maxWidth?: string;
  showBatchToggle?: boolean;
  batchMode?: boolean;
  onBatchModeChange?: () => void;
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  size = 'md',
  maxWidth,
  showBatchToggle = false,
  batchMode = false,
  onBatchModeChange,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = maxWidth || SIZE_CLASSES[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${widthClass} bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 transition-all animate-fade-scale ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-2.5 font-bold text-slate-800 dark:text-slate-100 flex-1 pr-4">
              {icon && <div className="text-emerald-600 shrink-0">{icon}</div>}
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg text-slate-900 dark:text-white font-extrabold">{title}</h3>
              ) : (
                title
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showBatchToggle && (
                <button
                  type="button"
                  onClick={onBatchModeChange}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                    batchMode
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                  title="Saisie en chaîne (les champs restent prêts pour le prochain ajout)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Enchaîner</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
