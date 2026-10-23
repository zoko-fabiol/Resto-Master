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
import os from 'node:os';

// Recherche automatique de la clé de compte de service
function findServiceAccountKey(): string | null {
  // 1. Variable d'environnement explicite
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) return credPath;
  }

  // 2. Fichier serviceAccountKey.json dans le projet
  const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) return localKeyPath;

  // 3. Scan du dossier racine pour tout fichier JSON Firebase Admin
  try {
    const rootFiles = fs.readdirSync(process.cwd());
    const matchRoot = rootFiles.find(
      (f) =>
        f.endsWith('.json') &&
        (f.includes('firebase-adminsdk') || f.includes('serviceAccount') || f.includes('resto-master'))
    );
    if (matchRoot) return path.resolve(process.cwd(), matchRoot);
  } catch {}

  // 4. Scan des répertoires de téléchargement courants de l'utilisateur
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

// Initialisation de Firebase Admin SDK
function initAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const keyPath = findServiceAccountKey();
  if (keyPath) {
    console.log(`[Firebase Admin] Clé de compte de service détectée : ${keyPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount) });
  }

  // Fallback sur applicationDefault si disponible
  try {
    return initializeApp({ credential: applicationDefault(), projectId: 'resto-master-310f7' });
  } catch (err) {
    return initializeApp({ projectId: 'resto-master-310f7' });
  }
}

// Helper pour poser une question masquée dans le terminal (pour les mots de passe)
function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    process.stdout.write(query);

    let password = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf8');
      switch (str) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.removeListener('data', onData);
          break;
        case '\u0003':
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
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

    const emailArg = process.argv[2]?.trim();
    const email = emailArg || (await promptPlain('Adresse e-mail du Super Administrateur : '));
    if (!email || !email.includes('@')) {
      console.error('\n[ERREUR] Adresse e-mail invalide.');
      process.exit(1);
    }

    const defaultName = email.split('@')[0];
    const nameInput = await promptPlain(`Nom complet (par défaut : ${defaultName}) : `);
    const name = nameInput || defaultName;

    let uid = '';
    let existingUser = null;

    try {
      existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      console.log(`\nCompte existant détecté dans Firebase Authentication (UID: ${uid}).`);
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    if (existingUser) {
      const askUpdatePw = await promptPlain('Voulez-vous réinitialiser le mot de passe actuel ? (o/N) : ');
      if (askUpdatePw.toLowerCase() === 'o' || askUpdatePw.toLowerCase() === 'oui') {
        let password = '';
        while (true) {
          password = await promptHidden('Nouveau mot de passe (minimum 8 caractères) : ');
          if (!password || password.length < 8) {
            console.log('[ERREUR] Le mot de passe doit comporter au moins 8 caractères.');
            continue;
          }
          const confirm = await promptHidden('Confirmez le mot de passe : ');
          if (password !== confirm) {
            console.log('[ERREUR] Les deux mots de passe ne correspondent pas.\n');
            continue;
          }
          break;
        }
        await auth.updateUser(uid, { password, displayName: name });
        console.log('Mot de passe mis à jour avec succès.');
      } else {
        await auth.updateUser(uid, { displayName: name });
        console.log('Mot de passe existant conservé.');
      }
    } else {
      let password = '';
      while (true) {
        password = await promptHidden('Mot de passe (minimum 8 caractères) : ');
        if (!password || password.length < 8) {
          console.log('[ERREUR] Le mot de passe doit comporter au moins 8 caractères.');
          continue;
        }
        const confirm = await promptHidden('Confirmez le mot de passe : ');
        if (password !== confirm) {
          console.log('[ERREUR] Les deux mots de passe ne correspondent pas.\n');
          continue;
        }
        break;
      }
      const newUser = await auth.createUser({
        email,
        password,
        displayName: name,
      });
      uid = newUser.uid;
      console.log(`Nouveau compte créé dans Firebase Auth (UID: ${uid}).`);
    }

    console.log('Attribution des Custom Claims Plateforme { platformRole: "platform_owner", active: true }...');
    await auth.setCustomUserClaims(uid, {
      platformRole: 'platform_owner',
      active: true,
    });

    console.log(`Enregistrement du profil Administrateur Plateforme dans Firestore (platform_admins/${uid})...`);
    await db.collection('platform_admins').doc(uid).set(
      {
        id: uid,
        email,
        name,
        role: 'platform_owner',
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log('Journalisation de sécurité dans platform_audit_logs...');
    await db.collection('platform_audit_logs').add({
      action: 'CREATION_SUPERADMIN',
      module: 'Sécurité Plateforme',
      detail: `Compte Propriétaire Plateforme ${name} (${email}) initialisé avec privilèges exclusifs`,
      actorUid: uid,
      actorEmail: email,
      actorRole: 'platform_owner',
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log('\n=============================================================');
    console.log(' SUCCÈS : Super Administrateur configuré avec succès !');
    console.log(` E-mail : ${email}`);
    console.log(` UID    : ${uid}`);
    console.log(' Rôle   : superadmin (droits universels)');
    console.log('=============================================================\n');
    console.log('Vous pouvez maintenant retourner sur votre navigateur et recharger la page.');
    process.exit(0);
  } catch (err: any) {
    if (
      err.message?.includes('Could not load the default credentials') ||
      err.message?.includes('credential') ||
      err.code === 'app/no-credential'
    ) {
      console.error('\n╔════════════════════════════════════════════════════════════════════════════╗');
      console.error('║                 CLÉ DE COMPTE DE SERVICE REQUISE                           ║');
      console.error('╚════════════════════════════════════════════════════════════════════════════╝');
      console.error('\nPour attribuer les privilèges administrateur via le SDK Firebase Admin :');
      console.error('\n1. Ouvrez ce lien dans votre navigateur :');
      console.error('   👉 https://console.firebase.google.com/project/resto-master-310f7/settings/serviceaccounts/adminsdk');
      console.error('\n2. Cliquez sur le bouton :');
      console.error('   👉 "Générer une nouvelle clé privée" (puis validez)');
      console.error('\n3. Un fichier JSON sera téléchargé dans votre dossier Téléchargements.');
      console.error('   (Le script le trouvera automatiquement !)');
      console.error('\n4. Relancez ensuite simplement la commande :');
      console.error('   👉 npm run create:superadmin -- clausephwandji044@gmail.com\n');
      process.exit(1);
    }

    console.error('\n[ERREUR CRITIQUE] Échec lors de la configuration du superadmin :', err.message || err);
    process.exit(1);
  }
}

main();

