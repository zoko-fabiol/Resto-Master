/**
 * RestoMaster OS — Script de création / provisionnement du premier Super Administrateur
 * Utilise le Firebase Admin SDK.
 * Exécution sécurisée : mot de passe masqué en invite interactive (jamais en clair, jamais en argument).
 * Commande : npx tsx scripts/create-superadmin.ts
 */

import readline from 'node:readline';
import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

// Initialisation de Firebase Admin SDK
function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // 1. Priorité à la variable GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      return initializeApp({ credential: cert(serviceAccount) });
    }
  }

  // 2. Recherche d'un fichier serviceAccountKey.json local s'il existe
  const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // 3. Fallback sur applicationDefault (Cloud Shell / Firebase CLI ADC)
  try {
    return initializeApp({ credential: applicationDefault() });
  } catch (err) {
    console.warn('[AVERTISSEMENT] Authentification par applicationDefault indisponible. Tentative d\'initialisation par défaut...');
    return initializeApp();
  }
}

// Helper pour poser une question masquée dans le terminal (pour les mots de passe)
function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Capture des frappes pour masquer les caractères
    process.stdout.write(query);

    let password = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf8');
      switch (str) {
        case '\n':
        case '\r':
        case '\u0004':
          // Validation
          process.stdin.removeListener('data', onData);
          break;
        case '\u0003':
          // Ctrl+C
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += str;
          process.stdout.write('*');
          break;
      }
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', onData);
    }

    rl.on('line', () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
      console.log('');
      resolve(password);
    });
  });
}

function promptPlain(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n=============================================================');
  console.log(' RestoMaster OS — Provisionnement du Super Administrateur');
  console.log('=============================================================\n');

  try {
    initAdmin();
    const auth = getAuth();
    const db = getFirestore();

    const email = await promptPlain('Adresse e-mail du Super Administrateur : ');
    if (!email || !email.includes('@')) {
      console.error('\n[ERREUR] Adresse e-mail invalide.');
      process.exit(1);
    }

    const name = (await promptPlain('Nom complet (par défaut : Super Administrateur) : ')) || 'Super Administrateur';

    let password = '';
    let confirm = '';
    while (true) {
      password = await promptHidden('Mot de passe (minimum 8 caractères) : ');
      if (!password || password.length < 8) {
        console.log('[ERREUR] Le mot de passe doit comporter au moins 8 caractères. Réessayez.');
        continue;
      }

      confirm = await promptHidden('Confirmez le mot de passe : ');
      if (password !== confirm) {
        console.log('[ERREUR] Les deux mots de passe ne correspondent pas. Réessayez.\n');
        continue;
      }
      break;
    }

    console.log('\nCréation / mise à jour du compte dans Firebase Authentication...');

    let uid = '';
    try {
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      await auth.updateUser(uid, {
        password,
        displayName: name,
      });
      console.log(`Compte existant mis à jour (UID: ${uid}).`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        uid = newUser.uid;
        console.log(`Nouveau compte créé (UID: ${uid}).`);
      } else {
        throw err;
      }
    }

    console.log('Attribution des Custom Claims { role: "superadmin", active: true, outlets: ["*"] }...');
    await auth.setCustomUserClaims(uid, {
      role: 'superadmin',
      active: true,
      outlets: ['*'],
      organizationId: 'org-main',
    });

    console.log('Enregistrement du profil dans Firestore (users/' + uid + ')...');
    await db.collection('users').doc(uid).set(
      {
        id: uid,
        email,
        name,
        role: 'superadmin',
        active: true,
        accessibleRestaurantIds: ['*'],
        organizationId: 'org-main',
        mustChangePassword: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('Journalisation de sécurité dans audit_logs...');
    await db.collection('audit_logs').add({
      action: 'Création Super Administrateur',
      module: 'Sécurité',
      details: `Création / initialisation du compte superadmin ${name} (${email}) via CLI Admin SDK`,
      userId: uid,
      userName: name,
      userRole: 'superadmin',
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log('\n=============================================================');
    console.log(' SUCCÈS : Super Administrateur configuré avec succès !');
    console.log(` E-mail : ${email}`);
    console.log(` UID    : ${uid}`);
    console.log(' Rôle   : superadmin (droits universels de configuration)');
    console.log('=============================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n[ERREUR CRITIQUE] Échec lors de la création du superadmin :', err.message || err);
    process.exit(1);
  }
}

main();
