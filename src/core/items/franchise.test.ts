import { describe, expect, it } from 'vitest'
import { stripSeasonSuffix } from '@core/title'
import { groupByFranchise, shelfFamilyKey, shelfFamilyName } from './franchise'
import type { Item } from './types'

function item(title: string, over: Partial<Item> = {}): Item {
  return {
    id: title,
    mediaType: 'anime',
    title,
    externalIds: {},
    status: 'backlog',
    tags: [],
    addedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('sufixo de temporada', () => {
  it('corta as formas que o anime usa', () => {
    expect(stripSeasonSuffix('Attack on Titan Season 2')).toBe('Attack on Titan')
    expect(stripSeasonSuffix('Dandadan 2nd Season')).toBe('Dandadan')
    expect(stripSeasonSuffix('Vinland Saga Season 2')).toBe('Vinland Saga')
    expect(stripSeasonSuffix('Bleach Part 2')).toBe('Bleach')
    expect(stripSeasonSuffix('Frieren 2ª Temporada')).toBe('Frieren')
    expect(stripSeasonSuffix('Frieren Temporada 2')).toBe('Frieren')
  })

  it('corta empilhado', () => {
    expect(stripSeasonSuffix('Attack on Titan Season 4 Part 2')).toBe(
      'Attack on Titan',
    )
  })

  // O limite deliberado da regra: ela casa a PALAVRA, nunca um número solto.
  // Cortar número no fim agruparia sequência com original em toda mídia, que é
  // uma decisão de produto bem maior do que "temporadas do mesmo anime".
  it('não toca em número que não diz temporada', () => {
    expect(stripSeasonSuffix('Spider-Man 2')).toBe('Spider-Man 2')
    expect(stripSeasonSuffix('Final Fantasy VII')).toBe('Final Fantasy VII')
    expect(stripSeasonSuffix('Dune: Part Two')).toBe('Dune: Part Two')
  })

  it('não devolve string vazia quando o título inteiro é o sufixo', () => {
    expect(stripSeasonSuffix('Season 2')).toBe('Season 2')
  })
})

describe('família da estante', () => {
  it('junta temporada com a obra base', () => {
    expect(shelfFamilyKey(item('Dandadan'))).toBe(
      shelfFamilyKey(item('Dandadan 2nd Season')),
    )
  })

  it('junta pelo prefixo, como a busca já fazia', () => {
    expect(shelfFamilyKey(item('The Legend of Zelda'))).toBe(
      shelfFamilyKey(item('The Legend of Zelda: Ocarina of Time')),
    )
  })

  it('o nome exibido não é o normalizado', () => {
    expect(shelfFamilyName(item('Pokémon: Preto e Branco'))).toBe('Pokémon')
  })
})

describe('agrupamento da seção', () => {
  it('empilha a família e deixa o resto no lugar', () => {
    const entradas = groupByFranchise([
      item('Um anime qualquer'),
      item('Dandadan'),
      item('Dandadan 2nd Season'),
      item('Outro qualquer'),
    ])

    expect(entradas.map((e) => (e.kind === 'stack' ? e.name : e.item.title))).toEqual([
      'Um anime qualquer',
      // A pilha nasce na posição do primeiro membro, não no fim da lista.
      'Dandadan',
      'Outro qualquer',
    ])
    const pilha = entradas[1]
    expect(pilha.kind === 'stack' && pilha.items.map((i) => i.title)).toEqual([
      'Dandadan',
      'Dandadan 2nd Season',
    ])
  })

  it('obra sozinha na família não vira pilha', () => {
    const entradas = groupByFranchise([item('Dandadan'), item('Frieren')])
    expect(entradas.every((e) => e.kind === 'item')).toBe(true)
  })

  it('o limiar é ajustável', () => {
    const tres = [item('Zelda: A'), item('Zelda: B'), item('Zelda: C')]
    expect(groupByFranchise(tres.slice(0, 2), 3).every((e) => e.kind === 'item')).toBe(
      true,
    )
    expect(groupByFranchise(tres, 3)).toHaveLength(1)
  })

  // A garantia de que agrupar não é fundir: os itens saem inteiros do outro
  // lado, e nenhum some.
  it('não perde nem duplica item', () => {
    const entrada = [
      item('Zelda: A'),
      item('Solo'),
      item('Zelda: B'),
      item('Zelda: C'),
    ]
    const saida = groupByFranchise(entrada).flatMap((e) =>
      e.kind === 'stack' ? e.items : [e.item],
    )
    expect(saida).toHaveLength(entrada.length)
    expect(new Set(saida.map((i) => i.id)).size).toBe(entrada.length)
  })

  // Título que normaliza para nada não pode juntar todos os sem-nome num balde.
  it('título sem letra nem número fica sozinho', () => {
    const entradas = groupByFranchise([item('???'), item('!!!')])
    expect(entradas.every((e) => e.kind === 'item')).toBe(true)
  })
})
