/**
 * RestoMaster OS — Script d'Initialisation du Catalogue Firestore
 *
 * Usage :
 *   npx tsx scripts/seed-catalog.ts           # Exécute l'initialisation dans Firestore
 *   npx tsx scripts/seed-catalog.ts --dry-run # Affiche ce qui sera écrit sans modification
 *
 * Collections initialisées :
 *   - catalog/packs/items/{minimum, medium, premium}
 *   - catalog/types/items/{8 types de restaurant}
 *   - catalog/addons/items/{options à la carte}
 *   - catalog/settings/global (multiplicateurs, TVA, pas d'arrondi)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import {
  CATALOG_PACKS,
  RESTAURANT_TYPES,
  CATALOG_ADDONS,
  CAPACITY_PRICING,
  DEFAULT_CATALOG_SETTINGS,
} from '../shared/catalog/packs.js';

// Lecture de l'environnement local
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        env[k] = v;
      }
    }
  }
  return env;
}

const env = loadEnv();
const isDryRun = process.argv.includes('--dry-run');

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       RESTOMASTER OS — INITIALISATION DU CATALOGUE COMMERCIAL               ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`[Mode] : ${isDryRun ? 'DRY-RUN (Simulation seule, aucune écriture)' : 'PRODUCTION / ÉMULATEUR (Écritures actives)'}\n`);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'restomaster-os',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo',
});

const db = getFirestore(app);

// Si utilisation des émulateurs
if (process.env.FIRESTORE_EMULATOR_HOST) {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  console.log(`[Émulateur] Connecté à Firestore sur ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else if (env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log(`[Émulateur] Connecté à Firestore sur localhost:8080`);
}

async function runSeed() {
  const now = new Date().toISOString();

  // 1. Packs (minimum, medium, premium)
  console.log('[1/4] Enregistrement des Packs Officiels (catalog/packs/items/)...');
  for (const [packId, packDef] of Object.entries(CATALOG_PACKS)) {
    const payload = {
      ...packDef,
      updatedAt: now,
    };
    console.log(`  ✓ Pack ${packId} : ${packDef.name} — ${packDef.priceMonthly.toLocaleString('fr-FR')} FCFA/mois`);
    if (!isDryRun) {
      await setDoc(doc(db, 'catalog', 'packs', 'items', packId), payload, { merge: true });
    }
  }

  // 2. Types de restaurant (8 types)
  console.log('\n[2/4] Enregistrement des 8 Types d\'Établissements (catalog/types/items/)...');
  for (const [typeId, typeDef] of Object.entries(RESTAURANT_TYPES)) {
    const payload = {
      ...typeDef,
      updatedAt: now,
    };
    console.log(`  ✓ Type ${typeId} : ${typeDef.name} (Pack recommandé : ${typeDef.recommendedPack})`);
    if (!isDryRun) {
      await setDoc(doc(db, 'catalog', 'types', 'items', typeId), payload, { merge: true });
    }
  }

  // 3. Options à la carte (addons)
  console.log('\n[3/4] Enregistrement des Options à la Carte (catalog/addons/items/)...');
  for (const addon of CATALOG_ADDONS) {
    const payload = {
      ...addon,
      updatedAt: now,
    };
    console.log(`  ✓ Option ${addon.id} : ${addon.name} — ${addon.priceMonthly.toLocaleString('fr-FR')} FCFA/mois (${addon.category})`);
    if (!isDryRun) {
      await setDoc(doc(db, 'catalog', 'addons', 'items', addon.id), payload, { merge: true });
    }
  }

  // 4. Paramètres globaux et capacités (settings)
  console.log('\n[4/4] Enregistrement des Paramètres de Facturation & Capacités (catalog/settings/global)...');
  const settingsPayload = {
    ...DEFAULT_CATALOG_SETTINGS,
    capacityPricing: CAPACITY_PRICING,
    updatedAt: now,
  };
  console.log(`  ✓ Facturation Annuelle : Multiplicateur x${DEFAULT_CATALOG_SETTINGS.annualMultiplier}`);
  console.log(`  ✓ Facturation À Vie    : Multiplicateur x${DEFAULT_CATALOG_SETTINGS.lifetimeMultiplier} (Maintenance x${DEFAULT_CATALOG_SETTINGS.lifetimeMaintenanceMultiplier}/an)`);
  console.log(`  ✓ Pas d'arrondi       : ${DEFAULT_CATALOG_SETTINGS.roundStep} FCFA`);
  if (!isDryRun) {
    await setDoc(doc(db, 'catalog', 'settings', 'global', 'billing'), settingsPayload, { merge: true });
  }

  console.log(`\n[✓] Catalogue RestoMaster OS initialisé avec succès ${isDryRun ? '(DRY RUN TERMINE)' : ''} !`);
}

runSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[!] Erreur lors de l\'initialisation du catalogue :', err);
    process.exit(1);
  });
