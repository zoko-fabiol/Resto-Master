import { RestaurantSettings } from '../../types/restaurant';

export const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 'main-settings',
  organizationId: '',
  restaurantId: '',
  name: '',
  slogan: '',
  address: '',
  phone: '',
  email: '',
  currency: 'FCFA',
  taxRate: 19.25, // Taux combiné légal CGI 2026 (17.5% TVA + 10% CAC = 19.25%)
  baseVatRate: 17.5,
  cacRate: 1.75, // Centimes additionnels communaux (10% de la TVA = 1.75% du HT)
  serviceChargeRate: 0,
  zones: [],
  enableStockAutoDeduction: true,
  minCashVarianceAlert: 5000,

  // Profil Juridique & Fiscal Camerounais (CGI / DGI 2026)
  raisonSociale: '',
  nomCommercial: '',
  formeJuridique: 'SARL',
  niu: '',
  rccm: '',
  taxCenter: '',
  adresseFiscale: '',
  city: '',
  quartier: '',
  bp: '',
  activitePrincipale: 'Restauration',
  activitesSecondaires: '',
  regimeFiscal: 'reel',
  assujettiTVA: true,
  statutContribuable: 'actif',
  exerciceFiscal: new Date().getFullYear().toString(),
  lastFiscalCheckDate: '',

  // Paramètres Numérotation & Contrôle des Remises
  invoicePrefix: 'FACT-',
  nextInvoiceSequence: 1,
  maxDiscountByRole: {
    superadmin: 100,
    direction: 100,
    manager: 15,
    finance: 20,
    comptable: 10,
    caisse: 5,
    serveur: 5,
    cuisine: 0,
    bar: 0,
    stock: 0,
    rh: 0,
    auditeur: 0,
    tablette: 0,
    aucun: 0,
  },

  // Mobile Money (vides par défaut)
  orangeMoneyMerchantCode: '',
  orangeMoneyPhone: '',
  mtnMoMoMerchantCode: '',
  mtnMoMoPhone: '',

  // Mode Opérationnel
  kitchenOperationMode: 'ecran_cuisine',
  defaultReceiptWidth: '80mm',
  stockDeductionTiming: 'envoi_cuisine',
  priceDisplayMode: 'TTC',

  // Verrouillage de livraison & Certification client
  configurationVerrouillee: false,
  certifiedReadyForHandover: false,
};
