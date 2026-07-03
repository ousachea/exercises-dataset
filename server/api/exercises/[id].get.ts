import type { Exercise } from '~/types/exercise'
import { loadExercises } from '~/server/utils/exercises'

export default defineEventHandler(async (event): Promise<Exercise> => {
  const id = getRouterParam(event, 'id')
  const all = await loadExercises()
  const found = all.find((ex) => ex.id === id)
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'Exercise not found' })
  }
  return found
})
