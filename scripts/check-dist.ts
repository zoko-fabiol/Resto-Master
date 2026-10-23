import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DistCheckOptions {
  rootDir: string;
  mode: 'tauri' | 'web' | 'electron';
  env?: Record<string, string | undefined>;
}

function loadEnv(rootDir: string): Record<string, string> {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      })
      .filter(([key]) => key.length > 0)
  );
}

function listFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

export function checkDist(options: DistCheckOptions): string[] {
  const distDir = path.join(options.rootDir, 'dist');
  const files = listFiles(distDir);
  const failures: string[] = [];
  const contents = files
    .filter((file) => /\.(js|css|html|json)$/i.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const functionChunks = files.filter((file) => /cloudFunctionsService-[^\\/]+\.js$/i.test(file));

  if (contents.includes('non configurée ou non déployée')) {
    failures.push('Le texte obsolète « non configurée ou non déployée » est présent dans dist/.');
  }
  if (functionChunks.length > 1) {
    failures.push(`dist/ contient ${functionChunks.length} chunks cloudFunctionsService-* ; un seul est attendu.`);
  }
  if (options.mode === 'tauri' || options.mode === 'electron') {
    const serviceWorkers = files.filter((file) => /(^|[\\/])(sw\.js|registerSW\.js|workbox-[^\\/]+\.js)$/i.test(file));
    if (serviceWorkers.length > 0) {
      failures.push(`Un build ${options.mode} contient des service workers : ${serviceWorkers.map((file) => path.relative(distDir, file)).join(', ')}.`);
    }
  }
  const env = options.env ?? { ...loadEnv(options.rootDir), ...process.env };
  if (env.VITE_USE_CLOUD_FUNCTIONS !== 'true') {
    failures.push('VITE_USE_CLOUD_FUNCTIONS doit être égal à true pour le build.');
  }

  return failures;
}

const modeArg = (process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'web') as 'tauri' | 'web' | 'electron';
if (modeArg !== 'tauri' && modeArg !== 'web' && modeArg !== 'electron') {
  console.error('[✗] Mode invalide. Utilisez --mode=tauri, --mode=web ou --mode=electron.');
  process.exit(1);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = checkDist({ rootDir, mode: modeArg });
if (failures.length > 0) {
  console.error('[✗] Contrôle de dist échoué :');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log(`[✓] Contrôle de dist réussi (${modeArg}).`);
