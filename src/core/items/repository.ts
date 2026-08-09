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
    addedAt: input.addedAt ?? new Date().toISOString(),
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

/**
 * O que está guardado localmente, independente de quem está logado. Existe para
 * a migração convidado→conta: ela precisa olhar o storage local ENQUANTO o
 * repositório ativo já é o da nuvem.
 */
export function readLocalItems(): Item[] {
  return readLocal()
}

/** Esvazia a estante local (chamado depois de migrar para a conta). */
export function clearLocalItems(): void {
  writeLocal([])
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
  favorite: boolean | null
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
    favorite: row.favorite ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    addedAt: row.added_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  }
}

/** Só os campos presentes viram coluna — `undefined` no patch significa
 *  "não mexa", e `null` no banco significa "apague". */
/**
 * O patch do app vira a linha do Postgres.
 *
 * A REGRA É `in`, NÃO `!== undefined`, e a diferença é a que fazia "tirar a
 * nota" não funcionar na conta. Apagar um campo é `update(id, { rating:
 * undefined })` — a chave ESTÁ no objeto, o valor é que é vazio. Testando por
 * `!== undefined`, esse patch era indistinguível de "não falei de nota": a
 * coluna ficava de fora do UPDATE, o Postgres devolvia a linha intacta, e a
 * nota reaparecia. Na conta a nota era impossível de apagar; no modo convidado
 * (que faz spread e não passa por aqui) sempre funcionou.
 *
 * `in` separa as duas coisas: chave ausente é "não mexa", chave presente com
 * vazio é "limpe". Vale para nota, notas, progresso e as datas — todos tinham
 * o mesmo defeito esperando alguém tentar apagá-los.
 *
 * O `?? null` continua sendo necessário: `undefined` some no JSON, e a coluna
 * precisa receber NULL escrito.
 */
export function toRow(
  patch: ItemPatch & Partial<NewItem>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if ('mediaType' in patch) row.media_type = patch.mediaType
  if ('title' in patch) row.title = patch.title
  if ('coverUrl' in patch) row.cover_url = patch.coverUrl ?? null
  if ('externalIds' in patch) row.external_ids = patch.externalIds
  if ('status' in patch) row.status = patch.status
  if ('statusDetail' in patch) row.status_detail = patch.statusDetail ?? null
  if ('progress' in patch) row.progress = patch.progress ?? null
  if ('rating' in patch) row.rating = patch.rating ?? null
  // Só entra na linha quando o patch FALA dele. Não é micro-otimização: a
  // coluna nasce na migração 0005, e um update que sempre mandasse
  // `favorite` falharia inteiro num banco que ainda não a tem — levando
  // junto a mudança de status ou de progresso que a pessoa queria salvar.
  if ('favorite' in patch) row.favorite = patch.favorite ?? false
  if ('notes' in patch) row.notes = patch.notes ?? null
  if ('tags' in patch) row.tags = patch.tags
  // Só na criação (a migração convidado→conta manda a data original); num
  // update comum `addedAt` nunca vem, e a coluna fica com o default do banco.
  if ('addedAt' in patch) row.added_at = patch.addedAt
  if ('startedAt' in patch) row.started_at = patch.startedAt ?? null
  if ('completedAt' in patch) row.completed_at = patch.completedAt ?? null
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
