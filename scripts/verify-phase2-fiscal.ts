/**
 * RestoMaster OS — Suite de Tests Automatisés Phase 2
 * Validation Fiscale Camerounaise :
 * 1. Calcul strict TVA 17.5% + CAC 1.75% = 19.25% en FCFA (sans décimales)
 * 2. Montants en toutes lettres & Formule légale obligatoire DGI
 * 3. Payload QR Code e-Billing normalisé DGI & Sceau cryptographique SHA-256
 * 4. Retenues à la source (AIR 2.2%, 5.5%, 15%) & Apurement comptable
 * 5. Format et chronologie du numéro de facture normalisé DGI
 * 6. Télé-déclaration DGI et export CSV DSF
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  calculateCameroonTaxes,
  numberToFrenchWords,
  formatLegalInvoiceNotice,
} from '../src/lib/utils';
import { DgiFiscalHelper } from '../src/services/fiscal/dgiQrCodeHelper';
import { TaxEngine } from '../src/services/fiscal/taxEngine';
import { AccountingExportService } from '../src/services/fiscal/accountingExportService';
import { RestaurantSettings, Order, FiscalJournalItem, Invoice } from '../src/types/restaurant';

console.log('================================================================');
console.log(' RestoMaster OS — Validation Fiscale Camerounaise (Phase 2)');
console.log(' Conforme Code Général des Impôts (CGI 2026) & Normes DGI');
console.log('================================================================\n');

// --------------------------------------------------------------------
// 1. TEST : CALCUL STRICT DE LA TVA ET DU CAC EN FCFA (ZÉRO DÉCIMALE)
// --------------------------------------------------------------------
console.log('[Test 1] Calcul de la TVA (17,50%) et CAC (1,75%) = 19,25% combiné...');

const subtotalTestCases = [
  { ht: 10000, expectedTva: 1750, expectedCac: 175, expectedTtc: 11925 },
  { ht: 25000, expectedTva: 4375, expectedCac: 438, expectedTtc: 29813 },
  { ht: 6500,  expectedTva: 1138, expectedCac: 114, expectedTtc: 7752 },
  { ht: 100000, expectedTva: 17500, expectedCac: 1750, expectedTtc: 119250 },
  { ht: 3333,  expectedTva: 583,  expectedCac: 58,  expectedTtc: 3974 },
];

for (const tc of subtotalTestCases) {
  const taxes = calculateCameroonTaxes(tc.ht);
  // Vérifier qu'il n'y a aucune décimale flottante
  assert.strictEqual(Number.isInteger(taxes.subtotalHt), true, 'Le sous-total HT doit être un entier');
  assert.strictEqual(Number.isInteger(taxes.tvaBase), true, 'La TVA doit être un entier FCFA');
  assert.strictEqual(Number.isInteger(taxes.cacBase), true, 'Le CAC doit être un entier FCFA');
  assert.strictEqual(Number.isInteger(taxes.totalTtc), true, 'Le TTC doit être un entier FCFA');

  // Vérifier la conformité de ventilation
  assert.strictEqual(taxes.tvaBase, tc.expectedTva, `TVA attendue pour ${tc.ht}`);
  assert.strictEqual(taxes.cacBase, tc.expectedCac, `CAC attendu pour ${tc.ht}`);
  assert.strictEqual(taxes.totalTtc, tc.expectedTtc, `Total TTC attendu pour ${tc.ht}`);

  // Équilibre comptable strict : subtotalHt + tvaBase + cacBase === totalTtc
  assert.strictEqual(
    taxes.subtotalHt + taxes.tvaBase + taxes.cacBase,
    taxes.totalTtc,
    'L\'équation bilancielle HT + TVA + CAC = TTC doit être exacte au franc près'
  );
}

console.log(' -> OK: Moteur fiscal integer strict sans déperdition de centimes.\n');

// --------------------------------------------------------------------
// 2. TEST : CONVERTISSEUR EN TOUTES LETTRES & FORMULE LÉGALE DGI
// --------------------------------------------------------------------
console.log('[Test 2] Formule légale obligatoire d\'arrêté de facture en toutes lettres...');

const wordsTestCases = [
  { amount: 80, expected: 'QUATRE-VINGTS' },
  { amount: 85, expected: 'QUATRE-VINGT-CINQ' },
  { amount: 71, expected: 'SOIXANTE-ET-ONZE' },
  { amount: 91, expected: 'QUATRE-VINGT-ONZE' },
  { amount: 1000, expected: 'MILLE' },
  { amount: 1925, expected: 'MILLE NEUF CENT VINGT-CINQ' },
  { amount: 1000000, expected: 'UN MILLION' },
  { amount: 1580250, expected: 'UN MILLION CINQ CENT QUATRE-VINGTS MILLE DEUX CENT CINQUANTE' },
];

for (const tc of wordsTestCases) {
  const words = numberToFrenchWords(tc.amount).toUpperCase();
  assert.strictEqual(words, tc.expected, `Conversion en lettres incorrecte pour ${tc.amount}`);
}

const notice = formatLegalInvoiceNotice(1580250, 'XAF');
assert.strictEqual(
  notice,
  '« Arrêté la présente facture à la somme de : UN MILLION CINQ CENT QUATRE-VINGTS MILLE DEUX CENT CINQUANTE FRANCS CFA. »',
  'Mention légale d\'arrêté non conforme'
);

console.log(' -> OK: Règle grammaticale française et formule légale d\'arrêté DGI vérifiées.\n');

// --------------------------------------------------------------------
// 3. TEST : PAYLOAD QR CODE E-BILLING DGI & SCEAU CRYPTOGRAPHIQUE SHA-256
// --------------------------------------------------------------------
console.log('[Test 3] Payload standard e-Billing DGI et sceau cryptographique SHA-256...');

const fiscalPayloadData = {
  emitterNiu: 'M012012345678A',
  emitterRccm: 'RC/YAO/2024/B/1894',
  invoiceNumber: '2026-RESTO-001-000042',
  dateTimeIso: '2026-03-29T14:30:00Z',
  subtotalHT: 50000,
  vatAmount: 8750,
  cacAmount: 875,
  totalTTC: 59625,
  clientNiu: 'M051800098765B',
};

const payloadString = DgiFiscalHelper.buildStandardPayload(fiscalPayloadData);
console.log('   Payload généré :', payloadString);

assert.strictEqual(payloadString.startsWith('DGI-CMR|v1|'), true, 'Doit démarrer par le header DGI-CMR|v1|');
assert.strictEqual(payloadString.includes('M012012345678A'), true, 'Doit contenir le NIU émetteur');
assert.strictEqual(payloadString.includes('2026-RESTO-001-000042'), true, 'Doit contenir le numéro de facture');
assert.strictEqual(payloadString.includes('50000|8750|875|59625'), true, 'Doit contenir la ventilation financière');
assert.strictEqual(payloadString.includes('M051800098765B'), true, 'Doit contenir le NIU client');

// Vérification de l'intégrité du sceau SHA-256
const isSealValid = DgiFiscalHelper.verifySeal(payloadString);
assert.strictEqual(isSealValid, true, 'Le sceau cryptographique SHA-256 doit être validé avec succès');

// Vérification de la détection de falsification (tampering)
const tamperedPayload = payloadString.replace('59625', '10000'); // Altération du montant
const isTamperedValid = DgiFiscalHelper.verifySeal(tamperedPayload);
assert.strictEqual(isTamperedValid, false, 'Le sceau doit rejeter toute modification du payload');

console.log(' -> OK: Sceau cryptographique et payload e-Billing DGI inviolables.\n');

// --------------------------------------------------------------------
// 4. TEST : RETENUES À LA SOURCE (AIR) CONFORMÉMENT AU RÉGIME
// --------------------------------------------------------------------
console.log('[Test 4] Retenues d\'Acompte d\'Impôt sur le Revenu (AIR)...');

const mockSettings: RestaurantSettings = {
  id: 'resto-test',
  name: 'L\'Oasis Gourmande',
  address: 'Bastos, Yaoundé',
  phone: '+237 699 00 00 00',
  currency: 'FCFA',
  taxRate: 19.25,
  baseVatRate: 17.5,
  niu: 'M012012345678A',
  rccm: 'RC/YAO/2024/B/1894',
  taxCenter: 'CDI YAOUNDE I',
  regimeFiscal: 'reel',
  assujettiTVA: true,
  invoicePrefix: '2026-RESTO-001',
  currentInvoiceSequence: 10,
} as unknown as RestaurantSettings;

// Cas 1 : Client Entreprise au Réel -> Taux AIR = 2.2%
const airReel = TaxEngine.calculateWithholding(100000, 'reel');
assert.strictEqual(airReel.rate, 2.2, 'Taux AIR au réel doit être 2.2%');
assert.strictEqual(airReel.withholdingAmount, 2200, 'Montant AIR sur 100 000 FCFA doit être 2 200 FCFA');

// Cas 2 : Prestataire / Client au Simplifié -> Taux AIR = 5.5%
const airSimplifie = TaxEngine.calculateWithholding(100000, 'simplifie');
assert.strictEqual(airSimplifie.rate, 5.5, 'Taux AIR au simplifié doit être 5.5%');
assert.strictEqual(airSimplifie.withholdingAmount, 5500, 'Montant AIR sur 100 000 FCFA doit être 5 500 FCFA');

// Cas 3 : Client sans NIU / Non immatriculé -> Taux AIR = 15%
const airNonImmatricule = TaxEngine.calculateWithholding(100000, 'igp');
assert.strictEqual(airNonImmatricule.rate, 15.0, 'Taux AIR non immatriculé doit être 15%');
assert.strictEqual(airNonImmatricule.withholdingAmount, 15000, 'Montant AIR sur 100 000 FCFA doit être 15 000 FCFA');

console.log(' -> OK: Taux et montants de retenue AIR conformes au CGI camerounais.\n');

// --------------------------------------------------------------------
// 5. TEST : FACTURATION FORMELLE & NUMÉROTATION CHRONOLOGIQUE DGI
// --------------------------------------------------------------------
console.log('[Test 5] Génération de facture officielle certifiée DGI...');

const mockOrder: Order = {
  id: 'ord-test-001',
  orderNumber: 'CMD-8899',
  tableId: 't-1',
  tableName: 'Table 4',
  serverId: 'srv-1',
  serverName: 'Jean Paul',
  type: 'sur_place',
  status: 'payee',
  paymentStatus: 'paye',
  discount: 0,
  guestCount: 2,
  items: [
    {
      id: 'i-1',
      productId: 'p-poulet',
      productName: 'Poulet DG Royal',
      quantity: 2,
      unitPrice: 7000,
      status: 'servi',
      destination: 'cuisine',
    },
    {
      id: 'i-2',
      productId: 'p-vin',
      productName: 'Bouteille Saint-Émilion',
      quantity: 1,
      unitPrice: 20000,
      status: 'servi',
      destination: 'bar',
    },
  ],
  subtotal: 34000,
  tax: 6545,
  total: 40545,
  paidAmount: 40545,
  createdAt: '2026-03-29T19:00:00Z',
  updatedAt: '2026-03-29T19:45:00Z',
  companyBillingName: 'TOTAL ENERGIES CAMEROUN SA',
  companyBillingNiu: 'M018500012345A',
};

const { invoice, journalItem } = TaxEngine.createFiscalInvoice(
  mockOrder,
  mockSettings,
  11,
  {
    name: mockOrder.companyBillingName,
    niu: mockOrder.companyBillingNiu,
    regime: 'reel',
    applyWithholding: true,
  }
);

// Vérification de la facture
assert.strictEqual(invoice.invoiceNumber, '2026-RESTO-001-000011', 'Numéro de facture standardisé invalide');
assert.strictEqual(invoice.subtotalHT, 34000, 'Sous-total HT invalide');
assert.strictEqual(invoice.vatAmount, 5950, 'TVA 17.5% attendue sur 34 000 FCFA = 5 950');
assert.strictEqual(invoice.cacAmount, 595, 'CAC 1.75% attendu sur 34 000 FCFA = 595');
assert.strictEqual(invoice.totalTTC, 40545, 'Total TTC = 34000 + 5950 + 595 = 40545 FCFA');
assert.strictEqual(invoice.withholdingAmount, 748, 'Retenue 2.2% sur HT (34 000) = 748 FCFA');
assert.strictEqual(invoice.netToPay, 39797, 'Net à payer = 40545 - 748 = 39797 FCFA');
assert.strictEqual(Number.isInteger(invoice.netToPay), true, 'Net à payer doit être entier');

// Vérification de l'écriture au journal fiscal
assert.strictEqual(journalItem.documentNumber, '2026-RESTO-001-000011', 'Liaison journal fiscal - documentNumber');
assert.strictEqual(journalItem.montantHT, 34000, 'Montant HT journal');
assert.strictEqual(journalItem.montantTTC, 40545, 'Montant TTC journal');
assert.strictEqual(journalItem.status, 'VALIDATED', 'Statut écriture journal');
assert.strictEqual(Boolean(journalItem.hashIntegrity), true, 'Le journal doit contenir l\'empreinte d\'intégrité');

console.log(' -> OK: Facture DGI et ligne de journal fiscal générées avec précision.\n');

// --------------------------------------------------------------------
// 6. TEST : TÉLÉ-DÉCLARATION DGI & FORMAT DSF
// --------------------------------------------------------------------
console.log('[Test 6] Format du fichier CSV de télé-déclaration mensuelle DGI...');

const dgiCsv = AccountingExportService.generateDgiTeledeclarationCsv(
  [journalItem],
  mockSettings,
  [invoice]
);

assert.strictEqual(dgiCsv.includes('Date Facture;Heure;N° Facture Normalisé DGI'), true, 'En-têtes CSV DGI conformes');
assert.strictEqual(dgiCsv.includes('2026-RESTO-001-000011'), true, 'Facture présente dans l\'export DGI');
assert.strictEqual(dgiCsv.includes('M018500012345A'), true, 'NIU client présent dans l\'export DGI');
assert.strictEqual(dgiCsv.includes('CONFORME_DGI'), true, 'Statut conforme DGI présent');

console.log(' -> OK: Fichier CSV de télé-déclaration DGI prêt pour le dépôt officiel.\n');

console.log('================================================================');
console.log(' TOUS LES TESTS FISCAUX PHASE 2 (CAMEROUN / DGI) ONT RÉUSSI !');
console.log('================================================================');
