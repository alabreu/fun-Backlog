import { DEFAULT_REGION } from '@core/region'
import {
  SEARCH_LIMIT,
  type MediaDetail,
  type MediaFact,
  type MediaProvider,
  type MediaSearchResult,
} from './types'
import { callMediaFunction } from './server'

/**
 * Filmes e séries via TMDB — a mesma base que roda por baixo de Plex, Jellyfin
 * e Letterboxd. Escolhida pelo pôster retrato em CDN e pelo `language=pt-BR`,
 * que traz título e sinopse em português e, quando existe, o pôster nacional.
 * Ver decisão 8.
 *
 * ATENÇÃO — condição da licença gratuita: a atribuição à TMDB precisa estar
 * VISÍVEL na interface onde estes dados aparecem (ver `add.tmdbAttribution`).
 * Não remova.
 *
 * Tem chave, então passa pela Edge Function `media` e exige login (decisão 3).
 */

/** 342px de largura: cobre com folga a célula do grid num telefone (a coluna do
 *  app é `max-w-md`, e o grid é de duas ou três colunas) sem baixar o dobro de
 *  bytes de um `w500`. */
const POSTER_SIZE = 'w342'

export function tmdbPosterUrl(posterPath: string): string {
  return `https://image.tmdb.org/t/p/${POSTER_SIZE}${posterPath}`
}

interface TmdbResult {
  id: number
  /** `multi` mistura os três; `person` é descartado. */
  media_type?: 'movie' | 'tv' | 'person'
  /** Filmes usam `title`, séries usam `name`. */
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
}

/**
 * Exportado para teste: o mapeamento é a parte que quebra quando a API muda.
 *
 * `expected` existe porque o `/find` (link do IMDb) devolve os resultados já
 * separados por tipo, em arrays sem `media_type` em cada item — ali o tipo vem
 * do array, não do objeto.
 */
export function mapTmdbResult(
  result: TmdbResult,
  expected?: 'movie' | 'tv',
): MediaSearchResult | null {
  const kind = result?.media_type ?? expected
  if (kind !== 'movie' && kind !== 'tv') return null

  const title = kind === 'movie' ? result.title : result.name
  if (!title) return null

  const original = kind === 'movie' ? result.original_title : result.original_name
  const date = kind === 'movie' ? result.release_date : result.first_air_date
  // A TMDB manda string vazia (não ausente) para data desconhecida, e
  // `parseInt('')` é NaN — daí o teste de tamanho antes.
  const year = date && date.length >= 4 ? Number(date.slice(0, 4)) : undefined

  return {
    provider: 'tmdb',
    externalId: String(result.id),
    mediaType: kind === 'movie' ? 'movie' : 'series',
    title,
    coverUrl: result.poster_path ? tmdbPosterUrl(result.poster_path) : undefined,
    year: year && !Number.isNaN(year) ? year : undefined,
    // O título original só ajuda quando difere do traduzido — repetir "Duna"
    // embaixo de "Duna" gasta uma linha para não dizer nada.
    subtitle: original && original !== title ? original : undefined,
  }
}

interface TmdbDetailBody extends TmdbResult {
  overview?: string
  vote_average?: number
  genres?: { name?: string }[]
  runtime?: number
  episode_run_time?: number[]
  number_of_seasons?: number
  number_of_episodes?: number
  credits?: {
    cast?: { name?: string }[]
    crew?: { name?: string; job?: string }[]
  }
  'watch/providers'?: {
    results?: Record<
      string,
      {
        /** Página do JustWatch daquela obra NAQUELE país. */
        link?: string
        flatrate?: { provider_name?: string }[]
      }
    >
  }
}

/** "2h 46min" / "46min" — minutos crus não dizem nada num relance. */
function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapTmdbDetail(
  body: TmdbDetailBody,
  kind: 'movie' | 'tv',
  /** País para "onde assistir" — a TMDB devolve um bloco por país. */
  region: string = DEFAULT_REGION,
): MediaDetail | null {
  const base = mapTmdbResult(body, kind)
  if (!base) return null

  const facts: MediaFact[] = []
  if (body.runtime)
    facts.push({ labelKey: 'fact.runtime', value: formatRuntime(body.runtime) })
  const perEpisode = body.episode_run_time?.[0]
  if (perEpisode)
    facts.push({
      labelKey: 'fact.episodeLength',
      value: formatRuntime(perEpisode),
    })
  if (body.number_of_seasons)
    facts.push({
      labelKey: 'fact.seasons',
      value: String(body.number_of_seasons),
    })
  if (body.number_of_episodes)
    facts.push({
      labelKey: 'fact.episodes',
      value: String(body.number_of_episodes),
    })

  // Direção primeiro, depois os três primeiros do elenco: é a ordem em que a
  // pergunta costuma vir ("de quem é?" antes de "quem está nele?").
  const directors = (body.credits?.crew ?? [])
    .filter((c) => c?.job === 'Director')
    .map((c) => c?.name)
  const cast = (body.credits?.cast ?? []).slice(0, 3).map((c) => c?.name)

  // Só `flatrate` (incluído na assinatura). Aluguel e compra virariam uma
  // lista de dez serviços que não responde "dá para ver hoje?".
  const watch = body['watch/providers']?.results?.[region]
  const onde = (watch?.flatrate ?? [])
    .map((p) => p?.provider_name)
    .filter((n): n is string => Boolean(n))

  // O MESMO link para todos os serviços, porque é o que a TMDB dá: a lista vem
  // do JustWatch e o que ela devolve é UMA página por obra por país, não uma
  // por serviço. Levar para a página do JustWatch, e não para a home da Max, é
  // também a condição de uso desses dados (ver a tela de créditos).
  const justWatch = typeof watch?.link === 'string' ? watch.link : null
  // `lead`: "não tenho essa assinatura" pesa tanto quanto "não roda no meu
  // console" — e aquela sobe acima da sinopse desde a ficha de jogo.
  if (onde.length > 0)
    facts.unshift({
      labelKey: 'fact.where',
      value: onde.join(' · '),
      values: onde,
      links: onde.map(() => justWatch),
      lead: true,
    })

  return {
    ...base,
    synopsis: body.overview || undefined,
    genres: (body.genres ?? [])
      .map((g) => g?.name)
      .filter((n): n is string => Boolean(n)),
    facts,
    people: [...directors, ...cast].filter((n): n is string => Boolean(n)),
    // vote_average é 0–10; o resto do app fala em 0–100.
    score: body.vote_average ? Math.round(body.vote_average * 10) : undefined,
    total: body.number_of_episodes,
  }
}

export const tmdbProvider: MediaProvider = {
  id: 'tmdb',
  mediaTypes: ['movie', 'series'],
  requiresServer: true,

  async search(query, signal) {
    const body = await callMediaFunction<{ results?: TmdbResult[] }>(
      { source: 'tmdb', query },
      signal,
    )
    const results = body?.results
    if (!Array.isArray(results)) throw new Error('tmdb-unavailable')

    return results
      .map((r) => mapTmdbResult(r))
      .filter((r): r is MediaSearchResult => r !== null)
      // A TMDB devolve 20 por página; o app mostra 12 por fonte. Cortar aqui, e
      // não no servidor, porque `person` só sai depois do mapeamento.
      .slice(0, SEARCH_LIMIT)
  },

  async detail(externalId, mediaType, { signal, region } = {}) {
    const kind = mediaType === 'series' ? 'tv' : 'movie'
    const body = await callMediaFunction<TmdbDetailBody>(
      { source: 'tmdb', detailId: externalId, detailKind: kind },
      signal,
    )
    // O país NÃO vai na requisição: a TMDB devolve o bloco de TODOS os países
    // na mesma resposta, e escolher aqui mantém a resposta cacheável por obra
    // em vez de por obra × país.
    const mapped = mapTmdbDetail(body, kind, region)
    if (!mapped) throw new Error('tmdb-unavailable')
    return mapped
  },
}

interface TmdbFindResponse {
  movie_results?: TmdbResult[]
  tv_results?: TmdbResult[]
}

/**
 * Resolve um id do IMDb (`tt0111165`) para a ficha da TMDB — é o que fará
 * "colar link do IMDb ou do Letterboxd" funcionar, já que o IMDb não tem API
 * utilizável mas o id dele é a chave universal desse mundo (decisão 8).
 *
 * Devolve `null` quando a TMDB não conhece aquele id.
 */
export async function findByImdbId(
  imdbId: string,
  signal?: AbortSignal,
): Promise<MediaSearchResult | null> {
  const body = await callMediaFunction<TmdbFindResponse>(
    { source: 'tmdb', imdbId },
    signal,
  )

  const movie = body?.movie_results?.[0]
  if (movie) return mapTmdbResult(movie, 'movie')

  const tv = body?.tv_results?.[0]
  if (tv) return mapTmdbResult(tv, 'tv')

  return null
}
