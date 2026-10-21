// ============================================================
// src/components/ui/Card.tsx
// Carte modulaire et typée pour l'interface de RestoMaster OS
// ============================================================

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive' | 'danger' | 'brand';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES = {
  default: 'bg-white border border-slate-200/80 shadow-xs',
  flat: 'bg-slate-50 border border-slate-200/60 shadow-none',
  interactive: 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-[border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99] touch-manipulation cursor-pointer',
  danger: 'bg-rose-50/50 border border-rose-200 text-rose-900',
  brand: 'bg-amber-50/40 border border-amber-200/80',
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-1 pb-4 border-b border-slate-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <h3 className={`text-base sm:text-lg font-bold text-slate-900 tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 ${className}`} {...props}>
      {children}
    </div>
  );
};
