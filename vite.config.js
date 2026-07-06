import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5183,
    strictPort: true,
  },
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
});
