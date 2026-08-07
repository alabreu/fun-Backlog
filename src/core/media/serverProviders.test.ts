import { beforeEach, describe, expect, it, vi } from 'vitest'
import { igdbCoverUrl, igdbProvider, mapIgdbGame } from './igdb'
import {
  findByImdbId,
  mapTmdbResult,
  tmdbPosterUrl,
  tmdbProvider,
} from './tmdb'
import { callMediaFunction } from './server'

/** Os dois providers com chave falam com a Edge Function `media`; o teste
 *  substitui essa ponte para exercitar o mapeamento sem tocar na rede. */
vi.mock('./server', () => ({ callMediaFunction: vi.fn() }))
const called = vi.mocked(callMediaFunction)

beforeEach(() => called.mockReset())

describe('mapeamento da IGDB', () => {
  it('converte o timestamp em segundos para ano e junta as plataformas', () => {
    const mapped = mapIgdbGame({
      id: 1942,
      name: 'The Witcher 3: Wild Hunt',
      // 19/05/2015 em segundos — a IGDB não manda milissegundos.
      first_release_date: 1431993600,
      cover: { image_id: 'co1wyy' },
      platforms: [{ abbreviation: 'PC' }, { abbreviation: 'PS4' }],
    })

    expect(mapped).toEqual({
      provider: 'igdb',
      externalId: '1942',
      mediaType: 'game',
      title: 'The Witcher 3: Wild Hunt',
      coverUrl: igdbCoverUrl('co1wyy'),
      year: 2015,
      subtitle: 'PC, PS4',
    })
  })

  it('corta a lista de plataformas em três', () => {
    const mapped = mapIgdbGame({
      id: 1,
      name: 'Multiplataforma',
      platforms: [
        { abbreviation: 'PC' },
        { abbreviation: 'PS5' },
        { abbreviation: 'XSX' },
        { abbreviation: 'Switch' },
      ],
    })
    expect(mapped?.subtitle).toBe('PC, PS5, XSX')
  })

  it('sobrevive a jogo sem capa, sem data e sem plataforma', () => {
    const mapped = mapIgdbGame({ id: 7, name: 'Obscuro' })
    expect(mapped?.coverUrl).toBeUndefined()
    expect(mapped?.year).toBeUndefined()
    expect(mapped?.subtitle).toBeUndefined()
  })

  it('descarta jogo sem nome', () => {
    expect(mapIgdbGame({ id: 8 })).toBeNull()
  })

  it('o provider descarta os inválidos em vez de quebrar a busca', async () => {
    called.mockResolvedValue([{ id: 1, name: 'Vale' }, { id: 2 }])
    const results = await igdbProvider.search('vale')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Vale')
  })

  it('trata resposta que não é lista como falha da fonte', async () => {
    called.mockResolvedValue({ message: 'erro' })
    await expect(igdbProvider.search('x')).rejects.toThrow('igdb-unavailable')
  })
})

describe('mapeamento da TMDB', () => {
  it('mapeia filme usando title e release_date', () => {
    const mapped = mapTmdbResult({
      id: 693134,
      media_type: 'movie',
      title: 'Duna: Parte Dois',
      original_title: 'Dune: Part Two',
      poster_path: '/abc.jpg',
      release_date: '2024-02-27',
    })

    expect(mapped).toEqual({
      provider: 'tmdb',
      externalId: '693134',
      mediaType: 'movie',
      title: 'Duna: Parte Dois',
      coverUrl: tmdbPosterUrl('/abc.jpg'),
      year: 2024,
      subtitle: 'Dune: Part Two',
    })
  })

  it('mapeia série usando name e first_air_date, e vira mediaType series', () => {
    const mapped = mapTmdbResult({
      id: 1396,
      media_type: 'tv',
      name: 'Breaking Bad',
      original_name: 'Breaking Bad',
      poster_path: '/bb.jpg',
      first_air_date: '2008-01-20',
    })

    expect(mapped?.mediaType).toBe('series')
    expect(mapped?.year).toBe(2008)
    // Título traduzido igual ao original: subtítulo repetido não informa nada.
    expect(mapped?.subtitle).toBeUndefined()
  })

  it('descarta pessoa, que o /search/multi mistura nos resultados', () => {
    expect(mapTmdbResult({ id: 1, media_type: 'person', name: 'Alguém' })).toBeNull()
  })

  it('trata data vazia sem produzir NaN', () => {
    const mapped = mapTmdbResult({
      id: 2,
      media_type: 'movie',
      title: 'Sem data',
      release_date: '',
    })
    expect(mapped?.year).toBeUndefined()
  })

  it('sobrevive a resultado sem pôster', () => {
    const mapped = mapTmdbResult({
      id: 3,
      media_type: 'movie',
      title: 'Sem pôster',
      poster_path: null,
    })
    expect(mapped?.coverUrl).toBeUndefined()
  })

  it('usa o tipo esperado quando o item não traz media_type (caso do /find)', () => {
    const mapped = mapTmdbResult({ id: 4, name: 'Série achada' }, 'tv')
    expect(mapped?.mediaType).toBe('series')
  })

  it('o provider corta em SEARCH_LIMIT e descarta pessoas', async () => {
    called.mockResolvedValue({
      results: [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: i,
          media_type: 'movie' as const,
          title: `Filme ${i}`,
        })),
        { id: 99, media_type: 'person' as const, name: 'Diretor' },
      ],
    })

    const results = await tmdbProvider.search('filme')
    expect(results).toHaveLength(12)
    expect(results.every((r) => r.mediaType === 'movie')).toBe(true)
  })
})

describe('findByImdbId', () => {
  it('resolve um id do IMDb para a ficha do filme', async () => {
    called.mockResolvedValue({
      movie_results: [{ id: 278, title: 'Um Sonho de Liberdade' }],
      tv_results: [],
    })

    const found = await findByImdbId('tt0111161')
    expect(found?.mediaType).toBe('movie')
    expect(found?.externalId).toBe('278')
    expect(called).toHaveBeenCalledWith(
      { source: 'tmdb', imdbId: 'tt0111161' },
      undefined,
    )
  })

  it('cai para série quando não há filme', async () => {
    called.mockResolvedValue({
      movie_results: [],
      tv_results: [{ id: 1396, name: 'Breaking Bad' }],
    })
    expect((await findByImdbId('tt0903747'))?.mediaType).toBe('series')
  })

  it('devolve null quando a TMDB não conhece o id', async () => {
    called.mockResolvedValue({ movie_results: [], tv_results: [] })
    expect(await findByImdbId('tt9999999')).toBeNull()
  })
})
