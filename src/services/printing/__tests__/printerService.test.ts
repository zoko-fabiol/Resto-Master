import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrinterService } from '../printerService';
import type { Peripheral } from '../../../types/configuration';

const networkPrinter: Peripheral = {
  id: 'network-printer',
  name: 'Imprimante réseau',
  type: 'imprimante_ticket',
  connectionType: 'reseau_ip',
  address: '192.168.1.50',
  port: 9100,
  outletId: 'outlet-test',
  active: true,
};

describe('PrinterService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transmet les octets au pont navigateur et confirme uniquement une réponse HTTP réussie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new PrinterService().sendRawToPrinter(
      networkPrinter,
      new Uint8Array([27, 64])
    );

    expect(result).toEqual({
      success: true,
      message: expect.stringContaining('192.168.1.50:9100'),
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('refuse un ticket vide avant tout transport', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await new PrinterService().sendRawToPrinter(networkPrinter, new Uint8Array());

    expect(result.success).toBe(false);
    expect(result.message).toContain('ticket');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('expose la cause du refus HTTP du pont navigateur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const result = await new PrinterService().sendRawToPrinter(
      networkPrinter,
      new Uint8Array([1])
    );

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining('HTTP 503'),
    });
  });
});
