// ============================================================
// src/components/ui/PageHeader.tsx
// En-tête de page standardisé, accessible et réactif pour RestoMaster OS
// ============================================================

import React from 'react';
import { renderIconNode } from './Button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  badge,
  actions,
  className = '',
}) => {
  const resolvedIcon = renderIconNode(icon, 'w-5 h-5');

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 mb-6 ${className}`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {resolvedIcon && (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
            {resolvedIcon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
