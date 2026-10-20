// ============================================================
// src/components/ui/Switch.tsx
// Interrupteur à bascule accessible et tactile pour RestoMaster OS
// Note design : l'état activé est strictement en Vert Émeraude (success)
// L'Amber est réservé aux signaux de marque / actions principales
// ============================================================

import React from 'react';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  size = 'md',
  'aria-label': ariaLabel,
}) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;
  const descriptionId = `${switchId}-description`;

  const sizeTrackClasses = {
    sm: 'w-9 h-5',
    md: 'w-11 h-6',
    lg: 'w-14 h-7.5',
  };

  const sizeThumbClasses = {
    sm: 'w-3.5 h-3.5 translate-x-1',
    md: 'w-4.5 h-4.5 translate-x-1',
    lg: 'w-5.5 h-5.5 translate-x-1',
  };

  const sizeThumbCheckedClasses = {
    sm: 'translate-x-4.5',
    md: 'translate-x-5.5',
    lg: 'translate-x-7.5',
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer
          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          ${sizeTrackClasses[size]}
          ${checked ? 'bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out
            ${sizeThumbClasses[size]}
            ${checked ? sizeThumbCheckedClasses[size] : ''}
          `}
        />
      </button>

      {(label || description) && (
        <label
          htmlFor={switchId}
          onClick={handleClick}
          className={`flex flex-col text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label && <span className="text-xs sm:text-sm font-semibold text-slate-800">{label}</span>}
          {description && (
            <span id={descriptionId} className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  );
};
