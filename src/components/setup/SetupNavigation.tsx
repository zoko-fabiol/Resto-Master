import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface SetupNavigationProps {
  currentChapter: number;
  totalChapters: number;
  onPrevious: () => void;
  onNext: () => void;
  isLoading?: boolean;
  canProceed?: boolean;
  nextLabel?: string;
}

export const SetupNavigation: React.FC<SetupNavigationProps> = ({
  currentChapter,
  totalChapters,
  onPrevious,
  onNext,
  isLoading = false,
  canProceed = true,
  nextLabel,
}) => {
  const isFirst = currentChapter === 1;
  const isLast = currentChapter === totalChapters;

  const defaultNextLabel = isLast ? 'Certifier & Mettre en Service' : 'Continuer';

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 select-none">
      {/* Bouton Précédent */}
      <div>
        {!isFirst ? (
          <button
            type="button"
            onClick={onPrevious}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 font-semibold text-xs border border-slate-800 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Précédent</span>
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>

      {/* Progression centrale */}
      <div className="text-center hidden sm:block">
        <span className="text-slate-500 font-mono text-[11px] uppercase tracking-wider">
          Étape <strong className="text-white font-bold">{currentChapter}</strong> sur {totalChapters}
        </span>
      </div>

      {/* Bouton Suivant */}
      <div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
            canProceed && !isLoading
              ? isLast
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95 cursor-pointer'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <span>{nextLabel || defaultNextLabel}</span>
              {isLast ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
