import React from 'react';
import { Building2, Store, Package, Layers, Printer, ShieldCheck, Check } from 'lucide-react';

export interface SetupChapter {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETUP_CHAPTERS: SetupChapter[] = [
  {
    id: 1,
    title: 'Identité',
    subtitle: 'Établissement & coordonnées',
    icon: Building2,
  },
  {
    id: 2,
    title: 'Métier & Pack',
    subtitle: '8 profils & 3 formules',
    icon: Store,
  },
  {
    id: 3,
    title: 'Options & Devis',
    subtitle: 'Boutique à la carte',
    icon: Package,
  },
  {
    id: 4,
    title: 'Matériel & Équipe',
    subtitle: 'Caisses & codes PIN',
    icon: Printer,
  },
  {
    id: 5,
    title: 'Mise en Service',
    subtitle: 'Règlement & scellement',
    icon: ShieldCheck,
  },
];

interface SetupStepperProps {
  currentChapter: number;
  onSelectChapter?: (chapterId: number) => void;
  maxAccessibleChapter: number;
}

export const SetupStepper: React.FC<SetupStepperProps> = ({
  currentChapter,
  onSelectChapter,
  maxAccessibleChapter,
}) => {
  return (
    <div className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 select-none">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {SETUP_CHAPTERS.map((chap, idx) => {
          const Icon = chap.icon;
          const isCompleted = chap.id < currentChapter;
          const isCurrent = chap.id === currentChapter;
          const isAccessible = chap.id <= maxAccessibleChapter;

          return (
            <React.Fragment key={chap.id}>
              {/* Étape */}
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => isAccessible && onSelectChapter?.(chap.id)}
                className={`flex items-center gap-3 py-1.5 px-3 rounded-xl transition-all shrink-0 text-left ${
                  isCurrent
                    ? 'bg-amber-500/10 border border-amber-500/30 text-white shadow-sm'
                    : isCompleted
                    ? 'text-slate-300 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                {/* Pastille numéro / coche */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                </div>

                {/* Libellés */}
                <div className="hidden md:block">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Étape {chap.id}
                  </div>
                  <div
                    className={`text-xs font-bold leading-tight ${
                      isCurrent ? 'text-amber-400' : isCompleted ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {chap.title}
                  </div>
                </div>
              </button>

              {/* Ligne séparatrice */}
              {idx < SETUP_CHAPTERS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-4 max-w-12 transition-colors ${
                    chap.id < currentChapter ? 'bg-emerald-500/60' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
