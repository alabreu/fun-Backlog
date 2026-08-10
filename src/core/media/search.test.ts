import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapAniListDetail, mapAniListMedia, stripHtml } from './anilist'
import {
  mapOpenLibraryDoc,
  mapOpenLibraryWork,
  openLibraryCover,
} from './openlibrary'
import {
  dedupe,
  familyKey,
  PROVIDERS,
  searchAll,
  sortByFranchise,
} from './search'
import {
  googleBooksCover,
  mapGoogleVolume,
  mapGoogleVolumeDetail,
} from './googlebooks'
import {
  SEARCH_LIMIT,
  type MediaProvider,
  type MediaSearchResult,
} from './types'

function result(over: Partial<MediaSearchResult> = {}): MediaSearchResult {
  return {
    provider: 'stub',
    externalId: '1',
    mediaType: 'anime',
    title: 'Um título',
    ...over,
  }
}

/** Provider de mentira, para exercitar searchAll sem tocar na rede. */
function stubProvider(over: Partial<MediaProvider> = {}): MediaProvider {
  return {
    id: 'stub',
    mediaTypes: ['anime'],
    requiresServer: false,
    search: async () => [result()],
    ...over,
  }
}

describe('mapeamento do AniList', () => {
  it('prefere o título em inglês e guarda o romaji como subtítulo', () => {
    const mapped = mapAniListMedia({
      id: 21,
      episodes: 26,
      seasonYear: 1998,
      title: { romaji: 'Cowboy Bebop', english: 'Cowboy Bebop: The Series' },
      coverImage: { large: 'https://img/1.jpg' },
    })

    expect(mapped).toEqual({
      provider: 'anilist',
      externalId: '21',
      mediaType: 'anime',
      title: 'Cowboy Bebop: The Series',
      coverUrl: 'https://img/1.jpg',
      year: 1998,
      total: 26,
      subtitle: 'Cowboy Bebop',
    })
  })

  it('cai para o romaji quando não há título em inglês', () => {
    const mapped = mapAniListMedia({
      id: 1,
      episodes: null,
      seasonYear: null,
      title: { romaji: 'Shirobako', english: null },
      coverImage: null,
    })
    expect(mapped?.title).toBe('Shirobako')
    expect(mapped?.subtitle).toBeUndefined()
    expect(mapped?.coverUrl).toBeUndefined()
  })

  it('descarta resultado sem título nenhum', () => {
    expect(
      mapAniListMedia({
        id: 2,
        episodes: null,
        seasonYear: null,
        title: null,
        coverImage: null,
      }),
    ).toBeNull()
  })
})

describe('mapeamento da Open Library', () => {
  it('extrai o id do caminho da obra e monta a capa', () => {
    const mapped = mapOpenLibraryDoc({
      key: '/works/OL45804W',
      title: 'Fahrenheit 451',
      author_name: ['Ray Bradbury'],
      first_publish_year: 1953,
      cover_i: 8231856,
      number_of_pages_median: 194,
    })

    expect(mapped?.externalId).toBe('OL45804W')
    expect(mapped?.coverUrl).toBe(openLibraryCover(8231856))
    expect(mapped?.subtitle).toBe('Ray Bradbury')
    expect(mapped?.total).toBe(194)
  })

  it('sobrevive a livro sem capa', () => {
    const mapped = mapOpenLibraryDoc({ key: '/works/OL1W', title: 'Sem capa' })
    expect(mapped?.coverUrl).toBeUndefined()
  })

  it('descarta documento sem key ou sem título', () => {
    expect(mapOpenLibraryDoc({ title: 'Sem key' })).toBeNull()
    expect(mapOpenLibraryDoc({ key: '/works/OL2W' })).toBeNull()
  })
})

describe('searchAll', () => {
  beforeEach(() => {
    PROVIDERS.length = 0
  })

  it('ignora busca curta demais sem tocar em provider nenhum', async () => {
    const search = vi.fn()
    PROVIDERS.push(stubProvider({ search }))

    expect(await searchAll('a')).toEqual({
      groups: [],
      failed: [],
      skippedNeedingAuth: [],
    })
    expect(search).not.toHaveBeenCalled()
  })

  it('agrupa por mídia na ordem fixa, não na ordem de resposta', async () => {
    PROVIDERS.push(
      stubProvider({
        id: 'books',
        mediaTypes: ['book'],
        search: async () => [result({ mediaType: 'book', provider: 'books' })],
      }),
      stubProvider({
        id: 'movies',
        mediaTypes: ['movie'],
        search: async () => [
          result({ mediaType: 'movie', provider: 'movies' }),
        ],
      }),
    )

    const { groups } = await searchAll('bebop')
    expect(groups.map((g) => g.mediaType)).toEqual(['movie', 'book'])
  })

  // A REGRESSÃO QUE MOTIVOU O CONSERTO. Pedir série trazia os filmes da mesma
  // fonte de carona, e como a estante achata os grupos numa lista só com filme
  // antes de série, a série exata que a pessoa digitou ia parar embaixo de uma
  // dúzia de filmes homônimos.
  it('pedir uma mídia devolve só ela, mesmo de fonte que cobre duas', async () => {
    PROVIDERS.push(
      stubProvider({
        id: 'tmdb',
        mediaTypes: ['movie', 'series'],
        search: async () => [
          result({ mediaType: 'series', provider: 'tmdb', externalId: 's', title: 'Succession' }),
          result({ mediaType: 'movie', provider: 'tmdb', externalId: 'm', title: 'Succession' }),
        ],
      }),
    )

    const { groups } = await searchAll('succession', { mediaType: 'series' })
    expect(groups.map((g) => g.mediaType)).toEqual(['series'])
    expect(groups[0].results.map((r) => r.externalId)).toEqual(['s'])
  })

  // O outro lado do mesmo contrato: a fonte precisa RECEBER o tipo para pedir a
  // busca certa à API, senão o corte de 20 resultados já vem disputado.
  it('repassa a mídia pedida ao provider', async () => {
    const search = vi.fn(async () => [result({ mediaType: 'series' })])
    PROVIDERS.push(stubProvider({ mediaTypes: ['movie', 'series'], search }))

    await searchAll('succession', { mediaType: 'series' })
    expect(search).toHaveBeenCalledWith(
      'succession',
      expect.objectContaining({ mediaType: 'series' }),
    )
  })

  it('uma fonte fora do ar não derruba as outras', async () => {
    PROVIDERS.push(
      stubProvider({ id: 'ok' }),
      stubProvider({
        id: 'quebrado',
        mediaTypes: ['book'],
        search: async () => {
          throw new Error('502')
        },
      }),
    )

    const outcome = await searchAll('bebop')
    expect(outcome.failed).toEqual(['quebrado'])
    expect(outcome.groups).toHaveLength(1)
  })

  it('não chama provider com chave quando não há sessão', async () => {
    const search = vi.fn()
    PROVIDERS.push(stubProvider({ id: 'igdb', requiresServer: true, search }))

    const outcome = await searchAll('hollow knight')
    expect(search).not.toHaveBeenCalled()
    expect(outcome.skippedNeedingAuth).toEqual(['igdb'])
  })

  it('chama provider com chave quando há sessão', async () => {
    const search = vi.fn(async () => [result({ provider: 'igdb' })])
    PROVIDERS.push(stubProvider({ id: 'igdb', requiresServer: true, search }))

    const outcome = await searchAll('hollow knight', { signedIn: true })
    expect(search).toHaveBeenCalledOnce()
    expect(outcome.skippedNeedingAuth).toEqual([])
  })

  it('restringe os providers quando a mídia é escolhida', async () => {
    const anime = vi.fn(async () => [result()])
    const books = vi.fn(async () => [result({ mediaType: 'book' })])
    PROVIDERS.push(
      stubProvider({ id: 'anime', search: anime }),
      stubProvider({ id: 'books', mediaTypes: ['book'], search: books }),
    )

    await searchAll('bebop', { mediaType: 'anime' })
    expect(anime).toHaveBeenCalledOnce()
    expect(books).not.toHaveBeenCalled()
  })

  // O ganho concreto de desligar uma categoria: uma chamada de rede a menos
  // por letra digitada. Se isto passar a só filtrar o resultado, a busca fica
  // igualmente lenta e o teste tem que reclamar.
  it('nem chama o provider de uma mídia desligada', async () => {
    const anime = vi.fn(async () => [result()])
    const books = vi.fn(async () => [result({ mediaType: 'book' })])
    PROVIDERS.push(
      stubProvider({ id: 'anime', search: anime }),
      stubProvider({ id: 'books', mediaTypes: ['book'], search: books }),
    )

    const outcome = await searchAll('bebop', { enabled: ['book'] })
    expect(anime).not.toHaveBeenCalled()
    expect(books).toHaveBeenCalledOnce()
    expect(outcome.groups.map((g) => g.mediaType)).toEqual(['book'])
  })

  // A TMDB atende filme E série. Com só uma das duas ligada ela continua sendo
  // chamada — e o que volta da outra é descartado no agrupamento.
  it('provider compartilhado sobrevive, mas o grupo desligado não aparece', async () => {
    const tmdb = vi.fn(async () => [
      result({ mediaType: 'movie', externalId: '1' }),
      result({ mediaType: 'series', externalId: '2' }),
    ])
    PROVIDERS.push(
      stubProvider({ id: 'tmdb', mediaTypes: ['movie', 'series'], search: tmdb }),
    )

    const outcome = await searchAll('bebop', { enabled: ['movie'] })
    expect(tmdb).toHaveBeenCalledOnce()
    expect(outcome.groups.map((g) => g.mediaType)).toEqual(['movie'])
  })

  it('a ordem dos grupos é a que a pessoa escolheu', async () => {
    PROVIDERS.push(
      stubProvider({ id: 'a', search: async () => [result()] }),
      stubProvider({
        id: 'b',
        mediaTypes: ['book'],
        search: async () => [result({ mediaType: 'book' })],
      }),
    )

    const outcome = await searchAll('bebop', { enabled: ['book', 'anime'] })
    expect(outcome.groups.map((g) => g.mediaType)).toEqual(['book', 'anime'])
  })
})

describe('mapeamento do Google Books', () => {
  it('conserta a capa que a API entrega pequena e enfeitada', () => {
    // `http`, `zoom=1` e a dobra de p\u00e1gina desenhada por cima da arte.
    expect(
      googleBooksCover(
        'http://books.google.com/books/content?id=A&printsec=frontcover&img=1&zoom=1&edge=curl',
      ),
    ).toBe(
      'https://books.google.com/books/content?id=A&printsec=frontcover&img=1&zoom=2',
    )
  })

  it('aceita as tr\u00eas formas de data que a API usa', () => {
    const ano = (publishedDate: string) =>
      mapGoogleVolume({ id: 'x', volumeInfo: { title: 'T', publishedDate } })
        ?.year
    expect(ano('2015')).toBe(2015)
    expect(ano('2015-03')).toBe(2015)
    expect(ano('2015-03-14')).toBe(2015)
    expect(ano('')).toBeUndefined()
  })

  it('descarta volume sem t\u00edtulo ou sem id', () => {
    expect(mapGoogleVolume({ id: 'x', volumeInfo: {} })).toBeNull()
    expect(mapGoogleVolume({ volumeInfo: { title: 'T' } })).toBeNull()
  })

  it('s\u00f3 vira "onde comprar" quando est\u00e1 mesmo \u00e0 venda', () => {
    const base = { id: 'x', volumeInfo: { title: 'T' } }
    const aVenda = mapGoogleVolumeDetail({
      ...base,
      saleInfo: { saleability: 'FOR_SALE', buyLink: 'https://play.example/x' },
    })
    expect(aVenda?.facts?.[0]).toEqual({
      labelKey: 'fact.buy',
      value: 'Google Play',
      items: [{ label: 'Google Play', url: 'https://play.example/x' }],
      lead: true,
    })

    // `buyLink` de livro indispon\u00edvel leva a uma p\u00e1gina que diz "n\u00e3o
    // dispon\u00edvel" — pior que n\u00e3o ter link nenhum.
    const naoVenda = mapGoogleVolumeDetail({
      ...base,
      saleInfo: { saleability: 'NOT_FOR_SALE', buyLink: 'https://play.example/x' },
    })
    expect(naoVenda?.facts).toEqual([])
  })

  it('tira o HTML de editora que vem na descri\u00e7\u00e3o', () => {
    const d = mapGoogleVolumeDetail({
      id: 'x',
      volumeInfo: {
        title: 'T',
        description: '<p>Primeiro.</p><p>Segundo.<br>Terceiro.</p>',
        averageRating: 4.5,
      },
    })
    expect(d?.synopsis).toBe('Primeiro.\n\nSegundo.\nTerceiro.')
    // `averageRating` \u00e9 0\u20135; o resto do app fala em 0\u2013100.
    expect(d?.score).toBe(90)
  })
})

describe('dedupe', () => {
  it('a mesma obra de duas fontes aparece uma vez, e vence a primeira', () => {
    const [primeiro, ...resto] = dedupe([
      result({
        mediaType: 'book',
        provider: 'openlibrary',
        title: 'O Senhor dos An\u00e9is:',
        year: 1954,
      }),
      result({
        mediaType: 'book',
        provider: 'googlebooks',
        title: 'o senhor dos aneis',
        year: 1954,
      }),
    ])
    expect(resto).toHaveLength(0)
    // A ordem de PROVIDERS \u00e9 o que torna o Google Books um FALLBACK: ele s\u00f3
    // acrescenta o que a Open Library n\u00e3o tinha.
    expect(primeiro.provider).toBe('openlibrary')
  })

  it('hom\u00f4nimos de anos diferentes s\u00e3o obras diferentes', () => {
    expect(
      dedupe([
        result({ mediaType: 'movie', title: 'Duna', year: 1984, externalId: '1' }),
        result({ mediaType: 'movie', title: 'Duna', year: 2021, externalId: '2' }),
      ]),
    ).toHaveLength(2)
  })

  // Na d\u00favida, mostrar duas vezes \u00e9 menos grave que sumir com a obra certa.
  it('obra sem ano n\u00e3o \u00e9 fundida com outra sem ano', () => {
    expect(
      dedupe([
        result({ mediaType: 'book', title: 'Sem ano', provider: 'a', externalId: '1' }),
        result({ mediaType: 'book', title: 'Sem ano', provider: 'b', externalId: '2' }),
      ]),
    ).toHaveLength(2)
  })

  it('corta no limite de exibi\u00e7\u00e3o, que duas fontes juntas passam', () => {
    const muitos = Array.from({ length: SEARCH_LIMIT + 10 }, (_, i) =>
      result({ mediaType: 'book', title: `Livro ${i}`, year: 2000 + i }),
    )
    expect(dedupe(muitos)).toHaveLength(SEARCH_LIMIT)
  })
})

describe('sortByFranchise', () => {
  const jogo = (
    title: string,
    year: number | undefined,
    franchise?: string,
  ): MediaSearchResult =>
    result({ mediaType: 'game', provider: 'igdb', externalId: title, title, year, franchise })

  // O caso que motivou tudo: buscar "zelda" trazia a franquia intercalada por
  // popularidade, com um intruso no meio.
  it('junta a franquia e a ordena do mais novo, sem rebaixar ninguém', () => {
    const ordenado = sortByFranchise([
      jogo('Breath of the Wild', 2017, 'The Legend of Zelda'),
      jogo('Um jogo qualquer', 2010),
      jogo('Ocarina of Time', 1998, 'The Legend of Zelda'),
      jogo('Tears of the Kingdom', 2023, 'The Legend of Zelda'),
    ])

    expect(ordenado.map((r) => r.title)).toEqual([
      // A franquia herda a posição do seu melhor colocado (BOTW estava em 1º),
      // ele abre o grupo, e o resto desce do mais novo para o mais velho.
      'Breath of the Wild',
      'Tears of the Kingdom',
      'Ocarina of Time',
      'Um jogo qualquer',
    ])
  })

  // A razão de o melhor colocado abrir o grupo. Sem essa regra, inverter a
  // cronologia devolveria o problema que a inversão veio consertar: o especial
  // recente passaria na frente da obra que a pessoa digitou.
  it('o melhor colocado abre a franquia, mesmo sendo o mais velho', () => {
    const serie = (title: string, year: number) =>
      result({ mediaType: 'series', provider: 'tmdb', externalId: title, title, year })

    const ordenado = sortByFranchise([
      serie('Game of Thrones', 2011),
      serie('Game of Thrones: The Last Watch', 2019),
      serie('Game of Thrones: The Story So Far', 2017),
    ])

    expect(ordenado.map((r) => r.title)).toEqual([
      'Game of Thrones',
      'Game of Thrones: The Last Watch',
      'Game of Thrones: The Story So Far',
    ])
  })

  // A garantia de que o conserto não estraga o que já funcionava: títulos que
  // não têm nada em comum saem exatamente como entraram.
  it('sem nada em comum, não mexe em nada', () => {
    const entrada = [
      jogo('C', 2020),
      jogo('A', 1990),
      jogo('B', 2005),
    ]
    expect(sortByFranchise(entrada).map((r) => r.title)).toEqual(['C', 'A', 'B'])
  })

  // O caso REAL da IGDB, e a razão de o conserto anterior não ter surtido
  // efeito: a fonte devolvia uma "coleção" diferente para cada Zelda (existe
  // uma chamada "The Legend of Zelda: Breath of the Wild"), então cada jogo
  // virava um grupo de um só. O título salva sozinho.
  it('agrupa pelo título antes dos dois pontos quando a fonte não ajuda', () => {
    const ordenado = sortByFranchise([
      jogo('The Legend of Zelda: Breath of the Wild', 2017),
      jogo('Super Mario Odyssey', 2017),
      jogo('The Legend of Zelda: Ocarina of Time', 1998),
      jogo('The Legend of Zelda: Tears of the Kingdom', 2023),
    ])

    expect(ordenado.map((r) => r.title)).toEqual([
      'The Legend of Zelda: Breath of the Wild',
      'The Legend of Zelda: Tears of the Kingdom',
      'The Legend of Zelda: Ocarina of Time',
      'Super Mario Odyssey',
    ])
  })

  // O original de 1986 não tem subtítulo, e mesmo assim é da família: a chave
  // de quem não tem dois pontos é o título inteiro, que é igual ao prefixo dos
  // outros.
  it('o título sem subtítulo entra no grupo que leva o nome dele', () => {
    const ordenado = sortByFranchise([
      jogo('The Legend of Zelda: Breath of the Wild', 2017),
      jogo('The Legend of Zelda', 1986),
    ])
    // Estão no mesmo grupo — é isto que o teste guarda. A ordem entre eles é a
    // das regras: BOTW veio em 1º na fonte, então abre a família.
    expect(ordenado.map((r) => r.year)).toEqual([2017, 1986])
  })

  // Casar pelo prefixo não pode virar casar por qualquer coisa: o hífen sem
  // espaço faz parte do nome, não separa subtítulo.
  it('não parte um nome composto por hífen', () => {
    // O que este teste guarda é o HÍFEN: "Spider-Man" não pode virar a família
    // "Spider". O `2` some porque a chave da busca passou a ser a mesma da
    // estante, e lá número solto no fim conta como sequência (10/08/2026) —
    // "Spider-Man 2" e "Spider-Man" são a mesma franquia.
    expect(familyKey(jogo('Spider-Man 2', 2023))).toBe('spider man')
    expect(familyKey(jogo('Spider-Man', 2018))).toBe('spider man')
    expect(familyKey(jogo('Marvel - Spider-Man', 2018))).toBe('marvel')
  })

  // As duas fontes de chave passam pela mesma normalização, então uma obra com
  // o campo da fonte e outra só com o título caem no mesmo grupo.
  it('o campo da fonte e o título casam entre si', () => {
    expect(familyKey(jogo('Ocarina of Time', 1998, 'The Legend of Zelda'))).toBe(
      familyKey(jogo('The Legend of Zelda: Breath of the Wild', 2017)),
    )
  })

  // Com a ordem invertida este caso fica mais delicado: um `Infinity` ingênuo
  // para "sem ano" mandaria a obra sem data para o TOPO do grupo.
  it('obra sem ano vai para o fim do próprio grupo, não para o começo', () => {
    const ordenado = sortByFranchise([
      jogo('Sem data', undefined, 'Saga'),
      jogo('Segundo', 2005, 'Saga'),
      jogo('Primeiro', 1999, 'Saga'),
    ])
    expect(ordenado.map((r) => r.title)).toEqual([
      // "Sem data" veio em 1º na fonte, então abre o grupo pela regra do melhor
      // colocado. Entre os outros dois, o mais novo primeiro.
      'Sem data',
      'Segundo',
      'Primeiro',
    ])
  })

  it('sem ano e sem ser o melhor colocado, vai mesmo para o fim', () => {
    const ordenado = sortByFranchise([
      jogo('Segundo', 2005, 'Saga'),
      jogo('Sem data', undefined, 'Saga'),
      jogo('Primeiro', 1999, 'Saga'),
    ])
    expect(ordenado.map((r) => r.title)).toEqual([
      'Segundo',
      'Primeiro',
      'Sem data',
    ])
  })

  // Duas franquias na mesma busca mantêm a ordem relativa que a popularidade
  // deu: a segunda não pode ultrapassar a primeira ao ser agrupada.
  it('franquias diferentes não trocam de lugar entre si', () => {
    const ordenado = sortByFranchise([
      jogo('Halo 3', 2007, 'Halo'),
      jogo('Doom 2016', 2016, 'Doom'),
      jogo('Halo 1', 2001, 'Halo'),
      jogo('Doom 1993', 1993, 'Doom'),
    ])
    expect(ordenado.map((r) => r.title)).toEqual([
      'Halo 3',
      'Halo 1',
      'Doom 2016',
      'Doom 1993',
    ])
  })
})

describe('ficha do AniList', () => {
  it('tira o HTML que vem mesmo pedindo texto puro', () => {
    expect(stripHtml('Um <i>anime</i>.<br><br>Segunda linha.')).toBe(
      'Um anime.\n\nSegunda linha.',
    )
  })

  // O "ONDE ASSISTIR" DE ANIME FOI REMOVIDO (09/08/2026), e este teste é o que
  // impede alguém de trazê-lo de volta sem ler o porquê: a lista de streaming do
  // AniList não conhece país, então ela oferecia Hulu — que não opera no Brasil
  // — na ficha em português. Ver a nota longa em `mapAniListDetail`.
  it('não promete onde assistir: a lista do AniList não tem país', () => {
    const d = mapAniListDetail({
      id: 21,
      episodes: 26,
      seasonYear: 1998,
      title: { romaji: 'Cowboy Bebop', english: null },
      coverImage: { large: '' },
    })
    expect(d?.facts?.some((f) => f.labelKey === 'fact.where')).toBe(false)
    // O que sobra continua sendo fato de verdade sobre a obra.
    expect(d?.facts?.map((f) => f.labelKey)).toEqual(['fact.episodes'])
  })

  it('mapeia est\u00fadio, g\u00eaneros e dura\u00e7\u00e3o por epis\u00f3dio', () => {
    const d = mapAniListDetail({
      id: 21,
      episodes: 26,
      duration: 24,
      seasonYear: 1998,
      genres: ['Action', 'Sci-Fi'],
      averageScore: 86,
      description: 'Ca\u00e7adores de recompensa.<br>No espa\u00e7o.',
      title: { romaji: 'Cowboy Bebop', english: null },
      coverImage: { large: 'https://img/1.jpg' },
      studios: { nodes: [{ name: 'Sunrise' }] },
    })

    expect(d?.people).toEqual(['Sunrise'])
    expect(d?.genres).toEqual(['Action', 'Sci-Fi'])
    expect(d?.score).toBe(86)
    expect(d?.synopsis).toBe('Ca\u00e7adores de recompensa.\nNo espa\u00e7o.')
    expect(d?.facts).toEqual([
      { labelKey: 'fact.episodes', value: '26' },
      { labelKey: 'fact.episodeLength', value: '24min' },
    ])
  })
})

describe('ficha da Open Library', () => {
  it('aceita a descri\u00e7\u00e3o nas DUAS formas que a API usa', () => {
    expect(
      mapOpenLibraryWork('OL1W', { title: 'A', description: 'Texto solto.' })
        .synopsis,
    ).toBe('Texto solto.')
    expect(
      mapOpenLibraryWork('OL2W', {
        title: 'B',
        description: { value: 'Dentro de objeto.' },
      }).synopsis,
    ).toBe('Dentro de objeto.')
  })

  it('corta a lista de assuntos, que a Open Library entrega enorme', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Assunto ${i}`)
    expect(mapOpenLibraryWork('OL3W', { subjects: many }).genres).toHaveLength(6)
  })

  it('obra sem descri\u00e7\u00e3o n\u00e3o inventa string vazia', () => {
    expect(mapOpenLibraryWork('OL4W', { title: 'C' }).synopsis).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Obra que ainda não saiu. O painel para de oferecer "assistindo", progresso e
// nota — ver `core/media/release.ts` e a decisão 20.
// ---------------------------------------------------------------------------

describe('obra não lançada', () => {
  it('AniList: NOT_YET_RELEASED marca, e o ano anunciado preenche o cabeçalho', () => {
    const d = mapAniListDetail({
      id: 999,
      episodes: null,
      seasonYear: null,
      status: 'NOT_YET_RELEASED',
      startDate: { year: 2026 },
      title: { romaji: 'Dandadan 3rd Season', english: null },
      coverImage: { large: '' },
    })
    expect(d?.unreleased).toBe(true)
    // Sem isto o cabeçalho ficava sem ano nenhum: `seasonYear` só existe
    // depois da estreia.
    expect(d?.year).toBe(2026)
  })

  it('AniList: o que já está no ar não é marcado', () => {
    for (const status of ['RELEASING', 'FINISHED', 'HIATUS', 'CANCELLED'])
      expect(
        mapAniListDetail({
          id: 1,
          episodes: 12,
          seasonYear: 2020,
          status,
          title: { romaji: 'X', english: null },
          coverImage: { large: '' },
        })?.unreleased,
      ).toBeUndefined()
  })
})

describe('data anunciada do AniList', () => {
  const ficha = (over: Record<string, unknown>) =>
    mapAniListDetail({
      id: 1,
      episodes: null,
      seasonYear: null,
      title: { romaji: 'Uma obra', english: null },
      coverImage: { large: null },
      ...over,
    })

  it('data completa vale como está, tenha saído ou não', () => {
    expect(
      ficha({ status: 'FINISHED', startDate: { year: 2015, month: 1, day: 9 } })
        ?.releaseDate,
    ).toBe('2015-01-09')
  })

  // O caso que motivou tudo: temporada anunciada sem dia marcado ficava sem
  // data e caía na fila como se desse para assistir.
  it('não lançada com só o ano vira o fim do ano', () => {
    expect(
      ficha({ status: 'NOT_YET_RELEASED', startDate: { year: 2027 } })
        ?.releaseDate,
    ).toBe('2027-12-31')
  })

  it('não lançada com ano e mês vira o último dia do mês', () => {
    expect(
      ficha({ status: 'NOT_YET_RELEASED', startDate: { year: 2027, month: 4 } })
        ?.releaseDate,
    ).toBe('2027-04-30')
    // Fevereiro bissexto, que uma tabela de dias erraria.
    expect(
      ficha({ status: 'NOT_YET_RELEASED', startDate: { year: 2028, month: 2 } })
        ?.releaseDate,
    ).toBe('2028-02-29')
  })

  // A condição que segura a regra: sem ela, um anime que foi ao ar em abril
  // deste ano viraria "31/12" e sairia da fila por engano.
  it('JÁ lançada com data parcial não ganha data inventada', () => {
    expect(
      ficha({ status: 'FINISHED', startDate: { year: 2026 } })?.releaseDate,
    ).toBeUndefined()
    expect(
      ficha({ status: 'RELEASING', startDate: { year: 2026, month: 4 } })
        ?.releaseDate,
    ).toBeUndefined()
  })

  it('sem data nenhuma, nada é gravado', () => {
    expect(
      ficha({ status: 'NOT_YET_RELEASED', startDate: null })?.releaseDate,
    ).toBeUndefined()
  })
})
