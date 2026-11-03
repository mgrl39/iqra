/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Rutas relativas: funciona en cualquier subcarpeta (GitHub Pages, Netlify…)
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Iqra — aprende a leer el Corán',
        short_name: 'Iqra',
        description: 'Aprende a leer árabe coránico desbloqueando palabras reales.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#06070b',
        background_color: '#06070b',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30 } },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    environment: 'node',
  },
})
