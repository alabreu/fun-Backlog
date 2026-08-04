import type { MediaType } from '@core/items/types'
import { anilistProvider } from './anilist'
import { openLibraryProvider } from './openlibrary'
import type { MediaProvider, MediaSearchResult } from './types'

/**
 * Busca unificada: uma caixa de texto, todas as mídias, resultados agrupados
 * por tipo. É o que o briefing pede como "fricção zero para adicionar" — quem
 * está no sofá não quer escolher a aba certa antes de digitar.
 *
 * Providers registrados aqui. Os que exigem chave (IGDB para jogos, TMDB para
 * filmes e séries) entram nesta lista quando as Edge Functions existirem, com
 * `requiresServer: true` — e aí `searchAll` já os filtra sozinho para quem está
 * sem login.
 */
export const PROVIDERS: MediaProvider[] = [anilistProvider, openLibraryProvider]

export interface SearchGroup {
  mediaType: MediaType
  results: MediaSearchResult[]
}

export interface SearchOutcome {
  groups: SearchGroup[]
  /** Providers que falharam — a UI avisa sem esconder o que deu certo. */
  failed: string[]
  /** Providers pulados por exigirem login. */
  skippedNeedingAuth: string[]
}

export interface SearchOptions {
  /** Restringe a uma mídia; ausente busca em todas. */
  mediaType?: MediaType
  /** Sem sessão, providers com chave nem são chamados (dariam 401). */
  signedIn?: boolean
  signal?: AbortSignal
}

/** Ordem de exibição dos grupos. Fixa de propósito: a posição de cada mídia na
 *  tela não deve dançar entre buscas — a memória muscular importa mais que
 *  ordenar por quantidade de resultados. */
const GROUP_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 2)
    return { groups: [], failed: [], skippedNeedingAuth: [] }

  const { mediaType, signedIn = false, signal } = options
  const failed: string[] = []
  const skippedNeedingAuth: string[] = []

  const eligible = PROVIDERS.filter((p) => {
    if (mediaType && !p.mediaTypes.includes(mediaType)) return false
    if (p.requiresServer && !signedIn) {
      skippedNeedingAuth.push(p.id)
      return false
    }
    return true
  })

  // Em paralelo e tolerante a falha: um provider fora do ar não pode levar a
  // busca inteira junto — o resultado dos outros ainda serve.
  const settled = await Promise.all(
    eligible.map(async (provider) => {
      try {
        return await provider.search(trimmed, signal)
      } catch (error) {
        // Cancelamento não é falha: quem digitou de novo abortou de propósito.
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          failed.push(provider.id)
        return [] as MediaSearchResult[]
      }
    }),
  )

  const byType = new Map<MediaType, MediaSearchResult[]>()
  for (const result of settled.flat()) {
    const bucket = byType.get(result.mediaType)
    if (bucket) bucket.push(result)
    else byType.set(result.mediaType, [result])
  }

  const groups = GROUP_ORDER.filter((type) => byType.has(type)).map((type) => ({
    mediaType: type,
    results: byType.get(type) as MediaSearchResult[],
  }))

  return { groups, failed, skippedNeedingAuth }
}
