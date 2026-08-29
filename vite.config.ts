import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Main Build ────────────────────────────────────────────────────────────
// Builds popup, options (HTML entry points) and background (service worker).
// These all run in extension contexts that support ES modules.
// Content script is built separately via vite.config.content.ts.

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup:      resolve(__dirname, 'public/popup.html'),
        options:    resolve(__dirname, 'public/options.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
