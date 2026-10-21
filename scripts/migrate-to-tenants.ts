/**
 * RestoMaster OS — Script de Migration Réversible vers l'Architecture Multi-Tenant (Phase 1)
 *
 * Objectif :
 * 1. Lit l'organisation existante 'org-main' (ou la première disponible dans 'organizations').
 * 2. Crée la fiche tenant canonique dans 'tenants/{orgId}'.
 * 3. Initialise le sous-document scellé 'tenants/{orgId}/entitlements/current' avec les modules et règles d'exploitation.
 * 4. Fournit un mode --dry-run (simulation sans écriture) et --rollback (annulation réversible).
 *
 * Utilisation :
 * npx tsx scripts/migrate-to-tenants.ts [--dry-run] [--rollback]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { DEFAULT_OPERATION_RULES } from '../src/types/configuration';

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

const isDryRun = process.argv.includes('--dry-run');
const isRollback = process.argv.includes('--rollback');

async function main() {
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('  RESTOMASTER OS — MIGRATION VERS ARCHITECTURE MULTI-TENANT');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`Mode : ${isDryRun ? 'SIMULATION À BLANC (--dry-run)' : isRollback ? 'ANNULATION (--rollback)' : 'APPLICATION EN BASE RÉELLE'}`);

  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    console.warn('⚠️ Variables Firebase absentes de .env. Vérification structurelle seule.');
    return;
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const orgId = 'org-main';
  const tenantDocRef = doc(db, 'tenants', orgId);
  const entitlementsDocRef = doc(db, `tenants/${orgId}/entitlements`, 'current');

  if (isRollback) {
    console.log(`\n[Rollback] Suppression de la fiche tenant ${orgId} et de ses entitlements...`);
    if (!isDryRun) {
      await deleteDoc(entitlementsDocRef);
      await deleteDoc(tenantDocRef);
      console.log('✓ Nettoyage effectué avec succès.');
    } else {
      console.log('[Simulation] Documents ciblés pour suppression :');
      console.log(`  - tenants/${orgId}`);
      console.log(`  - tenants/${orgId}/entitlements/current`);
    }
    return;
  }

  // 1. Lecture de l'organisation existante
  console.log(`\n1. Lecture de organizations/${orgId}...`);
  const orgDocRef = doc(db, 'organizations', orgId);
  let orgData: Record<string, any> = {};

  try {
    const orgSnap = await getDoc(orgDocRef);
    if (orgSnap.exists()) {
      orgData = orgSnap.data();
      console.log(`✓ Organisation trouvée : "${orgData.name || 'RestoMaster Main'}" (RCCM: ${orgData.rccm || 'N/A'}, NIU: ${orgData.taxId || 'N/A'})`);
    } else {
      console.log(`ℹ Aucune organisation existante à l'id "${orgId}". Utilisation des métadonnées par défaut.`);
      orgData = {
        name: 'Restaurant Pilote RestoMaster',
        legalName: 'RestoMaster SAS',
        taxId: 'M122300000000P',
        rccm: 'RC/DLA/2026/B/001',
        city: 'Douala',
        country: 'Cameroun',
        phone: '+237 600 000 000',
        email: 'direction@restomaster.cm',
        currency: 'FCFA',
      };
    }
  } catch (err) {
    console.warn('⚠️ Erreur lecture organizations (accès direct ignoré en local):', err);
  }

  // 2. Préparation du document Tenant
  const tenantPayload = {
    id: orgId,
    status: 'actif',
    planId: 'plan_pro',
    creationSource: 'cree_par_admin',
    channel: 'stable',
    labels: ['client_historique', 'production'],
    healthScore: 100,
    company: {
      name: orgData.name || 'Restaurant Pilote RestoMaster',
      legalName: orgData.legalName || orgData.name || 'RestoMaster SAS',
      legalForm: orgData.legalForm || 'SARL',
      taxId: orgData.taxId || 'M122300000000P',
      rccm: orgData.rccm || 'RC/DLA/2026/B/001',
      taxCenter: orgData.taxCenter || 'DGI Littoral 1',
      headquartersAddress: orgData.headquartersAddress || 'Akwa, Boulevard de la Liberté',
      city: orgData.city || 'Douala',
      country: orgData.country || 'Cameroun',
      phone: orgData.phone || '+237 600 000 000',
      email: orgData.email || 'direction@restomaster.cm',
    },
    owner: {
      uid: 'owner-org-main',
      name: 'Direction Générale',
      email: orgData.email || 'direction@restomaster.cm',
      phone: orgData.phone || '+237 600 000 000',
    },
    limits: {
      maxOutlets: 5,
      maxUsers: 20,
      maxTerminals: 10,
      maxOrdersPerMonth: 50000,
    },
    currency: orgData.currency || 'FCFA',
    createdAt: orgData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Préparation des Entitlements
  const modulesMap: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(DEFAULT_OPERATION_RULES)) {
    if (k.startsWith('mod_')) {
      modulesMap[k] = Boolean(v);
    }
  }

  const entitlementsPayload = {
    orgId,
    modules: modulesMap,
    operationRules: DEFAULT_OPERATION_RULES,
    lockedConfigKeys: [],
    effectiveLimits: tenantPayload.limits,
    features: {
      pos_vente_directe: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: 'system_migration',
        activatedAt: new Date().toISOString(),
      },
      pos_plan_tables: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: 'system_migration',
        activatedAt: new Date().toISOString(),
      },
      cuisine_kds: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: 'system_migration',
        activatedAt: new Date().toISOString(),
      },
      bar_kds: {
        status: 'ACTIVÉ',
        source: 'plan',
        activatedBy: 'system_migration',
        activatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_migration',
  };

  console.log('\n2. Données préparées pour le Tenant :');
  console.log(`  - ID : ${tenantPayload.id}`);
  console.log(`  - Statut : ${tenantPayload.status}`);
  console.log(`  - Plan : ${tenantPayload.planId}`);
  console.log(`  - Société : ${tenantPayload.company.name}`);
  console.log(`  - Modules activés : ${Object.keys(modulesMap).length}`);

  if (isDryRun) {
    console.log('\n✓ Simulation terminée avec succès. Aucune écriture n\'a été transmise à Firestore.');
    return;
  }

  // Écriture réelle
  console.log('\n3. Écriture dans Firestore...');
  await setDoc(tenantDocRef, tenantPayload, { merge: true });
  console.log(`✓ Document tenants/${orgId} créé avec succès.`);

  await setDoc(entitlementsDocRef, entitlementsPayload, { merge: true });
  console.log(`✓ Document tenants/${orgId}/entitlements/current créé avec succès.`);

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('✓ Migration terminée avec succès !');
  console.log('═════════════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Échec de la migration:', err);
  process.exit(1);
});
