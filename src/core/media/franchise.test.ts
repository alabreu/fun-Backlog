import { describe, expect, it } from 'vitest'
import {
  chainHead,
  chainToSeasons,
  chainTotal,
  groupSameWork,
  isSameWork,
  orderChain,
  type FranchiseEntry,
} from './franchise'

/** Attack on Titan como o AniList o entrega: quatro temporadas ligadas por
 *  sequência, mais um OVA, uma paródia e um compilado — que NÃO são a obra. */
const AOT: FranchiseEntry[] = [
  { id: '16498', title: 'Attack on Titan', episodes: 25, year: 2013, sameWorkIds: ['20958'] },
  { id: '20958', title: 'Attack on Titan Season 2', episodes: 12, year: 2017, sameWorkIds: ['16498', '99147'] },
  { id: '99147', title: 'Attack on Titan Season 3', episodes: 22, year: 2018, sameWorkIds: ['20958', '110277'] },
  { id: '110277', title: 'Attack on Titan Final Season', episodes: 16, year: 2020, sameWorkIds: ['99147'] },
  { id: '18397', title: 'Attack on Titan OVA', episodes: 3, year: 2013, sameWorkIds: [] },
  { id: '20787', title: 'Attack on Titan: Junior High', episodes: 12, year: 2015, sameWorkIds: [] },
]

describe('isSameWork', () => {
  it('só sequência e prequela continuam a mesma história', () => {
    expect(isSameWork('SEQUEL')).toBe(true)
    expect(isSameWork('PREQUEL')).toBe(true)
  })

  // Cada um destes já apareceu numa busca de anime popular, e cada um seria um
  // jeito diferente de somar episódios que não existem na mesma régua.
  it('o resto do universo compartilhado não funde', () => {
    for (const relacao of [
      'SIDE_STORY', 'SPIN_OFF', 'SUMMARY', 'ALTERNATIVE',
      'CHARACTER', 'ADAPTATION', 'PARENT', 'CONTAINS', 'OTHER',
    ])
      expect(isSameWork(relacao)).toBe(false)
  })

  // A API pode ganhar um valor novo. O default seguro é NÃO fundir.
  it('relação desconhecida não funde', () => {
    expect(isSameWork('ALGO_NOVO')).toBe(false)
  })
})

describe('groupSameWork', () => {
  it('junta as temporadas e deixa OVA e paródia de fora', () => {
    const grupos = groupSameWork(AOT)
    expect(grupos).toHaveLength(3)

    const temporadas = grupos.find((g) => g.length > 1)!
    expect(temporadas.map((e) => e.id).sort()).toEqual(
      ['110277', '16498', '20958', '99147'],
    )
    // Os dois avulsos continuam avulsos.
    expect(grupos.filter((g) => g.length === 1).map((g) => g[0].id).sort())
      .toEqual(['18397', '20787'])
  })

  // A cadeia é ligada em CORRENTE (1↔2↔3↔4), não todos com todos: o union-find
  // existe justamente para fechar isso num grupo só. Um `groupBy` ingênuo pelo
  // vizinho imediato devolveria três pares sobrepostos.
  it('fecha a corrente inteira, e não pares soltos', () => {
    const corrente: FranchiseEntry[] = [
      { id: 'a', title: 'A', year: 1, sameWorkIds: ['b'] },
      { id: 'b', title: 'B', year: 2, sameWorkIds: ['a', 'c'] },
      { id: 'c', title: 'C', year: 3, sameWorkIds: ['b', 'd'] },
      { id: 'd', title: 'D', year: 4, sameWorkIds: ['c'] },
    ]
    expect(groupSameWork(corrente)).toHaveLength(1)
  })

  // O custo assumido do union-find sobre o conjunto recebido: uma temporada
  // fora da página não vira grupo — ela não tem título nem capa aqui.
  it('ignora quem está ligado mas não veio na página', () => {
    const parcial: FranchiseEntry[] = [
      { id: 'a', title: 'A', year: 1, sameWorkIds: ['fantasma'] },
    ]
    expect(groupSameWork(parcial)).toEqual([[parcial[0]]])
  })

  it('preserva a ordem de relevância da fonte', () => {
    const grupos = groupSameWork(AOT)
    expect(grupos[0][0].id).toBe('16498')
  })

  it('lista vazia não quebra', () => {
    expect(groupSameWork([])).toEqual([])
  })
})

describe('orderChain', () => {
  it('a mais antiga primeiro', () => {
    const ordenada = orderChain(AOT.slice(0, 4))
    expect(ordenada.map((e) => e.year)).toEqual([2013, 2017, 2018, 2020])
  })

  // Ordem instável faria a mesma franquia mudar de cara entre duas aberturas.
  it('empate de ano desempata estável, pelo id', () => {
    const mesmo: FranchiseEntry[] = [
      { id: '30', title: 'B', year: 2020, sameWorkIds: [] },
      { id: '10', title: 'A', year: 2020, sameWorkIds: [] },
    ]
    expect(orderChain(mesmo).map((e) => e.id)).toEqual(['10', '30'])
  })

  it('sem ano vai para o fim', () => {
    const comInedito: FranchiseEntry[] = [
      { id: '2', title: 'Anunciada', sameWorkIds: [] },
      { id: '1', title: 'Exibida', year: 2019, sameWorkIds: [] },
    ]
    expect(orderChain(comInedito).map((e) => e.id)).toEqual(['1', '2'])
  })
})

describe('chainToSeasons', () => {
  // O ponto do módulo: sai a MESMA estrutura que a TMDB entrega, e o slider
  // de temporadas não precisa saber que anime é diferente.
  it('vira a tabela de temporadas que a régua já entende', () => {
    expect(chainToSeasons(AOT.slice(0, 4))).toEqual([
      { number: 1, episodes: 25 },
      { number: 2, episodes: 12 },
      { number: 3, episodes: 22 },
      { number: 4, episodes: 16 },
    ])
  })

  // Temporada anunciada e não exibida entraria como marco em cima do anterior.
  it('temporada sem episódios fica de fora', () => {
    const comAnunciada: FranchiseEntry[] = [
      ...AOT.slice(0, 2),
      { id: 'x', title: 'Anunciada', year: 2027, sameWorkIds: [] },
    ]
    expect(chainToSeasons(comAnunciada)).toHaveLength(2)
  })
})

describe('chainHead e chainTotal', () => {
  it('a cabeça é a mais antiga — é o id que o item guarda', () => {
    expect(chainHead(AOT.slice(0, 4))?.id).toBe('16498')
  })

  it('o total é a régua inteira', () => {
    expect(chainTotal(AOT.slice(0, 4))).toBe(75)
  })

  // Zero significaria "não tem episódio", que é outra coisa de "não sei".
  it('nenhum episódio conhecido é undefined, não zero', () => {
    expect(chainTotal([{ id: 'a', title: 'A', sameWorkIds: [] }])).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// A ponte com o AniList: o formato cru vira grupo, carrossel e régua.
// ---------------------------------------------------------------------------

describe('AniList → franquia', () => {
  /** Uma entrada como o GraphQL a devolve, com as relações embutidas. */
  const entrada = (
    id: number,
    nome: string,
    episodes: number | null,
    year: number | null,
    relacoes: [string, number, string?][],
  ) => ({
    id,
    episodes,
    seasonYear: year,
    title: { romaji: nome, english: nome },
    coverImage: { large: `https://img/${id}.jpg` },
    relations: {
      edges: relacoes.map(([relationType, nodeId, tipo]) => ({
        relationType,
        node: {
          id: nodeId,
          type: tipo ?? 'ANIME',
          episodes: 1,
          seasonYear: 2015,
          title: { romaji: `Obra ${nodeId}`, english: `Obra ${nodeId}` },
          coverImage: { large: `https://img/${nodeId}.jpg` },
        },
      })),
    },
  })

  const S1 = entrada(1, 'Attack on Titan', 25, 2013, [
    ['SEQUEL', 2],
    ['SPIN_OFF', 90],
    ['ADAPTATION', 500, 'MANGA'],
  ])
  const S2 = entrada(2, 'Attack on Titan Season 2', 12, 2017, [
    ['PREQUEL', 1],
    ['SEQUEL', 3],
  ])
  const S3 = entrada(3, 'Attack on Titan Season 3', 22, 2018, [['PREQUEL', 2]])
  const PARODIA = entrada(90, 'Junior High', 12, 2015, [['SPIN_OFF', 1]])

  it('a busca devolve um card por franquia, com a soma dos episódios', async () => {
    const { collapseSeasons } = await import('./anilist')
    const cards = collapseSeasons([S1, S2, S3, PARODIA])

    expect(cards).toHaveLength(2)
    expect(cards[0].title).toBe('Attack on Titan')
    expect(cards[0].externalId).toBe('1')
    expect(cards[0].total).toBe(59)
    expect(cards[0].seasonCount).toBe(3)
    // A paródia continua inteira: `SPIN_OFF` não funde.
    expect(cards[1].title).toBe('Junior High')
    expect(cards[1].seasonCount).toBeUndefined()
  })

  it('obra sozinha não ganha contagem de temporadas', async () => {
    const { collapseSeasons } = await import('./anilist')
    expect(collapseSeasons([PARODIA])[0].seasonCount).toBeUndefined()
  })

  it('o carrossel deixa de fora o que virou temporada e o que não é anime', async () => {
    const { relatedFrom } = await import('./anilist')
    const outras = relatedFrom([S1, S2, S3])

    // Sobra só o spin-off: as temporadas fundiram e o mangá não é anime.
    expect(outras.map((o) => o.externalId)).toEqual(['90'])
  })

  it('o carrossel não repete quem está ligado a várias temporadas', async () => {
    const { relatedFrom } = await import('./anilist')
    const ambas = entrada(2, 'S2', 12, 2017, [['SPIN_OFF', 90]])
    expect(relatedFrom([S1, ambas])).toHaveLength(1)
  })
})
