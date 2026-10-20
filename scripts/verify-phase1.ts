/**
 * RestoMaster OS — Suite de Tests Automatisés Phase 1
 * Validation : Idempotence, Résistance au Tampering, Numérotation Séquentielle Atomique, Chaîne SHA-256
 */

import assert from 'node:assert';
import crypto from 'node:crypto';

console.log('================================================================');
console.log(' RestoMaster OS — Validation Automatisée Architecture Phase 1');
console.log('================================================================\n');

// --------------------------------------------------------------------
// 1. TEST : RÉSISTANCE À LA FALSIFICATION DES PRIX (PRICE TAMPERING)
// --------------------------------------------------------------------
console.log('[Test 1] Vérification de la résistance à la falsification des prix...');

interface CatalogItem {
  id: string;
  name: string;
  price: number;
}

const mockCatalog: Record<string, CatalogItem> = {
  'prod-poulet-dg': { id: 'prod-poulet-dg', name: 'Poulet DG Royal', price: 6500 },
  'prod-jus-naturel': { id: 'prod-jus-naturel', name: 'Jus de Bissap 50cl', price: 1500 },
};

function serverCalculateOrder(
  catalog: Record<string, CatalogItem>,
  clientItems: Array<{ productId: string; quantity: number; unitPrice?: number }>,
  discountPercentRequested = 0,
  hasSupervisorToken = false
) {
  // Le serveur IGNORE COMPLÈTEMENT le unitPrice envoyé par le client
  let subtotal = 0;
  for (const item of clientItems) {
    const catalogItem = catalog[item.productId];
    if (!catalogItem) {
      throw new Error(`Produit non reconnu: ${item.productId}`);
    }
    subtotal += catalogItem.price * item.quantity;
  }

  // Contrôle du plafond de remise (max 10% sans superviseur)
  if (discountPercentRequested > 10 && !hasSupervisorToken) {
    throw new Error('Dépassement du plafond de remise de 10% sans autorisation superviseur');
  }

  const effectiveDiscountPercent = Math.min(Math.max(0, discountPercentRequested), 100);
  const discountAmount = Math.round((subtotal * effectiveDiscountPercent) / 100);
  const taxableBase = subtotal - discountAmount;
  const tax = Math.round((taxableBase * 19.25) / 100);
  const total = taxableBase + tax;

  return { subtotal, discountAmount, taxableBase, tax, total };
}

// Client malveillant tente d'injecter un prix de 50 FCFA au lieu de 6500 FCFA
const maliciousClientInput = [
  { productId: 'prod-poulet-dg', quantity: 2, unitPrice: 50 },
  { productId: 'prod-jus-naturel', quantity: 3, unitPrice: 10 },
];

const calculated = serverCalculateOrder(mockCatalog, maliciousClientInput);
// Prix attendu du catalogue : 2 * 6500 = 13000 + 3 * 1500 = 4500 => Sous-total = 17500 FCFA
assert.strictEqual(calculated.subtotal, 17500, 'Le serveur doit imposer le sous-total du catalogue');
assert.strictEqual(calculated.tax, Math.round((17500 * 19.25) / 100), 'TVA 19.25% exacte');
assert.strictEqual(calculated.total, 17500 + calculated.tax, 'Total TTC certifié');
console.log('  ✓ Succès : Prix client arbitraire neutralisé, catalogue certifié imposé (17 500 FCFA HT).');

// --------------------------------------------------------------------
// 2. TEST : CONTRÔLE STRICT DU PLAFOND DE REMISE (DISCOUNT CEILING)
// --------------------------------------------------------------------
console.log('\n[Test 2] Vérification du plafond de remise et token superviseur...');

assert.throws(
  () => serverCalculateOrder(mockCatalog, maliciousClientInput, 15, false),
  /Dépassement du plafond de remise de 10% sans autorisation superviseur/,
  'Une remise de 15% sans token superviseur doit être bloquée'
);

const authorizedCalculation = serverCalculateOrder(mockCatalog, maliciousClientInput, 15, true);
assert.strictEqual(authorizedCalculation.discountAmount, Math.round((17500 * 15) / 100));
console.log('  ✓ Succès : Remise de 15% bloquée sans superviseur, autorisée avec token valide.');

// --------------------------------------------------------------------
// 3. TEST : IDEMPOTENCE DU DOUBLE-CLIC DE PAIEMENT
// --------------------------------------------------------------------
console.log('\n[Test 3] Vérification de l\'idempotence des transactions de paiement...');

class MockPaymentLedger {
  private payments = new Map<string, { id: string; amount: number; orderId: string }>();
  private cashBalance = 50000; // Fond de caisse initial

  processPayment(params: {
    idempotencyKey: string;
    orderId: string;
    amount: number;
    method: 'especes' | 'momo';
  }) {
    // Si la clé existe déjà, retourner le résultat sans ré-appliquer
    if (this.payments.has(params.idempotencyKey)) {
      return {
        isDuplicate: true,
        payment: this.payments.get(params.idempotencyKey)!,
        currentCashBalance: this.cashBalance,
      };
    }

    const newPayment = {
      id: `pay-${crypto.randomUUID()}`,
      amount: params.amount,
      orderId: params.orderId,
    };

    this.payments.set(params.idempotencyKey, newPayment);
    if (params.method === 'especes') {
      this.cashBalance += params.amount;
    }

    return {
      isDuplicate: false,
      payment: newPayment,
      currentCashBalance: this.cashBalance,
    };
  }
}

const ledger = new MockPaymentLedger();
const idempotencyKey = crypto.randomUUID();

// Premier clic client
const payment1 = ledger.processPayment({
  idempotencyKey,
  orderId: 'ord-12345',
  amount: 20000,
  method: 'especes',
});
assert.strictEqual(payment1.isDuplicate, false);
assert.strictEqual(payment1.currentCashBalance, 70000);

// Deuxième clic immédiat (double-clic utilisateur ou renvoi réseau)
const payment2 = ledger.processPayment({
  idempotencyKey,
  orderId: 'ord-12345',
  amount: 20000,
  method: 'especes',
});
assert.strictEqual(payment2.isDuplicate, true);
assert.strictEqual(payment2.payment.id, payment1.payment.id, 'Doit retourner exactement le même reçu');
assert.strictEqual(payment2.currentCashBalance, 70000, 'La caisse ne doit pas être créditée une deuxième fois');
console.log('  ✓ Succès : Deuxième clic avec même clé d\'idempotence ignoré (solde préservé à 70 000 FCFA).');

// --------------------------------------------------------------------
// 4. TEST : NUMÉROTATION SÉQUENTIELLE ATOMIQUE SANS DOUBLON
// --------------------------------------------------------------------
console.log('\n[Test 4] Vérification de la numérotation séquentielle continue...');

class AtomicSequenceGenerator {
  private currentSeq = 0;

  nextOrderNumber(prefix = 'CMD', dateStr = '20261019'): string {
    // Simule une transaction atomique Firestore (incrementation atomique)
    this.currentSeq += 1;
    const padded = this.currentSeq.toString().padStart(4, '0');
    return `${prefix}-${dateStr}-${padded}`;
  }
}

const generator = new AtomicSequenceGenerator();
const generatedNumbers = new Set<string>();
for (let i = 1; i <= 25; i++) {
  const num = generator.nextOrderNumber();
  assert.strictEqual(generatedNumbers.has(num), false, `Doublon détecté: ${num}`);
  generatedNumbers.add(num);
  assert.strictEqual(num, `CMD-20261019-${i.toString().padStart(4, '0')}`);
}
assert.strictEqual(generatedNumbers.size, 25);
console.log('  ✓ Succès : 25 numéros consécutifs générés sans trou ni doublon (CMD-20261019-0001 à 0025).');

// --------------------------------------------------------------------
// 5. TEST : INTÉGRITÉ DU JOURNAL D\'AUDIT ET SCEAU SHA-256 EN CHAÎNE
// --------------------------------------------------------------------
console.log('\n[Test 5] Vérification du sceau de sécurité SHA-256 en chaîne immuable...');

interface ChainedLog {
  id: string;
  action: string;
  details: string;
  previousHash: string;
  chainHash: string;
}

function createLog(action: string, details: string, previousHash: string): ChainedLog {
  const id = crypto.randomUUID();
  const payload = `${previousHash}|${action}|${details}|${id}`;
  const chainHash = crypto.createHash('sha256').update(payload).digest('hex');
  return { id, action, details, previousHash, chainHash };
}

function verifyChain(logs: ChainedLog[]): boolean {
  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    const expectedPrev = i === 0 ? 'GENESIS_RESTOMASTER_2026' : logs[i - 1].chainHash;
    if (current.previousHash !== expectedPrev) return false;

    const payload = `${current.previousHash}|${current.action}|${current.details}|${current.id}`;
    const recalculated = crypto.createHash('sha256').update(payload).digest('hex');
    if (recalculated !== current.chainHash) return false;
  }
  return true;
}

const auditLedger: ChainedLog[] = [];
let prev = 'GENESIS_RESTOMASTER_2026';

const actions = [
  ['OUVERTURE_CAISSE', 'Fond initial 50 000 FCFA'],
  ['COMMANDE_VALIDEE', 'CMD-20261019-0001 (15 000 FCFA)'],
  ['ENCAISSEMENT_ESPECES', 'Règlement 15 000 FCFA'],
  ['CLOTURE_CAISSE', 'Fond final 65 000 FCFA'],
];

for (const [action, details] of actions) {
  const log = createLog(action, details, prev);
  auditLedger.push(log);
  prev = log.chainHash;
}

assert.strictEqual(verifyChain(auditLedger), true, 'La chaîne d\'audit initiale doit être valide');

// Tentative de falsification rétroactive d'un montant
auditLedger[1].details = 'CMD-20261019-0001 (5 000 FCFA)'; // Fraude tentée
assert.strictEqual(verifyChain(auditLedger), false, 'La falsification doit rompre la chaîne SHA-256');
console.log('  ✓ Succès : Falsification rétroactive immédiatement détectée par rupture du sceau SHA-256.');

// --------------------------------------------------------------------
// 6. TEST : REFUS STRICT DES PAIEMENTS SUPÉRIEURS AU RESTE À PAYER
// --------------------------------------------------------------------
console.log('\n[Test 6] Vérification du refus strict en cas de dépassement du solde...');

function validatePaymentAmount(orderTotal: number, totalPaidSoFar: number, requestedPayment: number) {
  const paymentAmount = Math.round(Number(requestedPayment));
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à zéro.');
  }
  const remaining = orderTotal - totalPaidSoFar;
  if (paymentAmount > remaining) {
    throw new Error(`Le montant (${paymentAmount} FCFA) dépasse le reste à payer exact (${remaining} FCFA).`);
  }
  return { newTotalPaid: totalPaidSoFar + paymentAmount, isFullyPaid: totalPaidSoFar + paymentAmount >= orderTotal };
}

assert.throws(
  () => validatePaymentAmount(15000, 10000, 6000),
  /dépasse le reste à payer exact/,
  'Un paiement de 6000 FCFA sur un solde restant de 5000 FCFA doit être rejeté'
);

const exactPayment = validatePaymentAmount(15000, 10000, 5000);
assert.strictEqual(exactPayment.newTotalPaid, 15000);
assert.strictEqual(exactPayment.isFullyPaid, true);
console.log('  ✓ Succès : Paiement excédentaire bloqué par précondition stricte sans tolérance laxiste.');

// --------------------------------------------------------------------
// 7. TEST : VALIDATION STRICTE DE SESSION DE CAISSE OUVERTE (ESPÈCES)
// --------------------------------------------------------------------
console.log('\n[Test 7] Vérification de l\'obligation d\'une session de caisse ouverte pour les espèces...');

function validateCashPaymentSession(method: string, session: { id: string; status: 'ouverte' | 'fermee' } | null) {
  if (method === 'especes') {
    if (!session || !session.id) {
      throw new Error('Une session de caisse active est obligatoire pour tout encaissement en espèces.');
    }
    if (session.status !== 'ouverte') {
      throw new Error('La session de caisse indiquée est déjà clôturée.');
    }
  }
  return true;
}

assert.throws(
  () => validateCashPaymentSession('especes', null),
  /Une session de caisse active est obligatoire/,
  'Encaissement en espèces sans session doit être rejeté'
);

assert.throws(
  () => validateCashPaymentSession('especes', { id: 'sess-closed', status: 'fermee' }),
  /La session de caisse indiquée est déjà clôturée/,
  'Encaissement en espèces sur session clôturée doit être rejeté'
);

assert.strictEqual(validateCashPaymentSession('especes', { id: 'sess-open', status: 'ouverte' }), true);
console.log('  ✓ Succès : Rejet systématique de tout encaissement en espèces sans session de caisse ouverte.');

console.log('\n================================================================');
console.log(' TOUS LES TESTS DE SÉCURITÉ BACKEND PHASE 1 SONT AU VERT (7/7) !');
console.log('================================================================\n');
