/**
 * RestoMaster OS — Contrôle d'environnement pré-build (Phase A5)
 * Vérifie l'intégrité des variables d'environnement de production.
 *
 * Règles bloquantes :
 * 1. Échoue si une variable VITE_FIREBASE_* obligatoire est manquante ou vide.
 * 2. Échoue si une variable VITE_DEMO_* existe (mode démo strictement interdit).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Lecture manuelle simple du fichier .env s'il existe
function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const envFromFiles = {
  ...loadEnvFile(path.join(ROOT_DIR, '.env')),
  ...loadEnvFile(path.join(ROOT_DIR, '.env.local')),
  ...loadEnvFile(path.join(ROOT_DIR, '.env.production')),
};

const allEnv: Record<string, string | undefined> = {
  ...envFromFiles,
  ...process.env,
};

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       RESTOMASTER OS — CONTRÔLE PRÉ-BUILD DE SÉCURITÉ ENVIRONNEMENT        ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

let hasErrors = false;

// 1. Détection de toute variable VITE_DEMO_* interdite
const demoVars = Object.keys(allEnv).filter((k) => k.startsWith('VITE_DEMO_'));
if (demoVars.length > 0) {
  console.error('[ERREUR CRITIQUE] Variables de mode démo détectées :');
  demoVars.forEach((v) => console.error(`  - ${v}`));
  console.error('Le mode démo est formellement interdit en phase de livraison de production.');
  hasErrors = true;
}

// 1.bis Interdiction formelle de VITE_USE_EMULATORS en build de production
if (allEnv.VITE_USE_EMULATORS === 'true') {
  console.error('[ERREUR CRITIQUE] VITE_USE_EMULATORS=true détecté dans l’environnement !');
  console.error('Les émulateurs locaux ne doivent JAMAIS être activés pour un build de production.');
  hasErrors = true;
}

// 2. Vérification des variables Firebase obligatoires
const requiredFirebaseVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingFirebaseVars: string[] = [];
for (const varName of requiredFirebaseVars) {
  const val = allEnv[varName];
  if (!val || val.trim() === '' || val.includes('votre-projet') || val.includes('AIzaSy...')) {
    missingFirebaseVars.push(varName);
  }
}

if (missingFirebaseVars.length > 0) {
  console.error('[ERREUR CRITIQUE] Variables Firebase manquantes ou non renseignées dans .env :');
  missingFirebaseVars.forEach((v) => console.error(`  - ${v}`));
  console.error('Veuillez renseigner un projet Firebase valide avant de construire le livrable.');
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n[ÉCHEC DU BUILD] Vérification d\'environnement non conforme aux règles de livraison.\n');
  process.exit(1);
} else {
  console.log('[✓] Environnement conforme : variables Firebase validées, zéro variable démo détectée.\n');
  process.exit(0);
}
