import type { Exercise, PagedResult } from '~/types/exercise'
import { loadExercises, filterExercises, toArray } from '~/server/utils/exercises'

const MAX_LIMIT = 100

export default defineEventHandler(async (event): Promise<PagedResult<Exercise>> => {
  const query = getQuery(event)

  let page = Number.parseInt(String(query.page ?? '1'), 10)
  let limit = Number.parseInt(String(query.limit ?? '20'), 10)
  if (!Number.isFinite(page) || page < 1) page = 1
  if (!Number.isFinite(limit) || limit < 1) limit = 20
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  const all = await loadExercises()
  const filtered = filterExercises(all, {
    q: query.q ? String(query.q) : undefined,
    category: toArray(query.category),
    equipment: toArray(query.equipment),
    target: toArray(query.target),
    body_part: toArray(query.body_part)
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const data = filtered.slice(start, start + limit)

  return { data, total, page, limit, totalPages }
})
