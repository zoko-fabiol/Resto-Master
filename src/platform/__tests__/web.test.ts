import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webPlatform } from '../web';

describe('Plateforme web', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('déclenche l’impression système pour un document', async () => {
    const print = vi.fn();
    vi.stubGlobal('window', { print });
    vi.stubGlobal('document', { title: 'RestoMaster OS' });

    await expect(webPlatform.printing.printDocument({ title: 'Ticket' })).resolves.toEqual({
      target: 'system',
    });

    expect(print).toHaveBeenCalledOnce();
    expect(document.title).not.toBe('Ticket');
  });

  it('refuse l’impression brute sans adaptateur natif', async () => {
    await expect(webPlatform.printing.printRaw(new Uint8Array([1]))).rejects.toThrow(
      'nécessite l’application Tauri'
    );
  });

  it('écrit dans le presse-papiers du navigateur', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await webPlatform.clipboard.write('copie');

    expect(writeText).toHaveBeenCalledWith('copie');
  });
});
