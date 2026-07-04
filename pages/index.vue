<script setup lang="ts">
import type { Exercise, FilterOptions, PagedResult } from '~/types/exercise'

const PAGE_SIZE = 60

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
  tr: 'Türkçe',
  ru: 'Русский',
  zh: '简体中文'
}
const LANG_ORDER = ['en', 'es', 'it', 'tr', 'ru', 'zh'] as const

const { gifUrl, thumbUrl } = useMedia()
const { addEntry, load: loadLog } = useWorkoutLog()
onMounted(loadLog)

// ── Filter options (SSR) ──────────────────────────────
const { data: filterData } = await useFetch<FilterOptions>('/api/filters')
const categories = computed(() => filterData.value?.categories ?? [])
const equipment = computed(() => filterData.value?.equipment ?? [])
const targets = computed(() => filterData.value?.targets ?? [])
const grandTotal = computed(() => filterData.value?.total ?? 0)

// ── State ─────────────────────────────────────────────
// Support /?q=… deep links (e.g. from the workout plan on /log)
const route = useRoute()
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selected = reactive({
  category: new Set<string>(),
  equipment: new Set<string>(),
  target: new Set<string>()
})
type FacetKey = keyof typeof selected

const items = ref<Exercise[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const loading = ref(true)
const hovered = reactive(new Set<string>())
const filtersOpen = ref(false)

const hasMore = computed(() => page.value < totalPages.value)

function facetParam(set: Set<string>): string | undefined {
  return set.size ? [...set].join(',') : undefined
}

let reqToken = 0
async function fetchExercises(reset: boolean) {
  if (reset) page.value = 1
  const token = ++reqToken
  loading.value = true
  try {
    const res = await $fetch<PagedResult<Exercise>>('/api/exercises', {
      params: {
        page: page.value,
        limit: PAGE_SIZE,
        q: search.value.trim() || undefined,
        category: facetParam(selected.category),
        equipment: facetParam(selected.equipment),
        target: facetParam(selected.target)
      }
    })
    if (token !== reqToken) return // a newer request superseded this one
    items.value = reset ? res.data : [...items.value, ...res.data]
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    if (token === reqToken) loading.value = false
  }
}

function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1
  fetchExercises(false)
}

// ── Filtering interactions ────────────────────────────
function toggleFacet(key: FacetKey, value: string) {
  const set = selected[key]
  if (set.has(value)) set.delete(value)
  else set.add(value)
  fetchExercises(true)
}

const activeBadges = computed(() =>
  (['category', 'equipment', 'target'] as FacetKey[]).flatMap((key) =>
    [...selected[key]].map((value) => ({ key, value }))
  )
)

function removeBadge(key: FacetKey, value: string) {
  selected[key].delete(value)
  fetchExercises(true)
}

function clearAll() {
  selected.category.clear()
  selected.equipment.clear()
  selected.target.clear()
  search.value = ''
  fetchExercises(true)
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchExercises(true), 250)
})

// ── Modal ─────────────────────────────────────────────
const active = ref<Exercise | null>(null)
const activeLang = ref<string>('en')

const activeLangs = computed(() => {
  const ex = active.value
  if (!ex) return []
  return LANG_ORDER.map((code) => ({
    code,
    steps: ex.instruction_steps?.[code] ?? []
  })).filter((l) => l.steps.length > 0)
})

const secondaryMuscles = computed(() => {
  const ex = active.value
  if (!ex) return []
  const raw = ex.secondary_muscles?.length
    ? ex.secondary_muscles
    : ex.muscle_group
      ? [ex.muscle_group]
      : []
  return raw.filter((m) => m !== ex.target)
})

function openModal(ex: Exercise) {
  active.value = ex
  activeLang.value = LANG_ORDER.find((c) => (ex.instruction_steps?.[c]?.length ?? 0) > 0) ?? 'en'
  resetLogForm()
}
function closeModal() {
  active.value = null
}

// ── Workout logging (inside modal) ────────────────────
const logOpen = ref(false)
const logDate = ref(todayISODate())
const logNotes = ref('')
const logSets = ref<{ reps: number | null; weight: number | null }[]>([{ reps: null, weight: null }])
const logSaved = ref(false)

function resetLogForm() {
  logOpen.value = false
  logDate.value = todayISODate()
  logNotes.value = ''
  logSets.value = [{ reps: null, weight: null }]
  logSaved.value = false
}
function addSetRow() {
  const last = logSets.value[logSets.value.length - 1]
  logSets.value.push({ reps: last?.reps ?? null, weight: last?.weight ?? null })
}
function removeSetRow(i: number) {
  if (logSets.value.length > 1) logSets.value.splice(i, 1)
}
const canSaveLog = computed(() =>
  logSets.value.some((s) => (s.reps ?? 0) > 0)
)
function saveLog() {
  const ex = active.value
  if (!ex || !canSaveLog.value) return
  const sets = logSets.value
    .filter((s) => (s.reps ?? 0) > 0)
    .map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 }))
  addEntry({
    date: logDate.value || todayISODate(),
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    equipment: ex.equipment,
    target: ex.target,
    sets,
    notes: logNotes.value.trim() || undefined
  })
  logSaved.value = true
  logOpen.value = false
}

watch([active, filtersOpen], ([ex, open]) => {
  if (import.meta.client) {
    document.body.style.overflow = ex || open ? 'hidden' : ''
  }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (active.value) closeModal()
  else filtersOpen.value = false
}

// Hide a broken image (e.g. the one exercise the mirror is missing) so the
// gray media placeholder shows through instead of a broken-image icon.
function hideImg(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}

// ── Infinite scroll ───────────────────────────────────
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  fetchExercises(true)
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMore()
    },
    { rootMargin: '200px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(searchTimer)
  document.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})

const resultsLabel = computed(() =>
  total.value === grandTotal.value
    ? `${grandTotal.value.toLocaleString()} exercises`
    : `${total.value.toLocaleString()} of ${grandTotal.value.toLocaleString()} exercises`
)
</script>

<template>
  <div class="app-shell">
    <!-- Mobile top bar -->
    <header class="mobile-topbar">
      <div class="mobile-topbar-row">
        <div class="sidebar-logo">Exercise<span>DB</span></div>
        <div class="sidebar-header-actions">
          <NuxtLink class="db-setup-btn accent" to="/log" title="My Workout Log">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 2.5h6.5L13 5v8.5H4z" />
              <path d="M6 6.5h5M6 9h5M6 11.5h3" />
            </svg>
            My Log
          </NuxtLink>        </div>
      </div>
      <div class="mobile-topbar-row">
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10.5 10.5L14 14" stroke-linecap="round" />
          </svg>
          <input v-model="search" type="search" class="search-box" placeholder="Search exercises…" autocomplete="off" />
          <button v-show="search" class="search-clear visible" aria-label="Clear search" @click="search = ''">×</button>
        </div>
        <button class="filter-toggle" :class="{ engaged: activeBadges.length }" @click="filtersOpen = true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3.5h12M4.5 8h7M7 12.5h2" />
          </svg>
          Filters
          <span v-if="activeBadges.length" class="filter-toggle-count">{{ activeBadges.length }}</span>
        </button>
      </div>
    </header>

    <!-- Drawer backdrop (mobile) -->
    <div class="drawer-backdrop" :class="{ open: filtersOpen }" @click="filtersOpen = false" />

    <!-- Sidebar -->
    <aside class="sidebar thin-scroll" :class="{ open: filtersOpen }">
      <div class="drawer-head">
        <span class="drawer-title">Filters</span>
        <button class="modal-close" aria-label="Close filters" @click="filtersOpen = false">✕</button>
      </div>
      <div class="sidebar-header">
        <div class="sidebar-logo">Exercise<span>DB</span></div>
        <div class="sidebar-header-actions">
          <NuxtLink class="db-setup-btn accent" to="/log" title="My Workout Log">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 2.5h6.5L13 5v8.5H4z" />
              <path d="M6 6.5h5M6 9h5M6 11.5h3" />
            </svg>
            My Log
          </NuxtLink>        </div>
      </div>

      <div class="sidebar-body">
        <!-- Search -->
        <div class="search-wrapper">
          <svg class="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10.5 10.5L14 14" stroke-linecap="round" />
          </svg>
          <input v-model="search" type="search" class="search-box" placeholder="Search exercises…" autocomplete="off" />
          <button v-show="search" class="search-clear visible" aria-label="Clear search" @click="search = ''">×</button>
        </div>

        <FilterSection title="Category" :values="categories" :active="selected.category" @toggle="(v) => toggleFacet('category', v)" />
        <FilterSection title="Equipment" :values="equipment" :active="selected.equipment" :initial-limit="10" @toggle="(v) => toggleFacet('equipment', v)" />
        <FilterSection title="Target Muscle" :values="targets" :active="selected.target" @toggle="(v) => toggleFacet('target', v)" />
      </div>
      <div class="drawer-footer">
        <button class="drawer-apply" @click="filtersOpen = false">
          Show {{ total.toLocaleString() }} exercise{{ total === 1 ? '' : 's' }}
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="main-content thin-scroll">
      <div class="results-bar">
        <div class="active-filters">
          <span v-for="b in activeBadges" :key="`${b.key}:${b.value}`" class="active-badge">
            {{ b.value }}
            <button class="active-badge-remove" :aria-label="`Remove ${b.value}`" @click="removeBadge(b.key, b.value)">×</button>
          </span>
          <button v-if="activeBadges.length" class="clear-all" @click="clearAll">Clear all</button>
        </div>
        <span class="results-count">{{ resultsLabel }}</span>
      </div>

      <div class="grid-wrapper">
        <div class="exercise-grid">
          <template v-if="loading && items.length === 0">
            <div v-for="n in 18" :key="n" class="skeleton-card">
              <div class="skeleton-media" />
              <div class="skeleton-body">
                <div class="skeleton-line" />
                <div class="skeleton-line short" />
              </div>
            </div>
          </template>

          <div v-else-if="items.length === 0" class="empty-state">
            <p>🔍</p>
            <p>No exercises found</p>
          </div>

          <article
            v-for="ex in items"
            :key="ex.id"
            class="exercise-card"
            @mouseenter="hovered.add(ex.id)"
            @click="openModal(ex)"
          >
            <div class="card-media">
              <img v-if="thumbUrl(ex)" class="card-thumb" :src="thumbUrl(ex)!" :alt="ex.name" loading="lazy" @error="hideImg" />
              <img v-if="hovered.has(ex.id) && gifUrl(ex)" class="card-gif" :src="gifUrl(ex)!" alt="" @error="hideImg" />
            </div>
            <div class="card-body">
              <h3 class="card-name">{{ ex.name }}</h3>
              <div class="card-tags">
                <span class="tag tag-cat">{{ ex.category }}</span>
                <span class="tag tag-equip">{{ ex.equipment }}</span>
              </div>
            </div>
          </article>
        </div>

        <div ref="sentinel" class="load-sentinel">
          <div class="load-spinner" :class="{ visible: loading && items.length > 0 }" />
        </div>
      </div>
    </main>

    <!-- Modal -->
    <div class="modal-overlay" :class="{ open: active }" role="dialog" aria-modal="true" @click.self="closeModal">
      <div v-if="active" class="modal-panel thin-scroll">
        <div class="modal-header">
          <h2 class="modal-title">{{ active.name }}</h2>
          <button class="modal-close" aria-label="Close" @click="closeModal">✕</button>
        </div>

        <div class="modal-media">
          <img v-if="gifUrl(active)" class="modal-gif" :src="gifUrl(active)!" :alt="active.name" @error="hideImg" />
        </div>

        <!-- Workout logging -->
        <div class="log-block">
          <div v-if="!logOpen" class="log-actions">
            <button class="log-open-btn" @click="logOpen = true">
              <span class="log-plus">＋</span> Log this exercise
            </button>
            <NuxtLink v-if="logSaved" class="log-saved-link" to="/log">✓ Saved — view log</NuxtLink>
          </div>

          <div v-else class="log-form">
            <div class="log-form-head">
              <label class="log-date-field">
                <span>Date</span>
                <input v-model="logDate" type="date" class="log-input log-date" />
              </label>
              <button class="log-cancel" @click="logOpen = false">Cancel</button>
            </div>

            <div class="log-sets">
              <div class="log-sets-head">
                <span class="log-col-idx">Set</span>
                <span class="log-col">Reps</span>
                <span class="log-col">Weight (kg)</span>
                <span class="log-col-x" />
              </div>
              <div v-for="(s, i) in logSets" :key="i" class="log-set-row">
                <span class="log-col-idx">{{ i + 1 }}</span>
                <input v-model.number="s.reps" type="number" min="0" inputmode="numeric" placeholder="0" class="log-input log-col" />
                <input v-model.number="s.weight" type="number" min="0" step="0.5" inputmode="decimal" placeholder="0" class="log-input log-col" />
                <button class="log-col-x log-remove" :disabled="logSets.length === 1" aria-label="Remove set" @click="removeSetRow(i)">×</button>
              </div>
              <button class="log-add-set" @click="addSetRow">＋ Add set</button>
            </div>

            <input v-model="logNotes" type="text" class="log-input log-notes" placeholder="Notes (optional)" maxlength="140" />

            <button class="log-save" :disabled="!canSaveLog" @click="saveLog">Save to my log</button>
          </div>
        </div>

        <div class="modal-meta">
          <div class="meta-chip">
            <span class="meta-chip-label">Body Part</span>
            <span class="meta-chip-value">{{ active.body_part || active.category }}</span>
          </div>
          <div class="meta-chip">
            <span class="meta-chip-label">Equipment</span>
            <span class="meta-chip-value">{{ active.equipment }}</span>
          </div>
          <div class="meta-chip">
            <span class="meta-chip-label">Target</span>
            <span class="meta-chip-value">{{ active.target }}</span>
          </div>
        </div>

        <div v-if="active.target || secondaryMuscles.length" class="modal-muscles">
          <div class="modal-muscles-label">Muscles</div>
          <div class="muscles-grid">
            <div v-if="active.target" class="muscles-group">
              <div class="muscles-group-label">Primary</div>
              <div class="muscle-tags">
                <span class="muscle-tag primary">{{ active.target }}</span>
              </div>
            </div>
            <div v-if="secondaryMuscles.length" class="muscles-group">
              <div class="muscles-group-label">Secondary</div>
              <div class="muscle-tags">
                <span v-for="m in secondaryMuscles" :key="m" class="muscle-tag">{{ m }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeLangs.length" class="modal-instructions">
          <span class="modal-instructions-label">Instructions</span>
          <div v-if="activeLangs.length > 1" class="lang-tabs">
            <button
              v-for="l in activeLangs"
              :key="l.code"
              class="lang-tab"
              :class="{ active: l.code === activeLang }"
              @click="activeLang = l.code"
            >
              {{ LANG_LABELS[l.code] ?? l.code }}
            </button>
          </div>
          <ol class="instructions-list">
            <li
              v-for="(step, i) in activeLangs.find((l) => l.code === activeLang)?.steps ?? activeLangs[0].steps"
              :key="i"
              class="instruction-step"
            >
              <span class="step-num">{{ i + 1 }}</span>
              <span class="step-text">{{ step }}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* ── App Shell ── */
.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  overflow: hidden;
}

/* Mobile-only chrome, hidden on desktop */
.mobile-topbar,
.drawer-backdrop,
.drawer-head,
.drawer-footer {
  display: none;
}

/* ── Sidebar ── */
.sidebar {
  background: #fff;
  border-right: 1px solid #e4e4e7;
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 20px 16px 16px;
  border-bottom: 1px solid #e4e4e7;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar-logo {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #111;
}
.sidebar-logo span {
  color: #ff4f00;
}
.sidebar-body {
  padding: 12px 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.db-setup-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 6px;
  border: 1px solid #e4e4e7;
  color: #71717a;
  font-size: 12px;
  font-weight: 500;
  background: #f0f0f1;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  white-space: nowrap;
  text-decoration: none;
}
.db-setup-btn.accent {
  border-color: #ff4f00;
  color: #ff4f00;
  background: rgba(255, 79, 0, 0.08);
}
.db-setup-btn.accent:hover {
  background: rgba(255, 79, 0, 0.16);
}
.db-setup-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}
.db-setup-btn:hover {
  border-color: #ff4f00;
  color: #ff4f00;
  background: rgba(255, 79, 0, 0.08);
}

/* ── Search ── */
.search-wrapper {
  position: relative;
  margin-bottom: 8px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1aa;
  pointer-events: none;
  width: 14px;
  height: 14px;
}
.search-box {
  width: 100%;
  padding: 8px 32px;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  color: #111;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.search-box::placeholder {
  color: #a1a1aa;
}
.search-box:focus {
  border-color: #ff4f00;
}
.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1aa;
  font-size: 16px;
  line-height: 1;
  padding: 2px 4px;
}
.search-clear:hover {
  color: #111;
}

/* ── Results Bar ── */
.main-content {
  overflow-y: auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.results-bar {
  /* Horizontal padding grows past 1480px so its content stays aligned with the centered grid */
  padding: 14px max(20px, calc((100% - 1480px) / 2 + 20px)) 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  background: #f4f4f5;
  z-index: 2;
  border-bottom: 1px solid #e4e4e7;
}
.results-count {
  font-size: 12px;
  color: #71717a;
  margin-left: auto;
}
.active-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.active-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 10px;
  background: rgba(255, 79, 0, 0.08);
  border: 1px solid #ff4f00;
  color: #ff4f00;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  text-transform: capitalize;
}
.active-badge-remove {
  font-size: 13px;
  line-height: 1;
  color: #ff4f00;
  opacity: 0.7;
}
.active-badge-remove:hover {
  opacity: 1;
}
.clear-all {
  font-size: 11px;
  color: #71717a;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.clear-all:hover {
  color: #111;
}

/* ── Grid ── */
.grid-wrapper {
  padding: 16px 20px 32px;
  flex: 1;
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
}
.exercise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

/* ── Skeleton ── */
.skeleton-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  overflow: hidden;
  animation: pulse 1.5s ease-in-out infinite;
}
.skeleton-media {
  aspect-ratio: 3/4;
  background: #f0f0f1;
}
.skeleton-body {
  padding: 10px 12px 12px;
}
.skeleton-line {
  height: 10px;
  border-radius: 5px;
  background: #f0f0f1;
  margin-bottom: 7px;
}
.skeleton-line.short {
  width: 60%;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── Card ── */
.exercise-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e4e4e7;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.exercise-card:hover {
  transform: translateY(-3px);
  border-color: #ff4f00;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.card-media {
  aspect-ratio: 3/4;
  background: #f0f0f1;
  overflow: hidden;
  position: relative;
}
.card-thumb,
.card-gif {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s;
}
.card-gif {
  opacity: 0;
}
.exercise-card:hover .card-thumb {
  opacity: 0;
}
.exercise-card:hover .card-gif {
  opacity: 1;
}
.card-body {
  padding: 9px 11px 11px;
}
.card-name {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.3;
  color: #111;
  margin-bottom: 5px;
  text-transform: capitalize;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.tag {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: capitalize;
}
.tag-cat {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
}
.tag-equip {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
}

/* ── Load sentinel ── */
.load-sentinel {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}
.load-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e4e4e7;
  border-top-color: #ff4f00;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: none;
}
.load-spinner.visible {
  display: block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Empty ── */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 20px;
  color: #71717a;
}
.empty-state p:first-child {
  font-size: 32px;
  margin-bottom: 8px;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  padding: 16px;
}
.modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.modal-panel {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 18px;
  width: min(660px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  transform: translateY(10px) scale(0.98);
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
}
.modal-overlay.open .modal-panel {
  transform: translateY(0) scale(1);
}
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 0;
}
.modal-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-transform: capitalize;
}
.modal-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  color: #71717a;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
  margin-top: 2px;
}
.modal-close:hover {
  background: rgba(255, 79, 0, 0.08);
  border-color: #ff4f00;
  color: #ff4f00;
}
.modal-media {
  padding: 14px 18px 0;
}
.modal-gif {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 10px;
  background: #f0f0f1;
}
.modal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 14px 18px 0;
}
.meta-chip {
  display: inline-flex;
  flex-direction: column;
  padding: 6px 12px;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  gap: 1px;
}
.meta-chip-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #a1a1aa;
}
.meta-chip-value {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  text-transform: capitalize;
}
.modal-muscles {
  padding: 14px 18px 16px;
  border-bottom: 1px solid #e4e4e7;
}
.modal-muscles-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
  margin-bottom: 10px;
}
.muscles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.muscles-group {
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  border-radius: 10px;
  padding: 10px 12px;
}
.muscles-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #a1a1aa;
  margin-bottom: 7px;
}
.muscle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.muscle-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 5px;
  text-transform: capitalize;
  background: #fff;
  color: #71717a;
  border: 1px solid #e4e4e7;
}
.muscle-tag.primary {
  background: #ff4f00;
  color: #fff;
  border-color: #ff4f00;
  font-weight: 600;
}
.modal-instructions {
  padding: 0 18px 22px;
}
.modal-instructions-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
  padding: 14px 0 0;
  display: block;
}
.lang-tabs {
  display: flex;
  border-bottom: 1px solid #e4e4e7;
  margin: 10px 0 14px;
}
.lang-tab {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 24px;
  color: #a1a1aa;
  position: relative;
  transition: color 0.15s;
}
.lang-tab:hover {
  color: #71717a;
}
.lang-tab.active {
  color: #111;
  font-weight: 600;
}
.lang-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #ff4f00;
  border-radius: 2px 2px 0 0;
}
.instructions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.instruction-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.step-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0f0f1;
  border: 1px solid #e4e4e7;
  font-size: 10px;
  font-weight: 700;
  color: #71717a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.step-text {
  font-size: 13px;
  line-height: 1.55;
  color: #71717a;
}

/* ── Log block (in modal) ── */
.log-block {
  padding: 14px 18px 0;
}
.log-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.log-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: #ff4f00;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: filter 0.15s;
}
.log-open-btn:hover {
  filter: brightness(0.94);
}
.log-plus {
  font-size: 15px;
  line-height: 1;
}
.log-saved-link {
  font-size: 12.5px;
  font-weight: 600;
  color: #16a34a;
  text-decoration: none;
}
.log-saved-link:hover {
  text-decoration: underline;
}
.log-form {
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 14px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.log-form-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.log-date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.log-cancel {
  font-size: 12px;
  color: #71717a;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.log-cancel:hover {
  color: #111;
}
.log-input {
  padding: 8px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  font-size: 13px;
  color: #111;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.log-input:focus {
  border-color: #ff4f00;
}
.log-date {
  max-width: 170px;
}
.log-sets {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.log-sets-head,
.log-set-row {
  display: grid;
  grid-template-columns: 36px 1fr 1fr 28px;
  gap: 8px;
  align-items: center;
}
.log-sets-head {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a1a1aa;
  padding: 0 2px;
}
.log-col-idx {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #71717a;
}
.log-remove {
  font-size: 18px;
  line-height: 1;
  color: #a1a1aa;
}
.log-remove:hover:not(:disabled) {
  color: #ef4444;
}
.log-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.log-add-set {
  align-self: flex-start;
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #ff4f00;
}
.log-add-set:hover {
  text-decoration: underline;
}
.log-save {
  padding: 10px 16px;
  background: #111;
  color: #fff;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: filter 0.15s, opacity 0.15s;
}
.log-save:hover:not(:disabled) {
  filter: brightness(1.25);
}
.log-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Responsive: large desktop ── */
@media (min-width: 1440px) {
  .app-shell {
    grid-template-columns: 288px 1fr;
  }
  .sidebar-body {
    padding: 14px 16px 28px;
  }
  .exercise-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}

/* ── Responsive: mobile ── */
@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: 100dvh;
  }

  /* Compact sticky top bar: logo + nav, then search + filter toggle */
  .mobile-topbar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    background: #fff;
    border-bottom: 1px solid #e4e4e7;
  }
  .mobile-topbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .mobile-topbar .search-wrapper {
    flex: 1;
    margin-bottom: 0;
  }
  .filter-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 8px 12px;
    border: 1px solid #e4e4e7;
    border-radius: 10px;
    background: #f4f4f5;
    color: #3f3f46;
    font-size: 13px;
    font-weight: 600;
    transition: border-color 0.15s, color 0.15s;
  }
  .filter-toggle.engaged {
    border-color: #ff4f00;
    color: #ff4f00;
    background: rgba(255, 79, 0, 0.08);
  }
  .filter-toggle svg {
    width: 14px;
    height: 14px;
  }
  .filter-toggle-count {
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    border-radius: 9px;
    background: #ff4f00;
    color: #fff;
    font-size: 10.5px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Sidebar becomes an off-canvas filter drawer */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(340px, 88vw);
    height: 100dvh;
    z-index: 120;
    border-right: 1px solid #e4e4e7;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.18);
    transform: translateX(-105%);
    transition: transform 0.25s ease;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-header {
    display: none; /* logo + nav live in the top bar on mobile */
  }
  .sidebar-body .search-wrapper {
    display: none; /* search lives in the top bar on mobile */
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid #e4e4e7;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
  }
  .drawer-title {
    font-size: 14px;
    font-weight: 700;
    color: #111;
  }
  .drawer-footer {
    display: block;
    position: sticky;
    bottom: 0;
    margin-top: auto;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: #fff;
    border-top: 1px solid #e4e4e7;
  }
  .drawer-apply {
    width: 100%;
    padding: 12px 16px;
    background: #ff4f00;
    color: #fff;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
  }
  .drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 110;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }
  .drawer-backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  .main-content {
    height: auto;
    flex: 1;
    min-height: 0;
  }
  .results-bar {
    padding: 10px 14px 8px;
  }
  .grid-wrapper {
    padding: 12px 14px 32px;
  }
  .exercise-grid {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 10px;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .modal-panel {
    width: 100%;
    max-height: 92dvh;
    border-radius: 18px 18px 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .muscles-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 480px) {
  .exercise-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .modal-title {
    font-size: 16px;
  }
}
</style>
