import {
  SEARCH_LIMIT,
  type MediaDetail,
  type MediaFact,
  type MediaProvider,
  type MediaSearchResult,
} from './types'

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
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
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

  async detail(externalId, _mediaType, signal) {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        query: DETAIL_QUERY,
        variables: { id: Number(externalId) },
      }),
      signal,
    })
    if (!response.ok) throw new Error('anilist-unavailable')

    const body = (await response.json()) as {
      data?: { Media?: AniListDetail }
      errors?: unknown[]
    }
    if (body.errors?.length || !body.data?.Media)
      throw new Error('anilist-unavailable')

    const mapped = mapAniListDetail(body.data.Media)
    if (!mapped) throw new Error('anilist-unavailable')
    return mapped
  },
}

// ---------------------------------------------------------------------------
// Ficha completa
// ---------------------------------------------------------------------------

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      episodes
      duration
      status
      seasonYear
      genres
      averageScore
      description(asHtml: false)
      title { romaji english }
      coverImage { large }
      studios(isMain: true) { nodes { name } }
    }
  }
`

interface AniListDetail extends AniListMedia {
  duration?: number | null
  status?: string | null
  genres?: string[] | null
  averageScore?: number | null
  description?: string | null
  studios?: { nodes?: { name?: string }[] } | null
}

/** O AniList devolve a sinopse com `<br>` e `<i>` mesmo pedindo `asHtml: false`.
 *  Deixar passar significaria renderizar HTML de terceiro na tela — então as
 *  tags saem aqui, e o que sobra é texto puro. */
export function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapAniListDetail(media: AniListDetail): MediaDetail | null {
  const base = mapAniListMedia(media)
  if (!base) return null

  const facts: MediaFact[] = []
  if (media.episodes) facts.push({ labelKey: 'fact.episodes', value: String(media.episodes) })
  if (media.duration)
    facts.push({ labelKey: 'fact.episodeLength', value: `${media.duration}min` })

  return {
    ...base,
    synopsis: media.description ? stripHtml(media.description) : undefined,
    genres: media.genres ?? [],
    facts,
    people: (media.studios?.nodes ?? [])
      .map((n) => n?.name)
      .filter((n): n is string => Boolean(n)),
    score: media.averageScore ?? undefined,
  }
}
