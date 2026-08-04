import { storageKey } from '@core/config'
import { supabase } from '@core/backend/client'
import type { Item, ItemPatch, NewItem } from './types'

/**
 * Onde os itens vivem. Duas implementações atrás de UMA interface: localStorage
 * para quem está sem conta, Postgres para quem entrou. A UI nunca escolhe — ela
 * chama `itemsRepository()` e recebe a que vale agora.
 *
 * Por que local existe: o app tem que abrir e ser usável sem nenhuma variável
 * de ambiente (regra herdada do boilerplate). Sem conta você cataloga à mão; a
 * busca por capa é que exige login, porque ela passa pelo servidor que guarda a
 * chave da API.
 */
export interface ItemsRepository {
  list(): Promise<Item[]>
  add(input: NewItem): Promise<Item>
  update(id: string, patch: ItemPatch): Promise<Item>
  remove(id: string): Promise<void>
}

const STORAGE_KEY = storageKey('items')

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `local-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

function hydrate(input: NewItem): Item {
  return {
    ...input,
    id: newId(),
    status: input.status ?? 'backlog',
    tags: input.tags ?? [],
    addedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Local (convidado)
// ---------------------------------------------------------------------------

function readLocal(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Item[]) : []
  } catch {
    return []
  }
}

function writeLocal(items: Item[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Quota estourada ou modo privado: a sessão continua em memória.
  }
}

export const localItemsRepository: ItemsRepository = {
  async list() {
    return readLocal()
  },
  async add(input) {
    const item = hydrate(input)
    writeLocal([item, ...readLocal()])
    return item
  },
  async update(id, patch) {
    const items = readLocal()
    const index = items.findIndex((i) => i.id === id)
    if (index === -1) throw new Error('item-not-found')
    const updated = { ...items[index], ...patch }
    items[index] = updated
    writeLocal(items)
    return updated
  },
  async remove(id) {
    writeLocal(readLocal().filter((i) => i.id !== id))
  },
}

// ---------------------------------------------------------------------------
// Nuvem (Postgres, via a costura de backend)
// ---------------------------------------------------------------------------

/** Linha da tabela `items` — snake_case, como o Postgres devolve. */
interface ItemRow {
  id: string
  media_type: Item['mediaType']
  title: string
  cover_url: string | null
  external_ids: Item['externalIds'] | null
  status: Item['status']
  status_detail: string | null
  progress: Item['progress'] | null
  rating: number | null
  notes: string | null
  tags: string[] | null
  added_at: string
  started_at: string | null
  completed_at: string | null
}

function fromRow(row: ItemRow): Item {
  return {
    id: row.id,
    mediaType: row.media_type,
    title: row.title,
    coverUrl: row.cover_url ?? undefined,
    externalIds: row.external_ids ?? {},
    status: row.status,
    statusDetail: row.status_detail ?? undefined,
    progress: row.progress ?? undefined,
    rating: row.rating ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    addedAt: row.added_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  }
}

/** Só os campos presentes viram coluna — `undefined` no patch significa
 *  "não mexa", e `null` no banco significa "apague". */
function toRow(patch: ItemPatch & Partial<NewItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.mediaType !== undefined) row.media_type = patch.mediaType
  if (patch.title !== undefined) row.title = patch.title
  if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl ?? null
  if (patch.externalIds !== undefined) row.external_ids = patch.externalIds
  if (patch.status !== undefined) row.status = patch.status
  if (patch.statusDetail !== undefined)
    row.status_detail = patch.statusDetail ?? null
  if (patch.progress !== undefined) row.progress = patch.progress ?? null
  if (patch.rating !== undefined) row.rating = patch.rating ?? null
  if (patch.notes !== undefined) row.notes = patch.notes ?? null
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt ?? null
  if (patch.completedAt !== undefined)
    row.completed_at = patch.completedAt ?? null
  return row
}

export const cloudItemsRepository: ItemsRepository = {
  async list() {
    if (!supabase) throw new Error('backend-not-configured')
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('added_at', { ascending: false })
    if (error) throw error
    return (data as ItemRow[]).map(fromRow)
  },

  async add(input) {
    if (!supabase) throw new Error('backend-not-configured')
    const { data: session } = await supabase.auth.getUser()
    const userId = session.user?.id
    if (!userId) throw new Error('unauthenticated')

    // `user_id` vai explícito porque a RLS exige que ele bata com auth.uid();
    // o default do banco cobriria, mas depender dele deixaria o insert quebrar
    // de um jeito opaco se a policy mudar.
    const { data, error } = await supabase
      .from('items')
      .insert({
        ...toRow({ ...input, status: input.status ?? 'backlog' }),
        user_id: userId,
        tags: input.tags ?? [],
      })
      .select()
      .single()
    if (error) throw error
    return fromRow(data as ItemRow)
  },

  async update(id, patch) {
    if (!supabase) throw new Error('backend-not-configured')
    const { data, error } = await supabase
      .from('items')
      .update(toRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return fromRow(data as ItemRow)
  },

  async remove(id) {
    if (!supabase) throw new Error('backend-not-configured')
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (error) throw error
  },
}

/**
 * A que vale agora. Decidido em runtime a cada chamada, de propósito: entrar ou
 * sair da conta troca o repositório sem ninguém remontar nada.
 */
export function itemsRepository(signedIn: boolean): ItemsRepository {
  return signedIn && supabase ? cloudItemsRepository : localItemsRepository
}
