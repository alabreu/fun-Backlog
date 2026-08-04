import { describe, expect, it } from 'vitest'
import { countByStatus, filterItems, sortForShelf } from './filter'
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

describe('filterItems', () => {
  const shelf = [
    item({ title: 'Hollow Knight', mediaType: 'game', status: 'backlog' }),
    item({ title: 'Pokémon Violet', mediaType: 'game', status: 'active' }),
    item({ title: 'Duna', mediaType: 'book', status: 'done' }),
  ]

  it('sem filtro devolve tudo', () => {
    expect(filterItems(shelf, {})).toHaveLength(3)
  })

  it('filtra por mídia e por status, juntos', () => {
    expect(filterItems(shelf, { mediaType: 'game' })).toHaveLength(2)
    expect(
      filterItems(shelf, { mediaType: 'game', status: 'active' }).map(
        (i) => i.title,
      ),
    ).toEqual(['Pokémon Violet'])
  })

  it('busca ignorando caixa e acento — quem digita no celular tem pressa', () => {
    expect(filterItems(shelf, { query: 'pokemon' })).toHaveLength(1)
    expect(filterItems(shelf, { query: 'POKÉMON' })).toHaveLength(1)
    expect(filterItems(shelf, { query: 'duna' })).toHaveLength(1)
  })

  it('busca casa no meio do título', () => {
    expect(filterItems(shelf, { query: 'knight' })).toHaveLength(1)
  })

  it('busca sem resultado devolve lista vazia, não tudo', () => {
    expect(filterItems(shelf, { query: 'zzz' })).toEqual([])
  })
})

describe('sortForShelf', () => {
  it('põe o que está em andamento na frente e arquiva o que terminou', () => {
    const sorted = sortForShelf([
      item({ title: 'concluído', status: 'done' }),
      item({ title: 'na fila', status: 'backlog' }),
      item({ title: 'em andamento', status: 'active' }),
      item({ title: 'abandonado', status: 'abandoned' }),
      item({ title: 'pausado', status: 'paused' }),
    ])

    expect(sorted.map((i) => i.title)).toEqual([
      'em andamento',
      'na fila',
      'pausado',
      'concluído',
      'abandonado',
    ])
  })

  it('dentro do mesmo status, o mais novo primeiro', () => {
    const sorted = sortForShelf([
      item({ title: 'velho', addedAt: '2026-01-01T00:00:00.000Z' }),
      item({ title: 'novo', addedAt: '2026-08-01T00:00:00.000Z' }),
    ])
    expect(sorted.map((i) => i.title)).toEqual(['novo', 'velho'])
  })

  it('não mexe no array original', () => {
    const original = [item({ status: 'done' }), item({ status: 'active' })]
    const copy = [...original]
    sortForShelf(original)
    expect(original).toEqual(copy)
  })
})

describe('countByStatus', () => {
  it('conta cada status, inclusive os zerados', () => {
    expect(
      countByStatus([
        item({ status: 'active' }),
        item({ status: 'active' }),
        item({ status: 'done' }),
      ]),
    ).toEqual({ backlog: 0, active: 2, paused: 0, done: 1, abandoned: 0 })
  })
})
