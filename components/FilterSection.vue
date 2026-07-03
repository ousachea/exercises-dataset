<script setup lang="ts">
const props = defineProps<{
  title: string
  values: string[]
  active: Set<string>
  /** Show only this many chips initially; the rest sit behind a "+N more" button. */
  initialLimit?: number
}>()

defineEmits<{ toggle: [value: string] }>()

const expanded = ref(false)

const visible = computed(() =>
  props.initialLimit && !expanded.value ? props.values.slice(0, props.initialLimit) : props.values
)
const hiddenCount = computed(() =>
  props.initialLimit && !expanded.value ? Math.max(0, props.values.length - props.initialLimit) : 0
)
</script>

<template>
  <div class="filter-section">
    <div class="filter-summary">{{ title }}</div>
    <div class="filter-options">
      <button
        v-for="value in visible"
        :key="value"
        class="chip"
        :class="{ active: active.has(value) }"
        @click="$emit('toggle', value)"
      >
        {{ value }}
      </button>
      <button v-if="hiddenCount" class="chip filter-show-more" @click="expanded = true">
        +{{ hiddenCount }} more
      </button>
    </div>
  </div>
</template>

<style>
.filter-section {
  border-radius: 10px;
  overflow: hidden;
}
.filter-summary {
  display: flex;
  align-items: center;
  padding: 8px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #71717a;
  user-select: none;
}
.filter-options {
  padding: 4px 2px 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #e4e4e7;
  background: transparent;
  color: #71717a;
  transition: all 0.1s;
  white-space: nowrap;
  text-transform: capitalize;
}
.chip:hover {
  border-color: #c4c4c7;
  color: #111;
}
.chip.active {
  background: rgba(255, 79, 0, 0.08);
  border-color: #ff4f00;
  color: #ff4f00;
}
.filter-show-more {
  font-size: 11px;
  color: #71717a;
  padding: 3px 6px;
  border-radius: 20px;
  border: 1px dashed #c4c4c7;
  text-transform: none;
}
.filter-show-more:hover {
  color: #111;
  border-color: #71717a;
}
</style>
