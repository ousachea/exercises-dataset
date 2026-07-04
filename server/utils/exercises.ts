import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Exercise } from '~/types/exercise'

let cache: Exercise[] | null = null
let indexCache: WeakMap<Exercise, string> | null = null

/**
 * Load and cache the full dataset. Files under `data/` ship as Nitro server
 * assets (see nuxt.config), so they are readable even inside serverless
 * bundles (e.g. Netlify functions) where the repo isn't on disk. Any other
 * path given via NUXT_DATA_FILE falls back to a plain filesystem read
 * resolved against the process working directory.
 */
export async function loadExercises(): Promise<Exercise[]> {
  if (cache) return cache
  const { dataFile } = useRuntimeConfig()
  if (dataFile.startsWith('data/')) {
    const asset = await useStorage('assets:data').getItemRaw(dataFile.slice('data/'.length))
    if (asset != null) {
      const text = typeof asset === 'string' ? asset : new TextDecoder().decode(asset)
      cache = JSON.parse(text) as Exercise[]
      return cache
    }
  }
  const path = resolve(process.cwd(), dataFile)
  const raw = await readFile(path, 'utf-8')
  cache = JSON.parse(raw) as Exercise[]
  return cache
}

/** Lowercased search haystack for an exercise (memoised). */
function haystack(ex: Exercise): string {
  indexCache ??= new WeakMap()
  let val = indexCache.get(ex)
  if (val === undefined) {
    val = `${ex.name} ${ex.category} ${ex.target} ${ex.equipment} ${ex.muscle_group}`.toLowerCase()
    indexCache.set(ex, val)
  }
  return val
}

export interface ExerciseQuery {
  q?: string
  category?: string[]
  equipment?: string[]
  target?: string[]
  body_part?: string[]
}

/** Apply search + multi-value filters (OR within a facet, AND across facets). */
export function filterExercises(list: Exercise[], query: ExerciseQuery): Exercise[] {
  const q = query.q?.toLowerCase().trim()
  const cat = query.category
  const equip = query.equipment
  const target = query.target
  const bodyPart = query.body_part

  return list.filter((ex) => {
    if (q && !haystack(ex).includes(q)) return false
    if (cat?.length && !cat.includes(ex.category)) return false
    if (equip?.length && !equip.includes(ex.equipment)) return false
    if (target?.length && !target.includes(ex.target)) return false
    if (bodyPart?.length && !bodyPart.includes(ex.body_part)) return false
    return true
  })
}

/** Parse a query param that may be repeated or comma-separated into a string[]. */
export function toArray(value: unknown): string[] | undefined {
  if (value == null) return undefined
  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}
