/**
 * RestoMaster OS — Script d'Audit Exhaustif de Configuration & Règles Opérationnelles
 * Exécutable via : npx tsx scripts/audit-config.ts
 *
 * Mesure en 5 volets :
 * 1. Règles d'opération (DEFAULT_OPERATION_RULES) : lues hors réglages vs mortes vs non déclarées
 * 2. Interrupteurs locaux sans effet (pay_*, notif_*)
 * 3. Fonctionnalités catalogue (INITIAL_FEATURES) jamais lues via isFeatureEnabled
 * 4. Champs jamais lus (RestaurantSettings, PrinterSettings, Peripheral, Terminal, RoleLimits, Outlet)
 * 5. Méthodes de configFirestoreService sans appelant
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OPERATION_RULES } from '../src/types/configuration';
import { INITIAL_FEATURES } from '../src/lib/configurationSeed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');

// Liste récursive des fichiers source
function getAllFiles(dir: string, extensions = ['.ts', '.tsx']): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allSrcFiles = getAllFiles(SRC_DIR);

// Catégorisation des fichiers pour l'audit
const isSettingsFile = (f: string) => f.includes(`${path.sep}settings${path.sep}`);
const isTypesFile = (f: string) => f.includes(`${path.sep}types${path.sep}`);
const isSeedFile = (f: string) => f.includes('configurationSeed.ts') || f.includes('seedData.ts') || f.includes('FeatureService.ts');
const isConfigService = (f: string) => f.includes('configFirestoreService.ts');

// Fichiers applicatifs exécutant réellement la logique métier (hors écrans d'administration/réglages/types/seeds)
const appLogicFiles = allSrcFiles.filter(
  (f) => !isSettingsFile(f) && !isTypesFile(f) && !isSeedFile(f)
);

// Contenu en cache
const fileContents = new Map<string, string>();
for (const f of allSrcFiles) {
  fileContents.set(f, fs.readFileSync(f, 'utf8'));
}

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       RESTOMASTER OS — AUDIT EXHAUSTIF CONFIGURATION & RÈGLES             ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// 1. RÈGLES D'OPÉRATION (DEFAULT_OPERATION_RULES)
// ============================================================================
const declaredRuleKeys = Object.keys(DEFAULT_OPERATION_RULES);
const activeRuleKeys: string[] = [];
const deadRuleKeys: string[] = [];
const ruleUsageLocations = new Map<string, string[]>();

for (const key of declaredRuleKeys) {
  const matches: string[] = [];
  // Regex pour détecter l'usage réel de la règle hors settings :
  // isRuleEnabled('key'), isRuleEnabled("key"), operationRules['key'], operationRules.key, 'key'
  const keyRegex = new RegExp(`['"\`]${key}['"\`]|\\boperationRules\\.${key}\\b`, 'g');
  for (const file of appLogicFiles) {
    const content = fileContents.get(file)!;
    if (keyRegex.test(content)) {
      const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
      matches.push(relPath);
    }
  }
  if (matches.length > 0) {
    activeRuleKeys.push(key);
    ruleUsageLocations.set(key, matches);
  } else {
    deadRuleKeys.push(key);
  }
}

// Recherche des clés lues dans tout le projet mais NON déclarées dans DEFAULT_OPERATION_RULES
const unregisteredRuleKeys = new Set<string>();
const isRuleEnabledRegex = /isRuleEnabled\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
for (const [file, content] of fileContents.entries()) {
  let m: RegExpExecArray | null;
  while ((m = isRuleEnabledRegex.exec(content)) !== null) {
    const key = m[1];
    if (!declaredRuleKeys.includes(key)) {
      unregisteredRuleKeys.add(key);
    }
  }
}

console.log('─── 1. RÈGLES OPÉRATIONNELLES (DEFAULT_OPERATION_RULES) ────────────────────────');
console.log(`• Total règles déclarées dans le catalogue : ${declaredRuleKeys.length}`);
console.log(`• Règles effectivement lues hors réglages   : ${activeRuleKeys.length}`);
console.log(`• Règles mortes (jamais lues hors réglages) : ${deadRuleKeys.length}`);
console.log(`• Clés lues via isRuleEnabled non déclarées : ${unregisteredRuleKeys.size}`);

if (deadRuleKeys.length > 0) {
  console.log(`\n  Exemples de règles mortes (${Math.min(deadRuleKeys.length, 12)} / ${deadRuleKeys.length}) :`);
  for (const k of deadRuleKeys.slice(0, 12)) {
    console.log(`    - ${k}`);
  }
  if (deadRuleKeys.length > 12) console.log(`    ... et ${deadRuleKeys.length - 12} autres.`);
}

if (unregisteredRuleKeys.size > 0) {
  console.log(`\n  [!] Clés lues mais non déclarées dans DEFAULT_OPERATION_RULES :`);
  for (const k of unregisteredRuleKeys) {
    console.log(`    - ${k}`);
  }
}

// ============================================================================
// 2. INTERRUPTEURS LOCAUX SANS EFFET (pay_*, notif_*)
// ============================================================================
const localSwitchesPay = [
  'pay_especes',
  'pay_cb',
  'pay_mtn_momo',
  'pay_orange_money',
  'pay_virement',
  'pay_cheque',
  'pay_credit_client',
  'pay_partiel',
  'pay_multiple',
];

const localSwitchesNotif = [
  'notif_stock_critique',
  'notif_peremption_lot',
  'notif_ecart_caisse',
  'notif_rappel_fiscal',
  'notif_retard_cuisine',
  'notif_rupture_bar',
];

const allLocalSwitches = [...localSwitchesPay, ...localSwitchesNotif];
const orphanedLocalSwitches: string[] = [];

for (const sw of allLocalSwitches) {
  let isSavedOrRead = false;
  // Vérifier si le switch est présent dans DEFAULT_OPERATION_RULES ou lu dans l'app
  if (declaredRuleKeys.includes(sw)) isSavedOrRead = true;
  // Vérifier si le switch est référencé hors du composant de settings où il est défini
  for (const file of appLogicFiles) {
    const content = fileContents.get(file)!;
    if (content.includes(sw)) {
      isSavedOrRead = true;
      break;
    }
  }
  if (!isSavedOrRead) {
    orphanedLocalSwitches.push(sw);
  }
}

console.log('\n─── 2. INTERRUPTEURS LOCAUX D\'ÉCRAN (pay_*, notif_*) ───────────────────────────');
console.log(`• Interrupteurs surveillés                  : ${allLocalSwitches.length} (9 pay_*, 6 notif_*)`);
console.log(`• Interrupteurs locaux sans effet/persistance : ${orphanedLocalSwitches.length}`);
if (orphanedLocalSwitches.length > 0) {
  console.log(`  Détail : ${orphanedLocalSwitches.join(', ')}`);
}

// ============================================================================
// 3. FONCTIONNALITÉS CATALOGUE (INITIAL_FEATURES) JAMAIS LUES
// ============================================================================
const declaredFeatures = INITIAL_FEATURES.map((f) => f.id);
const activeFeatures: string[] = [];
const deadFeatures: string[] = [];

for (const fid of declaredFeatures) {
  const isFeatureRegex = new RegExp(`isFeatureEnabled\\(\\s*['"\`]${fid}['"\`]`, 'g');
  let isRead = false;
  for (const file of appLogicFiles) {
    const content = fileContents.get(file)!;
    if (isFeatureRegex.test(content) || content.includes(`'${fid}'`) || content.includes(`"${fid}"`)) {
      isRead = true;
      break;
    }
  }
  if (isRead) {
    activeFeatures.push(fid);
  } else {
    deadFeatures.push(fid);
  }
}

console.log('\n─── 3. CATALOGUE DE FONCTIONNALITÉS (INITIAL_FEATURES) ─────────────────────────');
console.log(`• Fonctionnalités déclarées dans le catalogue : ${declaredFeatures.length}`);
console.log(`• Fonctionnalités lues dans l'application   : ${activeFeatures.length}`);
console.log(`• Fonctionnalités jamais lues (mortes)       : ${deadFeatures.length}`);
if (deadFeatures.length > 0) {
  console.log(`  Exemples de fonctionnalités mortes :`);
  for (const f of deadFeatures.slice(0, 10)) {
    console.log(`    - ${f}`);
  }
  if (deadFeatures.length > 10) console.log(`    ... et ${deadFeatures.length - 10} autres.`);
}

// ============================================================================
// 4. CHAMPS DES INTERFACES CLÉS JAMAIS LUS
// ============================================================================
interface InterfaceDef {
  name: string;
  fields: string[];
}

const interfacesToAudit: InterfaceDef[] = [
  {
    name: 'RestaurantSettings',
    fields: [
      'id', 'organizationId', 'restaurantId', 'name', 'slogan', 'address', 'phone', 'email',
      'currency', 'taxRate', 'baseVatRate', 'cacRate', 'serviceChargeRate', 'zones',
      'enableStockAutoDeduction', 'minCashVarianceAlert', 'raisonSociale', 'nomCommercial',
      'formeJuridique', 'niu', 'rccm', 'taxCenter', 'adresseFiscale', 'city', 'quartier',
      'bp', 'activitePrincipale', 'activitesSecondaires', 'regimeFiscal', 'assujettiTVA',
      'statutContribuable', 'exerciceFiscal', 'lastFiscalCheckDate', 'invoicePrefix',
      'nextInvoiceSequence', 'maxDiscountByRole', 'orangeMoneyMerchantCode', 'orangeMoneyPhone',
      'orangeMaxItQrUrl', 'mtnMoMoMerchantCode', 'mtnMoMoPhone', 'mtnMoMoQrUrl',
      'kitchenOperationMode', 'defaultReceiptWidth', 'stockDeductionTiming', 'priceDisplayMode',
    ],
  },
  {
    name: 'PrinterSettings',
    fields: [
      'autoPrintReceiptOnPayment', 'autoPrintKitchenOnOrder', 'autoOpenCashDrawerOnCash', 'receiptCopiesCount',
    ],
  },
  {
    name: 'Peripheral',
    fields: [
      'id', 'name', 'model', 'type', 'role', 'connectionType', 'address', 'port',
      'terminalId', 'outletId', 'active', 'paperWidth', 'charactersPerLine',
      'openDrawerOnCash', 'cutPaper', 'soundBuzzer', 'isDefault',
    ],
  },
  {
    name: 'Terminal',
    fields: [
      'id', 'outletId', 'name', 'type', 'ipAddress', 'assignedZone', 'assignedRole',
      'assignedTableId', 'kdsStation', 'pairingCode', 'pairingExpiresAt', 'pairedAt',
      'isLocked', 'active', 'allowedFeatures',
    ],
  },
  {
    name: 'RoleLimits',
    fields: [
      'maxDiscountPercent', 'maxRefundAmount', 'maxExpenseAmount',
      'requiresApprovalForDiscount', 'requiresApprovalForRefund',
      'requiresApprovalForCancel', 'requiresApprovalForNegativePrice',
    ],
  },
  {
    name: 'Outlet',
    fields: [
      'id', 'organizationId', 'name', 'commercialName', 'legalName', 'legalForm',
      'niu', 'rccm', 'taxCenter', 'city', 'address', 'neighborhood', 'postalBox',
      'phone', 'email', 'timezone', 'currency', 'operationalProfile', 'isMain',
      'active', 'createdAt', 'updatedAt',
    ],
  },
];

const unreadFieldsByInterface = new Map<string, string[]>();

for (const iface of interfacesToAudit) {
  const unread: string[] = [];
  for (const field of iface.fields) {
    // Regex pour détecter l'accès au champ : .field, field:, { field }
    const fieldRegex = new RegExp(`\\b${field}\\b`, 'g');
    let isRead = false;
    for (const file of appLogicFiles) {
      const content = fileContents.get(file)!;
      if (fieldRegex.test(content)) {
        isRead = true;
        break;
      }
    }
    if (!isRead) {
      unread.push(field);
    }
  }
  unreadFieldsByInterface.set(iface.name, unread);
}

console.log('\n─── 4. CHAMPS DES INTERFACES CLÉS JAMAIS LUS HORS TYPES/RÉGLAGES ───────────────');
for (const [ifaceName, unread] of unreadFieldsByInterface.entries()) {
  const total = interfacesToAudit.find((i) => i.name === ifaceName)!.fields.length;
  console.log(`• ${ifaceName.padEnd(20)} : ${unread.length} champ(s) jamais lu(s) sur ${total}`);
  if (unread.length > 0) {
    console.log(`    [!] Non lus : ${unread.join(', ')}`);
  }
}

// ============================================================================
// 5. MÉTHODES DE CONFIGFIRESTORESERVICE SANS APPELANT
// ============================================================================
const configServiceMethods = [
  'saveFeatures',
  'subscribeToFeatures',
  'saveTerminal',
  'deleteTerminal',
  'subscribeToTerminals',
  'savePeripheral',
  'subscribeToPeripherals',
  'saveRolePermissions',
  'subscribeToRolePermissions',
  'saveRoleLimits',
  'subscribeToRoleLimits',
  'savePrinterSettings',
  'subscribeToPrinterSettings',
  'saveOperationRules',
  'subscribeToOperationRules',
  'appendConfigHistory',
  'subscribeToConfigHistory',
  'appendAuditLog',
  'subscribeToAuditLogs',
  'saveNotification',
  'deleteNotification',
  'subscribeToNotifications',
];

const unusedConfigMethods: string[] = [];
const usedConfigMethods: string[] = [];

for (const method of configServiceMethods) {
  let callCount = 0;
  const methodRegex = new RegExp(`\\bconfigFirestoreService\\.${method}\\b`, 'g');
  for (const [file, content] of fileContents.entries()) {
    if (isConfigService(file)) continue; // Ne pas compter la déclaration elle-même
    const matches = content.match(methodRegex);
    if (matches) {
      callCount += matches.length;
    }
  }
  if (callCount === 0) {
    unusedConfigMethods.push(method);
  } else {
    usedConfigMethods.push(`${method} (${callCount} appel(s))`);
  }
}

console.log('\n─── 5. MÉTHODES DE CONFIGFIRESTORESERVICE SANS APPELANT ────────────────────────');
console.log(`• Total méthodes dans le service : ${configServiceMethods.length}`);
console.log(`• Méthodes appelées              : ${usedConfigMethods.length}`);
console.log(`• Méthodes sans aucun appelant   : ${unusedConfigMethods.length}`);
if (unusedConfigMethods.length > 0) {
  console.log(`  [!] Méthodes mortes :`);
  for (const m of unusedConfigMethods) {
    console.log(`    - configFirestoreService.${m}`);
  }
}

// ============================================================================
// BILAN GLOBAL & CODE DE SORTIE
// ============================================================================
const totalDefects =
  deadRuleKeys.length +
  unregisteredRuleKeys.size +
  orphanedLocalSwitches.length +
  deadFeatures.length +
  Array.from(unreadFieldsByInterface.values()).reduce((acc, curr) => acc + curr.length, 0) +
  unusedConfigMethods.length;

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`BILAN DE L'AUDIT DE CONFIGURATION :`);
console.log(`  - Règles mortes (DEFAULT_OPERATION_RULES) : ${deadRuleKeys.length}`);
console.log(`  - Clés isRuleEnabled non déclarées        : ${unregisteredRuleKeys.size}`);
console.log(`  - Interrupteurs locaux d'écran sans effet : ${orphanedLocalSwitches.length}`);
console.log(`  - Fonctionnalités catalogue mortes        : ${deadFeatures.length}`);
console.log(`  - Méthodes Firestore sans appelant        : ${unusedConfigMethods.length}`);
console.log(`  - TOTAL DÉFAUTS DÉTECTÉS                  : ${totalDefects}`);
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// Si le flag --allow-fail ou --baseline est présent, on sort avec 0 pour afficher la ligne de base
const isBaselineRun = process.argv.includes('--allow-fail') || process.argv.includes('--baseline');

if (totalDefects > 0 && !isBaselineRun) {
  console.log('[!] Échec de l\'audit : des options affichées ou méthodes ne sont pas connectées.');
  console.log('    (Utilisez --baseline pour afficher la ligne de base sans code d\'erreur non nul)\n');
  process.exit(1);
} else {
  console.log('[✓] Fin de l\'audit (mode baseline ou zéro défaut).\n');
  process.exit(0);
}
