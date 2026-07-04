<script setup lang="ts">
/**
 * A fixed weekly weight-loss training plan: strength to preserve muscle,
 * HIIT + steady cardio for calorie burn, one recovery walk and one rest day.
 * Day completion is tracked per calendar week in localStorage and resets
 * automatically when a new week starts.
 */
interface PlanExercise {
  id: string
  name: string
  rx: string
}
interface PlanDay {
  key: string
  day: string
  title: string
  tag: string
  note?: string
  exercises: PlanExercise[]
}

const PLAN: PlanDay[] = [
  {
    key: 'mon',
    day: 'Mon',
    title: 'Full-Body Strength',
    tag: 'strength',
    note: 'Rest 60–90s between sets. Pick weights that make the last 2 reps hard.',
    exercises: [
      { id: '1760', name: 'dumbbell goblet squat', rx: '3 × 12' },
      { id: '0293', name: 'dumbbell bent over row', rx: '3 × 12' },
      { id: '0662', name: 'push-up', rx: '3 × 10' },
      { id: '1459', name: 'dumbbell romanian deadlift', rx: '3 × 12' },
      { id: '0276', name: 'dead bug', rx: '3 × 10 / side' }
    ]
  },
  {
    key: 'tue',
    day: 'Tue',
    title: 'HIIT Circuit',
    tag: 'hiit',
    note: '4 rounds: 40s work / 20s rest per move. ~20 minutes total.',
    exercises: [
      { id: '3224', name: 'jack jump', rx: '40s' },
      { id: '1160', name: 'burpee', rx: '40s' },
      { id: '0630', name: 'mountain climber', rx: '40s' },
      { id: '0514', name: 'jump squat', rx: '40s' }
    ]
  },
  {
    key: 'wed',
    day: 'Wed',
    title: 'Active Recovery',
    tag: 'recovery',
    note: 'Easy pace — you should be able to hold a conversation.',
    exercises: [
      { id: '3666', name: 'walking on incline treadmill', rx: '30–40 min' },
      { id: '2141', name: 'walk elliptical cross trainer', rx: 'or 30 min' }
    ]
  },
  {
    key: 'thu',
    day: 'Thu',
    title: 'Lower Body & Core',
    tag: 'strength',
    note: 'Rest 60–90s between sets.',
    exercises: [
      { id: '1460', name: 'walking lunge', rx: '3 × 12 / leg' },
      { id: '0549', name: 'kettlebell swing', rx: '3 × 15' },
      { id: '3561', name: 'glute bridge march', rx: '3 × 10 / side' },
      { id: '0687', name: 'russian twist', rx: '3 × 20' }
    ]
  },
  {
    key: 'fri',
    day: 'Fri',
    title: 'Steady Cardio',
    tag: 'cardio',
    note: 'Moderate effort you can sustain — aim for 25–30 minutes.',
    exercises: [
      { id: '2612', name: 'jump rope', rx: '10 × 1 min' },
      { id: '2138', name: 'stationary bike run', rx: 'or 25 min' }
    ]
  },
  {
    key: 'sat',
    day: 'Sat',
    title: 'Upper Body & Core',
    tag: 'strength',
    note: 'Rest 60–90s between sets.',
    exercises: [
      { id: '0007', name: 'alternate lateral pulldown', rx: '3 × 12' },
      { id: '0405', name: 'dumbbell seated shoulder press', rx: '3 × 10' },
      { id: '0664', name: 'push-up to side plank', rx: '3 × 8 / side' },
      { id: '0507', name: 'jackknife sit-up', rx: '3 × 12' }
    ]
  },
  {
    key: 'sun',
    day: 'Sun',
    title: 'Rest',
    tag: 'rest',
    note: 'Full rest. Sleep, hydrate, and get your steps in.',
    exercises: []
  }
]

const TRAINING_DAYS = PLAN.filter((d) => d.exercises.length).length

const { thumbUrl } = useMedia()

// ── Weekly completion tracking ────────────────────────
const STORE_KEY = 'nuxt-workout:plan-week:v1'

/** Monday of the current week as YYYY-MM-DD. */
function weekStartISO(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7 // Mon = 0
  d.setDate(d.getDate() - day)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

const done = ref<Set<string>>(new Set())
const openDay = ref<string | null>(null)

onMounted(() => {
  // Expand today's session by default
  openDay.value = PLAN[(new Date().getDay() + 6) % 7]?.key ?? null
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { week: string; done: string[] }
      if (saved.week === weekStartISO()) done.value = new Set(saved.done)
    }
  } catch {
    /* corrupted store — start fresh */
  }
})

function toggleDone(key: string) {
  if (done.value.has(key)) done.value.delete(key)
  else done.value.add(key)
  done.value = new Set(done.value)
  localStorage.setItem(STORE_KEY, JSON.stringify({ week: weekStartISO(), done: [...done.value] }))
}

function toggleOpen(key: string) {
  openDay.value = openDay.value === key ? null : key
}

const doneCount = computed(() => PLAN.filter((d) => d.exercises.length && done.value.has(d.key)).length)

function hideImg(e: Event) {
  ;(e.target as HTMLImageElement).style.visibility = 'hidden'
}
</script>

<template>
  <section class="plan-card">
    <div class="plan-top">
      <div>
        <h2 class="plan-heading">Weight-Loss Plan</h2>
        <p class="plan-sub">
          Strength keeps your muscle, HIIT and cardio burn the calories — pair it with a modest
          calorie deficit and aim for 0.5–1&nbsp;kg lost per week.
        </p>
      </div>
      <div class="plan-progress">
        <span class="plan-progress-num">{{ doneCount }}/{{ TRAINING_DAYS }}</span>
        <span class="plan-progress-label">this week</span>
      </div>
    </div>
    <div class="plan-bar">
      <div class="plan-bar-fill" :style="{ width: `${(doneCount / TRAINING_DAYS) * 100}%` }" />
    </div>

    <div class="plan-days">
      <article v-for="d in PLAN" :key="d.key" class="plan-day" :class="{ rest: !d.exercises.length, checked: done.has(d.key) }">
        <button class="plan-day-head" @click="d.exercises.length && toggleOpen(d.key)">
          <span class="plan-day-name">{{ d.day }}</span>
          <span class="plan-day-title">{{ d.title }}</span>
          <span class="plan-tag" :class="`tag-${d.tag}`">{{ d.tag }}</span>
          <span
            v-if="d.exercises.length"
            class="plan-check"
            :class="{ on: done.has(d.key) }"
            role="checkbox"
            :aria-checked="done.has(d.key)"
            :aria-label="`Mark ${d.day} done`"
            @click.stop="toggleDone(d.key)"
          >✓</span>
          <span v-if="d.exercises.length" class="plan-chevron" :class="{ open: openDay === d.key }">›</span>
        </button>

        <div v-if="openDay === d.key || !d.exercises.length" class="plan-day-body">
          <p v-if="d.note" class="plan-note">{{ d.note }}</p>
          <NuxtLink
            v-for="ex in d.exercises"
            :key="ex.id"
            class="plan-ex"
            :to="{ path: '/', query: { q: ex.name } }"
          >
            <span class="plan-ex-media">
              <img v-if="thumbUrl({ id: ex.id })" :src="thumbUrl({ id: ex.id })!" :alt="ex.name" loading="lazy" @error="hideImg" />
            </span>
            <span class="plan-ex-name">{{ ex.name }}</span>
            <span class="plan-ex-rx">{{ ex.rx }}</span>
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>
</template>

<style>
.plan-card {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 24px;
}
.plan-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.plan-heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
  margin-bottom: 6px;
}
.plan-sub {
  font-size: 12.5px;
  line-height: 1.5;
  color: #71717a;
  max-width: 46ch;
}
.plan-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}
.plan-progress-num {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ff4f00;
}
.plan-progress-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.plan-bar {
  height: 5px;
  border-radius: 3px;
  background: #f0f0f1;
  margin: 12px 0 14px;
  overflow: hidden;
}
.plan-bar-fill {
  height: 100%;
  background: #ff4f00;
  border-radius: 3px;
  transition: width 0.25s ease;
}

.plan-days {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plan-day {
  border: 1px solid #eee;
  border-radius: 12px;
  background: #f7f7f8;
  overflow: hidden;
}
.plan-day.checked {
  border-color: rgba(22, 163, 74, 0.35);
  background: rgba(22, 163, 74, 0.05);
}
.plan-day-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
}
.plan-day-name {
  font-size: 11px;
  font-weight: 700;
  color: #a1a1aa;
  text-transform: uppercase;
  width: 32px;
  flex-shrink: 0;
}
.plan-day-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #111;
  flex: 1;
  min-width: 0;
}
.plan-tag {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}
.tag-strength { background: rgba(255, 79, 0, 0.1); color: #ff4f00; }
.tag-hiit { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.tag-cardio { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.tag-recovery { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.tag-rest { background: #f0f0f1; color: #a1a1aa; }
.plan-check {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1.5px solid #d4d4d8;
  background: #fff;
  color: transparent;
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.12s;
}
.plan-check:hover {
  border-color: #16a34a;
}
.plan-check.on {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.plan-chevron {
  font-size: 16px;
  color: #a1a1aa;
  transition: transform 0.15s;
  flex-shrink: 0;
}
.plan-chevron.open {
  transform: rotate(90deg);
}

.plan-day-body {
  padding: 0 12px 12px;
}
.plan-note {
  font-size: 11.5px;
  color: #71717a;
  margin-bottom: 8px;
}
.plan-day.rest .plan-note {
  margin-bottom: 0;
}
.plan-ex {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.12s;
}
.plan-ex:hover {
  background: #fff;
}
.plan-ex-media {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #eee;
  overflow: hidden;
  flex-shrink: 0;
}
.plan-ex-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.plan-ex-name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  text-transform: capitalize;
  flex: 1;
  min-width: 0;
}
.plan-ex-rx {
  font-size: 12px;
  font-weight: 700;
  color: #ff4f00;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .plan-card {
    padding: 14px;
  }
  .plan-ex-name {
    font-size: 12.5px;
  }
}
</style>
