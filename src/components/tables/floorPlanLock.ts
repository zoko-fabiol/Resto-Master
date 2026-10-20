import { RestaurantTable, LayoutLock } from '../../types/restaurant';

export function evaluateLockAcquisition(
  existingLock: LayoutLock | null,
  nowMs: number,
  candidate: { restaurantId: string; zoneId: string; userId: string; userName: string; userRole?: string },
  lockDurationMs: number = 120_000
): { canAcquire: boolean; lock: LayoutLock; reason?: string } {
  const isExpired = existingLock ? new Date(existingLock.expiresAt).getTime() <= nowMs : true;
  const isSameUser = existingLock ? existingLock.userId === candidate.userId : false;

  if (!existingLock || isExpired || isSameUser) {
    const newLock: LayoutLock = {
      id: `${candidate.restaurantId}_${candidate.zoneId}`,
      restaurantId: candidate.restaurantId,
      zoneId: candidate.zoneId,
      userId: candidate.userId,
      userName: candidate.userName,
      userRole: candidate.userRole,
      acquiredAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + lockDurationMs).toISOString(),
    };
    return { canAcquire: true, lock: newLock };
  }

  return {
    canAcquire: false,
    lock: existingLock,
    reason: `Le plan de salle est en cours de modification par ${existingLock.userName || 'un autre utilisateur'}.`,
  };
}

export function findOccupiedTablesInZone(
  tables: RestaurantTable[],
  zoneId: string,
  zoneName?: string
): RestaurantTable[] {
  return tables.filter((t) => {
    const isInZone = zoneId === 'all' || t.zoneId === zoneId || (zoneName && t.zone === zoneName);
    if (!isInZone) return false;
    const isOccupied =
      t.status === 'occupee' ||
      t.status === 'en_service' ||
      t.status === 'attente_commande' ||
      t.status === 'attente_paiement' ||
      Boolean(t.currentOrderId);
    return isOccupied;
  });
}
