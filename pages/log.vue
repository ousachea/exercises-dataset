<script setup lang="ts">
useHead({ title: 'My Workout Log — ExerciseDB' })

const {
  profile,
  hydrated,
  load,
  updateProfile,
  deleteEntry,
  entryVolume,
  bmi,
  totalVolume,
  workoutsThisWeek,
  totalDays,
  byDate
} = useWorkoutLog()

onMounted(load)

// ── Profile editing ───────────────────────────────────
const editingProfile = ref(false)
const draft = reactive({ age: null as number | null, heightCm: null as number | null, weightKg: null as number | null })

function startEdit() {
  draft.age = profile.value.age
  draft.heightCm = profile.value.heightCm
  draft.weightKg = profile.value.weightKg
  editingProfile.value = true
}
function saveProfile() {
  updateProfile({
    age: draft.age ? Number(draft.age) : null,
    heightCm: draft.heightCm ? Number(draft.heightCm) : null,
    weightKg: draft.weightKg ? Number(draft.weightKg) : null
  })
  editingProfile.value = false
}

const bmiLabel = computed(() => {
  const v = bmi.value
  if (v == null) return { text: '—', tag: '' }
  if (v < 18.5) return { text: v.toFixed(1), tag: 'Underweight' }
  if (v < 25) return { text: v.toFixed(1), tag: 'Normal' }
  if (v < 30) return { text: v.toFixed(1), tag: 'Overweight' }
  return { text: v.toFixed(1), tag: 'Obese' }
})

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()} kg`
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function topSet(sets: { reps: number; weight: number }[]): string {
  const best = [...sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0]
  if (!best) return ''
  return best.weight > 0 ? `${best.weight} kg × ${best.reps}` : `${best.reps} reps`
}
</script>

<template>
  <div class="log-page thin-scroll">
    <header class="log-header">
      <NuxtLink to="/" class="back-link">← Exercise Library</NuxtLink>
      <h1 class="log-title">My Workout Log</h1>
    </header>

    <!-- Profile -->
    <section class="profile-card">
      <div class="profile-top">
        <h2 class="profile-heading">Profile</h2>
        <button v-if="!editingProfile" class="profile-edit" @click="startEdit">Edit</button>
      </div>

      <div v-if="!editingProfile" class="profile-stats">
        <div class="pstat">
          <span class="pstat-value">{{ profile.age ?? '—' }}</span>
          <span class="pstat-label">Age</span>
        </div>
        <div class="pstat">
          <span class="pstat-value">{{ profile.heightCm ?? '—' }}<small v-if="profile.heightCm">cm</small></span>
          <span class="pstat-label">Height</span>
        </div>
        <div class="pstat">
          <span class="pstat-value">{{ profile.weightKg ?? '—' }}<small v-if="profile.weightKg">kg</small></span>
          <span class="pstat-label">Weight</span>
        </div>
        <div class="pstat pstat-bmi">
          <span class="pstat-value">{{ bmiLabel.text }}</span>
          <span class="pstat-label">BMI<template v-if="bmiLabel.tag"> · {{ bmiLabel.tag }}</template></span>
        </div>
      </div>

      <div v-else class="profile-form">
        <label class="pfield">
          <span>Age</span>
          <input v-model.number="draft.age" type="number" min="0" class="pinput" />
        </label>
        <label class="pfield">
          <span>Height (cm)</span>
          <input v-model.number="draft.heightCm" type="number" min="0" class="pinput" />
        </label>
        <label class="pfield">
          <span>Weight (kg)</span>
          <input v-model.number="draft.weightKg" type="number" min="0" step="0.1" class="pinput" />
        </label>
        <div class="pform-actions">
          <button class="pbtn-save" @click="saveProfile">Save</button>
          <button class="pbtn-cancel" @click="editingProfile = false">Cancel</button>
        </div>
      </div>
    </section>

    <!-- Summary stats -->
    <section class="summary-row">
      <div class="summary-card">
        <span class="summary-value">{{ totalDays }}</span>
        <span class="summary-label">Workout days</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">{{ workoutsThisWeek }}</span>
        <span class="summary-label">This week</span>
      </div>
      <div class="summary-card">
        <span class="summary-value">{{ fmtVolume(totalVolume) }}</span>
        <span class="summary-label">Total volume</span>
      </div>
    </section>

    <!-- History -->
    <section class="history">
      <h2 class="history-heading">History</h2>

      <div v-if="hydrated && byDate.length === 0" class="log-empty">
        <p class="log-empty-emoji">🏋️</p>
        <p>No workouts logged yet.</p>
        <NuxtLink to="/" class="log-empty-cta">Browse exercises to log your first set →</NuxtLink>
      </div>

      <div v-for="day in byDate" :key="day.date" class="day-group">
        <div class="day-head">
          <span class="day-date">{{ fmtDate(day.date) }}</span>
          <span class="day-volume">{{ fmtVolume(day.volume) }}</span>
        </div>

        <article v-for="entry in day.items" :key="entry.id" class="log-entry">
          <div class="entry-main">
            <h3 class="entry-name">{{ entry.name }}</h3>
            <div class="entry-tags">
              <span v-if="entry.target" class="entry-tag">{{ entry.target }}</span>
              <span v-if="entry.equipment" class="entry-tag">{{ entry.equipment }}</span>
            </div>
            <div class="entry-sets">
              <span v-for="(s, i) in entry.sets" :key="i" class="set-pill">
                <template v-if="s.weight > 0">{{ s.weight }}kg × {{ s.reps }}</template>
                <template v-else>{{ s.reps }} reps</template>
              </span>
            </div>
            <p v-if="entry.notes" class="entry-notes">“{{ entry.notes }}”</p>
          </div>
          <div class="entry-side">
            <span class="entry-volume">{{ fmtVolume(entryVolume(entry)) }}</span>
            <span class="entry-top">{{ topSet(entry.sets) }}</span>
            <button class="entry-delete" aria-label="Delete entry" @click="deleteEntry(entry.id)">Delete</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style>
.log-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 20px 64px;
  height: 100vh;
  overflow-y: auto;
}
.log-header {
  margin-bottom: 22px;
}
.back-link {
  font-size: 12.5px;
  font-weight: 500;
  color: #71717a;
  text-decoration: none;
}
.back-link:hover {
  color: #ff4f00;
}
.log-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-top: 8px;
  color: #111;
}

/* Profile */
.profile-card {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
}
.profile-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.profile-heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
}
.profile-edit {
  font-size: 12px;
  font-weight: 600;
  color: #ff4f00;
}
.profile-edit:hover {
  text-decoration: underline;
}
.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.pstat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  background: #f7f7f8;
  border: 1px solid #eee;
  border-radius: 12px;
}
.pstat-bmi {
  background: rgba(255, 79, 0, 0.06);
  border-color: rgba(255, 79, 0, 0.2);
}
.pstat-value {
  font-size: 20px;
  font-weight: 800;
  color: #111;
  letter-spacing: -0.02em;
}
.pstat-value small {
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
  margin-left: 2px;
}
.pstat-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.profile-form {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  align-items: end;
}
.pfield {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
}
.pinput {
  padding: 8px 10px;
  border: 1px solid #e4e4e7;
  border-radius: 8px;
  font-size: 14px;
  color: #111;
  outline: none;
}
.pinput:focus {
  border-color: #ff4f00;
}
.pform-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
}
.pbtn-save {
  padding: 8px 18px;
  background: #ff4f00;
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
.pbtn-save:hover {
  filter: brightness(0.94);
}
.pbtn-cancel {
  padding: 8px 14px;
  color: #71717a;
  font-size: 13px;
  font-weight: 500;
}
.pbtn-cancel:hover {
  color: #111;
}

/* Summary */
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #111;
  border-radius: 14px;
  color: #fff;
}
.summary-value {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.summary-label {
  font-size: 11px;
  font-weight: 500;
  color: #a1a1aa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* History */
.history-heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #a1a1aa;
  margin-bottom: 14px;
}
.log-empty {
  text-align: center;
  padding: 48px 20px;
  color: #71717a;
  background: #fff;
  border: 1px dashed #e4e4e7;
  border-radius: 16px;
}
.log-empty-emoji {
  font-size: 34px;
  margin-bottom: 10px;
}
.log-empty-cta {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #ff4f00;
  text-decoration: none;
}
.log-empty-cta:hover {
  text-decoration: underline;
}
.day-group {
  margin-bottom: 22px;
}
.day-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 4px 8px;
  border-bottom: 1px solid #e4e4e7;
  margin-bottom: 10px;
}
.day-date {
  font-size: 13px;
  font-weight: 700;
  color: #111;
}
.day-volume {
  font-size: 12px;
  font-weight: 600;
  color: #ff4f00;
}
.log-entry {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  margin-bottom: 8px;
}
.entry-name {
  font-size: 14.5px;
  font-weight: 700;
  color: #111;
  text-transform: capitalize;
  margin-bottom: 6px;
}
.entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.entry-tag {
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 5px;
  background: #f4f4f5;
  color: #71717a;
  text-transform: capitalize;
}
.entry-sets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.set-pill {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 6px;
  background: rgba(255, 79, 0, 0.08);
  color: #ff4f00;
}
.entry-notes {
  margin-top: 8px;
  font-size: 12.5px;
  font-style: italic;
  color: #71717a;
}
.entry-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}
.entry-volume {
  font-size: 15px;
  font-weight: 800;
  color: #111;
}
.entry-top {
  font-size: 11px;
  color: #a1a1aa;
  font-weight: 500;
  white-space: nowrap;
}
.entry-delete {
  margin-top: 6px;
  font-size: 11px;
  color: #a1a1aa;
}
.entry-delete:hover {
  color: #ef4444;
}

@media (max-width: 560px) {
  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-form {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
