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

import { useRestaurant } from '../../../context/RestaurantContext';
import { Lock } from 'lucide-react';

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
  const { isConfigKeyLocked } = useRestaurant();
  const isLocked = isConfigKeyLocked(id);

  const effectiveDisabled = disabled || isLocked;
  const effectiveDisabledReason = isLocked
    ? 'Ce réglage est verrouillé par la plateforme RestoMaster (clé non déléguée).'
    : disabledReason;
  const effectiveBadge = isLocked ? 'Géré par RestoMaster' : badge;
  const effectiveIcon = isLocked ? Lock : icon;

  return (
    <ConfigToggleRow
      id={id}
      label={label}
      description={description}
      checked={checked}
      onChange={() => onChange()}
      icon={effectiveIcon}
      badge={effectiveBadge}
      disabled={effectiveDisabled}
      disabledReason={effectiveDisabledReason}
      isSensitive={isSensitive}
      sensitiveWarning={sensitiveWarning}
      className={className}
    >
      {children}
    </ConfigToggleRow>
  );
};
