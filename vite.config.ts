import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function whatsappGatewayPlugin() {
  return {
    name: 'whatsapp-embedded-gateway-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/whatsapp/qr') {
          try {
            const { getGatewayQr } = await import('./server/whatsappGateway.js');
            const data = getGatewayQr();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (url === '/api/whatsapp/status') {
          try {
            const { getGatewayStatus } = await import('./server/whatsappGateway.js');
            const data = getGatewayStatus();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        if (url === '/api/whatsapp/send' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { sendGatewayMessage } = await import('./server/whatsappGateway.js');
              const parsed = JSON.parse(body || '{}');
              const result = await sendGatewayMessage(parsed.to, parsed.message || parsed.text);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: err.message }));
            }
          });
          return;
        }

        if (url === '/api/whatsapp/disconnect' && req.method === 'POST') {
          try {
            const { disconnectGateway } = await import('./server/whatsappGateway.js');
            const result = await disconnectGateway();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isDesktopBuild = mode === 'tauri' || mode === 'electron';
  return {
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', 'tests/rules/**'],
    },
    base: isDesktopBuild ? './' : '/',
    define: {
      __BUILD_ID__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      react(),
      tailwindcss(),
      whatsappGatewayPlugin(),
      ...(!isDesktopBuild ? [VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'maskable-icon-512x512.png',
        ],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      })] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, './shared/types'),
      },
    },
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase/')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/docx/')) {
              return 'vendor-docx';
            }
            if (id.includes('node_modules/xlsx-js-style/')) {
              return 'vendor-excel';
            }
            if (
              id.includes('node_modules/jspdf/') ||
              id.includes('node_modules/jspdf-autotable/') ||
              id.includes('node_modules/html2canvas/')
            ) {
              return 'vendor-pdf-export';
            }
            if (
              id.includes('node_modules/chart.js/') ||
              id.includes('node_modules/react-chartjs-2/')
            ) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (
              id.includes('node_modules/motion/') ||
              id.includes('node_modules/canvas-confetti/')
            ) {
              return 'vendor-fx';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api-ultramsg': {
          target: 'https://api.ultramsg.com',
          changeOrigin: true,
          secure: true,
          rewrite: (pathStr: string) => pathStr.replace(/^\/api-ultramsg/, ''),
        },
      },
    },
  };
});
