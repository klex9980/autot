/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // App installabile sul telefono e utilizzabile offline (i dati sono già nel browser)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icona.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Confronto Auto Usate',
        short_name: 'Auto Usate',
        description: 'Confronta annunci di auto usate in base al motore',
        lang: 'it',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f4f6f9',
        theme_color: '#1f4e79',
        icons: [
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] },
    }),
  ],
  // percorsi relativi: l'app funziona anche se pubblicata in una sottocartella (es. GitHub Pages)
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
