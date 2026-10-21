// ============================================================
// src/components/ui/PageLayout.tsx
// Coque de page : PageShell, PageToolbar, FilterChips, SectionCard
// Structure unique : titre (PageHeader) → barre d'outils → cartes de section
// ============================================================

import React from 'react';

/** Conteneur de page : espacement vertical et marge basse uniformes */
export const PageShell: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => <div className={`space-y-6 pb-12 ${className}`}>{children}</div>;

/** Barre d'outils sous le titre : recherche, filtres, boutons de vue */
export const PageToolbar: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <div
    role="toolbar"
    className={`bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
  >
    {children}
  </div>
);

export interface FilterChipOption {
  id: string;
  label: string;
  count?: number;
}

/** Filtres en pastilles (une seule sélection) */
export const FilterChips: React.FC<{
  options: FilterChipOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}> = ({ options, value, onChange, ariaLabel, className = '' }) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={`flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0 ${className}`}
  >
    {options.map((opt) => {
      const active = opt.id === value;
      return (
        <button
          key={opt.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(opt.id)}
          className={`min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors touch-manipulation ${
            active
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {opt.label}
          {typeof opt.count === 'number' && (
            <span className="ml-1.5 tabular-nums opacity-70">{opt.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

/** Carte de section : le titre est toujours dans l'en-tête de la carte (h2) */
export const SectionCard: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, description, icon, actions, className = '', bodyClassName = '', children }) => (
  <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${className}`}>
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 text-slate-500 shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </header>
    <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
  </section>
);
