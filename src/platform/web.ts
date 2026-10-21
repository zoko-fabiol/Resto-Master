import type {
  Platform,
  PrintDocumentOptions,
  SaveFileOptions,
} from './types';

function downloadFile({ filename, mimeType, data }: SaveFileOptions): Promise<{ path: string }> {
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return Promise.reject(new Error('La sauvegarde de fichier n’est pas disponible dans cet environnement.'));
  }

  const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return Promise.resolve({ path: filename });
}

async function printDocument(options: PrintDocumentOptions = {}) {
  if (typeof window === 'undefined' || typeof window.print !== 'function') {
    throw new Error('L’impression système n’est pas disponible dans cet environnement.');
  }

  const previousTitle = document.title;
  if (options.title) document.title = options.title;
  try {
    window.print();
  } finally {
    document.title = previousTitle;
  }
  return { target: 'system' as const };
}

export const webPlatform: Platform = {
  files: {
    save: downloadFile,
  },
  printing: {
    printRaw: async () => {
      throw new Error('L’impression brute nécessite l’application Tauri ou une imprimante navigateur compatible.');
    },
    printDocument,
  },
  clipboard: {
    write: async (text) => {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Le presse-papiers n’est pas disponible dans ce navigateur.');
      }
      await navigator.clipboard.writeText(text);
    },
  },
  screen: {
    keepAwake: async (enabled) => {
      if (!enabled || !('wakeLock' in navigator)) return;
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => undefined, { once: true });
    },
  },
  links: {
    open: async (url) => {
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!openedWindow) throw new Error('Le navigateur a bloqué l’ouverture du lien.');
    },
  },
  backButton: {
    subscribe: async () => () => undefined,
  },
};
