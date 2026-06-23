import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `SINGLEFILE=1 vite build` inlines all JS + CSS into a single index.html.
// Locales are bundled into the JS (see src/i18n.ts), so the output is fully
// self-contained — the only runtime externals are the Google Fonts <link>s.
// (An env flag instead of `--mode` keeps .env.production loading intact.)
const singlefile = !!process.env.SINGLEFILE;

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(singlefile ? [viteSingleFile()] : [])],
  // Dev: mirror the production nginx reverse proxy — the SPA talks to the Go
  // bridge same-origin at /bridge, stripped to hit the bridge on :8080.
  server: {
    proxy: {
      '/bridge': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/bridge/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@type/': fileURLToPath(new URL('./src/types/', import.meta.url)),
      '@store/': fileURLToPath(new URL('./src/store/', import.meta.url)),
      '@hooks/': fileURLToPath(new URL('./src/hooks/', import.meta.url)),
      '@constants/': fileURLToPath(new URL('./src/constants/', import.meta.url)),
      '@api/': fileURLToPath(new URL('./src/api/', import.meta.url)),
      '@components/': fileURLToPath(new URL('./src/components/', import.meta.url)),
      '@pages/': fileURLToPath(new URL('./src/pages/', import.meta.url)),
      '@utils/': fileURLToPath(new URL('./src/utils/', import.meta.url)),
      '@src/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  // Relative asset paths only make sense for the single-file build (opened via file://).
  base: singlefile ? './' : '/',
});
