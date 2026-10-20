/**
 * RestoMaster OS — Script de Migration des Coordonnées du Plan de Table (coordVersion: 2)
 *
 * Objectif :
 * Migre les anciennes coordonnées en pourcentages (<= 100) vers des unités logiques absolues (1200x800).
 * Applique coordVersion: 2 pour désactiver définitivement l'heuristique erronée (D-03).
 *
 * Utilisation :
 * npx tsx scripts/migrate-floorplan-coordinates.ts [--dry-run] [--revert]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { RestaurantTable, DecorElement } from '../src/types/restaurant';
import {
  migrateTableCoordinates,
  revertTableCoordinatesMigration,
  migrateDecorCoordinates,
} from '../src/components/tables/floorPlanCoordinates';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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

const isDryRun = process.argv.includes('--dry-run');
const isRevert = process.argv.includes('--revert');

async function runMigration() {
  console.log('================================================================');
  console.log(' RestoMaster OS — Migration des Coordonnées (coordVersion: 2)');
  console.log(` Mode: ${isRevert ? 'REVERT (Restauration)' : isDryRun ? 'DRY-RUN (Simulation)' : 'EXECUTE (Écriture Firestore)'}`);
  console.log('================================================================\n');

  // 1. Tables
  const tablesSnap = await getDocs(collection(db, 'tables'));
  console.log(`[Tables] ${tablesSnap.size} documents trouvés.`);

  let tableMigratedCount = 0;
  const batch = writeBatch(db);

  for (const docSnap of tablesSnap.docs) {
    const table = { id: docSnap.id, ...docSnap.data() } as RestaurantTable;

    if (isRevert) {
      if (table.coordVersion === 2) {
        const reverted = revertTableCoordinatesMigration(table as any);
        batch.set(doc(db, 'tables', table.id), reverted);
        tableMigratedCount++;
      }
    } else {
      const { migratedTable, wasMigrated } = migrateTableCoordinates(table);
      if (wasMigrated) {
        batch.set(doc(db, 'tables', table.id), migratedTable, { merge: true });
        tableMigratedCount++;
        console.log(`  - Table ${table.id} (${table.number}): x=${table.x} -> ${migratedTable.x}, y=${table.y} -> ${migratedTable.y}`);
      }
    }
  }

  // 2. Décor
  const decorSnap = await getDocs(collection(db, 'decor_elements'));
  console.log(`[Décor] ${decorSnap.size} documents trouvés.`);
  let decorMigratedCount = 0;

  for (const docSnap of decorSnap.docs) {
    const decor = { id: docSnap.id, ...docSnap.data() } as DecorElement;
    if (!isRevert) {
      const { migratedDecor, wasMigrated } = migrateDecorCoordinates(decor);
      if (wasMigrated) {
        batch.set(doc(db, 'decor_elements', decor.id), migratedDecor, { merge: true });
        decorMigratedCount++;
        console.log(`  - Décor ${decor.id} (${decor.type}): x=${decor.x} -> ${migratedDecor.x}, y=${decor.y} -> ${migratedDecor.y}`);
      }
    }
  }

  if (tableMigratedCount > 0 || decorMigratedCount > 0) {
    if (!isDryRun) {
      await batch.commit();
      console.log(`\n[✓] Migration commitée : ${tableMigratedCount} tables, ${decorMigratedCount} décors mis à jour.`);
    } else {
      console.log(`\n[i] Simulation terminée : ${tableMigratedCount} tables et ${decorMigratedCount} décors à migrer.`);
    }
  } else {
    console.log('\n[✓] Aucun document n a nécessité de migration (déjà en coordVersion: 2 ou base vide).');
  }

  process.exit(0);
}

runMigration().catch((err) => {
  console.error('[!] Erreur migration coordonnées:', err);
  process.exit(1);
});
