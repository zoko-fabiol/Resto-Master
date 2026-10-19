// ============================================================
// src/components/ui/Toast.tsx
// Notifications Toasts élégantes, réactives et autonomes
// ============================================================

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastEventDetail {
  id?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (detail: ToastEventDetail) => void;
const listeners = new Set<ToastListener>();

export const showToast = (
  message: string,
  type: ToastType = 'info',
  duration: number = 3500
): void => {
  const detail: ToastEventDetail = {
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    message,
    type,
    duration,
  };

  listeners.forEach((fn) => fn(detail));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-global-toast', { detail }));
  }
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Array<Required<ToastEventDetail>>>([]);

  useEffect(() => {
    const handleAdd = (detail: ToastEventDetail) => {
      const fullToast: Required<ToastEventDetail> = {
        id: detail.id || `toast-${Date.now()}`,
        message: detail.message,
        type: detail.type,
        duration: detail.duration || 3500,
      };

      setToasts((prev) => [...prev, fullToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== fullToast.id));
      }, fullToast.duration);
    };

    listeners.add(handleAdd);

    const onCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<ToastEventDetail>;
      if (custom.detail) handleAdd(custom.detail);
    };

    window.addEventListener('app-global-toast', onCustomEvent);

    return () => {
      listeners.delete(handleAdd);
      window.removeEventListener('app-global-toast', onCustomEvent);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold border backdrop-blur-md transition-all animate-fade-scale ${
            t.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-600/40 shadow-emerald-950/20'
              : t.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-600/40 shadow-rose-950/20'
              : t.type === 'warning'
              ? 'bg-amber-950/90 text-amber-100 border-amber-600/40 shadow-amber-950/20'
              : 'bg-slate-900/90 text-slate-100 border-slate-700/50 shadow-slate-950/20'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}

          <span className="flex-1 leading-snug">{t.message}</span>

          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
