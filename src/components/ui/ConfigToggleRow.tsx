// ============================================================
// src/components/ui/ConfigToggleRow.tsx
// Ligne de paramétrage standardisée avec Switch accessible,
// gestion des options dépendantes et confirmation des réglages sensibles
// ============================================================

import React from 'react';
import { LucideIcon, ShieldAlert } from 'lucide-react';
import { Switch } from './Switch';
import { useConfirm } from './ConfirmDialog';

export interface ConfigToggleRowProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
  isSensitive?: boolean;
  sensitiveWarning?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ConfigToggleRow: React.FC<ConfigToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  badge,
  disabled = false,
  disabledReason,
  isSensitive = false,
  sensitiveWarning,
  className = '',
  children,
}) => {
  const confirm = useConfirm();

  const handleToggle = async (nextChecked: boolean) => {
    if (disabled) return;

    if (nextChecked && isSensitive) {
      const ok = await confirm({
        title: 'Option sensible',
        message:
          sensitiveWarning ||
          `Êtes-vous certain de vouloir activer « ${label} » ? Cette option modifie les règles de contrôle opérationnel du restaurant.`,
        variant: 'danger',
        confirmText: 'Activer',
        cancelText: 'Annuler',
      });
      if (!ok) return;
    }

    onChange(nextChecked);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        disabled
          ? 'opacity-50 bg-slate-50 border-slate-200 pointer-events-none'
          : checked
          ? 'bg-white border-slate-300 ring-1 ring-slate-200 shadow-2xs hover:shadow-xs'
          : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
      } ${className}`}
      title={disabled && disabledReason ? disabledReason : undefined}
    >
      <div
        className="flex items-center justify-between gap-3.5 p-4 cursor-pointer select-none"
        onClick={() => !disabled && handleToggle(!checked)}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                checked
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-slate-200/70 text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {label}
              </span>
              {isSensitive && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 shrink-0">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Sensible</span>
                </span>
              )}
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
            {disabled && disabledReason && (
              <p className="text-[11px] text-amber-700 mt-1 italic">
                {disabledReason}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 pl-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            id={id}
            checked={checked}
            onChange={handleToggle}
            disabled={disabled}
            aria-label={label}
          />
        </div>
      </div>

      {children && checked && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};
