// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  devServer: {
    port: 4000,
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
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
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Browse 1,324 fitness exercises with multilingual instructions, filters and a developer setup guide.'
        }
      ]
    }
  }
})
