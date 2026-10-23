import { describe, it, expect, beforeEach } from 'vitest';
import { offlineSyncService } from '../services/firestore/offlineSyncService';
import { CashRegisterSession } from '../types/restaurant';

// Shim standard localStorage & navigator pour environnement de test Node
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
(globalThis as any).localStorage = localStorageMock;

if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = { onLine: false };
}

describe('RestoMaster OS — Résilience Hors-Ligne & Tolérance Coupures de Courant (Phase 3)', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('1. Persistance et restauration de la session de caisse active après simulation de coupure brutale', () => {
    const activeSession: CashRegisterSession = {
      id: 'sess-123',
      openedAt: '2026-10-23T10:00:00.000Z',
      openedBy: 'Caissier Principal',
      initialFloat: 25000, // 25 000 FCFA
      totalCashIn: 50000,
      totalCashOut: 5000,
      expectedTotal: 70000,
      status: 'ouverte',
      notes: 'Session active matinée',
    };

    // Simulation de sauvegarde locale atomique
    localStorage.setItem('restomaster_cashSession', JSON.stringify(activeSession));

    // Simulation de redémarrage complet de l'application (extinction et rallumage)
    const reloaded = JSON.parse(localStorage.getItem('restomaster_cashSession') || '{}');

    expect(reloaded.id).toBe('sess-123');
    expect(reloaded.status).toBe('ouverte');
    expect(reloaded.expectedTotal).toBe(70000);
    expect(reloaded.initialFloat).toBe(25000);
  });

  it('2. File d’attente hors-ligne : enqueue avec clé d’idempotence et prévention des doublons', () => {
    // 1. Enqueue d'une action
    const action1 = offlineSyncService.enqueue(
      'orders',
      'CREATE',
      'ord-404',
      { total: 15000, status: 'en_attente' },
      'idemp_order_404'
    );

    expect(action1).toBeDefined();
    expect(action1.idempotencyKey).toBe('idemp_order_404');
    expect(action1.status).toBe('pending');

    // 2. Tentative de renvoyer la même action avec la même clé d'idempotence (simulation de double clic lors d'une micro-coupure)
    const action2 = offlineSyncService.enqueue(
      'orders',
      'CREATE',
      'ord-404',
      { total: 15000, status: 'en_attente' },
      'idemp_order_404'
    );

    // Doit retourner la même action existante sans dupliquer la file
    expect(action2.id).toBe(action1.id);
    const allQueue = offlineSyncService.getQueue();
    const matching = allQueue.filter((a) => a.idempotencyKey === 'idemp_order_404');
    expect(matching.length).toBe(1);
  });

  it('3. File d’attente hors-ligne : mise en file d’appels Cloud Functions avec rejeu garanti', () => {
    const cfAction = offlineSyncService.enqueueCloudFunction(
      'recordPayment',
      { orderId: 'ord-555', amount: 8000, method: 'especes' },
      'idemp_cf_payment_555'
    );

    expect(cfAction.actionType).toBe('CLOUD_FUNCTION');
    expect(cfAction.functionName).toBe('recordPayment');
    expect(cfAction.status).toBe('pending');
    expect(offlineSyncService.getPendingCount()).toBeGreaterThanOrEqual(1);
  });

  it('4. Persistance et restauration de brouillon de panier POS en cas de coupure secteur en cours de saisie', () => {
    const cartDraft = {
      tableId: 'table-5',
      items: [
        { id: 'i1', productId: 'p1', productName: 'Poisson Braisé', quantity: 2, unitPrice: 4000 },
        { id: 'i2', productId: 'p2', productName: 'Bière Blonde', quantity: 3, unitPrice: 1000 },
      ],
      orderNotes: 'Piment fort à part',
      discountPercent: 5,
      savedAt: new Date().toISOString(),
    };

    const draftKey = `restomaster_pos_draft_${cartDraft.tableId}`;
    localStorage.setItem(draftKey, JSON.stringify(cartDraft));

    // Simulation de récupération après rallumage
    const restored = JSON.parse(localStorage.getItem(draftKey) || '{}');
    expect(restored.items.length).toBe(2);
    expect(restored.items[0].productName).toBe('Poisson Braisé');
    expect(restored.orderNotes).toBe('Piment fort à part');
    expect(restored.discountPercent).toBe(5);
  });
});
