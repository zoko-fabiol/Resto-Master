/**
 * RestoMaster OS — Script de packaging de Release (Zéro Donnée Fictive)
 * Commande : npm run release:zip
 *
 * Ce script :
 * 1. Exécute l'audit check:demo pour certifier l'absence de données de test
 * 2. Prépare la liste des fichiers et répertoires de production
 * 3. Génère l'archive release zip propre (sans node_modules, dist, ni .env)
 * 4. Calcule la taille et l'empreinte SHA-256 du livrable
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const ZIP_NAME = 'restomaster-os-v1.0.0-release.zip';
const ZIP_OUTPUT = path.join(RELEASE_DIR, ZIP_NAME);

// Liste des cibles à inclure dans l'archive
const INCLUDED_ENTRIES = [
  'src',
  'admin-panel',
  'functions',
  'public',
  'docs',
  'scripts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json',
  '.env.example',
  'README.md',
  'AGENTS.md',
  'GEMINI.md',
  'index.html',
];

function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║               RESTOMASTER OS — PACKAGING DE LIVRAISON ZIP                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // 1. Audit préalable
  console.log('[1/4] Validation de l hygiène du code (check:demo)...');
  try {
    execSync('npm run check:demo', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch {
    console.error('[✗] Échec de l audit check:demo. Création du zip annulée.');
    process.exit(1);
  }

  // 2. Préparation du répertoire release
  console.log('\n[2/4] Préparation du dossier de release...');
  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }
  if (fs.existsSync(ZIP_OUTPUT)) {
    fs.unlinkSync(ZIP_OUTPUT);
  }

  // 3. Création de l'archive via bsdtar (ou Compress-Archive en fallback)
  console.log(`[3/4] Compression de l archive vers ${ZIP_NAME}...`);
  const existingEntries = INCLUDED_ENTRIES.filter((entry) =>
    fs.existsSync(path.join(ROOT_DIR, entry))
  );

  let success = false;
  try {
    // bsdtar supporte le format zip avec l'option -a
    const quotedEntries = existingEntries.map((e) => `"${e}"`).join(' ');
    const cmd = `tar -a -cf "${ZIP_OUTPUT}" --exclude="node_modules" --exclude="dist" --exclude=".env" --exclude=".git" ${quotedEntries}`;
    execSync(cmd, { cwd: ROOT_DIR, stdio: 'pipe' });
    success = fs.existsSync(ZIP_OUTPUT) && fs.statSync(ZIP_OUTPUT).size > 0;
  } catch (tarErr) {
    console.warn('Fallback vers PowerShell Compress-Archive...');
    try {
      const psEntries = existingEntries.map((e) => `'${path.join(ROOT_DIR, e)}'`).join(',');
      const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path ${psEntries} -DestinationPath '${ZIP_OUTPUT}' -Force"`;
      execSync(psCmd, { cwd: ROOT_DIR, stdio: 'pipe' });
      success = fs.existsSync(ZIP_OUTPUT) && fs.statSync(ZIP_OUTPUT).size > 0;
    } catch (psErr) {
      console.error('[✗] Erreur lors de la compression:', psErr);
      process.exit(1);
    }
  }

  if (!success) {
    console.error('[✗] Fichier zip introuvable ou vide.');
    process.exit(1);
  }

  // 4. Calcul d'empreinte SHA-256 et métriques
  console.log('\n[4/4] Certification de l intégrité du livrable...');
  const fileBuffer = fs.readFileSync(ZIP_OUTPUT);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const sha256 = hashSum.digest('hex');
  const sizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);

  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      ARCHIVE DE RELEASE CERTIFIÉE                          ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ Fichier    : release/${ZIP_NAME}`.padEnd(77) + '║');
  console.log(`║ Taille     : ${sizeMb} Mo (${fileBuffer.length.toLocaleString('fr-FR')} octets)`.padEnd(77) + '║');
  console.log(`║ SHA-256    : ${sha256}`.padEnd(77) + '║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
}

main();
