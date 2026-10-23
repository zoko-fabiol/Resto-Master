/**
 * RestoMaster OS — Script de Migration des Droits d'Accès Utilisateurs (Phase 1)
 * Déplace tabPermissions et additionalTabs de users/{uid} vers tenants/{orgId}/userAccess/{uid}.
 *
 * Utilisation :
 *   npx tsx scripts/migrate-user-access.ts            (Mode simulation --dry-run par défaut)
 *   npx tsx scripts/migrate-user-access.ts --apply    (Application réelle dans Firestore)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const isDryRun = !process.argv.includes('--apply');

// Initialisation Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    initializeApp({
      credential: cert(serviceAccountPath),
    });
  } else {
    // Mode émulateur ou projet par défaut
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    initializeApp({ projectId: 'restomaster-os-demo' });
  }
}

const db = getFirestore();

interface MigrationStats {
  totalScanned: number;
  needingMigration: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function runMigration() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       RESTOMASTER OS — MIGRATION VERS USERACCESS (PHASE 1)                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`[i] Mode d'exécution : ${isDryRun ? 'SIMULATION (DRY-RUN)' : 'APPLICATION RÉELLE (--apply)'}\n`);

  const stats: MigrationStats = {
    totalScanned: 0,
    needingMigration: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    const usersSnap = await db.collection('users').get();
    stats.totalScanned = usersSnap.size;
    console.log(`[i] ${stats.totalScanned} utilisateurs détectés dans la collection users/.\n`);

    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data();
      const uid = docSnap.id;
      const orgId = data.organizationId || data.orgId || 'org_default';
      const hasLegacyTabs = Array.isArray(data.additionalTabs) && data.additionalTabs.length > 0;
      const hasLegacyPerms = data.tabPermissions && Object.keys(data.tabPermissions).length > 0;

      if (!hasLegacyTabs && !hasLegacyPerms) {
        stats.skipped++;
        continue;
      }

      stats.needingMigration++;
      console.log(`[→] Utilisateur ${data.name || uid} (${data.email || 'sans email'})`);
      console.log(`    - Organisation : ${orgId}`);
      if (hasLegacyTabs) console.log(`    - additionalTabs (${data.additionalTabs.length}) :`, data.additionalTabs.join(', '));
      if (hasLegacyPerms) console.log(`    - tabPermissions (${Object.keys(data.tabPermissions).length} onglets)`);

      const targetDocRef = db.collection('tenants').doc(orgId).collection('userAccess').doc(uid);

      if (!isDryRun) {
        try {
          // 1. Écriture dans tenants/{orgId}/userAccess/{uid}
          await targetDocRef.set(
            {
              uid,
              orgId,
              tabs: data.additionalTabs || [],
              permissions: data.tabPermissions || {},
              assignedTableId: data.assignedTableId || null,
              assignedTableName: data.assignedTableName || null,
              version: 1,
              updatedAt: new Date().toISOString(),
              updatedBy: 'scripts:migrate-user-access',
            },
            { merge: true }
          );

          // 2. Nettoyage des anciens champs sur users/{uid}
          await docSnap.ref.update({
            additionalTabs: FieldValue.delete(),
            tabPermissions: FieldValue.delete(),
            updatedAt: new Date().toISOString(),
          });

          stats.migrated++;
          console.log(`    [✓] Migré avec succès vers tenants/${orgId}/userAccess/${uid}`);
        } catch (err) {
          stats.errors++;
          console.error(`    [✗] Échec migration pour ${uid} :`, err);
        }
      } else {
        console.log(`    [DRY-RUN] Prêt à écrire dans tenants/${orgId}/userAccess/${uid} et purger users/${uid}`);
      }
      console.log('');
    }

    console.log('────────────────────────────────────────────────────────────────────────────');
    console.log('BILAN DE LA MIGRATION :');
    console.log(`- Total utilisateurs scannés       : ${stats.totalScanned}`);
    console.log(`- Utilisateurs nécessitant migration : ${stats.needingMigration}`);
    if (isDryRun) {
      console.log(`- Actions simulées                 : ${stats.needingMigration}`);
      console.log('\n[TIP] Pour appliquer réellement les modifications dans la base de données, relancez avec :');
      console.log('      npx tsx scripts/migrate-user-access.ts --apply');
    } else {
      console.log(`- Utilisateurs migrés avec succès  : ${stats.migrated}`);
      console.log(`- Erreurs rencontrées              : ${stats.errors}`);
    }
    console.log('────────────────────────────────────────────────────────────────────────────\n');
  } catch (globalErr) {
    console.error('[FATAL] Erreur lors de l’exécution du script de migration :', globalErr);
    process.exit(1);
  }
}

runMigration();
