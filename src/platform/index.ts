import { electronPlatform, isElectron } from './electron';
import { tauriPlatform } from './tauri';
import { webPlatform } from './web';
import type { Platform } from './types';

export { isElectron } from './electron';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function isDesktop(): boolean {
  return isElectron() || isTauri();
}

export const platform: Platform = isElectron()
  ? electronPlatform
  : isTauri()
    ? tauriPlatform
    : webPlatform;

export * from './types';

