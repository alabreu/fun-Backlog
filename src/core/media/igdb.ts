import { callMediaFunction } from './server'
import type { MediaProvider, MediaSearchResult } from './types'

/**
 * Jogos via IGDB. Cobre TODAS as plataformas — console, portátil, arcade,
 * retrô — e é por isso que ela é a fonte de catálogo de jogos e a Steam não:
 * a Steam só conhece PC. Ver decisão 8.
 *
 * Tem chave, então passa pela Edge Function `media` (`requiresServer: true`) e
 * exige login. Ver decisão 3.
 */

/** Tamanho de capa da IGDB: 264×374, retrato — o formato do nosso `Cover`.
 *  Os outros tamanhos (`t_thumb`, `t_720p`) são pequenos demais ou deitados. */
const COVER_SIZE = 't_cover_big'

export function igdbCoverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/${COVER_SIZE}/${imageId}.jpg`
}

interface IgdbGame {
  id: number
  name?: string
  /** Unix em SEGUNDOS, não milissegundos — multiplicar antes de usar. */
  first_release_date?: number
  cover?: { image_id?: string }
  platforms?: { abbreviation?: string }[]
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapIgdbGame(game: IgdbGame): MediaSearchResult | null {
  if (!game?.name) return null

  // Só as três primeiras: um jogo multiplataforma lista dez siglas e estoura a
  // linha, e a função do subtítulo é desempatar homônimo, não catalogar.
  const platforms = (game.platforms ?? [])
    .map((p) => p?.abbreviation)
    .filter((a): a is string => Boolean(a))
    .slice(0, 3)

  return {
    provider: 'igdb',
    externalId: String(game.id),
    mediaType: 'game',
    title: game.name,
    coverUrl: game.cover?.image_id
      ? igdbCoverUrl(game.cover.image_id)
      : undefined,
    year: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : undefined,
    subtitle: platforms.length > 0 ? platforms.join(', ') : undefined,
  }
}

export const igdbProvider: MediaProvider = {
  id: 'igdb',
  mediaTypes: ['game'],
  requiresServer: true,

  async search(query, signal) {
    const games = await callMediaFunction<IgdbGame[]>(
      { source: 'igdb', query },
      signal,
    )
    if (!Array.isArray(games)) throw new Error('igdb-unavailable')

    return games
      .map(mapIgdbGame)
      .filter((r): r is MediaSearchResult => r !== null)
  },
}
