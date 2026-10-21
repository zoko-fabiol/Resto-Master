import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const tauriConfigPath = path.resolve(process.cwd(), 'src-tauri', 'tauri.conf.json');

describe('CSP de production Tauri', () => {
  it('exige une CSP explicite sans wildcard default-src', () => {
    const config = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8')) as {
      app?: { security?: { csp?: string | null } };
    };
    const csp = config.app?.security?.csp;

    expect(csp).toEqual(expect.any(String));
    expect(csp).not.toBeNull();
    expect(csp).toMatch(/(^|;\s*)default-src\s+[^;]*'self'/);
    expect(csp).not.toMatch(/(^|;\s*)default-src\s+\*/);
  });
});
