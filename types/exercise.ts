export type LangCode = 'en' | 'es' | 'it' | 'tr' | 'ru' | 'zh'

export interface Exercise {
  id: string
  name: string
  category: string
  body_part: string
  equipment: string
  instructions: Partial<Record<LangCode, string>>
  instruction_steps: Partial<Record<LangCode, string[]>>
  muscle_group: string
  secondary_muscles: string[]
  target: string
  image: string | null
  gif_url: string | null
  media_id: string | null
  created_at: string
}

export interface PagedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface FilterOptions {
  categories: string[]
  equipment: string[]
  targets: string[]
  total: number
}
