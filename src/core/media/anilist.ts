import { SEARCH_LIMIT, type MediaProvider, type MediaSearchResult } from './types'

/**
 * Animes via AniList (GraphQL público, sem chave e generoso no rate limit —
 * por isso preferido ao MyAnimeList, que exige registro de app).
 *
 * Sem chave = sem servidor no meio: o browser chama direto. O host está no
 * `connect-src` da CSP em vercel.json.
 */
export const ANILIST_URL = 'https://graphql.anilist.co'

const QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        episodes
        seasonYear
        title { romaji english }
        coverImage { large }
      }
    }
  }
`

interface AniListMedia {
  id: number
  episodes: number | null
  seasonYear: number | null
  title: { romaji: string | null; english: string | null } | null
  coverImage: { large: string | null } | null
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapAniListMedia(media: AniListMedia): MediaSearchResult | null {
  const title = media.title?.english || media.title?.romaji
  if (!title) return null

  return {
    provider: 'anilist',
    externalId: String(media.id),
    mediaType: 'anime',
    title,
    coverUrl: media.coverImage?.large ?? undefined,
    year: media.seasonYear ?? undefined,
    total: media.episodes ?? undefined,
    subtitle:
      media.title?.english && media.title?.romaji !== media.title?.english
        ? (media.title.romaji ?? undefined)
        : undefined,
  }
}

export const anilistProvider: MediaProvider = {
  id: 'anilist',
  mediaTypes: ['anime'],
  requiresServer: false,

  async search(query, signal) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        query: QUERY,
        variables: { search: query, perPage: SEARCH_LIMIT },
      }),
      signal,
    })
    if (!response.ok) throw new Error('anilist-unavailable')

    // GraphQL responde 200 com `errors` — checar só o status deixaria passar.
    const body = (await response.json()) as {
      data?: { Page?: { media?: AniListMedia[] } }
      errors?: unknown[]
    }
    if (body.errors?.length) throw new Error('anilist-unavailable')

    return (body.data?.Page?.media ?? [])
      .map(mapAniListMedia)
      .filter((r): r is MediaSearchResult => r !== null)
  },
}
