import { describe, expect, it } from 'vitest'
import {
  completedInYear,
  completedItems,
  inProgress,
  shelfProgress,
  suggestFromBacklog,
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

  // MUDOU na decisão 16: o status sozinho decide. Exigir data fazia sumir
  // desta tela tudo o que fosse concluído a partir de agora, porque o app
  // parou de carimbá-la.
  it('conta o concluído mesmo sem data', () => {
    expect(
      completedItems([
        item({ status: 'done' }),
        item({ status: 'done', completedAt: '2026-01-02T00:00:00.000Z' }),
        item({ status: 'active' }),
      ]),
    ).toHaveLength(2)
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
        mediaType: 'book',
        progress: { unit: 'page', current: 194 },
      }),
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'book',
        progress: { unit: 'page', current: 106 },
      }),
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'anime',
        progress: { unit: 'episode', current: 26 },
      }),
    ])

    expect(summary.pagesRead).toBe(300)
    expect(summary.episodesWatched).toBe(26)
  })

  // Item antigo de jogo pode ter `unit: 'hour'` gravado, de antes da decisão
  // 21. A soma tem de IGNORAR em vez de quebrar: a coluna continua no banco e
  // o app simplesmente parou de ler.
  it('unidade que não existe mais não entra em conta nenhuma', () => {
    const summary = summarizeCompleted([
      done('2026-01-01T00:00:00.000Z', {
        mediaType: 'game',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress: { unit: 'hour' as any, current: 80 },
      }),
    ])
    expect(summary).toMatchObject({ total: 1, pagesRead: 0, episodesWatched: 0 })
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
      pagesRead: 0,
      episodesWatched: 0,
    })
  })

  it('conjunto vazio devolve tudo zerado, sem quebrar', () => {
    expect(summarizeCompleted([])).toEqual({
      total: 0,
      byMedia: [],
      pagesRead: 0,
      episodesWatched: 0,
    })
  })
})

describe('inProgress', () => {
  it('pega só o que está em andamento', () => {
    const shelf = [
      item({ status: 'active', title: 'agora' }),
      item({ status: 'backlog' }),
      done('2026-01-01T00:00:00.000Z'),
      item({ status: 'paused' }),
    ]
    expect(inProgress(shelf).map((i) => i.title)).toEqual(['agora'])
  })

  it('põe na frente o que foi começado mais recentemente', () => {
    const shelf = [
      item({
        status: 'active',
        title: 'março',
        startedAt: '2026-03-01T00:00:00.000Z',
      }),
      item({
        status: 'active',
        title: 'ontem',
        startedAt: '2026-08-05T00:00:00.000Z',
      }),
    ]
    expect(inProgress(shelf).map((i) => i.title)).toEqual(['ontem', 'março'])
  })

  it('sem data de início, cai na data de entrada', () => {
    const shelf = [
      item({
        status: 'active',
        title: 'velho',
        addedAt: '2026-01-01T00:00:00.000Z',
      }),
      item({
        status: 'active',
        title: 'novo',
        addedAt: '2026-08-01T00:00:00.000Z',
      }),
    ]
    expect(inProgress(shelf).map((i) => i.title)).toEqual(['novo', 'velho'])
  })

  // A ordem escolhida em Configuracoes manda; a recencia decide DENTRO de cada
  // midia. Sem isso o carrossel embaralhava as midias, e quem arrastou "Jogos"
  // para o topo da home via a lista logo abaixo desobedecer.
  it('agrupa pela ordem de midia escolhida, e so depois pela recencia', () => {
    const shelf = [
      item({ status: 'active', mediaType: 'book', title: 'livro',
             startedAt: '2026-08-09T00:00:00.000Z' }),
      item({ status: 'active', mediaType: 'game', title: 'jogo antigo',
             startedAt: '2026-01-01T00:00:00.000Z' }),
      item({ status: 'active', mediaType: 'game', title: 'jogo novo',
             startedAt: '2026-08-08T00:00:00.000Z' }),
    ]
    expect(
      inProgress(shelf, ['game', 'book']).map((i) => i.title),
    ).toEqual(['jogo novo', 'jogo antigo', 'livro'])

    // Inverter a ordem inverte os grupos, sem mexer no que ha dentro deles.
    expect(
      inProgress(shelf, ['book', 'game']).map((i) => i.title),
    ).toEqual(['livro', 'jogo novo', 'jogo antigo'])
  })

  it('midia fora da ordem vai para o fim, em vez de baguncar tudo', () => {
    const shelf = [
      item({ status: 'active', mediaType: 'anime', title: 'fora' }),
      item({ status: 'active', mediaType: 'game', title: 'dentro' }),
    ]
    expect(inProgress(shelf, ['game']).map((i) => i.title)).toEqual([
      'dentro',
      'fora',
    ])
  })
})

describe('shelfProgress', () => {
  const shelf = [
    done('2026-01-01T00:00:00.000Z', { mediaType: 'game' }),
    item({ mediaType: 'game', status: 'backlog' }),
    item({ mediaType: 'game', status: 'active' }),
    item({ mediaType: 'book', status: 'backlog' }),
  ]

  it('conta concluídos e total da mídia pedida', () => {
    expect(shelfProgress(shelf, 'game')).toEqual({ completed: 1, total: 3 })
  })

  it('não mistura mídias', () => {
    expect(shelfProgress(shelf, 'book')).toEqual({ completed: 0, total: 1 })
  })

  it('mídia sem nenhum item devolve zero, não quebra a fração', () => {
    expect(shelfProgress(shelf, 'movie')).toEqual({ completed: 0, total: 0 })
  })
})

describe('suggestFromBacklog', () => {
  const dia = new Date(2026, 7, 6, 10)

  function queue(n: number): Item[] {
    return Array.from({ length: n }, (_, i) =>
      item({
        title: `fila ${i}`,
        status: 'backlog',
        addedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    )
  }

  it('fila pequena aparece inteira, sem sortear nada', () => {
    expect(suggestFromBacklog(queue(3), dia)).toHaveLength(3)
  })

  it('fila grande devolve o limite pedido', () => {
    expect(suggestFromBacklog(queue(20), dia)).toHaveLength(4)
    expect(suggestFromBacklog(queue(20), dia, 2)).toHaveLength(2)
  })

  it('sugere o mesmo durante o dia e muda no dia seguinte', () => {
    const hoje = suggestFromBacklog(queue(20), new Date(2026, 7, 6, 8))
    const maisTarde = suggestFromBacklog(queue(20), new Date(2026, 7, 6, 23))
    const amanha = suggestFromBacklog(queue(20), new Date(2026, 7, 7, 8))

    expect(hoje.map((i) => i.title)).toEqual(maisTarde.map((i) => i.title))
    expect(hoje.map((i) => i.title)).not.toEqual(amanha.map((i) => i.title))
  })

  it('nunca repete item na mesma sugestão', () => {
    const titles = suggestFromBacklog(queue(20), dia).map((i) => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('ignora quem não está na fila', () => {
    const shelf = [
      item({ status: 'active' }),
      done('2026-01-01T00:00:00.000Z'),
      item({ status: 'backlog', title: 'só esta' }),
    ]
    expect(suggestFromBacklog(shelf, dia).map((i) => i.title)).toEqual([
      'só esta',
    ])
  })

  it('estante vazia não sugere nada', () => {
    expect(suggestFromBacklog([], dia)).toEqual([])
  })
})
