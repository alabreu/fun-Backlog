import type { Item, ItemStatus, MediaType } from './types'

/**
 * Filtro e ordenação do catálogo. Puro e fora da tela de propósito: é a regra
 * que decide o que a estante mostra, e é onde um backlog de 300 itens vira
 * usável ou não — merece teste, e teste não deve precisar de DOM.
 */
export interface CatalogFilter {
  mediaType?: MediaType
  status?: ItemStatus
  /** Busca local por título, sem acento e sem caixa. */
  query?: string
  /**
   * Só as favoritas. `false` e ausente são a MESMA coisa — "não favoritas" não
   * é um recorte que alguém pede, e um filtro de três estados obrigaria toda
   * chamada a dizer qual dos dois "não" ela quer.
   */
  favorite?: boolean
}

/**
 * Normaliza para comparar: "Pokémon" tem que casar com "pokemon" digitado com
 * pressa no celular. NFD separa a letra do acento e o range remove só os
 * acentos, preservando o resto.
 */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filterItems(items: Item[], filter: CatalogFilter): Item[] {
  const query = filter.query ? normalize(filter.query) : ''

  return items.filter((item) => {
    if (filter.mediaType && item.mediaType !== filter.mediaType) return false
    if (filter.status && item.status !== filter.status) return false
    if (query && !normalize(item.title).includes(query)) return false
    if (filter.favorite && !item.favorite) return false
    return true
  })
}

/**
 * Ordem da estante: o que está em andamento primeiro, o resto por data de
 * entrada. Quem abre o app no sofá está quase sempre voltando para algo que já
 * começou — fazer essa pessoa rolar até achar seria o app trabalhando contra
 * ela. Concluído e abandonado descem para o fim: viraram arquivo, não fila.
 */
const STATUS_WEIGHT: Record<ItemStatus, number> = {
  active: 0,
  backlog: 1,
  paused: 2,
  done: 3,
  abandoned: 4,
}

export function sortForShelf(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byStatus = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status]
    if (byStatus !== 0) return byStatus

    // FAVORITA PRIMEIRO, DENTRO DA SEÇÃO (escolha do usuário, 09/08/2026).
    //
    // Dentro, e não acima de tudo: o coração diz "isto é meu", não "isto vem
    // antes de tudo o que estou vendo". Uma favorita concluída não pode furar
    // a fila do que está em andamento — ela já acabou. O que ela ganha é a
    // primeira fileira da própria seção, que é onde o olho bate primeiro sem
    // desmontar a ordem que a estante já tinha.
    const byFavorite = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
    if (byFavorite !== 0) return byFavorite

    return b.addedAt.localeCompare(a.addedAt)
  })
}

/** Quantos itens há em cada status — alimenta os contadores dos filtros. */
export function countByStatus(items: Item[]): Record<ItemStatus, number> {
  const counts: Record<ItemStatus, number> = {
    backlog: 0,
    active: 0,
    paused: 0,
    done: 0,
    abandoned: 0,
  }
  for (const item of items) counts[item.status] += 1
  return counts
}
