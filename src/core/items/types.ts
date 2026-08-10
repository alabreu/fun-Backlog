/**
 * O item do catálogo — o tipo central do produto.
 *
 * As cinco mídias têm metadados diferentes e "progresso" significa coisa
 * diferente em cada uma. A saída aqui é: campos COMUNS tipados (é o que o grid,
 * os filtros e a ordenação usam) + duas bolsas flexíveis (`externalIds` e
 * `progress`) para o que é específico de cada mídia. Nada de uma tabela por
 * mídia, e nada de um enum de status por mídia — ver `status.ts` para o porquê.
 */

export const MEDIA_TYPES = ['game', 'movie', 'series', 'anime', 'book'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

/**
 * Status UNIVERSAIS: cinco estados que existem em todas as mídias e que a UI
 * entende (filtro, seção do grid, animação de conclusão). A nuance por mídia
 * NÃO entra aqui — "platinado", "em dia", "largado no capítulo 3" viram
 * `statusDetail` + `progress`. Enum pequeno e fechado no núcleo, riqueza nas
 * bordas: é o que evita a explosão combinatória de 5 mídias × N estados.
 */
export const ITEM_STATUSES = [
  'backlog',
  'active',
  'paused',
  'done',
  'abandoned',
] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

/** Unidade de progresso de cada mídia. Filme não tem — ver `progressUnitFor`. */
/** `hour` SAIU (09/08/2026, decisão 21). Jogo não tem mais campo de progresso.
 *  Itens antigos podem ter a unidade gravada na coluna `progress` — nada os
 *  apaga, e nada mais os lê. */
export type ProgressUnit = 'page' | 'episode'

export interface Progress {
  unit: ProgressUnit
  /** Onde a pessoa está (página, episódio, horas jogadas). */
  current: number
  /** Total conhecido, quando o provider souber (páginas, episódios). */
  total?: number
}

/** Ids do item nas fontes externas, por provider: `{ anilist: '21' }`. */
export type ExternalIds = Partial<Record<string, string>>

export interface Item {
  id: string
  mediaType: MediaType
  title: string
  coverUrl?: string
  externalIds: ExternalIds
  status: ItemStatus
  /** Nuance por mídia, livre de propósito (ex.: 'platinum', 'caught-up'). */
  statusDetail?: string
  progress?: Progress
  /** 1 a 5. Meia-estrela não existe: decisão de produto, não limitação. */
  rating?: number
  /**
   * Marcador da pessoa, e NÃO uma sexta estrela.
   *
   * Nota responde "isto é bom?"; favorita responde "isto é meu". Os dois eixos
   * são independentes — dá para amar um filme de nota 3 e reconhecer um de nota
   * 5 que não é seu. Por isso é campo próprio, com cor própria na tela.
   */
  favorite?: boolean
  notes?: string
  tags: string[]
  addedAt: string
  startedAt?: string
  completedAt?: string
}

/**
 * O que a UI precisa fornecer para criar um item; o resto o repositório põe.
 * `addedAt` é opcional e não omitido porque a migração convidado→conta precisa
 * PRESERVAR a data original — "adicionei isso em janeiro" é informação do
 * usuário, não detalhe de implementação.
 */
export type NewItem = Omit<Item, 'id' | 'addedAt' | 'tags' | 'status'> &
  Partial<Pick<Item, 'tags' | 'status' | 'addedAt'>>

/** Campos editáveis de um item existente. */
export type ItemPatch = Partial<
  Omit<Item, 'id' | 'addedAt' | 'externalIds' | 'mediaType'>
>
