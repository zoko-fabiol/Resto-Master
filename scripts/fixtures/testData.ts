/**
 * Jeux de données de test isolés strictement réservés aux suites de tests automatisées (scripts/)
 * Ne JAMAIS importer ces fixtures dans le code applicatif src/ ou les Cloud Functions.
 */

import { RestaurantSettings, Category, Product } from '../../src/types/restaurant';

export const FIXTURE_SETTINGS: RestaurantSettings = {
  id: 'fixture-settings',
  organizationId: 'org-test',
  restaurantId: 'resto-test',
  name: 'Restaurant Test Lab',
  slogan: 'Laboratoire de validation technique',
  address: 'Rue de test 123',
  phone: '+237 600 00 00 00',
  email: 'test@lab.internal',
  currency: 'FCFA',
  taxRate: 19.25,
  baseVatRate: 17.5,
  cacRate: 1.75,
  serviceChargeRate: 0,
  zones: ['Zone Test A', 'Zone Test B'],
  enableStockAutoDeduction: true,
  minCashVarianceAlert: 5000,
  raisonSociale: 'TEST LAB RESTOMASTER SARL',
  nomCommercial: 'TEST LAB',
  formeJuridique: 'SARL',
  niu: 'M000000000000T',
  rccm: 'RC/TEST/2026/B/0001',
  taxCenter: 'CDI TEST',
  adresseFiscale: 'Rue de test 123, Ville Test',
  city: 'Douala',
  quartier: 'Test',
  bp: 'BP 00',
  activitePrincipale: 'Restauration',
  regimeFiscal: 'reel',
  assujettiTVA: true,
  statutContribuable: 'actif',
  exerciceFiscal: '2026',
  lastFiscalCheckDate: '2026-01-01',
  invoicePrefix: 'FACT-TEST-',
  nextInvoiceSequence: 1,
  orangeMoneyMerchantCode: '',
  orangeMoneyPhone: '',
  mtnMoMoMerchantCode: '',
  mtnMoMoPhone: '',
  kitchenOperationMode: 'ecran_cuisine',
  defaultReceiptWidth: '80mm',
  stockDeductionTiming: 'envoi_cuisine',
  priceDisplayMode: 'TTC',
};

export const FIXTURE_CATEGORIES: Category[] = [
  { id: 'cat-test-1', name: 'Entrées Test', icon: 'Soup', displayOrder: 1, active: true },
  { id: 'cat-test-2', name: 'Plats Test', icon: 'Flame', displayOrder: 2, active: true },
  { id: 'cat-test-3', name: 'Boissons Test', icon: 'GlassWater', displayOrder: 3, active: true },
];

export const FIXTURE_PRODUCTS: Product[] = [
  {
    id: 'prod-test-1',
    name: 'Plat Signature Test',
    description: 'Plat de test pour validation automatisée',
    price: 5000,
    costPrice: 2000,
    categoryId: 'cat-test-2',
    categoryName: 'Plats Test',
    available: true,
    destination: 'cuisine',
    preparationTimeMinutes: 15,
    ingredients: [],
    taxApplicable: true,
  },
  {
    id: 'prod-test-2',
    name: 'Boisson Test',
    description: 'Boisson de test pour validation automatisée',
    price: 1500,
    costPrice: 600,
    categoryId: 'cat-test-3',
    categoryName: 'Boissons Test',
    available: true,
    destination: 'bar',
    preparationTimeMinutes: 5,
    ingredients: [],
    taxApplicable: true,
  },
];
