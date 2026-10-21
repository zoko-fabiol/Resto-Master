import { tauriPlatform } from './tauri';
import { webPlatform } from './web';
import type { Platform } from './types';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const platform: Platform = isTauri() ? tauriPlatform : webPlatform;

export * from './types';
