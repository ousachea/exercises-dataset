export interface LoggedSet {
  reps: number
  weight: number // kg; 0 = bodyweight / unweighted
}

export interface WorkoutEntry {
  id: string
  date: string // YYYY-MM-DD (the day the workout was performed)
  exerciseId: string
  name: string
  category?: string
  equipment?: string
  target?: string
  sets: LoggedSet[]
  notes?: string
  loggedAt: string // ISO timestamp of when the record was created
}

export interface Profile {
  age: number | null
  heightCm: number | null
  weightKg: number | null
}

export interface WeighIn {
  date: string // YYYY-MM-DD
  weightKg: number
}

const ENTRIES_KEY = 'nuxt-workout:entries:v1'
const PROFILE_KEY = 'nuxt-workout:profile:v1'
const WEIGHTS_KEY = 'nuxt-workout:weights:v1'

const DEFAULT_PROFILE: Profile = { age: 28, heightCm: 170, weightKg: 83.5 }

/** Local date as YYYY-MM-DD (avoids the UTC shift of toISOString). */
export function todayISODate(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

function makeId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  )
}

/**
 * Personal workout log backed by localStorage. State is shared across the app
 * via useState; localStorage is only touched on the client (SSR-safe).
 */
export function useWorkoutLog() {
  const entries = useState<WorkoutEntry[]>('workout-entries', () => [])
  const profile = useState<Profile>('workout-profile', () => ({ ...DEFAULT_PROFILE }))
  const weighIns = useState<WeighIn[]>('workout-weights', () => [])
  const hydrated = useState<boolean>('workout-hydrated', () => false)

  function load() {
    if (!import.meta.client || hydrated.value) return
    try {
      const rawEntries = localStorage.getItem(ENTRIES_KEY)
      if (rawEntries) {
        const parsed = JSON.parse(rawEntries)
        if (Array.isArray(parsed)) entries.value = parsed
      }
      const rawProfile = localStorage.getItem(PROFILE_KEY)
      if (rawProfile) profile.value = { ...DEFAULT_PROFILE, ...JSON.parse(rawProfile) }
      const rawWeights = localStorage.getItem(WEIGHTS_KEY)
      if (rawWeights) {
        const parsed = JSON.parse(rawWeights)
        if (Array.isArray(parsed)) weighIns.value = parsed
      }
    } catch (err) {
      console.warn('[workout-log] failed to read localStorage', err)
    }
    hydrated.value = true
  }

  function persistEntries() {
    if (!import.meta.client) return
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries.value))
  }

  function persistProfile() {
    if (!import.meta.client) return
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
  }

  function addEntry(entry: Omit<WorkoutEntry, 'id' | 'loggedAt'>): WorkoutEntry {
    const full: WorkoutEntry = { ...entry, id: makeId(), loggedAt: new Date().toISOString() }
    // Newest first
    entries.value = [full, ...entries.value]
    persistEntries()
    return full
  }

  function deleteEntry(id: string) {
    entries.value = entries.value.filter((e) => e.id !== id)
    persistEntries()
  }

  function updateProfile(patch: Partial<Profile>) {
    profile.value = { ...profile.value, ...patch }
    persistProfile()
  }

  function persistWeighIns() {
    if (!import.meta.client) return
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weighIns.value))
  }

  /** Record body weight for a date (one entry per day — same-day logs overwrite). */
  function addWeighIn(date: string, weightKg: number) {
    const next = weighIns.value.filter((w) => w.date !== date)
    next.push({ date, weightKg })
    next.sort((a, b) => (a.date < b.date ? -1 : 1))
    weighIns.value = next
    persistWeighIns()
    // Keep the profile's current weight (and BMI) in sync with the latest weigh-in
    const latest = next[next.length - 1]
    if (latest) updateProfile({ weightKg: latest.weightKg })
  }

  function deleteWeighIn(date: string) {
    weighIns.value = weighIns.value.filter((w) => w.date !== date)
    persistWeighIns()
  }

  /** Restore a backup produced by the log page's Export button. */
  function importAll(data: { entries?: unknown; profile?: unknown; weighIns?: unknown }) {
    if (Array.isArray(data.entries)) {
      entries.value = data.entries as WorkoutEntry[]
      persistEntries()
    }
    if (data.profile && typeof data.profile === 'object') {
      profile.value = { ...DEFAULT_PROFILE, ...(data.profile as Partial<Profile>) }
      persistProfile()
    }
    if (Array.isArray(data.weighIns)) {
      weighIns.value = data.weighIns as WeighIn[]
      persistWeighIns()
    }
  }

  // ── Derived stats ──────────────────────────────────────
  const bmi = computed(() => {
    const { heightCm, weightKg } = profile.value
    if (!heightCm || !weightKg) return null
    const m = heightCm / 100
    return weightKg / (m * m)
  })

  function setVolume(set: LoggedSet): number {
    return (set.reps || 0) * (set.weight || 0)
  }

  function entryVolume(entry: WorkoutEntry): number {
    return entry.sets.reduce((sum, s) => sum + setVolume(s), 0)
  }

  const totalVolume = computed(() =>
    entries.value.reduce((sum, e) => sum + entryVolume(e), 0)
  )

  /** Distinct workout days in the current ISO-ish week (last 7 days inclusive). */
  const workoutsThisWeek = computed(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 6)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const days = new Set(
      entries.value.filter((e) => e.date >= cutoffStr).map((e) => e.date)
    )
    return days.size
  })

  const totalDays = computed(() => new Set(entries.value.map((e) => e.date)).size)

  /** Entries grouped by date, newest date first. */
  const byDate = computed(() => {
    const groups = new Map<string, WorkoutEntry[]>()
    for (const e of entries.value) {
      const arr = groups.get(e.date) ?? []
      arr.push(e)
      groups.set(e.date, arr)
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items,
        volume: items.reduce((s, e) => s + entryVolume(e), 0)
      }))
  })

  return {
    entries,
    profile,
    hydrated,
    load,
    addEntry,
    deleteEntry,
    updateProfile,
    weighIns,
    addWeighIn,
    deleteWeighIn,
    importAll,
    bmi,
    entryVolume,
    totalVolume,
    workoutsThisWeek,
    totalDays,
    byDate
  }
}
