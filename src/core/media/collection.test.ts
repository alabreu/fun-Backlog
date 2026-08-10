import { describe, expect, it } from 'vitest'
import type { Item, ItemStatus } from '@core/items/types'
import {
  collectionState,
  groupResultsByFranchise,
  sortByCollection,
  sortByRelease,
} from './collection'
import type { MediaSearchResult } from './types'

const obra = (externalId: string): MediaSearchResult => ({
  provider: 'anilist',
  externalId,
  mediaType: 'anime',
  title: `Obra ${externalId}`,
})

const meu = (externalId: string, status: ItemStatus): Item => ({
  id: externalId,
  mediaType: 'anime',
  title: `Obra ${externalId}`,
  externalIds: { anilist: externalId },
  status,
  tags: [],
  addedAt: '2026-01-01T00:00:00.000Z',
})

describe('estado na coleção', () => {
  it('sem item na estante, está faltando', () => {
    expect(collectionState(obra('1'), [])).toBe('missing')
  })

  it('na estante e concluída, terminada', () => {
    expect(collectionState(obra('1'), [meu('1', 'done')])).toBe('done')
  })

  it('na estante em qualquer outro estado, só na estante', () => {
    for (const s of ['backlog', 'active', 'paused'] as ItemStatus[])
      expect(collectionState(obra('1'), [meu('1', s)])).toBe('shelved')
  })

  // Os dois saem da fila, mas a pergunta aqui é sobre a coleção: uma obra
  // largada no meio ainda é algo que dá para retomar.
  it('abandonada não conta como terminada', () => {
    expect(collectionState(obra('1'), [meu('1', 'abandoned')])).toBe('shelved')
  })

  // Id de OUTRO provider com o mesmo valor não pode casar.
  it('não casa id de provider diferente', () => {
    const deOutraFonte: Item = { ...meu('1', 'done'), externalIds: { tmdb: '1' } }
    expect(collectionState(obra('1'), [deOutraFonte])).toBe('missing')
  })
})

describe('ordem do carrossel', () => {
  it('o que falta vem na frente', () => {
    const ordenado = sortByCollection(
      [obra('1'), obra('2'), obra('3'), obra('4')],
      [meu('1', 'done'), meu('2', 'active')],
    )
    expect(ordenado.map((r) => r.externalId)).toEqual(['3', '4', '2', '1'])
  })

  // A cronologia da fonte sobrevive DENTRO de cada grupo — é o que mantém a
  // sequência da série legível onde ela ainda cabe.
  it('preserva a ordem da fonte dentro do grupo', () => {
    const ordenado = sortByCollection(
      [obra('a'), obra('b'), obra('c')],
      [meu('b', 'done')],
    )
    expect(ordenado.map((r) => r.externalId)).toEqual(['a', 'c', 'b'])
  })

  it('sem nada na estante, não mexe em nada', () => {
    const entrada = [obra('1'), obra('2'), obra('3')]
    expect(sortByCollection(entrada, []).map((r) => r.externalId)).toEqual([
      '1',
      '2',
      '3',
    ])
  })
})

describe('pilha de franquia na busca', () => {
  const obra = (title: string, over: Partial<MediaSearchResult> = {}) => ({
    provider: 'anilist',
    externalId: title,
    mediaType: 'anime' as const,
    title,
    ...over,
  })

  it('agrupa a franquia e deixa o resto no lugar', () => {
    const entradas = groupResultsByFranchise([
      obra('Outra coisa'),
      obra('Dandadan'),
      obra('Dandadan 2nd Season'),
    ])
    expect(entradas.map((e) => (e.kind === 'stack' ? e.name : e.result.title))).toEqual([
      'Outra coisa',
      'Dandadan',
    ])
  })

  // A mesma chave da estante — antes a busca ignorava sufixo de temporada e as
  // duas telas discordavam sobre o que é a mesma franquia.
  it('usa a mesma regra de família da estante', () => {
    const entradas = groupResultsByFranchise([
      obra('Attack on Titan'),
      obra('Attack on Titan Season 2'),
      obra('Attack on Titan Final Season THE FINAL CHAPTERS Special 1'),
    ])
    expect(entradas).toHaveLength(1)
  })

  it('obra sozinha não vira pilha', () => {
    const entradas = groupResultsByFranchise([obra('Frieren'), obra('PLUTO')])
    expect(entradas.every((e) => e.kind === 'result')).toBe(true)
  })
})

describe('ordem crescente de lançamento', () => {
  const obra = (title: string, releaseDate?: string, year?: number) => ({
    title,
    releaseDate,
    year,
  })

  it('do mais velho para o mais novo', () => {
    expect(
      sortByRelease([
        obra('c', '2024-01-01'),
        obra('a', '2013-04-07'),
        obra('b', '2019-04-29'),
      ]).map((o) => o.title),
    ).toEqual(['a', 'b', 'c'])
  })

  it('o ano serve de reserva quando falta a data cheia', () => {
    expect(
      sortByRelease([obra('novo', undefined, 2024), obra('velho', '2013-04-07')]).map(
        (o) => o.title,
      ),
    ).toEqual(['velho', 'novo'])
  })

  it('sem data nenhuma vai para o fim, na ordem que chegou', () => {
    expect(
      sortByRelease([
        obra('sem data 1'),
        obra('com data', '2020-01-01'),
        obra('sem data 2'),
      ]).map((o) => o.title),
    ).toEqual(['com data', 'sem data 1', 'sem data 2'])
  })
})
