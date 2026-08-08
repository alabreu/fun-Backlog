import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  igdbCoverUrl,
  igdbProvider,
  mapIgdbDetail,
  mapIgdbGame,
} from './igdb'
import {
  findByImdbId,
  mapTmdbDetail,
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

describe('ficha da IGDB', () => {
  it('separa desenvolvedora de publisher e p\u00f5e a primeira na frente', () => {
    const d = mapIgdbDetail({
      id: 1942,
      name: 'The Witcher 3',
      summary: 'Um bruxo procura a filha adotiva.',
      total_rating: 93.4,
      genres: [{ name: 'RPG' }],
      platforms: [{ abbreviation: 'PC' }, { abbreviation: 'PS4' }],
      involved_companies: [
        { publisher: true, company: { name: 'Bandai Namco' } },
        { developer: true, company: { name: 'CD Projekt RED' } },
      ],
    })

    expect(d?.people).toEqual(['CD Projekt RED', 'Bandai Namco'])
    expect(d?.synopsis).toBe('Um bruxo procura a filha adotiva.')
    expect(d?.genres).toEqual(['RPG'])
    expect(d?.score).toBe(93)
    // `lead`: em jogo, plataforma vem ANTES da sinopse — "roda no meu
    // aparelho?" é a pergunta que decide se vale ler o resto.
    expect(d?.facts?.[0]).toEqual({
      labelKey: 'fact.platforms',
      value: 'PC, PS4',
      lead: true,
    })
  })

  it('cai para storyline quando n\u00e3o h\u00e1 summary', () => {
    const d = mapIgdbDetail({ id: 1, name: 'X', storyline: 'O enredo.' })
    expect(d?.synopsis).toBe('O enredo.')
  })

  it('a mesma empresa que desenvolve e publica aparece uma vez s\u00f3', () => {
    const d = mapIgdbDetail({
      id: 2,
      name: 'Y',
      involved_companies: [
        { developer: true, publisher: true, company: { name: 'Nintendo' } },
      ],
    })
    expect(d?.people).toEqual(['Nintendo'])
  })

  it('descarta ficha sem nome', () => {
    expect(mapIgdbDetail({ id: 3 })).toBeNull()
  })
})

describe('ficha da TMDB', () => {
  it('formata dura\u00e7\u00e3o, elenco e onde assistir', () => {
    const d = mapTmdbDetail(
      {
        id: 693134,
        title: 'Duna: Parte Dois',
        overview: 'Paul se une aos Fremen.',
        backdrop_path: '/bd.jpg',
        runtime: 166,
        vote_average: 8.15,
        genres: [{ name: 'Fic\u00e7\u00e3o cient\u00edfica' }],
        credits: {
          crew: [
            { name: 'Denis Villeneuve', job: 'Director' },
            { name: 'Outro', job: 'Editor' },
          ],
          cast: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
        },
        'watch/providers': {
          results: { BR: { flatrate: [{ provider_name: 'Max' }] } },
        },
      },
      'movie',
    )

    expect(d?.facts).toEqual([{ labelKey: 'fact.runtime', value: '2h 46min' }])
    // Direção antes do elenco, e o elenco cortado em tr\u00eas.
    expect(d?.people).toEqual(['Denis Villeneuve', 'A', 'B', 'C'])
    expect(d?.where).toEqual(['Max'])
    expect(d?.score).toBe(82)
    expect(d?.synopsis).toBe('Paul se une aos Fremen.')
  })

  it('s\u00e9rie usa temporadas e epis\u00f3dios em vez de dura\u00e7\u00e3o', () => {
    const d = mapTmdbDetail(
      {
        id: 1396,
        name: 'Breaking Bad',
        episode_run_time: [47],
        number_of_seasons: 5,
        number_of_episodes: 62,
      },
      'tv',
    )
    expect(d?.facts).toEqual([
      { labelKey: 'fact.episodeLength', value: '47min' },
      { labelKey: 'fact.seasons', value: '5' },
      { labelKey: 'fact.episodes', value: '62' },
    ])
    expect(d?.total).toBe(62)
  })

  it('dura\u00e7\u00e3o abaixo de uma hora n\u00e3o mostra "0h"', () => {
    const d = mapTmdbDetail({ id: 1, title: 'Curta', runtime: 22 }, 'movie')
    expect(d?.facts?.[0].value).toBe('22min')
  })

  it('sem provedor no pa\u00eds pedido, "onde assistir" fica vazio', () => {
    const d = mapTmdbDetail(
      {
        id: 2,
        title: 'X',
        'watch/providers': {
          results: { US: { flatrate: [{ provider_name: 'Hulu' }] } },
        },
      },
      'movie',
    )
    expect(d?.where).toEqual([])
  })
})
