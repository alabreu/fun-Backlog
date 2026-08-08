import type { MessageKey } from '@core/i18n'
import type { ItemStatus, MediaType, ProgressUnit } from './types'

/**
 * O vocabulário do catálogo: como cada status se CHAMA em cada mídia, e o que
 * "progresso" significa nelas.
 *
 * O status guardado é universal (5 valores, ver `types.ts`), mas o rótulo não
 * pode ser: dizer "concluído" para um jogo soa a planilha, e "zerado" é a
 * palavra que a pessoa usa. Só dois dos cinco estados mudam de nome por mídia —
 * os outros três são universais também na linguagem. Por isso o mapa abaixo é
 * pequeno: 10 chaves em vez das 25 que um enum por mídia exigiria.
 */

/**
 * Os dois estados cujo nome muda de mídia para mídia. Escrito como mapa, e não
 * montado por template (`status.${media}.${status}`), porque o mapa é
 * verificado pelo compilador: `MessageKey` só aceita chave que exista de fato
 * em `i18n/pt.ts`, então esquecer uma tradução quebra o build em vez de vazar
 * a chave crua para a tela.
 */
const NAMED_BY_MEDIA: Record<
  MediaType,
  Record<'active' | 'done', MessageKey>
> = {
  game: { active: 'status.game.active', done: 'status.game.done' },
  movie: { active: 'status.movie.active', done: 'status.movie.done' },
  series: { active: 'status.series.active', done: 'status.series.done' },
  anime: { active: 'status.anime.active', done: 'status.anime.done' },
  book: { active: 'status.book.active', done: 'status.book.done' },
}

const UNIVERSAL: Record<'backlog' | 'paused' | 'abandoned', MessageKey> = {
  backlog: 'status.backlog',
  paused: 'status.paused',
  abandoned: 'status.abandoned',
}

/** Chave de i18n do rótulo de um status, para uma mídia. */
export function statusLabelKey(
  status: ItemStatus,
  mediaType: MediaType,
): MessageKey {
  return status === 'active' || status === 'done'
    ? NAMED_BY_MEDIA[mediaType][status]
    : UNIVERSAL[status]
}

/** Chave de i18n do nome de uma mídia (plural, como nos filtros). */
export function mediaLabelKey(mediaType: MediaType): MessageKey {
  const keys: Record<MediaType, MessageKey> = {
    game: 'media.game',
    movie: 'media.movie',
    series: 'media.series',
    anime: 'media.anime',
    book: 'media.book',
  }
  return keys[mediaType]
}

/** Chave de i18n do rótulo da unidade de progresso. */
export function progressLabelKey(unit: ProgressUnit): MessageKey {
  const keys: Record<ProgressUnit, MessageKey> = {
    page: 'item.progress.page',
    episode: 'item.progress.episode',
    hour: 'item.progress.hour',
  }
  return keys[unit]
}

/**
 * A unidade em que o progresso é contado. Filme não tem progresso: ou você
 * assistiu, ou não — e inventar uma barra de progresso para ele seria a
 * interface mentindo sobre o formato da mídia.
 */
export function progressUnitFor(
  mediaType: MediaType,
): ProgressUnit | undefined {
  switch (mediaType) {
    case 'book':
      return 'page'
    case 'series':
    case 'anime':
      return 'episode'
    case 'game':
      return 'hour'
    case 'movie':
      return undefined
  }
}

/**
 * Efeitos colaterais de mudar de status, nas datas. Devolve só o que muda —
 * quem chama aplica sobre o item.
 *
 * `startedAt` é preservado quando já existe: pausar e voltar não deve reescrever
 * a data em que a pessoa começou. `completedAt` é limpo ao sair de `done`, senão
 * a tela de "concluídos" mostraria como troféu do ano algo que foi desmarcado.
 */
export function datesForStatus(
  status: ItemStatus,
  current: { startedAt?: string; completedAt?: string },
  now: string,
): { startedAt?: string; completedAt?: string } {
  const started =
    current.startedAt ??
    (status === 'active' || status === 'done' ? now : undefined)

  return {
    startedAt: started,
    completedAt: status === 'done' ? (current.completedAt ?? now) : undefined,
  }
}

/**
 * A ORDEM DAS SEÇÕES da estante, por mídia.
 *
 * A estante deixou de ter filtro de status e passou a ter seções fixas, todas
 * visíveis — inclusive as vazias. Com nada escondido, a ordem é a única coisa
 * que organiza a tela, e ela não pode ser a mesma para as cinco mídias porque a
 * pergunta que se faz ao abrir cada estante é diferente.
 *
 * A regra é uma só: PRIMEIRO O QUE VOCÊ MAIS PROVAVELMENTE VEIO FAZER.
 *
 * - Jogos, séries, animes e livros abrem com o que está EM ANDAMENTO. São
 *   mídias de sessão longa: você volta para continuar, não para escolher.
 *
 * - Filmes abrem com a FILA. "Assistindo" um filme é um estado de duas horas,
 *   que na prática está quase sempre vazio — pôr uma seção vazia no topo da
 *   estante mais usada para escolher seria organizar pela exceção.
 *
 * Depois disso: pausado (a fila viva de segunda ordem), concluído e abandonado.
 * Os dois últimos são ARQUIVO — consulta, não decisão — e por isso vão ao fim
 * em todas as mídias.
 *
 * Pausado fica alto de propósito em jogos, séries, animes e livros: é onde mora
 * o que foi largado no meio, que é candidato a retomar. Em filmes ele desce,
 * porque filme pausado é raro.
 */
export const SHELF_SECTIONS: Record<MediaType, ItemStatus[]> = {
  game: ['active', 'backlog', 'paused', 'done', 'abandoned'],
  series: ['active', 'backlog', 'paused', 'done', 'abandoned'],
  anime: ['active', 'backlog', 'paused', 'done', 'abandoned'],
  book: ['active', 'backlog', 'paused', 'done', 'abandoned'],
  movie: ['backlog', 'active', 'paused', 'done', 'abandoned'],
}

export function shelfSections(mediaType: MediaType): ItemStatus[] {
  return SHELF_SECTIONS[mediaType]
}
