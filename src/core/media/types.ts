import type { MediaType } from '@core/items/types'

/**
 * A interface comum das fontes externas. O resto do app não sabe de onde veio o
 * dado: `AddScreen` chama `searchAll()` e recebe resultados iguais, venham eles
 * de GraphQL, REST ou de uma Edge Function nossa.
 *
 * `requiresServer` é a divisão que importa na prática: quem exige chave de API
 * (IGDB, TMDB) só pode ser chamado a partir de uma Edge Function, com o usuário
 * logado; quem é público (AniList, Open Library) o browser chama direto. Ver
 * docs/decisions.md.
 */
export interface MediaSearchResult {
  /** Id do provider que devolveu (`anilist`, `openlibrary`, …). */
  provider: string
  /** Id do item NAQUELE provider — vira `externalIds[provider]`. */
  externalId: string
  mediaType: MediaType
  title: string
  coverUrl?: string
  year?: number
  /** Total de episódios / páginas, quando o provider souber. */
  total?: number
  /** Uma linha de contexto para desempatar homônimos na lista. */
  subtitle?: string
}

export interface MediaProvider {
  id: string
  /** Que mídias este provider cobre. */
  mediaTypes: MediaType[]
  /** Precisa passar por Edge Function (tem chave)? */
  requiresServer: boolean
  search(query: string, signal?: AbortSignal): Promise<MediaSearchResult[]>
}

/** Quantos resultados pedir por provider — a lista é para escolher, não para
 *  navegar; mais que isso vira scroll infinito de decisão. */
export const SEARCH_LIMIT = 12
