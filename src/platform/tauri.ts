import type {
  Platform,
  PrintDocumentOptions,
  SaveFileOptions,
} from './types';

interface TauriCore {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

interface TauriEvent {
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void>;
}

async function loadCore(): Promise<TauriCore> {
  return import('@tauri-apps/api/core');
}

async function loadEvent(): Promise<TauriEvent> {
  return import('@tauri-apps/api/event');
}

async function saveWithNativeDialog({ filename, mimeType, data }: SaveFileOptions) {
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const extension = filename.includes('.') ? filename.split('.').pop() ?? '' : '';
  const path = await save({
    defaultPath: filename,
    filters: extension ? [{ name: mimeType, extensions: [extension] }] : undefined,
  });
  if (!path) {
    throw new Error('Enregistrement annulé par l’utilisateur.');
  }
  await writeFile(path, data);
  return { path };
}

export const tauriPlatform: Platform = {
  files: {
    save: saveWithNativeDialog,
  },
  printing: {
    printRaw: async (data, target) => {
      const { invoke } = await loadCore();
      if (target?.host) {
        return invoke<{ target: 'native' }>('print_tcp', {
          host: target.host,
          port: target.port ?? 9100,
          bytes: Array.from(data),
        });
      }
      throw new Error(
        target?.printerId
          ? `L’impression brute par nom d’imprimante (${target.printerId}) n’est pas encore disponible dans cette version.`
          : 'Aucune cible d’impression native n’est configurée.'
      );
    },
    printDocument: async (options: PrintDocumentOptions = {}) => {
      if (typeof window === 'undefined' || typeof window.print !== 'function') {
        throw new Error('L’impression système n’est pas disponible dans cette fenêtre Tauri.');
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
    write: async (text) => {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(text);
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
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    },
  },
  backButton: {
    subscribe: async (callback) => {
      const { listen } = await loadEvent();
      return listen('tauri://back-button', callback);
    },
  },
};
