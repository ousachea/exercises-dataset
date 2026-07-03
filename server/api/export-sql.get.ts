import type { Exercise } from '~/types/exercise'
import { loadExercises } from '~/server/utils/exercises'

type Db = 'mssql' | 'postgresql' | 'mysql' | 'sqlite'

const COLUMNS =
  'id, name, category, body_part, equipment, instructions_en, instructions_es, instructions_it, instructions_tr, instructions_ru, instructions_zh, muscle_group, secondary_muscles, target, image, gif_url, created_at'

function escStr(val: unknown, db: Db): string {
  if (val === null || val === undefined) return 'NULL'
  const s = String(val).replace(/'/g, "''")
  return db === 'mssql' ? `N'${s}'` : `'${s}'`
}

function buildInserts(exercises: Exercise[], db: Db): string {
  const lines: string[] = []
  lines.push(db === 'mssql' ? 'BEGIN TRANSACTION;\nGO\n' : 'BEGIN;\n')

  exercises.forEach((ex, i) => {
    const muscles = JSON.stringify(
      Array.isArray(ex.secondary_muscles) ? ex.secondary_muscles : []
    )
    const instr = ex.instructions ?? {}
    const vals = [
      escStr(ex.id, db),
      escStr(ex.name, db),
      escStr(ex.category, db),
      escStr(ex.body_part, db),
      escStr(ex.equipment, db),
      escStr(instr.en ?? '', db),
      escStr(instr.es ?? '', db),
      escStr(instr.it ?? '', db),
      escStr(instr.tr ?? '', db),
      escStr(instr.ru ?? '', db),
      escStr(instr.zh ?? '', db),
      escStr(ex.muscle_group, db),
      escStr(muscles, db),
      escStr(ex.target, db),
      escStr(ex.image, db),
      escStr(ex.gif_url, db),
      escStr(ex.created_at, db)
    ].join(', ')

    lines.push(`INSERT INTO exercises (${COLUMNS}) VALUES (${vals});`)

    // Batch commits every 50 rows for SQL Server compatibility
    if (db === 'mssql' && (i + 1) % 50 === 0 && i + 1 < exercises.length) {
      lines.push('GO')
    }
  })

  lines.push(db === 'mssql' ? '\nCOMMIT;\nGO' : '\nCOMMIT;')
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = String(query.db ?? 'postgresql') as Db
  const valid: Db[] = ['mssql', 'postgresql', 'mysql', 'sqlite']
  if (!valid.includes(db)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown database engine' })
  }

  const all = await loadExercises()
  const sql = buildInserts(all, db)

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="exercises_insert_${db}.sql"`
  )
  return sql
})
