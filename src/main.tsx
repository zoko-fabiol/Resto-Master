import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import './index.css';

function clearStaleDesktopCaches(): void {
  const isDesktop = import.meta.env.MODE === 'tauri' || import.meta.env.MODE === 'electron';
  if (!isDesktop || typeof window === 'undefined') return;
  const cacheKey = `restomaster:desktop-cache-cleaned:${__BUILD_ID__}`;
  if (window.localStorage.getItem(cacheKey)) return;

  void (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
      window.localStorage.setItem(cacheKey, '1');
    } catch (error) {
      console.warn('[RestoMaster OS] Nettoyage du cache Desktop incomplet.', error);
    }
  })();
}

clearStaleDesktopCaches();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
