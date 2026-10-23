import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const tauriConfigPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.conf.json');
const electronMainPath = path.resolve(process.cwd(), 'electron', 'main.cjs');

describe('CSP de production Desktop (Electron & Tauri)', () => {
  it('exige une CSP explicite sans wildcard default-src', () => {
    let csp = '';

    if (fs.existsSync(electronMainPath)) {
      const electronCode = fs.readFileSync(electronMainPath, 'utf8');
      const match = electronCode.match(/const PRODUCTION_CSP\s*=\s*\[([\s\S]*?)\]\.join/);
      if (match) {
        csp = match[1];
      }
    } else if (fs.existsSync(tauriConfigPath)) {
      const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8')) as {
        app?: { security?: { csp?: string | null } };
      };
      csp = config.app?.security?.csp || '';
    }

    expect(csp).toBeTruthy();
    expect(csp).toMatch(/(^|['";\s])default-src\s+[^;]*'self'/);
    expect(csp).not.toMatch(/(^|['";\s])default-src\s+\*/);
  });
});
