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
  /**
   * A FRANQUIA, dita pela fonte — não deduzida do título.
   *
   * A estante empilha obras da mesma família, e a família saía só do título: o
   * prefixo antes dos dois pontos mais a normalização de temporada. Isso erra
   * exatamente onde dói, que é quando a franquia MUDA DE NOME entre as obras —
   * "Shingeki no Kyojin" e "Attack on Titan" nunca se encontram assim.
   *
   * Só jogo e filme chegam com isto preenchido: `franchises` na IGDB e
   * `belongs_to_collection` na TMDB. Série, anime e livro ficam `undefined`
   * para sempre, porque a fonte deles não tem o conceito — e ali o título
   * continua sendo a única resposta possível, que é o que `shelfFamilyKey` faz.
   *
   * AUSENTE NÃO É "NÃO TEM FRANQUIA": é "ninguém perguntou ainda, ou a fonte
   * não sabe". Os dois casos caem no título, que é o comportamento anterior.
   */
  franchise?: string
  tags: string[]
  /**
   * Quando a obra sai — o que faz a seção "Não lançados" existir.
   *
   * DATA E NÃO BOOLEANO: um sinalizador apodrece no dia da estreia, e a obra
   * ficaria marcada até alguém abri-la de novo. Comparando com o relógio na
   * hora de desenhar, ela migra para a fila sozinha.
   *
   * AUSENTE É DESCONHECIDO, e desconhecido conta como JÁ LANÇADO — a esmagadora
   * maioria do que se cataloga já existe, e o contrário jogaria toda obra sem
   * data numa seção onde ela não pode ser tocada.
   */
  releasesAt?: string
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
