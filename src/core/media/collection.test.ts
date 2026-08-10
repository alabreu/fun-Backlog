import { describe, expect, it } from 'vitest'
import type { Item, ItemStatus } from '@core/items/types'
import { collectionState, sortByCollection } from './collection'
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
