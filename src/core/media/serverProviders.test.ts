import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  igdbCoverUrl,
  igdbProvider,
  mapIgdbDetail,
  mapIgdbGame,
} from './igdb'
import {
  findByImdbId,
  isInTheaters,
  mapTmdbDetail,
  mapTmdbResult,
  tmdbLogoUrl,
  tmdbPosterUrl,
  tmdbProvider,
} from './tmdb'
import { callMediaFunction } from './server'
import { SEARCH_LIMIT } from './types'

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
      releaseDate: '2015-05-19',
      franchise: undefined,
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
      releaseDate: '2024-02-27',
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
        ...Array.from({ length: SEARCH_LIMIT + 8 }, (_, i) => ({
          id: i,
          media_type: 'movie' as const,
          title: `Filme ${i}`,
        })),
        { id: 99, media_type: 'person' as const, name: 'Diretor' },
      ],
    })

    const results = await tmdbProvider.search('filme')
    expect(results).toHaveLength(SEARCH_LIMIT)
    expect(results.every((r) => r.mediaType === 'movie')).toBe(true)
  })

  // Sem mídia pedida (a busca unificada da tela `+`) a chamada é a mista.
  it('sem mídia pedida, não manda searchKind', async () => {
    called.mockResolvedValue({ results: [] })
    await tmdbProvider.search('duna')
    expect(called).toHaveBeenCalledWith(
      expect.objectContaining({ searchKind: undefined }),
      undefined,
    )
  })

  // Com mídia pedida a busca é do tipo — e a resposta desse endpoint NÃO traz
  // `media_type` em cada item, então o mapeamento depende do tipo que a gente
  // mandou. Sem isso a estante voltaria vazia.
  it('com série pedida, busca em /search/tv e mapeia sem media_type', async () => {
    called.mockResolvedValue({
      results: [{ id: 1399, name: 'Game of Thrones', first_air_date: '2011-04-17' }],
    })

    const results = await tmdbProvider.search('game of thrones', {
      mediaType: 'series',
    })

    expect(called).toHaveBeenCalledWith(
      expect.objectContaining({ searchKind: 'tv' }),
      undefined,
    )
    expect(results).toEqual([
      {
        provider: 'tmdb',
        externalId: '1399',
        mediaType: 'series',
        title: 'Game of Thrones',
        coverUrl: undefined,
        year: 2011,
        releaseDate: '2011-04-17',
        subtitle: undefined,
      },
    ])
  })

  it('com filme pedido, busca em /search/movie', async () => {
    called.mockResolvedValue({ results: [] })
    await tmdbProvider.search('duna', { mediaType: 'movie' })
    expect(called).toHaveBeenCalledWith(
      expect.objectContaining({ searchKind: 'movie' }),
      undefined,
    )
  })

  // Mídia que a TMDB não cobre não pode virar `/search/anime`: o valor entra na
  // URL da fonte.
  it('mídia que não é dela cai no multi', async () => {
    called.mockResolvedValue({ results: [] })
    await tmdbProvider.search('bebop', { mediaType: 'anime' })
    expect(called).toHaveBeenCalledWith(
      expect.objectContaining({ searchKind: undefined }),
      undefined,
    )
  })
})

describe('em cartaz', () => {
  const DIA = 24 * 60 * 60 * 1000
  const HOJE = Date.parse('2026-08-08T12:00:00Z')

  function filme(
    dates: { type: number; release_date: string }[],
    country = 'BR',
  ) {
    return {
      id: 1,
      title: 'X',
      release_dates: {
        results: [{ iso_3166_1: country, release_date: '', release_dates: dates }],
      },
    }
  }

  it('estreou h\u00e1 pouco e ainda n\u00e3o saiu em casa', () => {
    expect(
      isInTheaters(
        filme([{ type: 3, release_date: '2026-07-30T00:00:00.000Z' }]),
        'BR',
        HOJE,
      ),
    ).toBe(true)
  })

  it('a data digital fecha a temporada, mesmo dentro da janela', () => {
    expect(
      isInTheaters(
        filme([
          { type: 3, release_date: '2026-07-01T00:00:00.000Z' },
          { type: 4, release_date: '2026-08-01T00:00:00.000Z' },
        ]),
        'BR',
        HOJE,
      ),
    ).toBe(false)
  })

  it('data digital ainda no futuro n\u00e3o tira o filme do cinema', () => {
    expect(
      isInTheaters(
        filme([
          { type: 3, release_date: '2026-07-01T00:00:00.000Z' },
          { type: 4, release_date: '2026-09-01T00:00:00.000Z' },
        ]),
        'BR',
        HOJE,
      ),
    ).toBe(true)
  })

  // O caso que a janela existe para pegar: cl\u00e1ssico sem data digital na TMDB.
  // Sem ela, "Pulp Fiction" apareceria em cartaz para sempre.
  it('filme antigo sem data digital N\u00c3O fica em cartaz para sempre', () => {
    expect(
      isInTheaters(
        filme([{ type: 3, release_date: '1994-10-14T00:00:00.000Z' }]),
        'BR',
        HOJE,
      ),
    ).toBe(false)
  })

  it('pr\u00e9-estreia de festival n\u00e3o conta como cinema', () => {
    expect(
      isInTheaters(
        filme([{ type: 1, release_date: '2026-08-01T00:00:00.000Z' }]),
        'BR',
        HOJE,
      ),
    ).toBe(false)
  })

  it('estreia futura ainda n\u00e3o \u00e9 "em cartaz"', () => {
    expect(
      isInTheaters(
        filme([{ type: 3, release_date: '2026-08-20T00:00:00.000Z' }]),
        'BR',
        HOJE,
      ),
    ).toBe(false)
  })

  // Responder com a temporada americana para quem mora no Brasil seria
  // inventar: sem o pa\u00eds na resposta, a pergunta fica sem resposta.
  it('sem o pa\u00eds na resposta, n\u00e3o afirma nada', () => {
    expect(
      isInTheaters(
        filme([{ type: 3, release_date: '2026-08-01T00:00:00.000Z' }], 'US'),
        'BR',
        HOJE,
      ),
    ).toBeUndefined()
  })

  // Aqui as datas s\u00e3o relativas ao rel\u00f3gio de verdade: `mapTmdbDetail` n\u00e3o
  // recebe `now`, e um teste ancorado numa data fixa passaria a mentir sozinho.
  it('a ficha s\u00f3 carrega o campo quando \u00e9 verdade', () => {
    const dias = (n: number) => new Date(Date.now() + n * DIA).toISOString()

    const emCartaz = mapTmdbDetail(
      filme([{ type: 3, release_date: dias(-10) }]),
      'movie',
      'BR',
    )
    expect(emCartaz?.inTheaters).toBe(true)

    // `undefined` e n\u00e3o `false`: a tela n\u00e3o mostra nada nos dois casos, e um
    // campo que ningu\u00e9m l\u00ea n\u00e3o precisa existir na ficha.
    const jaSaiu = mapTmdbDetail(
      filme([
        { type: 3, release_date: dias(-40) },
        { type: 4, release_date: dias(-5) },
      ]),
      'movie',
      'BR',
    )
    expect(jaSaiu?.inTheaters).toBeUndefined()
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
    // `values` são FAMÍLIAS, não modelos, e `value` é o texto pronto delas —
    // quem não souber desenhar ícone ainda mostra algo legível.
    expect(d?.facts?.[0]).toEqual({
      labelKey: 'fact.platforms',
      value: 'PlayStation · PC',
      items: [
        { label: 'PlayStation', platform: 'playstation' },
        { label: 'PC', platform: 'pc' },
      ],
      lead: true,
    })
  })

  it('vira "onde comprar" s\u00f3 com as lojas, e na ordem de exibi\u00e7\u00e3o', () => {
    const d = mapIgdbDetail({
      id: 1,
      name: 'Hollow Knight',
      websites: [
        { category: 3, url: 'https://wikipedia.org/hk' },
        { category: 17, url: 'https://gog.com/hk' },
        { category: 1, url: 'https://hollowknight.com' },
        { category: 13, url: 'https://store.steampowered.com/app/367520' },
      ],
    })

    const comprar = d?.facts?.find((f) => f.labelKey === 'fact.buy')
    // Wikipedia e site oficial ficam de fora: "onde comprar" com uma landing
    // page dentro \u00e9 o r\u00f3tulo mentindo. E Steam antes de GOG apesar de vir
    // depois na resposta — a ordem \u00e9 nossa, n\u00e3o da IGDB.
    expect(comprar?.items).toEqual([
      { label: 'Steam', url: 'https://store.steampowered.com/app/367520' },
      { label: 'GOG', url: 'https://gog.com/hk' },
    ])
    expect(comprar?.lead).toBe(true)
  })

  it('jogo sem loja nenhuma n\u00e3o ganha a se\u00e7\u00e3o vazia', () => {
    const d = mapIgdbDetail({
      id: 2,
      name: 'X',
      websites: [{ category: 3, url: 'https://wikipedia.org/x' }],
    })
    expect(d?.facts?.some((f) => f.labelKey === 'fact.buy')).toBe(false)
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
          results: {
            BR: {
              link: 'https://www.themoviedb.org/movie/693134/watch?locale=BR',
              flatrate: [{ provider_name: 'Max', logo_path: '/max.jpg' }],
            },
          },
        },
      },
      'movie',
    )

    // "Onde assistir" vem PRIMEIRO e com `lead`: sobe acima da sinopse, igual
    // \u00e0s plataformas de um jogo.
    expect(d?.facts).toEqual([
      {
        labelKey: 'fact.where',
        value: 'Max',
        // A TMDB d\u00e1 UM link por pa\u00eds (a p\u00e1gina do JustWatch), n\u00e3o um por
        // servi\u00e7o — ent\u00e3o todos apontam para o mesmo lugar, e \u00e9 esse link que
        // a condi\u00e7\u00e3o de uso dos dados pede que exista. O logo vem da mesma
        // resposta: \u00e9 ele que distingue as marcas, e n\u00e3o a cor delas.
        items: [
          {
            label: 'Max',
            url: 'https://www.themoviedb.org/movie/693134/watch?locale=BR',
            logoUrl: tmdbLogoUrl('/max.jpg'),
          },
        ],
        lead: true,
      },
      { labelKey: 'fact.runtime', value: '2h 46min' },
    ])
    // Dire\u00e7\u00e3o antes do elenco, e o elenco cortado em tr\u00eas.
    expect(d?.people).toEqual(['Denis Villeneuve', 'A', 'B', 'C'])
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

  it('a divis\u00e3o em temporadas exclui especiais e temporada an\u00fanciada vazia', () => {
    const d = mapTmdbDetail(
      {
        id: 1396,
        name: 'Breaking Bad',
        number_of_episodes: 62,
        seasons: [
          // A TMDB p\u00f5e os especiais na temporada 0 e N\u00c3O os conta em
          // `number_of_episodes`: som\u00e1-los faria "fechar a \u00faltima temporada"
          // nunca chegar ao total da pr\u00f3pria ficha.
          { season_number: 0, episode_count: 8 },
          { season_number: 2, episode_count: 13 },
          { season_number: 1, episode_count: 7 },
          // Anunciada, ainda sem epis\u00f3dio: viraria um bot\u00e3o que n\u00e3o move nada.
          { season_number: 3, episode_count: 0 },
        ],
      },
      'tv',
    )

    // Ordenadas pelo n\u00famero, e n\u00e3o pela ordem em que a resposta veio.
    expect(d?.seasons).toEqual([
      { number: 1, episodes: 7 },
      { number: 2, episodes: 13 },
    ])
  })

  it('filme n\u00e3o carrega array vazio de temporadas', () => {
    expect(mapTmdbDetail({ id: 1, title: 'X' }, 'movie')?.seasons).toBeUndefined()
  })

  it('dura\u00e7\u00e3o abaixo de uma hora n\u00e3o mostra "0h"', () => {
    const d = mapTmdbDetail({ id: 1, title: 'Curta', runtime: 22 }, 'movie')
    expect(d?.facts?.[0].value).toBe('22min')
  })

  it('o pa\u00eds pedido escolhe o bloco, e n\u00e3o o primeiro que a TMDB mandar', () => {
    const body = {
      id: 3,
      title: 'X',
      'watch/providers': {
        results: {
          BR: { flatrate: [{ provider_name: 'Globoplay' }] },
          PT: { flatrate: [{ provider_name: 'RTP Play' }] },
        },
      },
    }
    // Mesma resposta, dois pa\u00edses: quem mora em Portugal n\u00e3o pode ver a lista
    // brasileira s\u00f3 porque o padr\u00e3o do app \u00e9 BR.
    const br = mapTmdbDetail(body, 'movie', 'BR')
    const pt = mapTmdbDetail(body, 'movie', 'PT')
    expect(br?.facts?.[0].items?.map((i) => i.label)).toEqual(['Globoplay'])
    expect(pt?.facts?.[0].items?.map((i) => i.label)).toEqual(['RTP Play'])
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
    // Regi\u00e3o sem cobertura n\u00e3o vira fato nenhum, em vez de virar um r\u00f3tulo
    // "Onde assistir" com nada do lado.
    expect(d?.facts?.some((f) => f.labelKey === 'fact.where')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Carrossel de franquia. Os campos `franchiseGames` e `collectionParts` são
// SINTÉTICOS — a Edge Function os monta —, então o teste vive aqui para que
// renomear um deles lá quebre aqui em vez de sumir com a seção em silêncio.
// ---------------------------------------------------------------------------

describe('franquia na ficha', () => {
  it('IGDB: os irmãos de franquia viram cards', () => {
    const detalhe = mapIgdbDetail({
      id: 1942,
      name: 'The Witcher 3',
      franchiseGames: [
        { id: 1, name: 'The Witcher', cover: { image_id: 'a' } },
        { id: 2, name: 'The Witcher 2', cover: { image_id: 'b' } },
      ],
    })
    expect(detalhe?.related?.map((r) => r.title)).toEqual([
      'The Witcher',
      'The Witcher 2',
    ])
    expect(detalhe?.related?.[0].provider).toBe('igdb')
  })

  it('IGDB: sem franquia, sem seção', () => {
    expect(mapIgdbDetail({ id: 1, name: 'Jogo solto' })?.related).toEqual([])
  })

  it('TMDB: a saga vira cards, sem repetir o próprio filme', () => {
    const detalhe = mapTmdbDetail(
      {
        id: 671,
        title: 'Harry Potter e a Pedra Filosofal',
        media_type: 'movie',
        collectionParts: [
          { id: 671, title: 'Harry Potter e a Pedra Filosofal' },
          { id: 672, title: 'Harry Potter e a Câmara Secreta' },
        ],
      },
      'movie',
    )
    expect(detalhe?.related?.map((r) => r.externalId)).toEqual(['672'])
  })

  // Não é campo esquecido: a TMDB não tem coleção para TV. A seção some.
  it('TMDB: série não tem franquia', () => {
    const detalhe = mapTmdbDetail(
      { id: 1396, name: 'Breaking Bad', media_type: 'tv' },
      'tv',
    )
    expect(detalhe?.related).toEqual([])
  })
})

describe('obra não lançada (fontes com servidor)', () => {
  const daquiA = (anos: number) =>
    new Date(Date.UTC(new Date().getUTCFullYear() + anos, 0, 1))

  it('IGDB: jogo anunciado para o futuro', () => {
    const futuro = mapIgdbDetail({
      id: 1,
      name: 'GTA VII',
      first_release_date: Math.floor(daquiA(2).getTime() / 1000),
    })
    expect(futuro?.unreleased).toBe(true)
  })

  it('IGDB: jogo lançado, e jogo sem data, não são marcados', () => {
    expect(
      mapIgdbDetail({ id: 1, name: 'Antigo', first_release_date: 1431993600 })
        ?.unreleased,
    ).toBeUndefined()
    // "Não sei quando sai" não é "não saiu": marcar aqui esconderia as horas
    // jogadas de todo jogo retrô mal catalogado.
    expect(mapIgdbDetail({ id: 2, name: 'Sem data' })?.unreleased).toBeUndefined()
  })

  it('TMDB: basta o status OU a data — a fonte desencontra os dois', () => {
    const porStatus = mapTmdbDetail(
      { id: 1, title: 'Anunciado', media_type: 'movie', status: 'Post Production' },
      'movie',
    )
    const porData = mapTmdbDetail(
      {
        id: 2,
        title: 'Com data futura',
        media_type: 'movie',
        release_date: daquiA(2).toISOString().slice(0, 10),
      },
      'movie',
    )
    expect(porStatus?.unreleased).toBe(true)
    expect(porData?.unreleased).toBe(true)
  })

  // Cancelada depois de ir ao ar é assistível.
  it('TMDB: série no ar ou encerrada não é marcada', () => {
    for (const status of ['Returning Series', 'Ended', 'Canceled'])
      expect(
        mapTmdbDetail(
          { id: 1, name: 'X', media_type: 'tv', status, first_air_date: '2008-01-20' },
          'tv',
        )?.unreleased,
      ).toBeUndefined()
  })
})
