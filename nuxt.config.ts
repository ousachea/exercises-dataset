// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  devServer: {
    port: 4000,
  },
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'ExerciseDB — Workout Tracker',
      short_name: 'ExerciseDB',
      description: 'Exercise library and personal workout log with a weekly weight-loss plan.',
      theme_color: '#ff4f00',
      background_color: '#f4f4f5',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      navigateFallback: null,
      runtimeCaching: [
        {
          // Visited pages (SSR HTML) — fresh when online, cached copy offline
          urlPattern: /^https?:\/\/[^/]+\/(log|setup)?$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'pages',
            expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 3600 }
          }
        },
        {
          // Exercise data API
          urlPattern: /\/api\/(exercises|filters)/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api',
            expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 }
          }
        },
        {
          // Exercise GIFs from the CDN mirror
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'exercise-media',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 24 * 3600 },
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    }
  },
  nitro: {
    // Bundle the dataset into the server build so API routes can read it on
    // serverless hosts (Netlify/Vercel) where the repo isn't on disk.
    serverAssets: [{ baseName: 'data', dir: '../data' }]
  },
  runtimeConfig: {
    // Path to the dataset, read by server routes. Override with NUXT_DATA_FILE.
    dataFile: 'data/exercises.json',
    public: {
      // Base URL used to build exercise media URLs. The original media is NOT
      // bundled with this repo. The documented ExerciseDB CDN
      // (static.exercisedb.dev/media/{media_id}.gif) is currently unresolvable,
      // so we default to a globally-reachable community mirror on jsDelivr that
      // is keyed by each record's numeric `id`. Override with
      // NUXT_PUBLIC_MEDIA_BASE, or set to '' to disable media entirely.
      mediaBase: 'https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets',
      // Which record field forms the media filename: 'id' (numeric, for the
      // mirror above) or 'media_id' (hash, for static.exercisedb.dev).
      mediaKey: 'id'
    }
  },
  app: {
    head: {
      title: 'ExerciseDB — Exercise Library',
      link: [{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#ff4f00' },
        {
          name: 'description',
          content:
            'Browse 1,324 fitness exercises with multilingual instructions, filters and a developer setup guide.'
        }
      ]
    }
  }
})
