// ============================================================
// src/components/ui/ConfigSection.tsx
// Section d'accordéon pliable pour les écrans de configuration
// ============================================================

import React, { useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

export interface ConfigSectionProps {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string | number;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  id,
  title,
  description,
  icon: Icon,
  badge,
  defaultOpen = true,
  actions,
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `${id}-content`;

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex items-center gap-3.5 text-left flex-1 min-w-0 cursor-pointer group focus:outline-none"
        >
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-amber-500/20 transition-colors">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
                {title}
              </h3>
              {badge !== undefined && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 tabular-nums">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>

          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200/50 transition-all">
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
              aria-hidden="true"
            />
          </div>
        </button>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {isOpen && (
        <div id={contentId} className="p-4 sm:p-6 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};
