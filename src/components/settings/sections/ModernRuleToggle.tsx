import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ModernRuleToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  icon?: LucideIcon;
  badge?: string;
}

export const ModernRuleToggle: React.FC<ModernRuleToggleProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  badge,
}) => {
  return (
    <div
      onClick={onChange}
      className={`group relative flex items-center justify-between gap-3.5 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
        checked
          ? 'bg-white border-amber-400 shadow-xs ring-1 ring-amber-400/40 hover:shadow-md'
          : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
              checked
                ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 shadow-sm shadow-amber-500/25 scale-100'
                : 'bg-slate-200/70 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold leading-snug transition-colors ${
                checked ? 'text-slate-950' : 'text-slate-700 group-hover:text-slate-900'
              }`}
            >
              {label}
            </span>
            {badge && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200/60 shrink-0">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Modern Switch (Interrupteur ON/OFF) */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        <span
          className={`text-[10px] font-black tracking-wider uppercase transition-colors select-none ${
            checked ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>

        <div
          role="switch"
          aria-checked={checked}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
            checked
              ? 'bg-emerald-500 shadow-inner'
              : 'bg-slate-300'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
