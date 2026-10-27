/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH is the sub-folder when hosted under one (e.g. GitHub Pages: BASE_PATH=/mi-repo/). Defaults to '/'.
let base = process.env.BASE_PATH || '/';
// Git Bash on Windows rewrites "/repo/" into "C:/Program Files/Git/repo/": fail loudly instead of building a broken app.
if (/^\/?[A-Za-z]:[\/]/.test(base)) {
  throw new Error(
    `BASE_PATH inválido ("${base}"). En Git Bash usa MSYS_NO_PATHCONV=1, o usa PowerShell: $env:BASE_PATH='/repo/'; npm run build`,
  );
}
if (!base.startsWith('/')) base = `/${base}`;
if (!base.endsWith('/')) base = `${base}/`;

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false, // the glob below already precaches public/*.png
      injectRegister: 'auto',
      // Everything in public/ is already precached by the glob below.
      manifest: {
        name: 'Calculadora de precios · Pastelería',
        short_name: 'Precios',
        description: 'Calcula en cuánto vender tus pasteles y postres.',
        lang: 'es-MX',
        // Stable identity: does not change if start_url does.
        id: base,
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#F4F1EC',
        theme_color: '#B0245A',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
