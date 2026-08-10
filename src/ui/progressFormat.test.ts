import { describe, expect, it } from 'vitest'
import { makeProgressFormat } from './progressFormat'

/** Um `t` de mentira que devolve a chave e os parâmetros: o teste é sobre QUAL
 *  forma é escolhida, não sobre a tradução — essa já tem teste próprio. */
const t = ((key: string, params?: Record<string, string | number>) =>
  params ? `${key}(${JSON.stringify(params)})` : key) as never

const DUAS = [
  { number: 1, episodes: 10 },
  { number: 2, episodes: 9 },
]
const UMA = [{ number: 1, episodes: 19 }]

describe('makeProgressFormat', () => {
  it('com várias temporadas, fala em temporada e episódio', () => {
    const dizer = makeProgressFormat(t, 'series', DUAS)
    expect(dizer(12)).toBe('item.seasonEpisode({"season":2,"episode":2})')
  })

  // O pedido do usuário (09/08/2026): "T1" em toda posição de uma minissérie é
  // repetir a única temporada que existe.
  it('com uma temporada só, some o T e sobra o E', () => {
    const dizer = makeProgressFormat(t, 'series', UMA)
    expect(dizer(3)).toBe('item.episodeShort({"episode":3})')
    // Inclusive no zero, que não cai em temporada nenhuma e antes virava o
    // "Episódio 0" por extenso — o rótulo mais largo do balão.
    expect(dizer(0)).toBe('item.episodeShort({"episode":0})')
  })

  it('sem temporadas, o rótulo é o da unidade', () => {
    expect(makeProgressFormat(t, 'book', undefined)(234)).toBe(
      'item.progress.page 234',
    )
    expect(makeProgressFormat(t, 'series', [])(7)).toBe(
      'item.progress.episode 7',
    )
  })

  // Episódio 0 numa série de VÁRIAS temporadas não cai em nenhuma delas, então
  // não há "T? E0" para dizer — cai no genérico, e é o único caso em que ele
  // ainda aparece numa série.
  it('o zero de uma série longa cai no genérico', () => {
    expect(makeProgressFormat(t, 'series', DUAS)(0)).toBe(
      'item.progress.episode 0',
    )
  })
})
