import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDist } from '../../scripts/check-dist';
import { mapCloudFunctionError } from '../services/functions/cloudFunctionsService';

const temporaryDirectories: string[] = [];

function createFixture(files: Record<string, string>, env = { VITE_USE_CLOUD_FUNCTIONS: 'true' }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'restomaster-dist-'));
  temporaryDirectories.push(rootDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, 'dist', relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  return { rootDir, env };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('Contrôles du pipeline Tauri', () => {
  it('refuse les anciens messages et les service workers en mode Tauri', () => {
    const fixture = createFixture({
      'assets/cloudFunctionsService-one.js': 'export const ok = true;',
      'sw.js': 'old cache',
    });
    const failures = checkDist({ ...fixture, mode: 'tauri' });
    expect(failures.join('\n')).toContain('service workers');
  });

  it('refuse plusieurs chunks du service Cloud Functions', () => {
    const fixture = createFixture({
      'assets/cloudFunctionsService-one.js': 'one',
      'assets/cloudFunctionsService-two.js': 'two',
    });
    const failures = checkDist({ ...fixture, mode: 'tauri' });
    expect(failures.join('\n')).toContain('chunks cloudFunctionsService-*');
  });

  it('mappe les erreurs Firebase sans perdre leur code technique', () => {
    expect(mapCloudFunctionError({ code: 'functions/not-found' })).toEqual({
      code: 'functions/not-found',
      message: "Le service d'inscription n'est pas déployé sur ce projet. Contactez le support.",
    });
    expect(mapCloudFunctionError({ code: 'functions/invalid-argument', message: 'Champ invalide.' })).toEqual({
      code: 'functions/invalid-argument',
      message: 'Champ invalide.',
    });
  });
});
