// ============================================================
// src/components/ui/Button.tsx
// Bouton standardisé et tactile pour RestoMaster OS
// ============================================================

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'touch';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  rightIcon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-slate-950 font-bold shadow-xs border border-brand-400/30 focus-visible:ring-brand-500',
  secondary:
    'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold shadow-xs border border-slate-800 focus-visible:ring-slate-400',
  outline:
    'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 font-semibold shadow-xs focus-visible:ring-slate-400',
  danger:
    'bg-danger-600 hover:bg-danger-700 active:bg-danger-800 text-white font-bold shadow-xs border border-danger-500/30 focus-visible:ring-danger-500',
  ghost:
    'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-medium focus-visible:ring-slate-400',
  success:
    'bg-success-600 hover:bg-success-700 active:bg-success-800 text-white font-bold shadow-xs border border-success-500/30 focus-visible:ring-success-500',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2 rounded-xl gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5',
  touch: 'text-sm sm:text-base min-h-[48px] min-w-[48px] px-5 py-3 rounded-xl gap-2.5 font-bold',
};

export function renderIconNode(
  icon: React.ComponentType<{ className?: string }> | React.ReactNode | null | undefined,
  defaultClassName: string = 'w-4 h-4 shrink-0'
): React.ReactNode {
  if (!icon) return null;

  // 1. Déjà un élément JSX instancié (ex: <Plus className="w-4 h-4" />)
  if (React.isValidElement(icon)) {
    return icon;
  }

  // 2. Composant React fonctionnel OU composant forwardRef / memo (les icônes lucide-react sont des objets forwardRef)
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' &&
      icon !== null &&
      ('$$typeof' in icon || 'render' in icon))
  ) {
    const Component = icon as React.ComponentType<{ className?: string }>;
    return React.createElement(Component, { className: defaultClassName });
  }

  // 3. Fallback pour tout autre ReactNode valide (texte, nombre, etc.)
  return icon as React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      icon,
      fullWidth = false,
      disabled = false,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const resolvedLeftIcon = renderIconNode(leftIcon || icon, 'w-4 h-4 shrink-0');
    const resolvedRightIcon = renderIconNode(rightIcon, 'w-4 h-4 shrink-0');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={`
          inline-flex items-center justify-center transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out select-none touch-manipulation
          focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2
          active:scale-98 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100
          ${VARIANT_STYLES[variant]}
          ${SIZE_STYLES[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {resolvedLeftIcon && <span className="shrink-0" aria-hidden="true">{resolvedLeftIcon}</span>}
            {children && <span>{children}</span>}
            {resolvedRightIcon && <span className="shrink-0" aria-hidden="true">{resolvedRightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
