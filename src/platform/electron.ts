import type {
  Platform,
  PrintDocumentOptions,
  SaveFileOptions,
} from './types';

export interface ElectronAPIResponse<T = Record<string, unknown>> {
  ok: boolean;
  error?: string;
  path?: string;
  printers?: Array<{ name: string; isDefault: boolean }>;
  [key: string]: unknown;
}

export interface ElectronAPI {
  saveFile(filename: string, data: Uint8Array): Promise<ElectronAPIResponse<{ path: string }>>;
  printTcp(
    host: string,
    port: number,
    bytes: number[],
    timeoutMs?: number
  ): Promise<ElectronAPIResponse>;
  printWindows(printerName: string, bytes: number[]): Promise<ElectronAPIResponse>;
  listPrinters(): Promise<ElectronAPIResponse<{ printers: Array<{ name: string; isDefault: boolean }> }>>;
  openLink(url: string): Promise<ElectronAPIResponse>;
  writeClipboard(text: string): Promise<ElectronAPIResponse>;
  keepAwake(enabled: boolean): Promise<ElectronAPIResponse>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

export const electronPlatform: Platform = {
  files: {
    save: async ({ filename, data }: SaveFileOptions) => {
      if (!window.electronAPI) {
        throw new Error('API Electron non disponible.');
      }
      const res = await window.electronAPI.saveFile(filename, data);
      if (!res.ok) {
        throw new Error(res.error || 'Erreur lors de l’enregistrement du fichier.');
      }
      return { path: res.path || filename };
    },
  },
  printing: {
    printRaw: async (data, target) => {
      if (!window.electronAPI) {
        throw new Error('API Electron non disponible.');
      }
      if (target?.host) {
        const res = await window.electronAPI.printTcp(
          target.host,
          target.port ?? 9100,
          Array.from(data)
        );
        if (!res.ok) {
          throw new Error(res.error || 'Erreur lors de l’impression TCP.');
        }
        return { target: 'native' };
      }
      if (target?.printerId) {
        const res = await window.electronAPI.printWindows(target.printerId, Array.from(data));
        if (!res.ok) {
          throw new Error(res.error || 'Erreur lors de l’impression Windows.');
        }
        return { target: 'native' };
      }
      throw new Error('Aucune cible d’impression native n’est configurée.');
    },
    printDocument: async (options: PrintDocumentOptions = {}) => {
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        throw new Error('L’impression système n’est pas disponible dans cette fenêtre Electron.');
      }
      const previousTitle = document.title;
      if (options.title) document.title = options.title;
      try {
        window.print();
      } finally {
        document.title = previousTitle;
      }
      return { target: 'system' };
    },
  },
  clipboard: {
    write: async (text: string) => {
      if (window.electronAPI) {
        const res = await window.electronAPI.writeClipboard(text);
        if (!res.ok) throw new Error(res.error || 'Erreur d’écriture dans le presse-papiers.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    },
  },
  screen: {
    keepAwake: async (enabled: boolean) => {
      if (window.electronAPI) {
        await window.electronAPI.keepAwake(enabled);
      } else if (enabled && 'wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => undefined, { once: true });
      }
    },
  },
  links: {
    open: async (url: string) => {
      if (window.electronAPI) {
        const res = await window.electronAPI.openLink(url);
        if (!res.ok) throw new Error(res.error || 'Erreur lors de l’ouverture du lien.');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
  },
  backButton: {
    subscribe: async () => () => undefined,
  },
};
