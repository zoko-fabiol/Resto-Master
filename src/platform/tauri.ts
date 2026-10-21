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

export const tauriPlatform: Platform = {
  files: {
    save: async ({ filename, mimeType, data }: SaveFileOptions) => {
      const { invoke } = await loadCore();
      return invoke<{ path: string }>('platform_save_file', {
        filename,
        mimeType,
        data: Array.from(data),
      });
    },
  },
  printing: {
    printRaw: async (data, printerId) => {
      const { invoke } = await loadCore();
      return invoke<{ target: 'native' }>('platform_print_raw', {
        data: Array.from(data),
        printerId,
      });
    },
    printDocument: async (options: PrintDocumentOptions = {}) => {
      const { invoke } = await loadCore();
      return invoke<{ target: 'native' }>('platform_print_document', {
        title: options.title,
        html: options.html,
      });
    },
  },
  clipboard: {
    write: async (text) => {
      const { invoke } = await loadCore();
      await invoke('platform_clipboard_write', { text });
    },
  },
  screen: {
    keepAwake: async (enabled) => {
      const { invoke } = await loadCore();
      await invoke('platform_keep_awake', { enabled });
    },
  },
  links: {
    open: async (url) => {
      const { invoke } = await loadCore();
      await invoke('platform_open_link', { url });
    },
  },
  backButton: {
    subscribe: async (callback) => {
      const { listen } = await loadEvent();
      return listen('tauri://back-button', callback);
    },
  },
};
