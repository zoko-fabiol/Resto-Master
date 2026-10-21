// ============================================================
// src/services/logService.ts
// Service d'audit unifié pour les actions du personnel et du module RH
// ============================================================

import { auditFirestoreService } from './firestore/auditFirestoreService';
import { generateSecureId } from '../lib/utils';

export const logAction = async (
  action: string,
  category: string,
  details: string,
  targetId?: string | number
): Promise<void> => {
  let userName = 'Direction Générale';
  let userRole = 'direction';

  try {
    const raw = localStorage.getItem('restomaster_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      userName = parsed.name || userName;
      userRole = parsed.role || userRole;
    }
  } catch (err) {
    console.warn('[logService] Lecture session locale:', err);
  }

  const logEntry = {
    id: generateSecureId('log'),
    timestamp: new Date().toISOString(),
    userName,
    userRole: userRole as any,
    module: 'Personnel' as const,
    action: `${action.toUpperCase()}_${category.toUpperCase()}`,
    details: targetId ? `${details} (Cible: ${targetId})` : details,
    entityId: targetId ? String(targetId) : undefined,
  };

  await auditFirestoreService.recordAuditLog(logEntry);
};
