// ============================================================
// src/components/ui/EmptyState.tsx
// État vide visuel, élégant et chaleureux pour RestoMaster OS
// ============================================================

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionProps?: Partial<ButtonProps>;
  actionNode?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionProps,
  actionNode,
  className = '',
}) => {
  const isLucideIcon = typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null && 'render' in Icon);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
        {isLucideIcon ? (
          // @ts-expect-error Lucide icon component invocation
          <Icon className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
        ) : (
          (Icon as React.ReactNode)
        )}
      </div>

      <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h4>

      {description && (
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {actionNode ? (
        <div className="mt-6">{actionNode}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            onClick={onAction}
            {...actionProps}
          >
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
