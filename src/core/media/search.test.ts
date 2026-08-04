import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapAniListMedia } from './anilist'
import { mapOpenLibraryDoc, openLibraryCover } from './openlibrary'
import { PROVIDERS, searchAll } from './search'
import type { MediaProvider, MediaSearchResult } from './types'

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
        search: async () => [result({ mediaType: 'movie', provider: 'movies' })],
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
})
