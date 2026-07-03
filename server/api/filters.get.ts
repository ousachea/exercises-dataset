import type { FilterOptions } from '~/types/exercise'
import { loadExercises } from '~/server/utils/exercises'

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export default defineEventHandler(async (): Promise<FilterOptions> => {
  const all = await loadExercises()
  return {
    categories: uniqueSorted(all.map((e) => e.category)),
    equipment: uniqueSorted(all.map((e) => e.equipment)),
    targets: uniqueSorted(all.map((e) => e.target)),
    total: all.length
  }
})
