import type { Exercise } from '~/types/exercise'

/**
 * Resolve the media (thumbnail/animation) URL for an exercise.
 *
 * The original media is NOT bundled with this repository. When a record has an
 * explicit `image`/`gif_url` we use it; otherwise we build a URL from
 * `NUXT_PUBLIC_MEDIA_BASE` plus the record key named by `NUXT_PUBLIC_MEDIA_KEY`
 * (`id` for the numeric-id mirror, `media_id` for the original ExerciseDB CDN).
 * Set NUXT_PUBLIC_MEDIA_BASE='' to disable this and render placeholders instead.
 */
export function useMedia() {
  const { public: pub } = useRuntimeConfig()
  const base = ((pub.mediaBase as string) || '').replace(/\/$/, '')
  const key = (pub.mediaKey as 'id' | 'media_id') || 'id'

  function built(ex: Pick<Exercise, 'id' | 'media_id'>): string | null {
    const ref = ex[key]
    return base && ref ? `${base}/${ref}.gif` : null
  }

  function gifUrl(ex: Pick<Exercise, 'id' | 'gif_url' | 'image' | 'media_id'>): string | null {
    if (ex.gif_url) return ex.gif_url
    if (ex.image) return ex.image
    return built(ex)
  }

  /** Static thumbnail URL — prefers an explicit image, then the built media URL. */
  function thumbUrl(ex: Pick<Exercise, 'id' | 'gif_url' | 'image' | 'media_id'>): string | null {
    if (ex.image) return ex.image
    return built(ex) ?? ex.gif_url ?? null
  }

  return { gifUrl, thumbUrl }
}
