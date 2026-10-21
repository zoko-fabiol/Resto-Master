// ============================================================
// src/components/ui/ConfirmDialog.tsx
// Dialogues de confirmation et de saisie accessibles et modernes
// Remplace alert(), confirm() et prompt() natifs
// ============================================================

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'normal' | 'danger';
  icon?: React.ReactNode;
}

export interface PromptOptions {
  title?: string;
  message?: React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'password' | 'number';
}

interface ConfirmContextType {
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
  prompt: (options: string | PromptOptions, defaultValue?: string) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Confirm state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: { message: '' },
  });
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // Prompt state
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions;
    value: string;
  }>({
    isOpen: false,
    options: {},
    value: '',
  });
  const promptResolverRef = useRef<((value: string | null) => void) | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger Confirm
  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ isOpen: true, options: opts });
    });
  }, []);

  // Trigger Prompt
  const prompt = useCallback(
    (options: string | PromptOptions, defaultValue?: string): Promise<string | null> => {
      const opts: PromptOptions =
        typeof options === 'string'
          ? { title: options, defaultValue }
          : { ...options, defaultValue: defaultValue ?? options.defaultValue };
      return new Promise((resolve) => {
        promptResolverRef.current = resolve;
        setPromptState({
          isOpen: true,
          options: opts,
          value: opts.defaultValue || '',
        });
      });
    },
    []
  );

  const handleConfirmClose = (result: boolean) => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  };

  const handlePromptClose = (result: string | null) => {
    setPromptState((prev) => ({ ...prev, isOpen: false }));
    if (promptResolverRef.current) {
      promptResolverRef.current(result);
      promptResolverRef.current = null;
    }
  };

  // Keyboard navigation & focus trap for Confirm
  useEffect(() => {
    if (!confirmState.isOpen) return;
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleConfirmClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmState.isOpen]);

  // Keyboard navigation & focus trap for Prompt
  useEffect(() => {
    if (!promptState.isOpen) return;
    const timer = setTimeout(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.select();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handlePromptClose(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [promptState.isOpen]);

  const confirmOpts = confirmState.options;
  const isDanger = confirmOpts.variant === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => handleConfirmClose(false)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-fade-scale"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {confirmOpts.icon ||
                    (isDanger ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <HelpCircle className="w-5 h-5" />
                    ))}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id="confirm-dialog-title"
                    className="text-base font-bold text-slate-900 leading-snug"
                  >
                    {confirmOpts.title || (isDanger ? 'Confirmer la suppression' : 'Confirmation requise')}
                  </h3>
                  <div
                    id="confirm-dialog-description"
                    className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed"
                  >
                    {confirmOpts.message}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
                >
                  {confirmOpts.cancelLabel || confirmOpts.cancelText || 'Annuler'}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs transition-[background-color,transform] duration-100 ease-out active:scale-98 cursor-pointer touch-manipulation ${
                    isDanger
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {confirmOpts.confirmLabel || confirmOpts.confirmText || 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => handlePromptClose(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-dialog-title"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePromptClose(promptState.value);
              }}
              className="p-5 sm:p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 id="prompt-dialog-title" className="text-base font-bold text-slate-900">
                  {promptState.options.title || 'Saisie requise'}
                </h3>
                <button
                  type="button"
                  onClick={() => handlePromptClose(null)}
                  aria-label="Fermer la boîte de dialogue"
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {promptState.options.message && (
                <div className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {promptState.options.message}
                </div>
              )}

              <div className="mt-4">
                <input
                  ref={promptInputRef}
                  type={promptState.options.inputType || 'text'}
                  value={promptState.value}
                  placeholder={promptState.options.placeholder || ''}
                  onChange={(e) => setPromptState((prev) => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePromptClose(null)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {promptState.options.cancelLabel || promptState.options.cancelText || 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-[background-color,transform] duration-100 ease-out active:scale-98 cursor-pointer touch-manipulation"
                >
                  {promptState.options.confirmLabel || promptState.options.confirmText || 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
};

export const usePrompt = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('usePrompt must be used within a ConfirmProvider');
  }
  return context.prompt;
};
