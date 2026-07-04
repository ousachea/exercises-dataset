<script setup lang="ts">
/**
 * Body-weight tracker: quick weigh-in entry, trend line chart (single series,
 * crosshair + tooltip), delta stats and a recent-entries strip. Data lives in
 * localStorage via useWorkoutLog.
 */
const { weighIns, profile, addWeighIn, deleteWeighIn, hydrated } = useWorkoutLog()

// ── Entry form (range slider) ─────────────────────────
const KG_MIN = 65
const KG_MAX = 90
const KG_TICKS = [65, 70, 75, 80, 85, 90]

const formDate = ref(todayISODate())
const formKg = ref(77.5)
const touched = ref(false)

function clampKg(v: number): number {
  return Math.min(KG_MAX, Math.max(KG_MIN, Math.round(v * 10) / 10))
}

// Start the slider at the most recent known weight until the user moves it
watch(
  () => weighIns.value[weighIns.value.length - 1]?.weightKg ?? profile.value.weightKg,
  (kg) => {
    if (!touched.value && kg) formKg.value = clampKg(kg)
  },
  { immediate: true }
)

/** Thumb position as a percentage of the track. */
const sliderPct = computed(() => ((formKg.value - KG_MIN) / (KG_MAX - KG_MIN)) * 100)

function submit() {
  if (!formDate.value) return
  addWeighIn(formDate.value, clampKg(formKg.value))
  formDate.value = todayISODate()
}

// ── Derived stats ─────────────────────────────────────
const sorted = computed(() => weighIns.value) // kept sorted by the composable
const current = computed(() => sorted.value[sorted.value.length - 1] ?? null)

const deltaTotal = computed(() => {
  if (sorted.value.length < 2) return null
  return current.value!.weightKg - sorted.value[0].weightKg
})

const delta7 = computed(() => {
  if (sorted.value.length < 2) return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutStr = cutoff.toISOString().slice(0, 10)
  // Baseline: last weigh-in at or before the cutoff
  const base = [...sorted.value].reverse().find((w) => w.date <= cutStr)
  if (!base) return null
  return current.value!.weightKg - base.weightKg
})

function fmtDelta(d: number): string {
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(1)} kg`
}

// ── Chart geometry ────────────────────────────────────
const chartWrap = ref<HTMLElement | null>(null)
const width = ref(600)
let ro: ResizeObserver | null = null
onMounted(() => {
  ro = new ResizeObserver(([e]) => {
    if (e.contentRect.width > 0) width.value = e.contentRect.width
  })
  if (chartWrap.value) ro.observe(chartWrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

const H = 200
const PAD = { top: 14, right: 16, bottom: 26, left: 40 }

const chart = computed(() => {
  const pts = sorted.value
  if (pts.length < 2) return null
  const w = width.value
  const innerW = w - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const ts = pts.map((p) => new Date(p.date + 'T00:00:00').getTime())
  const t0 = ts[0]
  const t1 = ts[ts.length - 1]
  const kgs = pts.map((p) => p.weightKg)
  let lo = Math.min(...kgs)
  let hi = Math.max(...kgs)
  const padKg = Math.max(0.5, (hi - lo) * 0.15)
  lo -= padKg
  hi += padKg

  // Clean y ticks: pick the step that yields 3–5 lines
  const step = [0.5, 1, 2, 2.5, 5, 10, 20].find((s) => (hi - lo) / s <= 5) ?? 20
  const tickLo = Math.ceil(lo / step) * step
  const yTicks: number[] = []
  for (let v = tickLo; v <= hi; v += step) yTicks.push(Math.round(v * 10) / 10)

  const x = (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * innerW
  const y = (kg: number) => PAD.top + (1 - (kg - lo) / (hi - lo)) * innerH

  const dots = pts.map((p, i) => ({ ...p, x: x(ts[i]), y: y(p.weightKg) }))
  const line = dots.map((d, i) => `${i ? 'L' : 'M'}${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(' ')
  const area = `${line} L${dots[dots.length - 1].x.toFixed(1)},${H - PAD.bottom} L${dots[0].x.toFixed(1)},${H - PAD.bottom} Z`

  // 3 x-axis labels: first, middle, last
  const mid = Math.floor(dots.length / 2)
  const xLabels = [...new Set([0, mid, dots.length - 1])].map((i) => ({
    x: dots[i].x,
    text: fmtShort(pts[i].date)
  }))

  return { dots, line, area, yTicks, y, xLabels, w }
})

function fmtShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function fmtLong(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Crosshair + tooltip ───────────────────────────────
const hover = ref<{ x: number; y: number; date: string; weightKg: number } | null>(null)

function onMove(e: PointerEvent) {
  const c = chart.value
  if (!c || !chartWrap.value) return
  const rect = chartWrap.value.getBoundingClientRect()
  const px = e.clientX - rect.left
  let best = c.dots[0]
  for (const d of c.dots) if (Math.abs(d.x - px) < Math.abs(best.x - px)) best = d
  hover.value = best
}
function onLeave() {
  hover.value = null
}

// Recent entries, newest first (non-hover access to the values)
const recent = computed(() => [...sorted.value].reverse().slice(0, 6))
</script>

<template>
  <section class="wp-card">
    <div class="wp-top">
      <h2 class="wp-heading">Weight Progress</h2>
      <div v-if="current" class="wp-stats">
        <span class="wp-current">{{ current.weightKg.toFixed(1) }} kg</span>
        <span v-if="delta7 !== null" class="wp-delta" :class="delta7 <= 0 ? 'down' : 'up'">
          {{ fmtDelta(delta7) }} · 7d
        </span>
        <span v-if="deltaTotal !== null" class="wp-delta" :class="deltaTotal <= 0 ? 'down' : 'up'">
          {{ fmtDelta(deltaTotal) }} · total
        </span>
      </div>
    </div>

    <!-- Weigh-in form -->
    <form class="wp-form" @submit.prevent="submit">
      <div class="wp-slider-block">
        <div class="wp-slider-wrap">
          <output
            class="wp-bubble"
            :style="{ left: `calc(${sliderPct}% + ${(0.5 - sliderPct / 100) * 24}px)` }"
          >{{ formKg.toFixed(1) }}<small>kg</small></output>
          <input
            v-model.number="formKg"
            type="range"
            class="wp-range"
            :min="KG_MIN"
            :max="KG_MAX"
            step="0.1"
            :style="{ '--fill': `${sliderPct}%` }"
            aria-label="Weight in kilograms"
            @input="touched = true"
          />
        </div>
        <div class="wp-ticks" aria-hidden="true">
          <span v-for="t in KG_TICKS" :key="t" class="wp-tick-mark">
            <i />{{ t.toFixed(1) }}
          </span>
        </div>
      </div>
      <div class="wp-form-row">
        <input v-model="formDate" type="date" class="wp-input wp-date" :max="todayISODate()" />
        <button type="submit" class="wp-add">Log weight</button>
      </div>
    </form>

    <!-- Chart -->
    <div ref="chartWrap" class="wp-chart" @pointermove="onMove" @pointerleave="onLeave">
      <svg v-if="chart" :width="chart.w" :height="H" :viewBox="`0 0 ${chart.w} ${H}`">
        <!-- gridlines + y ticks -->
        <g v-for="t in chart.yTicks" :key="t">
          <line :x1="PAD.left" :x2="chart.w - PAD.right" :y1="chart.y(t)" :y2="chart.y(t)" class="wp-grid" />
          <text :x="PAD.left - 7" :y="chart.y(t) + 3" class="wp-tick" text-anchor="end">{{ t.toFixed(1) }}</text>
        </g>
        <!-- x labels -->
        <text
          v-for="(l, i) in chart.xLabels"
          :key="`x${i}`"
          :x="l.x"
          :y="H - 8"
          class="wp-tick"
          :text-anchor="i === 0 ? 'start' : i === chart.xLabels.length - 1 ? 'end' : 'middle'"
        >{{ l.text }}</text>
        <!-- crosshair -->
        <line
          v-if="hover"
          :x1="hover.x"
          :x2="hover.x"
          :y1="PAD.top"
          :y2="H - PAD.bottom"
          class="wp-crosshair"
        />
        <!-- series -->
        <path :d="chart.area" class="wp-area" />
        <path :d="chart.line" class="wp-line" />
        <circle
          v-for="d in chart.dots"
          :key="d.date"
          :cx="d.x"
          :cy="d.y"
          :r="hover && hover.date === d.date ? 5 : 4"
          class="wp-dot"
        />
        <!-- endpoint direct label -->
        <text
          :x="chart.dots[chart.dots.length - 1].x"
          :y="chart.dots[chart.dots.length - 1].y - 10"
          class="wp-endlabel"
          text-anchor="end"
        >{{ current!.weightKg.toFixed(1) }}</text>
      </svg>

      <p v-else-if="hydrated" class="wp-empty">
        {{ sorted.length === 1 ? 'One more weigh-in and your trend line appears.' : 'Log your first weigh-in to start tracking.' }}
      </p>

      <!-- tooltip -->
      <div
        v-if="hover && chart"
        class="wp-tooltip"
        :style="{
          left: `${Math.min(Math.max(hover.x, 60), chart.w - 60)}px`,
          top: `${hover.y - 14}px`
        }"
      >
        <span class="wp-tooltip-value"><i class="wp-key" />{{ hover.weightKg.toFixed(1) }} kg</span>
        <span class="wp-tooltip-date">{{ fmtLong(hover.date) }}</span>
      </div>
    </div>

    <!-- Recent weigh-ins -->
    <div v-if="recent.length" class="wp-recent">
      <span v-for="w in recent" :key="w.date" class="wp-pill">
        <span class="wp-pill-date">{{ fmtShort(w.date) }}</span>
        <span class="wp-pill-kg">{{ w.weightKg.toFixed(1) }}</span>
        <button class="wp-pill-x" :aria-label="`Delete weigh-in ${w.date}`" @click="deleteWeighIn(w.date)">×</button>
      </span>
    </div>
  </section>
</template>

<style>
.wp-card {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
}
.wp-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.wp-heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
}
.wp-stats {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.wp-current {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #111;
}
.wp-delta {
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}
.wp-delta.down {
  background: rgba(22, 163, 74, 0.1);
  color: #16a34a;
}
.wp-delta.up {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.wp-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}
.wp-form-row {
  display: flex;
  gap: 8px;
}

/* ── Range slider ── */
.wp-slider-block {
  padding: 34px 12px 0;
  background: #f7f7f8;
  border: 1px solid #eee;
  border-radius: 14px;
  padding-bottom: 8px;
}
.wp-slider-wrap {
  position: relative;
}
.wp-bubble {
  position: absolute;
  bottom: 26px;
  transform: translateX(-50%);
  background: #111;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  padding: 4px 10px;
  border-radius: 9px;
  white-space: nowrap;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}
.wp-bubble small {
  font-size: 10px;
  font-weight: 600;
  color: #a1a1aa;
  margin-left: 3px;
}
.wp-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #111;
}
.wp-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 24px;
  background: transparent;
  cursor: pointer;
  margin: 0;
}
.wp-range:focus {
  outline: none;
}
.wp-range::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #ff4f00 var(--fill), #e8e8ea var(--fill));
}
.wp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  margin-top: -8px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #ff4f00;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  transition: transform 0.1s;
}
.wp-range::-webkit-slider-thumb:active {
  transform: scale(1.15);
}
.wp-range::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: #e8e8ea;
}
.wp-range::-moz-range-progress {
  height: 8px;
  border-radius: 4px;
  background: #ff4f00;
}
.wp-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid #ff4f00;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}
.wp-range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(255, 79, 0, 0.25);
}
.wp-ticks {
  display: flex;
  justify-content: space-between;
  padding: 2px 12px 0;
  /* Align tick row with the thumb's travel: thumb center spans 12px→calc(100%-12px) */
  margin: 0 -12px;
}
.wp-tick-mark {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  font-weight: 600;
  color: #a1a1aa;
  width: 24px;
}
.wp-tick-mark i {
  width: 1px;
  height: 5px;
  background: #d4d4d8;
}
.wp-input {
  padding: 8px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  font-size: 13px;
  color: #111;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.wp-input:focus {
  border-color: #ff4f00;
}
.wp-date {
  flex: 1;
  min-width: 0;
}
.wp-add {
  padding: 8px 14px;
  background: #ff4f00;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: filter 0.15s, opacity 0.15s;
}
.wp-add:hover:not(:disabled) {
  filter: brightness(0.94);
}
.wp-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.wp-chart {
  position: relative;
  width: 100%;
}
.wp-grid {
  stroke: #f0f0f1;
  stroke-width: 1;
}
.wp-tick {
  font-size: 10.5px;
  fill: #a1a1aa;
}
.wp-crosshair {
  stroke: #d4d4d8;
  stroke-width: 1;
}
.wp-area {
  fill: #ff4f00;
  fill-opacity: 0.1;
  stroke: none;
}
.wp-line {
  fill: none;
  stroke: #ff4f00;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.wp-dot {
  fill: #ff4f00;
  stroke: #fff;
  stroke-width: 2;
}
.wp-endlabel {
  font-size: 11.5px;
  font-weight: 700;
  fill: #111;
}
.wp-empty {
  padding: 26px 0 30px;
  text-align: center;
  font-size: 12.5px;
  color: #a1a1aa;
}
.wp-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  padding: 6px 10px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  white-space: nowrap;
  z-index: 5;
}
.wp-tooltip-value {
  font-size: 13px;
  font-weight: 700;
  color: #111;
  display: flex;
  align-items: center;
  gap: 6px;
}
.wp-key {
  display: inline-block;
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: #ff4f00;
}
.wp-tooltip-date {
  font-size: 11px;
  color: #71717a;
}

.wp-recent {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.wp-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  background: #f7f7f8;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 11.5px;
}
.wp-pill-date {
  color: #a1a1aa;
  font-weight: 500;
}
.wp-pill-kg {
  color: #111;
  font-weight: 700;
}
.wp-pill-x {
  color: #a1a1aa;
  font-size: 14px;
  line-height: 1;
}
.wp-pill-x:hover {
  color: #ef4444;
}

@media (max-width: 560px) {
  .wp-card {
    padding: 14px;
  }
}
</style>
