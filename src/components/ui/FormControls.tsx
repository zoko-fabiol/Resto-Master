// ============================================================
// src/components/ui/FormControls.tsx
// Contrôles de saisie uniformes (hauteur, bordure, focus, états)
// À utiliser à l'intérieur de <Field> pour les libellés et erreurs
// ============================================================

import React from 'react';

const BASE_CONTROL =
  'w-full text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 rounded-xl ' +
  'px-3.5 min-h-[44px] transition-[border-color,box-shadow] duration-150 ease-out ' +
  'focus:outline-hidden focus:ring-2 focus:ring-slate-400/40 focus:border-slate-500 ' +
  'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ' +
  'aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-400/40';

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={`${BASE_CONTROL} ${type === 'number' ? 'tabular-nums' : ''} ${className}`}
    {...props}
  />
));
TextInput.displayName = 'TextInput';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className = '', children, ...props }, ref) => (
  <select ref={ref} className={`${BASE_CONTROL} pr-8 ${className}`} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={`${BASE_CONTROL} py-2.5 resize-y ${className}`}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

/** Grille de champs responsive : 1 colonne mobile, 2 ou 3 colonnes ensuite */
export const FormGrid: React.FC<{
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}> = ({ columns = 2, className = '', children }) => {
  const cols =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';
  return <div className={`grid gap-4 ${cols} ${className}`}>{children}</div>;
};
