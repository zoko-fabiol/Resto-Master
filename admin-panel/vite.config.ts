import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    root: __dirname,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../shared/types'),
      },
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    build: {
      outDir: path.resolve(__dirname, '../dist-admin'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
    },
  };
});
