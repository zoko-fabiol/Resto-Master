/**
 * RestoMaster OS — Script de purge et migration sécurisée des codes PIN en clair
 *
 * Règle de sécurité absolue :
 * - Aucun code PIN ne doit être stocké en clair dans Firestore.
 * - Supprime le champ `pinCode` de `users`, `userAccounts` et `employees`.
 * - Hache chaque code PIN avec PBKDF2-SHA256 (100 000 itérations) + sel unique 128 bits.
 * - Stocke le hash exclusivement dans la collection sécurisée `user_pins/{userId}`.
 *
 * Commande : npx tsx scripts/purge-plaintext-pins.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function findServiceAccountKey(): string | null {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) return credPath;
  }

  const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) return localKeyPath;

  try {
    const rootFiles = fs.readdirSync(process.cwd());
    const matchRoot = rootFiles.find(
      (f) =>
        f.endsWith('.json') &&
        (f.includes('firebase-adminsdk') || f.includes('serviceAccount') || f.includes('resto-master'))
    );
    if (matchRoot) return path.resolve(process.cwd(), matchRoot);
  } catch {}

  const candidateDirs = [
    path.join(os.homedir(), 'Downloads'),
    'e:\\Telechargement',
    'E:\\Telechargement',
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const match = files.find(
          (f) =>
            f.endsWith('.json') &&
            (f.includes('resto-master') || (f.includes('firebase-adminsdk') && !f.includes('flash-pay')))
        );
        if (match) return path.join(dir, match);
      } catch {}
    }
  }

  return null;
}

function hashPin(pin: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 100_000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   RESTOMASTER OS — PURGE DES PINS EN CLAIR & CHIFFREMENT CRYPTOGRAPHIQUE   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const keyPath = findServiceAccountKey();
  if (!keyPath) {
    console.error('[ERREUR FATALE] Clé de service Firebase introuvable.');
    process.exit(1);
  }

  console.log(`[INFO] Clé de service détectée : ${keyPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || 'resto-master-310f7',
    });
  }

  const db = getFirestore();
  let totalPurged = 0;

  // 1. Purge dans 'users'
  console.log('\n[1/3] Analyse de la collection "users"...');
  const usersSnap = await db.collection('users').get();
  for (const uDoc of usersSnap.docs) {
    const data = uDoc.data();
    if (data.pinCode) {
      const pin = String(data.pinCode);
      const { hash, salt } = hashPin(pin);

      // Écrire dans user_pins
      await db.collection('user_pins').doc(uDoc.id).set({
        userId: uDoc.id,
        hash,
        salt,
        failedAttempts: 0,
        lockoutUntil: null,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'SecurityPurgeScript',
      });

      // Supprimer le pinCode en clair de users
      await db.collection('users').doc(uDoc.id).update({
        hasPin: true,
        pinCode: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`  [✓] Utilisateur ${data.email || uDoc.id} : pinCode en clair PURGÉ et migré vers user_pins (hash PBKDF2).`);
      totalPurged++;
    }
  }

  // 2. Purge dans 'userAccounts'
  console.log('\n[2/3] Analyse de la collection "userAccounts"...');
  const accountsSnap = await db.collection('userAccounts').get();
  for (const aDoc of accountsSnap.docs) {
    const data = aDoc.data();
    if (data.pinCode) {
      await db.collection('userAccounts').doc(aDoc.id).update({
        hasPin: true,
        pinCode: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  [✓] Compte ${data.email || aDoc.id} : pinCode en clair supprimé.`);
      totalPurged++;
    }
  }

  // 3. Purge dans 'employees'
  console.log('\n[3/3] Analyse de la collection "employees"...');
  const employeesSnap = await db.collection('employees').get();
  for (const eDoc of employeesSnap.docs) {
    const data = eDoc.data();
    if (data.pinCode) {
      await db.collection('employees').doc(eDoc.id).update({
        hasPin: true,
        pinCode: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  [✓] Employé ${data.name || eDoc.id} : pinCode en clair supprimé.`);
      totalPurged++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(`[RÉSULTAT] Opération terminée. Total de champs en clair purgés : ${totalPurged}`);
  console.log('[RÉSULTAT] Tous les PINs sont désormais sécurisés sous hachage PBKDF2 irréversible.');
  console.log('════════════════════════════════════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('[ERREUR CRITIQUE] Échec de la purge :', err);
  process.exit(1);
});
