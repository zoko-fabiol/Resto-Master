/**
 * RestoMaster OS — Script de Nettoyage des Clés de Règles Sans Effet (Phase B.4)
 *
 * Objectif :
 * Supprime les clés de règles opérationnelles obsolètes dans Firestore
 * (pos_active, pos_custom_price, tables_auto_status, cuisine_kds, etc.)
 * tout en conservant une sauvegarde réversible dans un fichier JSON local.
 *
 * Utilisation :
 * npx tsx scripts/migrate-clean-operation-rules.ts [--dry-run] [--apply] [--revert]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  deleteField,
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_PATH = path.join(ROOT_DIR, 'scripts', 'fixtures', 'backup-operation-rules.json');

function loadEnv(): Record<string, string> {
  const envPath = path.join(ROOT_DIR, '.env');
  const res: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return res;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    let v = t.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    res[k] = v;
  }
  return res;
}

const env = loadEnv();
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const isApply = process.argv.includes('--apply');
const isRevert = process.argv.includes('--revert');
const isDryRun = !isApply && !isRevert;

export const OBSOLETE_KEYS_TO_CLEAN = [
  'pos_active',
  'pos_custom_price',
  'pos_item_comp',
  'pos_change_server',
  'pos_table_transfer',
  'pos_table_merge',
  'pos_table_split',
  'tables_auto_status',
  'tables_transfer',
  'tables_auto_server_assign',
  'cuisine_kds',
  'cuisine_screen',
  'cuisine_stations',
  'bar_module',
  'bar_screen',
  'bar_bottles',
  'bar_glasses',
  'bar_consumption_control',
  'delivery_active',
  'delivery_online_order',
  'delivery_zones',
  'delivery_tracking',
  'delivery_customer_notifications',
  'delivery_web_orders',
  'res_online',
  'res_auto_confirm',
  'res_reminders',
  'res_availability',
  'event_active',
  'event_custom_menus',
  'event_banquet',
  'event_hall',
  'event_planning',
  'event_billing',
  'caisse_management',
  'caisse_transfers',
  'caisse_mandatory_close',
  'caisse_block_after_close',
  'caisse_reopen_with_auth',
];

async function runCleanMigration() {
  console.log('================================================================');
  console.log(' RestoMaster OS — Nettoyage des Règles Obsolètes (Phase B.4)');
  console.log(` Mode: ${isRevert ? 'REVERT (Restauration)' : isDryRun ? 'DRY-RUN (Simulation sans écriture)' : 'APPLY (Écriture Firestore)'}`);
  console.log('================================================================\n');

  if (isRevert) {
    if (!fs.existsSync(BACKUP_PATH)) {
      console.error(`[Erreur] Fichier de sauvegarde introuvable : ${BACKUP_PATH}`);
      process.exit(1);
    }
    const backupData = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
    console.log(`[Restauration] Restauration de ${Object.keys(backupData).length} documents depuis la sauvegarde...`);
    const batch = writeBatch(db);
    for (const [docPath, data] of Object.entries(backupData)) {
      const docRef = doc(db, docPath);
      batch.set(docRef, data as any, { merge: true });
    }
    await batch.commit();
    console.log('[Restauration] Documents restaurés avec succès.');
    return;
  }

  // 1. Scanner les documents settings
  const settingsSnap = await getDocs(collection(db, 'settings'));
  console.log(`[Settings] ${settingsSnap.size} document(s) analysé(s).`);

  const backupToSave: Record<string, any> = {};
  const batch = writeBatch(db);
  let totalKeysCleaned = 0;

  for (const docSnap of settingsSnap.docs) {
    const data = docSnap.data();
    const docPath = `settings/${docSnap.id}`;
    let docHasObsoleteKeys = false;
    const updates: Record<string, any> = {};

    // Vérifier si des clés obsolètes sont directement à la racine ou dans un sous-champ operationRules
    for (const key of OBSOLETE_KEYS_TO_CLEAN) {
      if (data && key in data) {
        docHasObsoleteKeys = true;
        updates[key] = deleteField();
        totalKeysCleaned++;
        console.log(`  - [${docPath}] Clé obsolète détectée : ${key}`);
      }
      if (data?.operationRules && key in data.operationRules) {
        docHasObsoleteKeys = true;
        updates[`operationRules.${key}`] = deleteField();
        totalKeysCleaned++;
        console.log(`  - [${docPath}] Clé obsolète dans operationRules : ${key}`);
      }
    }

    if (docHasObsoleteKeys) {
      backupToSave[docPath] = data;
      batch.update(docSnap.ref, updates);
    }
  }

  console.log(`\n[Bilan] Total de ${totalKeysCleaned} clé(s) obsolète(s) identifiée(s).`);

  if (isDryRun) {
    console.log('\n[DRY-RUN] Aucune modification écrite dans Firestore.');
    console.log('Pour appliquer réellement le nettoyage, exécutez avec : --apply');
  } else if (isApply && totalKeysCleaned > 0) {
    // Sauvegarder d'abord
    const backupDir = path.dirname(BACKUP_PATH);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_PATH, JSON.stringify(backupToSave, null, 2), 'utf8');
    console.log(`[Sauvegarde] Sauvegarde pré-nettoyage enregistrée dans ${BACKUP_PATH}`);

    await batch.commit();
    console.log('[Succès] Nettoyage appliqué avec succès dans Firestore.');
  } else {
    console.log('[OK] Aucune clé obsolète à nettoyer dans Firestore.');
  }

  process.exit(0);
}

runCleanMigration().catch((err) => {
  console.error('[Erreur critique]', err);
  process.exit(1);
});
