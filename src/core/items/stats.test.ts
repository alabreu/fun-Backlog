import { describe, expect, it } from 'vitest'
import {
  completedInYear,
  completedItems,
  summarizeCompleted,
  yearsWithCompletions,
} from './stats'
import type { Item } from './types'

function item(over: Partial<Item> = {}): Item {
  return {
    id: Math.random().toString(36).slice(2),
    mediaType: 'game',
    title: 'Um jogo',
    externalIds: {},
    status: 'backlog',
    tags: [],
    addedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function done(completedAt: string, over: Partial<Item> = {}): Item {
  return item({ status: 'done', completedAt, ...over })
}

describe('completedItems', () => {
  it('pega só o que está concluído', () => {
    const shelf = [
      done('2026-03-01T00:00:00.000Z'),
      item({ status: 'active' }),
      item({ status: 'abandoned' }),
    ]
    expect(completedItems(shelf)).toHaveLength(1)
  })

  it('ignora "concluído" sem data — troféu precisa de quando', () => {
    expect(completedItems([item({ status: 'done' })])).toEqual([])
  })
})

describe('yearsWithCompletions', () => {
  it('lista os anos do mais recente para o mais antigo, sem repetir', () => {
    const shelf = [
      done('2024-05-01T00:00:00.000Z'),
      done('2026-01-02T00:00:00.000Z'),
      done('2026-11-30T00:00:00.000Z'),
    ]
    expect(yearsWithCompletions(shelf)).toEqual([2026, 2024])
  })

  it('estante sem conclusão não tem ano nenhum', () => {
    expect(yearsWithCompletions([item()])).toEqual([])
  })
})

describe('completedInYear', () => {
  const shelf = [
    done('2026-01-02T00:00:00.000Z', { title: 'janeiro' }),
    done('2026-11-30T00:00:00.000Z', { title: 'novembro' }),
    done('2024-05-01T00:00:00.000Z', { title: 'retrasado' }),
  ]

  it('sem ano, devolve tudo', () => {
    expect(completedInYear(shelf)).toHaveLength(3)
  })

  it('filtra pelo ano pedido', () => {
    expect(completedInYear(shelf, 2026).map((i) => i.title)).toEqual([
      'novembro',
      'janeiro',
    ])
  })

  it('devolve o mais recente primeiro', () => {
    expect(completedInYear(shelf)[0].title).toBe('novembro')
  })

  it('ano sem nada devolve lista vazia', () => {
    expect(completedInYear(shelf, 2019)).toEqual([])
  })
})

describe('summarizeCompleted', () => {
  it('conta por mídia, na ordem fixa, e só as que existem', () => {
    const summary = summarizeCompleted([
      done('2026-01-01T00:00:00.000Z', { mediaType: 'book' }),
      done('2026-01-01T00:00:00.000Z', { mediaType: 'game' }),
      done('2026-01-01T00:00:00.000Z', { mediaType: 'book' }),
    ])

    expect(summary.total).toBe(3)
    expect(summary.byMedia).toEqual([
      { mediaType: 'game', count: 1 },
      { mediaType: 'book', count: 2 },
    ])
  })

  it('soma cada unidade de progresso na sua conta', () => {
    const summary = summarizeCompleted([
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'game',
        progress: { unit: 'hour', current: 80 },
      }),
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'game',
        progress: { unit: 'hour', current: 12 },
      }),
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'book',
        progress: { unit: 'page', current: 194 },
      }),
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'anime',
        progress: { unit: 'episode', current: 26 },
      }),
    ])

    expect(summary.hoursPlayed).toBe(92)
    expect(summary.pagesRead).toBe(194)
    expect(summary.episodesWatched).toBe(26)
  })

  it('não inventa número para quem não registrou progresso', () => {
    // Um livro marcado como lido sem preencher a página fica em 0, e não em
    // "total de páginas do provider" — o troféu tem que ser da pessoa.
    const summary = summarizeCompleted([
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'book',
        progress: { unit: 'page', current: 0, total: 400 },
      }),
    ])
    expect(summary.pagesRead).toBe(0)
  })

  it('sobrevive a item sem progresso nenhum', () => {
    const summary = summarizeCompleted([done('2026-01-01T00:00:00.000Z')])
    expect(summary).toMatchObject({
      total: 1,
      hoursPlayed: 0,
      pagesRead: 0,
      episodesWatched: 0,
    })
  })

  it('conjunto vazio devolve tudo zerado, sem quebrar', () => {
    expect(summarizeCompleted([])).toEqual({
      total: 0,
      byMedia: [],
      hoursPlayed: 0,
      pagesRead: 0,
      episodesWatched: 0,
    })
  })
})
