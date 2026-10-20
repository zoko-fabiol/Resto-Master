// ============================================================
// src/components/ui/Badge.tsx
// Badge sémantique pour statuts, rôles et alertes dans RestoMaster OS
// ============================================================

import React from 'react';

export type BadgeVariant = 'default' | 'brand' | 'success' | 'danger' | 'warning' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  brand: {
    container: 'bg-amber-100 text-amber-900 border-amber-300/60 font-bold',
    dot: 'bg-amber-500',
  },
  success: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 font-semibold',
    dot: 'bg-emerald-500',
  },
  danger: {
    container: 'bg-rose-50 text-rose-800 border-rose-200/80 font-semibold',
    dot: 'bg-rose-500',
  },
  warning: {
    container: 'bg-orange-50 text-orange-800 border-orange-200/80 font-semibold',
    dot: 'bg-orange-500',
  },
  info: {
    container: 'bg-sky-50 text-sky-800 border-sky-200/80 font-semibold',
    dot: 'bg-sky-500',
  },
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1 rounded-md font-medium',
  md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5 rounded-lg font-medium',
  lg: 'text-sm px-3 py-1.5 gap-2 rounded-xl font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
  ...props
}) => {
  const styles = VARIANT_CLASSES[variant];

  return (
    <span
      className={`
        inline-flex items-center border select-none transition-colors
        ${styles.container}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
