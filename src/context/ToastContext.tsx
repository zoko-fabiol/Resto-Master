import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (
    optionsOrTitle: string | { title: string; message?: string; type?: ToastType; duration?: number },
    type?: ToastType
  ) => void;
  removeToast: (id: string) => void;
  playAudioChime: (kind?: 'success' | 'warning' | 'alert' | 'kitchen' | 'error' | 'tap') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Helper for Web Audio API Chime (offline, zero-asset, instant sound)
const playChimeSound = (
  kind: 'success' | 'warning' | 'alert' | 'kitchen' | 'error' | 'tap' = 'success'
) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (kind === 'success') {
      // Pleasant high double ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (kind === 'kitchen') {
      // Classic loud kitchen order bell (2-tone chime)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(1046.5, now + 0.12); // C6
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if (kind === 'error') {
      // Low descending buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (kind === 'tap') {
      // Subtle tactile click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (kind === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (kind === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(330, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.46);
    }
  } catch {
    // Graceful fallback if audio is not permitted or unsupported
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
  }, []);

  const playAudioChime = useCallback(
    (kind: 'success' | 'warning' | 'alert' | 'kitchen' | 'error' | 'tap' = 'success') => {
      playChimeSound(kind);
    },
    []
  );

  const showToast = useCallback(
    (
      optionsOrTitle: string | { title: string; message?: string; type?: ToastType; duration?: number },
      typeArg?: ToastType
    ) => {
      let title: string;
      let message: string | undefined;
      let type: ToastType = 'info';
      let duration: number = 4500;

      if (typeof optionsOrTitle === 'string') {
        title = optionsOrTitle;
        type = typeArg || 'info';
      } else {
        title = optionsOrTitle.title;
        message = optionsOrTitle.message;
        type = optionsOrTitle.type || 'info';
        duration = optionsOrTitle.duration !== undefined ? optionsOrTitle.duration : 4500;
      }

      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newToast: ToastItem = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      // Play soft feedback sound
      if (type === 'success') playChimeSound('success');
      else if (type === 'error' || type === 'warning') playChimeSound('warning');

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, playAudioChime }}>
      {children}
      {/* Toast Floating Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-500/40',
              bg: 'bg-slate-900/95 text-white shadow-emerald-950/20',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
              badgeBg: 'bg-emerald-500/20 text-emerald-300',
            },
            error: {
              border: 'border-rose-500/40',
              bg: 'bg-slate-900/95 text-white shadow-rose-950/20',
              icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
              badgeBg: 'bg-rose-500/20 text-rose-300',
            },
            warning: {
              border: 'border-amber-500/40',
              bg: 'bg-slate-900/95 text-white shadow-amber-950/20',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
              badgeBg: 'bg-amber-500/20 text-amber-300',
            },
            info: {
              border: 'border-blue-500/40',
              bg: 'bg-slate-900/95 text-white shadow-blue-950/20',
              icon: <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
              badgeBg: 'bg-blue-500/20 text-blue-300',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="status"
              aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md animate-toast-slide-in ${typeConfig.bg} ${typeConfig.border}`}
            >
              {typeConfig.icon}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-xs font-bold leading-tight flex items-center justify-between gap-2">
                  <span className="truncate">{toast.title}</span>
                </div>
                {toast.message && (
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-3">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Fermer la notification"
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
