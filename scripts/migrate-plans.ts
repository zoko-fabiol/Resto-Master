/**
 * RestoMaster OS — Script de Migration des Plans Existants vers les Nouveaux Packs
 *
 * Usage :
 *   npx tsx scripts/migrate-plans.ts           # Exécute la migration dans Firestore
 *   npx tsx scripts/migrate-plans.ts --dry-run # Affiche les modifications sans les appliquer
 *
 * Correspondances :
 *   - 'plan_starter' / 'starter'       -> Pack 'minimum'
 *   - 'plan_pro' / 'pro'               -> Pack 'medium'
 *   - 'plan_enterprise' / 'enterprise' -> Pack 'premium'
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, connectFirestoreEmulator } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { PackId, RestaurantTypeId } from '../shared/catalog/packs.js';
import { resolveEntitlements } from '../shared/catalog/resolver.js';

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
console.log('║       RESTOMASTER OS — MIGRATION VERS LES NOUVEAUX PACKS ET DROITS         ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`[Mode] : ${isDryRun ? 'DRY-RUN (Simulation seule)' : 'PRODUCTION / ÉMULATEUR (Mise à jour Firestore)'}\n`);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'restomaster-os',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo',
});

const auth = getAuth(app);
const db = getFirestore(app);

if (process.env.FIRESTORE_EMULATOR_HOST) {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(db, host, Number(port));
} else if (env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

function mapLegacyPlanToPack(legacyPlanId?: string): PackId {
  if (!legacyPlanId) return 'medium';
  const clean = legacyPlanId.toLowerCase();
  if (clean.includes('starter') || clean.includes('minimum')) return 'minimum';
  if (clean.includes('enterprise') || clean.includes('premium')) return 'premium';
  return 'medium';
}

async function migrate() {
  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    try {
      console.log(`[Auth] Connexion admin avec ${env.ADMIN_EMAIL}...`);
      await signInWithEmailAndPassword(auth, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
      console.log(`[Auth] ✓ Authentifié avec succès.`);
    } catch (authErr) {
      console.warn(`[Auth] ⚠ Impossible de se connecter en admin :`, authErr);
    }
  }

  const tenantsRef = collection(db, 'tenants');
  const snapshot = await getDocs(tenantsRef);

  console.log(`[Analyse] ${snapshot.docs.length} établissement(s) trouvé(s) dans Firestore.\n`);

  let migratedCount = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const currentPlanId = data.planId || data.packId;
    const targetPackId = mapLegacyPlanToPack(currentPlanId);
    const targetType: RestaurantTypeId = data.restaurantType || data.type || 'restaurant_classique';
    const activeAddons: string[] = data.selectedAddons || [];
    const additionalCaps = data.additionalCapacities || {};

    const resolvedEntitlements = resolveEntitlements({
      orgId: docSnap.id,
      restaurantType: targetType,
      packId: targetPackId,
      subscribedAddons: activeAddons,
      capacities: additionalCaps,
    });

    const updatePayload = {
      packId: targetPackId,
      planId: targetPackId, // Rétro-compatibilité
      restaurantType: targetType,
      entitlements: resolvedEntitlements,
      updatedAt: new Date().toISOString(),
    };

    console.log(`• Tenant ${docSnap.id} ("${data.name || 'Sans Nom'}") :`);
    console.log(`   Ancien plan : ${currentPlanId || 'aucun'}  ==>  Nouveau pack : ${targetPackId}`);
    console.log(`   Type restaurant : ${targetType}`);
    console.log(`   Modules accordés : ${Object.keys(resolvedEntitlements.modules).filter((m) => resolvedEntitlements.modules[m]).length} modules`);
    console.log(`   Plafonds : ${resolvedEntitlements.effectiveLimits.maxUsers} utilisateurs, ${resolvedEntitlements.effectiveLimits.maxTerminals} terminaux, ${resolvedEntitlements.effectiveLimits.maxOrdersPerMonth} commandes/mois\n`);

    if (!isDryRun) {
      await updateDoc(doc(db, 'tenants', docSnap.id), updatePayload);
    }
    migratedCount++;
  }

  console.log(`[✓] Migration achevée : ${migratedCount} restaurant(s) ${isDryRun ? 'simulé(s)' : 'mis à jour'}.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[!] Erreur lors de la migration :', err);
    process.exit(1);
  });
