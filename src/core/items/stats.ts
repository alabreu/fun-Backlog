import type { Item, MediaType } from './types'

/**
 * As contas da tela de concluídos — "o ano em revista".
 *
 * O briefing pede que concluir vire troféu, e troféu precisa de número: quantos
 * livros, quantas horas de jogo, quantos episódios. Tudo puro e fora da tela,
 * porque é regra de produto (o que conta como concluído, o que entra em cada
 * unidade) e não desenho.
 */

/** Só o que está concluído E tem data — o check da migração 0004 garante o par,
 *  mas a estante local de versões antigas pode ter escapado. */
export function completedItems(items: Item[]): Item[] {
  return items.filter((i) => i.status === 'done' && Boolean(i.completedAt))
}

/** Anos com alguma conclusão, do mais recente para o mais antigo. */
export function yearsWithCompletions(items: Item[]): number[] {
  const years = new Set<number>()
  for (const item of completedItems(items))
    years.add(new Date(item.completedAt as string).getFullYear())
  return [...years].sort((a, b) => b - a)
}

export function completedInYear(items: Item[], year?: number): Item[] {
  const done = completedItems(items)
  const filtered =
    year === undefined
      ? done
      : done.filter(
          (i) => new Date(i.completedAt as string).getFullYear() === year,
        )

  // Mais recente primeiro: a tela de troféu conta uma história em ordem
  // inversa, e o que você acabou de terminar é o que você quer ver.
  return filtered.sort((a, b) =>
    (b.completedAt as string).localeCompare(a.completedAt as string),
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

const MEDIA_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

/**
 * Resumo de um conjunto já filtrado por ano.
 *
 * As somas usam `progress.current`, que é o que a pessoa registrou — e não o
 * `total` do provider. Um livro de 400 páginas marcado como lido sem nunca ter
 * o progresso preenchido conta 0 páginas, de propósito: o número precisa ser
 * dela, não uma estimativa nossa. Inflar isso transformaria o troféu em enfeite.
 */
export function summarizeCompleted(items: Item[]): CompletedSummary {
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
    byMedia: MEDIA_ORDER.filter((m) => counts.has(m)).map((mediaType) => ({
      mediaType,
      count: counts.get(mediaType) as number,
    })),
    hoursPlayed,
    pagesRead,
    episodesWatched,
  }
}
