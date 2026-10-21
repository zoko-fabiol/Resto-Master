/**
 * RestoMaster OS — Vérification des prérequis Tauri 2 et Android.
 *
 * Le diagnostic reste informatif tant que l'outillage Tauri n'est pas installé.
 * Il échoue uniquement lorsqu'une variable ou un outil déjà déclaré est
 * manifestement invalide, afin de ne pas bloquer le développement navigateur.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type CheckResult = {
  label: string;
  value: string;
  required: boolean;
};

function commandVersion(command: string, args: string[]): string | null {
  try {
    const cargoBin = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cargo', 'bin');
    const localExecutable =
      ['rustc', 'cargo', 'rustup'].includes(command) && fs.existsSync(path.join(cargoBin, `${command}.exe`))
        ? path.join(cargoBin, `${command}.exe`)
        : command;
    const executable = process.platform === 'win32' && localExecutable === 'npm' ? 'npm.cmd' : localExecutable;
    const commandArgs =
      process.platform === 'win32' && executable === 'npm.cmd'
        ? ['/d', '/s', '/c', `${executable} ${args.join(' ')}`]
        : args;
    const commandName =
      process.platform === 'win32' && executable === 'npm.cmd'
        ? process.env.ComSpec || 'cmd.exe'
        : executable;
    return execFileSync(commandName, commandArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    }).trim().split(/\r?\n/)[0] || 'détecté';
  } catch {
    return null;
  }
}

function checkCommand(label: string, command: string, args: string[], required: boolean): CheckResult {
  return {
    label,
    value: commandVersion(command, args) || 'absent',
    required,
  };
}

function envValue(name: string): string {
  return process.env[name]?.trim() || 'non définie';
}

const isWindows = process.platform === 'win32';
const results: CheckResult[] = [
  checkCommand('Node.js', 'node', ['--version'], true),
  checkCommand('npm', 'npm', ['--version'], true),
  checkCommand('Rust', 'rustc', ['--version'], false),
  checkCommand('Cargo', 'cargo', ['--version'], false),
  checkCommand('rustup', 'rustup', ['--version'], false),
  checkCommand('Java', 'java', ['--version'], false),
  checkCommand('Android Debug Bridge', 'adb', ['version'], false),
];

if (isWindows) {
  results.push(
    checkCommand('WebView2 Runtime', 'reg', [
      'query',
      'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      '/v',
      'pv',
    ], false)
  );
}

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║       RESTOMASTER OS — DIAGNOSTIC DE L’ENVIRONNEMENT TAURI 2              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

let blockingErrors = 0;
for (const result of results) {
  const isPresent = result.value !== 'absent';
  const icon = isPresent ? '✓' : result.required ? '✗' : '!';
  const suffix = result.required && !isPresent ? ' (bloquant)' : '';
  console.log(`[${icon}] ${result.label}: ${result.value}${suffix}`);
  if (result.required && !isPresent) blockingErrors += 1;
}

console.log('\nVariables Android :');
for (const name of ['JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'NDK_HOME']) {
  console.log(`  - ${name}: ${envValue(name)}`);
}

console.log('\nPrérequis optionnels à installer pour Tauri :');
console.log('  - Rust stable via rustup, puis les cibles desktop et Android nécessaires.');
console.log('  - Android Studio, SDK Platform, Build Tools, NDK et un appareil ou émulateur.');
if (isWindows) {
  console.log('  - Microsoft C++ Build Tools et WebView2 Runtime.');
}

if (blockingErrors > 0) {
  console.error('\n[ÉCHEC] Node.js et npm sont nécessaires pour poursuivre.');
  process.exit(1);
}

console.log('\n[OK] L’environnement navigateur est exploitable. Les prérequis Tauri manquants sont listés ci-dessus.');
