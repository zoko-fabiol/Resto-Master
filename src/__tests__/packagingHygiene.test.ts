import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('RestoMaster OS — Hygiène du Dépôt & Stratégie de Packaging (Phase 0 bis)', () => {
  it('1. Valide la présence et le contenu de docs/PACKAGING.md', () => {
    const packagingDocPath = path.resolve('docs/PACKAGING.md');
    expect(fs.existsSync(packagingDocPath)).toBe(true);

    const docContent = fs.readFileSync(packagingDocPath, 'utf8');
    // Doit affirmer clairement Electron en production et Tauri gelé
    expect(docContent).toContain('Electron');
    expect(docContent).toContain('Tauri');
    expect(docContent).toMatch(/ACTIF.*OFFICIEL.*Production/i);
    expect(docContent).toMatch(/GELÉ/i);
    expect(docContent).toContain('npm run build:electron');
    expect(docContent).toContain('npm run package:electron');
  });

  it('2. Valide que .env.example est exhaustif et exempt de tout secret', () => {
    const envExamplePath = path.resolve('.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    // Doit documenter les variables requises
    expect(envContent).toContain('VITE_FIREBASE_API_KEY');
    expect(envContent).toContain('VITE_FIREBASE_PROJECT_ID');
    expect(envContent).toContain('VITE_USE_CLOUD_FUNCTIONS');
    expect(envContent).toContain('VITE_USE_EMULATORS');
    expect(envContent).toContain('VITE_GAS_WEBHOOK_URL');

    // Ne doit pas contenir de clés de prod réelles
    expect(envContent).not.toContain('resto-master-310f7');
    expect(envContent).not.toContain('AKfycbx6zKdA_7SAwejIXUjJd49rTikO6wTsO_5MPZFEl2lU3rjYjBwApSAxr7OuTUMACnY');
    expect(envContent).not.toContain('AIzaSyC2zfdRlJrs0N1vtYvy1qbOK11piNpsQSw');
  });

  it('3. Valide la stricte cohérence des versions applicatives (package.json, Cargo.toml, tauri.conf.json)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    const tauriConf = JSON.parse(fs.readFileSync(path.resolve('src-tauri/tauri.conf.json'), 'utf8'));
    const cargoToml = fs.readFileSync(path.resolve('src-tauri/Cargo.toml'), 'utf8');
    const cargoVersionMatch = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml);

    expect(pkg.version).toBeTruthy();
    expect(tauriConf.version).toBe(pkg.version);
    expect(cargoVersionMatch?.[1]).toBe(pkg.version);
  });

  it('4. Valide la présence des scripts de packaging Electron de production dans package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    expect(pkg.scripts['build:electron']).toBeDefined();
    expect(pkg.scripts['package:electron']).toBeDefined();
    expect(pkg.scripts['dev:electron']).toBeDefined();
    expect(pkg.main).toBe('electron/main.cjs');
  });

  it('5. Valide que les règles .gitignore protègent dist, les zips et les variables locales', () => {
    const gitignore = fs.readFileSync(path.resolve('.gitignore'), 'utf8');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toContain('dist-admin/');
    expect(gitignore).toContain('*.zip');
    expect(gitignore).toContain('.env*');
    expect(gitignore).toContain('!.env.example');
  });
});
