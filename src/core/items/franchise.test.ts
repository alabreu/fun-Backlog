import { describe, expect, it } from 'vitest'
import { stripSequelMarkers } from '@core/title'
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

describe('marcadores de sequência', () => {
  it('corta as formas que o anime usa', () => {
    expect(stripSequelMarkers('Attack on Titan Season 2')).toBe('Attack on Titan')
    expect(stripSequelMarkers('Dandadan 2nd Season')).toBe('Dandadan')
    expect(stripSequelMarkers('Vinland Saga Season 2')).toBe('Vinland Saga')
    expect(stripSequelMarkers('Bleach Part 2')).toBe('Bleach')
    expect(stripSequelMarkers('Frieren 2ª Temporada')).toBe('Frieren')
    expect(stripSequelMarkers('Frieren Temporada 2')).toBe('Frieren')
  })

  it('corta empilhado', () => {
    expect(stripSequelMarkers('Attack on Titan Season 4 Part 2')).toBe(
      'Attack on Titan',
    )
  })

  // O CASO QUE ESCAPAVA: o marcador está no MEIO do título, seguido de mais
  // título. A primeira versão só tirava sufixo e devolvia a linha inteira, e por
  // isso este especial aparecia solto ao lado da própria pilha na estante.
  it('corta a partir do marcador, mesmo com título depois dele', () => {
    expect(
      stripSequelMarkers('Attack on Titan Final Season THE FINAL CHAPTERS Special 1'),
    ).toBe('Attack on Titan')
    expect(
      stripSequelMarkers('Harry Potter and the Deathly Hallows Part 1'),
    ).toBe('Harry Potter and the Deathly Hallows')
  })

  // Decisão de produto (10/08/2026), e ela vale para TODA mídia: sequência
  // numerada é a franquia mais óbvia que existe.
  it('corta número solto no fim', () => {
    expect(stripSequelMarkers('JUJUTSU KAISEN 0')).toBe('JUJUTSU KAISEN')
    expect(stripSequelMarkers('Spider-Man 2')).toBe('Spider-Man')
    expect(stripSequelMarkers('Blade Runner 2049')).toBe('Blade Runner')
  })

  // O que segura o alcance da regra acima: o número precisa vir depois de um
  // ESPAÇO. Sem isso, um título que É um número perderia o nome.
  it('não toca em número colado nem em algarismo romano', () => {
    expect(stripSequelMarkers('1917')).toBe('1917')
    expect(stripSequelMarkers('Se7en')).toBe('Se7en')
    expect(stripSequelMarkers('Final Fantasy VII')).toBe('Final Fantasy VII')
    expect(stripSequelMarkers('Dune: Part Two')).toBe('Dune: Part Two')
  })

  // A invariante que importa: reduzir um título a NADA o jogaria num balde com
  // todos os outros sem nome, e aí obras sem relação nenhuma empilhariam.
  // Títulos degenerados existem pouco, mas o balde seria silencioso.
  it('nunca devolve vazio', () => {
    for (const t of ['Season 2', 'Part 3', '2', '1917', '   7   '])
      expect(stripSequelMarkers(t).length).toBeGreaterThan(0)
  })
})

describe('família da estante', () => {
  it('junta temporada com a obra base', () => {
    expect(shelfFamilyKey(item('Dandadan'))).toBe(
      shelfFamilyKey(item('Dandadan 2nd Season')),
    )
  })

  // Os dois casos que a estante mostrou soltos ao lado das próprias pilhas.
  it('junta os casos reais da estante de anime', () => {
    expect(
      shelfFamilyKey(
        item('Attack on Titan Final Season THE FINAL CHAPTERS Special 1'),
      ),
    ).toBe(shelfFamilyKey(item('Attack on Titan')))
    expect(shelfFamilyKey(item('JUJUTSU KAISEN 0'))).toBe(
      shelfFamilyKey(item('JUJUTSU KAISEN')),
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
