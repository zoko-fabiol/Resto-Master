// ============================================================
// src/components/settings/sections/ModernRuleToggle.tsx
// Pont de compatibilité vers ConfigToggleRow pour l'ensemble des sections
// ============================================================

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ConfigToggleRow } from '../../ui/ConfigToggleRow';

export interface ModernRuleToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  icon?: LucideIcon;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
  isSensitive?: boolean;
  sensitiveWarning?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ModernRuleToggle: React.FC<ModernRuleToggleProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  icon,
  badge,
  disabled = false,
  disabledReason,
  isSensitive = false,
  sensitiveWarning,
  className = '',
  children,
}) => {
  return (
    <ConfigToggleRow
      id={id}
      label={label}
      description={description}
      checked={checked}
      onChange={() => onChange()}
      icon={icon}
      badge={badge}
      disabled={disabled}
      disabledReason={disabledReason}
      isSensitive={isSensitive}
      sensitiveWarning={sensitiveWarning}
      className={className}
    >
      {children}
    </ConfigToggleRow>
  );
};
