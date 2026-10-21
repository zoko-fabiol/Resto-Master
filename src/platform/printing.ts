import { platform } from './index';
import type { PrintDocumentOptions } from './types';

export async function requestDocumentPrint(options: PrintDocumentOptions = {}): Promise<boolean> {
  try {
    await platform.printing.printDocument(options);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('restomaster:platform-error', {
          detail: { operation: 'impression', message },
        })
      );
    }
    return false;
  }
}
