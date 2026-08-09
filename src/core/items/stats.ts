import { dayNumber } from '@core/greeting'
import type { Item, MediaType } from './types'

/**
 * As contas da tela de concluídos — "o ano em revista".
 *
 * O briefing pede que concluir vire troféu, e troféu precisa de número: quantos
 * livros, quantas horas de jogo, quantos episódios. Tudo puro e fora da tela,
 * porque é regra de produto (o que conta como concluído, o que entra em cada
 * unidade) e não desenho.
 */

/**
 * O que está concluído — e SÓ o status decide (decisão 16).
 *
 * Exigia data também, e isso deixou de fazer sentido quando o app parou de
 * carimbá-la: num app de backlog a maior parte da estante entra de uma vez,
 * com anos de coisas já vistas, e "hoje" seria mentira em quase todas. Com a
 * exigência, tudo que fosse concluído a partir de agora sumiria desta tela.
 */
export function completedItems(items: Item[]): Item[] {
  return items.filter((i) => i.status === 'done')
}

/**
 * Anos com alguma conclusão DATADA, do mais recente para o mais antigo.
 *
 * Devolve vazio quando ninguém tem data — e é assim que a tela sabe esconder o
 * filtro de ano em vez de mostrar um filtro que não filtra nada. As datas que
 * existem são de antes da decisão 16, ou virão de uma importação que traga a
 * data de verdade.
 */
export function yearsWithCompletions(items: Item[]): number[] {
  const years = new Set<number>()
  for (const item of completedItems(items))
    if (item.completedAt) years.add(new Date(item.completedAt).getFullYear())
  return [...years].sort((a, b) => b - a)
}

export function completedInYear(items: Item[], year?: number): Item[] {
  const done = completedItems(items)
  const filtered =
    year === undefined
      ? done
      : done.filter(
          (i) =>
            i.completedAt &&
            new Date(i.completedAt).getFullYear() === year,
        )

  // Mais recente primeiro. Sem data de conclusão, a de ENTRADA é o melhor
  // substituto: ela também é "o mais novo primeiro", só que do catálogo.
  return filtered.sort((a, b) =>
    (b.completedAt ?? b.addedAt).localeCompare(a.completedAt ?? a.addedAt),
  )
}

export interface MediaCount {
  mediaType: MediaType
  count: number
}

export interface CompletedSummary {
  total: number
  /** Só as mídias com pelo menos um item — nada de "0 livros" na tela. */
  byMedia: MediaCount[]
  /** Somas de progresso, por unidade. Zero quando ninguém registrou nada. */
  hoursPlayed: number
  pagesRead: number
  episodesWatched: number
}

/** Ordem de exibição quando quem chama não passa a da pessoa. */
const MEDIA_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

/**
 * Resumo de um conjunto já filtrado por ano.
 *
 * As somas usam `progress.current`, que é o que a pessoa registrou — e não o
 * `total` do provider. Um livro de 400 páginas marcado como lido sem nunca ter
 * o progresso preenchido conta 0 páginas, de propósito: o número precisa ser
 * dela, não uma estimativa nossa. Inflar isso transformaria o troféu em enfeite.
 */
export function summarizeCompleted(
  items: Item[],
  order: MediaType[] = MEDIA_ORDER,
): CompletedSummary {
  const counts = new Map<MediaType, number>()
  let hoursPlayed = 0
  let pagesRead = 0
  let episodesWatched = 0

  for (const item of items) {
    counts.set(item.mediaType, (counts.get(item.mediaType) ?? 0) + 1)

    const progress = item.progress
    if (!progress || !Number.isFinite(progress.current)) continue
    if (progress.unit === 'hour') hoursPlayed += progress.current
    else if (progress.unit === 'page') pagesRead += progress.current
    else if (progress.unit === 'episode') episodesWatched += progress.current
  }

  return {
    total: items.length,
    byMedia: order.filter((m) => counts.has(m)).map((mediaType) => ({
      mediaType,
      count: counts.get(mediaType) as number,
    })),
    hoursPlayed,
    pagesRead,
    episodesWatched,
  }
}

/**
 * O que está em andamento — o herói da home.
 *
 * Ordenado pela ORDEM DE MÍDIA QUE A PESSOA ESCOLHEU (Configurações › Editar
 * categorias), e só depois por quando ela começou.
 *
 * Antes era só a recência, e o carrossel embaralhava as mídias: um livro entre
 * dois jogos, um anime no fim. Quem arrastou "Jogos" para o topo da home disse
 * o que quer ver primeiro, e não faz sentido a lista logo abaixo desobedecer.
 * A recência continua valendo DENTRO de cada mídia, que é onde ela ajuda: entre
 * dois jogos, o que você pegou ontem vem antes do que arrasta desde março.
 *
 * `order` ausente = ordem canônica, que é o que os testes usam.
 */
export function inProgress(items: Item[], order: MediaType[] = MEDIA_ORDER): Item[] {
  const rank = new Map(order.map((media, i) => [media, i]))
  return items
    .filter((i) => i.status === 'active')
    .sort((a, b) => {
      // Mídia fora da ordem vai para o fim, em vez de virar `undefined` e
      // bagunçar a comparação inteira.
      const posA = rank.get(a.mediaType) ?? order.length
      const posB = rank.get(b.mediaType) ?? order.length
      if (posA !== posB) return posA - posB
      return (b.startedAt ?? b.addedAt).localeCompare(a.startedAt ?? a.addedAt)
    })
}

/** Progresso da estante de uma mídia: `concluídos de total`. É o que a linha
 *  da home mostra, e a barra entre os dois números é uma fração de verdade. */
export interface ShelfProgress {
  completed: number
  total: number
}

export function shelfProgress(
  items: Item[],
  mediaType: MediaType,
): ShelfProgress {
  let completed = 0
  let total = 0
  for (const item of items) {
    if (item.mediaType !== mediaType) continue
    total += 1
    if (item.status === 'done') completed += 1
  }
  return { completed, total }
}

/**
 * Empurrãozinho para quem tem fila mas não começou nada: alguns itens da
 * PRÓPRIA estante, sorteados de forma estável no dia (mesma semente do
 * vocativo). Não é a recomendação por mood do briefing — aquela pensa, custa
 * uma chamada de LLM e vem depois. Esta só diz "que tal um destes?".
 */
export function suggestFromBacklog(
  items: Item[],
  date: Date,
  limit = 4,
): Item[] {
  const queue = items.filter((i) => i.status === 'backlog')
  if (queue.length <= limit) return queue

  // Janela deslizante sobre a fila ordenada: no dia seguinte ela anda, então a
  // sugestão muda sem repetir sempre os mesmos quatro do topo.
  const start = ((dayNumber(date) % queue.length) + queue.length) % queue.length
  const ordered = [...queue].sort((a, b) => a.addedAt.localeCompare(b.addedAt))
  return Array.from(
    { length: limit },
    (_, i) => ordered[(start + i) % ordered.length],
  )
}
