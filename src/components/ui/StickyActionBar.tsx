// ============================================================
// src/components/ui/StickyActionBar.tsx
// Barre d'actions inférieure collante pour enregistrement et annulation
// ============================================================

import React from 'react';
import { Save, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface StickyActionBarProps {
  dirtyCount?: number;
  message?: string;
  onSave: () => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  visible?: boolean;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  dirtyCount = 0,
  message,
  onSave,
  onCancel,
  isSaving = false,
  saveLabel = 'Enregistrer les modifications',
  cancelLabel = 'Annuler',
  visible = true,
  className = '',
}) => {
  if (!visible && dirtyCount === 0) return null;

  const defaultMessage =
    dirtyCount > 0
      ? `${dirtyCount} modification${dirtyCount > 1 ? 's' : ''} non enregistrée${dirtyCount > 1 ? 's' : ''}`
      : 'Modifications en attente';

  return (
    <aside
      role="region"
      aria-label="Actions d'enregistrement"
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-xl animate-in slide-in-from-bottom-5 duration-200 ${className}`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate">
              {message || defaultMessage}
            </p>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Pensez à sauvegarder avant de changer de page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {cancelLabel}
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onSave}
            isLoading={isSaving}
            className="text-xs sm:text-sm font-bold shadow-md min-h-[42px] sm:min-h-[44px]"
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </aside>
  );
};
