import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapAniListDetail, mapAniListMedia, stripHtml } from './anilist'
import {
  mapOpenLibraryDoc,
  mapOpenLibraryWork,
  openLibraryCover,
} from './openlibrary'
import { dedupe, PROVIDERS, searchAll } from './search'
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
      values: ['Google Play'],
      links: ['https://play.example/x'],
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

describe('ficha do AniList', () => {
  it('tira o HTML que vem mesmo pedindo texto puro', () => {
    expect(stripHtml('Um <i>anime</i>.<br><br>Segunda linha.')).toBe(
      'Um anime.\n\nSegunda linha.',
    )
  })

  it('separa STREAMING do resto dos links externos', () => {
    const d = mapAniListDetail({
      id: 21,
      episodes: null,
      seasonYear: null,
      title: { romaji: 'Cowboy Bebop', english: null },
      coverImage: { large: '' },
      externalLinks: [
        { site: 'Official Site', type: 'INFO', url: 'https://bebop.example' },
        { site: 'Crunchyroll', type: 'STREAMING', url: 'https://cr.example/21' },
        { site: 'Twitter', type: 'SOCIAL', url: 'https://x.example/bebop' },
        { site: 'Netflix', type: 'STREAMING', url: 'https://nf.example/21' },
        // Repetido: o AniList lista a mesma casa uma vez por idioma. Vence a
        // PRIMEIRA — a segunda n\u00e3o pode trocar o link por baixo.
        { site: 'Netflix', type: 'STREAMING', url: 'https://nf.example/outro' },
        null,
      ],
    })

    const onde = d?.facts?.find((f) => f.labelKey === 'fact.where')
    expect(onde?.values).toEqual(['Crunchyroll', 'Netflix'])
    // O link leva \u00e0 P\u00c1GINA DA OBRA no servi\u00e7o, n\u00e3o \u00e0 home dele.
    expect(onde?.links).toEqual(['https://cr.example/21', 'https://nf.example/21'])
    // Fato-l\u00edder e primeiro da lista: sobe acima da sinopse.
    expect(onde?.lead).toBe(true)
    expect(d?.facts?.[0]).toBe(onde)
  })

  it('sem streaming, n\u00e3o inventa a se\u00e7\u00e3o', () => {
    const d = mapAniListDetail({
      id: 1,
      episodes: null,
      seasonYear: null,
      title: { romaji: 'X', english: null },
      coverImage: { large: '' },
      externalLinks: [
        { site: 'Official Site', type: 'INFO', url: 'https://x.example' },
      ],
    })
    expect(d?.facts?.some((f) => f.labelKey === 'fact.where')).toBe(false)
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
