// ============================================================
// src/components/ui/Field.tsx
// Enveloppe de champ de formulaire accessible avec htmlFor + aide + erreur
// ============================================================

import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

export interface FieldProps {
  id?: string;
  label?: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactElement<{
    id?: string;
    'aria-invalid'?: boolean | 'true' | 'false';
    'aria-describedby'?: string;
    required?: boolean;
  }>;
}

export const Field: React.FC<FieldProps> = ({
  id,
  label,
  helpText,
  error,
  required = false,
  className = '',
  children,
}) => {
  const generatedId = React.useId();
  const fieldId = id || children.props.id || generatedId;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;

  const describedByParts: string[] = [];
  if (helpText) describedByParts.push(helpId);
  if (error) describedByParts.push(errorId);
  const describedBy = describedByParts.length > 0 ? describedByParts.join(' ') : undefined;

  // Clone children to inject id, aria attributes and required
  const childWithProps = React.cloneElement(children, {
    id: fieldId,
    required: required || children.props.required,
    'aria-invalid': !!error,
    'aria-describedby': describedBy || children.props['aria-describedby'],
  });

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 select-none"
        >
          <span>{label}</span>
          {required && (
            <span className="text-rose-500 font-bold" title="Champ obligatoire">
              *
            </span>
          )}
        </label>
      )}

      {childWithProps}

      {error ? (
        <div id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : helpText ? (
        <div id={helpId} className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
          <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>{helpText}</span>
        </div>
      ) : null}
    </div>
  );
};
