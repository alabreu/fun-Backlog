import { describe, expect, it } from 'vitest'
import {
  episodesThrough,
  locate,
  seasonProgress,
  type SeasonInfo,
} from './seasons'

/** Breaking Bad: 7, 13, 13, 13, 16 — 62 episódios, temporadas desiguais, que é
 *  justamente onde uma conta "episódios ÷ temporadas" erraria. */
const BB: SeasonInfo[] = [
  { number: 1, episodes: 7 },
  { number: 2, episodes: 13 },
  { number: 3, episodes: 13 },
  { number: 4, episodes: 13 },
  { number: 5, episodes: 16 },
]

describe('episodesThrough', () => {
  it('soma as temporadas anteriores junto com a pedida', () => {
    expect(episodesThrough(BB, 1)).toBe(7)
    expect(episodesThrough(BB, 2)).toBe(20)
    expect(episodesThrough(BB, 5)).toBe(62)
  })

  // Chutar para cima marcaria como visto o que ninguém viu.
  it('temporada que não existe não vira o total', () => {
    expect(episodesThrough(BB, 9)).toBe(62)
    expect(episodesThrough(BB, 0)).toBe(0)
  })
})

describe('locate', () => {
  it('traduz a contagem corrida para temporada e episódio', () => {
    expect(locate(1, BB)).toEqual({ season: 1, episode: 1 })
    // A fronteira: 7 é o ÚLTIMO da primeira, 8 é o primeiro da segunda.
    expect(locate(7, BB)).toEqual({ season: 1, episode: 7 })
    expect(locate(8, BB)).toEqual({ season: 2, episode: 1 })
    // Meio de temporada: 20 fecham a T2, então o 25 é o quinto da T3.
    expect(locate(25, BB)).toEqual({ season: 3, episode: 5 })
    // 46 fecham a T4 — o 47 é a estreia da última.
    expect(locate(47, BB)).toEqual({ season: 5, episode: 1 })
    expect(locate(62, BB)).toEqual({ season: 5, episode: 16 })
  })

  it('não inventa posição para quem não começou', () => {
    expect(locate(0, BB)).toBeNull()
    expect(locate(-3, BB)).toBeNull()
  })

  // Acontece de verdade: a série estreia uma temporada nova e a ficha guardada
  // ainda é a antiga. Melhor cair no número cru que mentir uma posição.
  it('não inventa posição além do que a tabela conhece', () => {
    expect(locate(70, BB)).toBeNull()
  })
})

describe('seasonProgress', () => {
  it('reparte a contagem corrida entre as temporadas', () => {
    const p = seasonProgress(25, BB)
    expect(p.map((s) => s.watched)).toEqual([7, 13, 5, 0, 0])
    expect(p.map((s) => s.done)).toEqual([true, true, false, false, false])
  })

  it('leva o alvo de "fechar esta temporada" junto', () => {
    expect(seasonProgress(0, BB).map((s) => s.through)).toEqual([
      7, 20, 33, 46, 62,
    ])
  })

  // Sem o corte, uma contagem maior que o total pintaria tudo como parcial.
  it('contagem além do total não vaza para as temporadas', () => {
    expect(seasonProgress(999, BB).every((s) => s.done)).toBe(true)
    expect(seasonProgress(999, BB).map((s) => s.watched)).toEqual([
      7, 13, 13, 13, 16,
    ])
  })

  it('nada visto deixa todas zeradas', () => {
    expect(seasonProgress(0, BB).every((s) => s.watched === 0)).toBe(true)
  })
})
