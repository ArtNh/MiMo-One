// vite.web.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Exclude vendor and node_modules from pre‑bundling / bundling
  optimizeDeps: {
    exclude: ['src/vendor/**', 'node_modules/**'],
  },
  resolve: {
    // Prevent Vite from trying to resolve imports that live in the vendor folder
    alias: {
      '@mimo-ai': '/src/vendor/mimo-code/packages/mimo-ai',
    },
  },
  // Explicitly mark vendor files as external for Rollup
  build: {
    rollupOptions: {
      external: [/^src\/vendor\//],
    },
  },
});
