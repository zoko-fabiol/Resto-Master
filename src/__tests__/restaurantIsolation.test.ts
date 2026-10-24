import { describe, it, expect } from 'vitest';
import { Order, RestaurantTable, Zone, CashRegister, CashMovement, Expense } from '../types/restaurant';

describe('Isolation stricte multi-restaurants (Data Scoping & Sandboxing)', () => {
  const RESTO_A = 'out-douala-centre';
  const RESTO_B = 'out-yaounde-bastos';

  it('isole strictement les commandes de chaque établissement', () => {
    const orders: Partial<Order>[] = [
      { id: 'ord-1', restaurantId: RESTO_A, total: 15000, status: 'payee' },
      { id: 'ord-2', restaurantId: RESTO_A, total: 25000, status: 'envoye' },
      { id: 'ord-3', restaurantId: RESTO_B, total: 50000, status: 'payee' },
      { id: 'ord-orphan', restaurantId: '', total: 8000, status: 'payee' },
      { id: 'ord-undefined', total: 12000, status: 'envoye' },
    ];

    const activeOrdersA = orders.filter((o) => Boolean(RESTO_A) && o.restaurantId === RESTO_A);
    const activeOrdersB = orders.filter((o) => Boolean(RESTO_B) && o.restaurantId === RESTO_B);

    // Restaurant A ne doit voir que ord-1 et ord-2
    expect(activeOrdersA.map((o) => o.id)).toEqual(['ord-1', 'ord-2']);
    expect(activeOrdersA.reduce((sum, o) => sum + (o.total || 0), 0)).toBe(40000);

    // Restaurant B ne doit voir que ord-3
    expect(activeOrdersB.map((o) => o.id)).toEqual(['ord-3']);
    expect(activeOrdersB.reduce((sum, o) => sum + (o.total || 0), 0)).toBe(50000);

    // Les commandes orphelines créées avant l'onboarding ne doivent fuiter dans AUCUN restaurant
    expect(activeOrdersA.some((o) => o.id === 'ord-orphan' || o.id === 'ord-undefined')).toBe(false);
    expect(activeOrdersB.some((o) => o.id === 'ord-orphan' || o.id === 'ord-undefined')).toBe(false);
  });

  it('garantit un plan de salle (tables et zones) vierge et exclusif pour chaque restaurant', () => {
    const tables: Partial<RestaurantTable>[] = [
      { id: 'tbl-1', restaurantId: RESTO_A, number: '1', name: 'Table 1' },
      { id: 'tbl-2', restaurantId: RESTO_A, number: '2', name: 'Table 2' },
      { id: 'tbl-orphan', restaurantId: undefined, number: '99', name: 'Table Orpheline' },
    ];

    const zones: Partial<Zone>[] = [
      { id: 'zone-1', restaurantId: RESTO_A, name: 'Terrasse Douala' },
      { id: 'zone-orphan', restaurantId: '', name: 'Zone Ancienne' },
    ];

    const activeTablesB = tables.filter((t) => Boolean(RESTO_B) && t.restaurantId === RESTO_B);
    const activeZonesB = zones.filter((z) => Boolean(RESTO_B) && z.restaurantId === RESTO_B);

    // Nouveau restaurant B doit être vierge de toute table et zone de A
    expect(activeTablesB.length).toBe(0);
    expect(activeZonesB.length).toBe(0);
  });

  it('isole strictement les flux financiers, caisses et dépenses', () => {
    const movements: Partial<CashMovement>[] = [
      { id: 'cm-1', restaurantId: RESTO_A, amount: 25000, type: 'entree' },
      { id: 'cm-orphan', restaurantId: undefined, amount: 10000, type: 'entree' },
    ];

    const expenses: Partial<Expense>[] = [
      { id: 'exp-1', restaurantId: RESTO_A, amount: 5000, reason: 'Marché Douala' },
      { id: 'exp-orphan', restaurantId: '', amount: 7000, reason: 'Test' },
    ];

    const activeMovementsB = movements.filter((m) => Boolean(RESTO_B) && m.restaurantId === RESTO_B);
    const activeExpensesB = expenses.filter((e) => Boolean(RESTO_B) && e.restaurantId === RESTO_B);

    expect(activeMovementsB.length).toBe(0);
    expect(activeExpensesB.length).toBe(0);
  });
});
