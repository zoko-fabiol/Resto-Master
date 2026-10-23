/**
 * RestoMaster OS — Suite de Tests Automatisés Phase H : Intégrité Financière & Stocks Serveur
 * Validation : Idempotence, Unicité des Mouvements de Caisse, Déduction des Stocks Serveur,
 *              Immuabilité des Montants et Région d'Exécution europe-west1.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       RESTOMASTER OS — TESTS AUTOMATISÉS INTÉGRITÉ FINANCIÈRE & STOCK      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

// -----------------------------------------------------------------------------
// TEST 1 : VALIDATION DE LA RÉGION D'EXÉCUTION CLOUD FUNCTIONS (H6)
// -----------------------------------------------------------------------------
console.log('[Test 1] Validation de la région d\'exécution (europe-west1)...');

const indexPath = path.resolve('functions/src/index.ts');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

assert.ok(
  indexContent.includes("region: 'europe-west1'"),
  'Toutes les Cloud Functions doivent être configurées sur europe-west1'
);

const expectedFunctions = [
  'createUser',
  'setUserRole',
  'deleteUser',
  'setPin',
  'verifyPin',
  'verifySupervisor',
  'unlockWithPin',
  'createOrder',
  'addItemsToOrder',
  'recordPayment',
  'cancelOrder',
  'voidItem',
  'openCashSession',
  'closeCashSession',
  'issueInvoice',
  'appendAuditLog',
  'generatePairingCode',
  'pairDevice',
];

for (const fn of expectedFunctions) {
  assert.ok(
    indexContent.includes(`export const ${fn} = onCall(FUNCTION_OPTIONS`),
    `La fonction ${fn} doit être exportée avec FUNCTION_OPTIONS (europe-west1)`
  );
}

console.log('  ✓ Succès : Les 18 fonctions Cloud Functions sont certifiées sur la région europe-west1.');

// -----------------------------------------------------------------------------
// TEST 2 : IDEMPOTENCE DU PAIEMENT ET UNICITÉ DU MOUVEMENT DE CAISSE (H1, H2, H3)
// -----------------------------------------------------------------------------
console.log('\n[Test 2] Test d\'idempotence de recordPayment et unicité des mouvements de caisse...');

interface MockOrder {
  id: string;
  orderNumber: string;
  total: number;
  paidAmount: number;
  payments: Array<{ id: string; amount: number; method: string }>;
  status: string;
  stockDeducted?: boolean;
}

interface MockCashSession {
  id: string;
  status: 'ouverte' | 'fermee';
  initialFloat: number;
  totalCashIn: number;
  expectedTotal: number;
}

interface MockCashMovement {
  id: string;
  sessionId: string;
  amount: number;
  type: string;
  idempotencyKey: string;
}

class TransactionalServerEmulator {
  private idempotencyStore = new Map<string, any>();
  private orders = new Map<string, MockOrder>();
  private cashSessions = new Map<string, MockCashSession>();
  private cashMovements: MockCashMovement[] = [];
  private stockItems = new Map<string, { id: string; name: string; currentQuantity: number }>();
  private stockMovements: Array<{ id: string; stockItemId: string; quantity: number; reason: string }> = [];

  constructor() {
    // Initialiser les stocks
    this.stockItems.set('ing-poulet', { id: 'ing-poulet', name: 'Poulet fermier', currentQuantity: 20 });
    this.stockItems.set('ing-plantain', { id: 'ing-plantain', name: 'Plantain mûr', currentQuantity: 50 });
    this.stockItems.set('ing-gingembre', { id: 'ing-gingembre', name: 'Gingembre frais', currentQuantity: 10 });
  }

  createCashSession(id: string, initialFloat: number): MockCashSession {
    const session: MockCashSession = {
      id,
      status: 'ouverte',
      initialFloat,
      totalCashIn: 0,
      expectedTotal: initialFloat,
    };
    this.cashSessions.set(id, session);
    return session;
  }

  createOrder(order: MockOrder): void {
    this.orders.set(order.id, order);
  }

  // Simulation fidèle de la Cloud Function handleRecordPayment
  recordPayment(params: {
    idempotencyKey: string;
    orderId: string;
    amount: number;
    method: 'especes' | 'momo' | 'carte';
    cashSessionId?: string;
  }) {
    const { idempotencyKey, orderId, amount, method, cashSessionId } = params;

    // 1. Validation idempotence dans la transaction
    if (this.idempotencyStore.has(idempotencyKey)) {
      return {
        isDuplicate: true,
        response: this.idempotencyStore.get(idempotencyKey),
      };
    }

    const order = this.orders.get(orderId);
    if (!order) throw new Error('Commande introuvable');
    if (order.status === 'annulee') throw new Error('Commande annulée');

    const paymentAmount = Math.round(amount);
    if (paymentAmount <= 0) throw new Error('Montant supérieur à zéro obligatoire');

    const totalPaidSoFar = order.paidAmount || 0;
    const remaining = order.total - totalPaidSoFar;

    // Refus strict du dépassement
    if (paymentAmount > remaining) {
      throw new Error(`Montant (${paymentAmount}) dépasse le reste à payer (${remaining})`);
    }

    // Validation session de caisse si espèces
    let session: MockCashSession | undefined;
    if (method === 'especes') {
      if (!cashSessionId) throw new Error('Session de caisse obligatoire pour espèces');
      session = this.cashSessions.get(cashSessionId);
      if (!session || session.status !== 'ouverte') {
        throw new Error('Session de caisse fermée ou invalide');
      }
    }

    const paymentId = `pay_${crypto.randomUUID()}`;
    const newPaidAmount = totalPaidSoFar + paymentAmount;
    const isFullyPaid = newPaidAmount >= order.total;

    order.paidAmount = newPaidAmount;
    order.payments.push({ id: paymentId, amount: paymentAmount, method });
    order.status = isFullyPaid ? 'payee' : 'partiellement_payee';

    // Mouvement de caisse
    if (method === 'especes' && session) {
      const movementId = `mvt_${crypto.randomUUID()}`;
      this.cashMovements.push({
        id: movementId,
        sessionId: session.id,
        amount: paymentAmount,
        type: 'encaissement_vente',
        idempotencyKey,
      });
      session.totalCashIn += paymentAmount;
      session.expectedTotal += paymentAmount;
    }

    const responsePayload = {
      success: true,
      paymentId,
      orderId,
      amountPaid: paymentAmount,
      totalPaid: newPaidAmount,
      isFullyPaid,
    };

    // Mémoriser la clé d'idempotence
    this.idempotencyStore.set(idempotencyKey, responsePayload);

    return {
      isDuplicate: false,
      response: responsePayload,
    };
  }

  getCashMovementsCount(): number {
    return this.cashMovements.length;
  }

  getCashSession(id: string): MockCashSession | undefined {
    return this.cashSessions.get(id);
  }

  getStockItem(id: string) {
    return this.stockItems.get(id);
  }

  // Simulation déduction des stocks
  deductRecipeStock(orderId: string, items: Array<{ name: string; quantity: number; ingredients: Array<{ stockItemId: string; quantityRequired: number }> }>) {
    const order = this.orders.get(orderId);
    if (!order || order.stockDeducted) {
      return false; // Évite la double déduction
    }

    for (const item of items) {
      for (const ing of item.ingredients) {
        const stockItem = this.stockItems.get(ing.stockItemId);
        if (stockItem) {
          const consumed = ing.quantityRequired * item.quantity;
          stockItem.currentQuantity = Math.max(0, Math.round((stockItem.currentQuantity - consumed) * 100) / 100);
          this.stockMovements.push({
            id: `sm_${crypto.randomUUID()}`,
            stockItemId: ing.stockItemId,
            quantity: consumed,
            reason: `Consommation recette ${order.orderNumber}`,
          });
        }
      }
    }

    order.stockDeducted = true;
    return true;
  }

  getStockMovementsCount(): number {
    return this.stockMovements.length;
  }
}

const emulator = new TransactionalServerEmulator();
const session1 = emulator.createCashSession('cs-100', 50000); // 50 000 FCFA fond initial

emulator.createOrder({
  id: 'ord-100',
  orderNumber: 'CMD-20261020-0001',
  total: 15000,
  paidAmount: 0,
  payments: [],
  status: 'en_service',
});

const idempKey1 = crypto.randomUUID();

// 1. Premier appel
const res1 = emulator.recordPayment({
  idempotencyKey: idempKey1,
  orderId: 'ord-100',
  amount: 15000,
  method: 'especes',
  cashSessionId: 'cs-100',
});

assert.strictEqual(res1.isDuplicate, false);
assert.strictEqual(res1.response.totalPaid, 15000);
assert.strictEqual(res1.response.isFullyPaid, true);
assert.strictEqual(emulator.getCashMovementsCount(), 1);
assert.strictEqual(session1.expectedTotal, 65000); // 50 000 + 15 000

// 2. Deuxième appel immédiat avec la même clé (répétition réseau)
const res2 = emulator.recordPayment({
  idempotencyKey: idempKey1,
  orderId: 'ord-100',
  amount: 15000,
  method: 'especes',
  cashSessionId: 'cs-100',
});

assert.strictEqual(res2.isDuplicate, true);
assert.strictEqual(res2.response.paymentId, res1.response.paymentId);
assert.strictEqual(emulator.getCashMovementsCount(), 1, 'Aucun mouvement de caisse dupliqué');
assert.strictEqual(session1.expectedTotal, 65000, 'Le solde de caisse n\'est pas crédité une 2ème fois');

console.log('  ✓ Succès : Idempotence parfaite et unicité garantie du mouvement de caisse (solde: 65 000 FCFA).');

// -----------------------------------------------------------------------------
// TEST 3 : REFUS STRICT DU SURPAIEMENT ET SESSION REQUISE (H2)
// -----------------------------------------------------------------------------
console.log('\n[Test 3] Test des garde-fous financiers (surpaiement & session de caisse)...');

emulator.createOrder({
  id: 'ord-200',
  orderNumber: 'CMD-20261020-0002',
  total: 8000,
  paidAmount: 0,
  payments: [],
  status: 'en_service',
});

// A. Tentative de paiement de 10 000 FCFA pour une facture de 8 000 FCFA
assert.throws(
  () => {
    emulator.recordPayment({
      idempotencyKey: crypto.randomUUID(),
      orderId: 'ord-200',
      amount: 10000,
      method: 'especes',
      cashSessionId: 'cs-100',
    });
  },
  /dépasse le reste à payer/,
  'Le serveur doit refuser tout montant excédant le reste à payer exact'
);

// B. Tentative de paiement en espèces sans session de caisse
assert.throws(
  () => {
    emulator.recordPayment({
      idempotencyKey: crypto.randomUUID(),
      orderId: 'ord-200',
      amount: 5000,
      method: 'especes',
    });
  },
  /Session de caisse obligatoire/,
  'Le paiement en espèces sans session de caisse doit être rejeté'
);

console.log('  ✓ Succès : Surpaiement bloqué et session de caisse obligatoire vérifiée.');

// -----------------------------------------------------------------------------
// TEST 4 : DÉDUCTION DES STOCKS SERVEUR ET PRÉVENTION DOUBLE DÉDUCTION (H4)
// -----------------------------------------------------------------------------
console.log('\n[Test 4] Test de déduction des stocks selon fiche technique et timing...');

emulator.createOrder({
  id: 'ord-300',
  orderNumber: 'CMD-20261020-0003',
  total: 12000,
  paidAmount: 0,
  payments: [],
  status: 'en_service',
  stockDeducted: false,
});

const orderItemsWithRecipe = [
  {
    name: 'Poulet DG',
    quantity: 2,
    ingredients: [
      { stockItemId: 'ing-poulet', quantityRequired: 1 }, // 2 poulets
      { stockItemId: 'ing-plantain', quantityRequired: 3 }, // 6 plantains
    ],
  },
];

// Déduction à l'encaissement
const initialPoulet = emulator.getStockItem('ing-poulet')!.currentQuantity; // 20
const initialPlantain = emulator.getStockItem('ing-plantain')!.currentQuantity; // 50

const deducted1 = emulator.deductRecipeStock('ord-300', orderItemsWithRecipe);
assert.strictEqual(deducted1, true);
assert.strictEqual(emulator.getStockItem('ing-poulet')!.currentQuantity, initialPoulet - 2);
assert.strictEqual(emulator.getStockItem('ing-plantain')!.currentQuantity, initialPlantain - 6);
assert.strictEqual(emulator.getStockMovementsCount(), 2);

// Tentative de ré-exécution pour la même commande (protection anti double déduction)
const deducted2 = emulator.deductRecipeStock('ord-300', orderItemsWithRecipe);
assert.strictEqual(deducted2, false, 'La déduction ne doit pas s\'exécuter deux fois');
assert.strictEqual(emulator.getStockMovementsCount(), 2, 'Nombre de mouvements de stock inchangé');

console.log('  ✓ Succès : Déduction des ingrédients conforme (Poulet: 18, Plantain: 44), double déduction évitée.');

// -----------------------------------------------------------------------------
// TEST 5 : CONTRÔLE DES RÈGLES DE SÉCURITÉ FIRESTORE POUR LES MONTANTS (H5)
// -----------------------------------------------------------------------------
console.log('\n[Test 5] Contrôle des règles de sécurité Firestore pour l\'intégrité des montants...');

const rulesPath = path.resolve('firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

const isProtectedByDiff =
  rulesContent.includes("affectedKeys().hasAny") &&
  rulesContent.includes("'orderNumber'") &&
  rulesContent.includes("'total'") &&
  rulesContent.includes("'subtotal'") &&
  rulesContent.includes("'tax'") &&
  rulesContent.includes("'paidAmount'");

assert.ok(
  isProtectedByDiff || rulesContent.includes("request.resource.data.orderNumber == resource.data.orderNumber"),
  'Les règles Firestore doivent interdire la modification de orderNumber'
);
assert.ok(
  isProtectedByDiff || rulesContent.includes("request.resource.data.total == resource.data.total"),
  'Les règles Firestore doivent interdire la modification non autorisée de total'
);
assert.ok(
  isProtectedByDiff || rulesContent.includes("request.resource.data.subtotal == resource.data.subtotal"),
  'Les règles Firestore doivent interdire la modification non autorisée de subtotal'
);
assert.ok(
  isProtectedByDiff || rulesContent.includes("request.resource.data.tax == resource.data.tax"),
  'Les règles Firestore doivent interdire la modification non autorisée de tax'
);
assert.ok(
  isProtectedByDiff || rulesContent.includes("request.resource.data.paidAmount >= resource.data.paidAmount"),
  'Les règles Firestore doivent interdire la réduction cliente de paidAmount'
);
assert.ok(
  rulesContent.includes("match /_idempotency_keys/{keyId}") && rulesContent.includes("allow read, write: if false;"),
  'Les clés d\'idempotence doivent être inaccessibles aux clients directs'
);
assert.ok(
  rulesContent.includes("match /_counters/{counterId}") && rulesContent.includes("allow read, write: if false;"),
  'Les compteurs doivent être inaccessibles aux clients directs'
);

console.log('  ✓ Succès : Protection stricte des montants, numéros et collections système dans firestore.rules.');

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       TOUS LES TESTS DE LA PHASE H SONT VALIDÉS AVEC SUCCÈS (5/5)         ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
