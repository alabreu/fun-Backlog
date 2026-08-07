import { SEARCH_LIMIT, type MediaProvider, type MediaSearchResult } from './types'
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
