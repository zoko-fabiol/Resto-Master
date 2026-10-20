import { describe, it, expect } from 'vitest';
import { RestaurantTable, LayoutLock } from '../../../types/restaurant';
import { evaluateLockAcquisition, findOccupiedTablesInZone } from '../floorPlanLock';

describe('floorPlanLock & Service Protection (D-06)', () => {
  const mockUser = {
    restaurantId: 'resto-1',
    zoneId: 'zone-terrasse',
    userId: 'user-manager-1',
    userName: 'Marc (Manager)',
    userRole: 'manager',
  };

  const otherUserLock: LayoutLock = {
    id: 'resto-1_zone-terrasse',
    restaurantId: 'resto-1',
    zoneId: 'zone-terrasse',
    userId: 'user-manager-2',
    userName: 'Claire (Directrice)',
    userRole: 'direction',
    acquiredAt: new Date(1000).toISOString(),
    expiresAt: new Date(1000 + 120_000).toISOString(), // expire à 121000
  };

  it('permet l acquisition du verrou si aucun verrou n existe', () => {
    const res = evaluateLockAcquisition(null, 5000, mockUser);
    expect(res.canAcquire).toBe(true);
    expect(res.lock.userId).toBe('user-manager-1');
    expect(res.lock.expiresAt).toBe(new Date(5000 + 120_000).toISOString());
  });

  it('bloque l acquisition si un autre utilisateur détient un verrou actif', () => {
    const now = 50_000; // avant expiration (121_000)
    const res = evaluateLockAcquisition(otherUserLock, now, mockUser);
    expect(res.canAcquire).toBe(false);
    expect(res.reason).toContain('Claire (Directrice)');
  });

  it('autorise l acquisition si le verrou de l autre utilisateur est expiré', () => {
    const now = 130_000; // après expiration (121_000)
    const res = evaluateLockAcquisition(otherUserLock, now, mockUser);
    expect(res.canAcquire).toBe(true);
    expect(res.lock.userId).toBe('user-manager-1');
  });

  it('autorise le renouvellement par le même utilisateur', () => {
    const sameUserLock: LayoutLock = {
      ...otherUserLock,
      userId: 'user-manager-1',
      userName: 'Marc (Manager)',
    };
    const now = 60_000;
    const res = evaluateLockAcquisition(sameUserLock, now, mockUser);
    expect(res.canAcquire).toBe(true);
    expect(res.lock.userId).toBe('user-manager-1');
    expect(res.lock.expiresAt).toBe(new Date(60_000 + 120_000).toISOString());
  });

  it('détecte avec précision les tables occupées ou en commande dans une salle', () => {
    const sampleTables: RestaurantTable[] = [
      { id: 't1', number: 'T1', capacity: 2, zoneId: 'zone-1', zone: 'Salle Principale', status: 'libre' },
      { id: 't2', number: 'T2', capacity: 4, zoneId: 'zone-1', zone: 'Salle Principale', status: 'occupee', currentOrderId: 'cmd-1' },
      { id: 't3', number: 'T3', capacity: 6, zoneId: 'zone-2', zone: 'Terrasse', status: 'occupee' },
      { id: 't4', number: 'T4', capacity: 2, zoneId: 'zone-1', zone: 'Salle Principale', status: 'attente_paiement' },
      { id: 't5', number: 'T5', capacity: 4, zoneId: 'zone-1', zone: 'Salle Principale', status: 'libre', currentOrderId: 'cmd-2' }, // commande résiduelle
    ];

    const occupiedInZone1 = findOccupiedTablesInZone(sampleTables, 'zone-1');
    expect(occupiedInZone1.map((t) => t.id)).toEqual(['t2', 't4', 't5']);

    const occupiedInZone2 = findOccupiedTablesInZone(sampleTables, 'zone-2');
    expect(occupiedInZone2.map((t) => t.id)).toEqual(['t3']);
  });
});
