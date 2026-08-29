import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Content Script Build ──────────────────────────────────────────────────
// Chrome content scripts CANNOT use ES module imports (`import ... from`).
// This config bundles content.ts as a single IIFE with ALL dependencies
// inlined — no code splitting, no external chunks.

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe the main build output
    lib: {
      entry: resolve(__dirname, 'src/content/content.ts'),
      formats: ['iife'],
      name: 'SFAContent',
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        // Ensure everything is inlined
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
