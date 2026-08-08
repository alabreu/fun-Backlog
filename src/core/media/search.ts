import type { MediaType } from '@core/items/types'
import { anilistProvider } from './anilist'
import { igdbProvider } from './igdb'
import { openLibraryProvider } from './openlibrary'
import { tmdbProvider } from './tmdb'
import type { MediaProvider, MediaSearchResult } from './types'

/**
 * Busca unificada: uma caixa de texto, todas as mídias, resultados agrupados
 * por tipo. É o que o briefing pede como "fricção zero para adicionar" — quem
 * está no sofá não quer escolher a aba certa antes de digitar.
 *
 * Providers registrados aqui. Os que exigem chave (IGDB para jogos, TMDB para
 * filmes e séries) passam pela Edge Function `media` e vêm com
 * `requiresServer: true` — `searchAll` os filtra sozinho para quem está sem
 * login, então em modo convidado a busca continua funcionando para anime e
 * livro em vez de dar 401.
 */
export const PROVIDERS: MediaProvider[] = [
  igdbProvider,
  tmdbProvider,
  anilistProvider,
  openLibraryProvider,
]

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
  /**
   * As mídias que a pessoa mantém ligadas, NA ORDEM dela. Ausente = todas, que
   * é o padrão e o que os testes usam.
   *
   * Não é só filtro de exibição: provider de mídia desligada não é CHAMADO. Uma
   * busca a menos por letra digitada é o ganho concreto de desligar uma
   * categoria — buscar "the last" com anime desligado deixa de bater no AniList.
   */
  enabled?: MediaType[]
  signal?: AbortSignal
}

/** Ordem de exibição dos grupos quando a pessoa não escolheu a dela. A posição
 *  de cada mídia na tela não deve dançar entre buscas — memória muscular importa
 *  mais que ordenar por quantidade de resultados. */
const GROUP_ORDER: MediaType[] = ['game', 'movie', 'series', 'anime', 'book']

/**
 * Existe alguma fonte capaz de buscar esta mídia agora? Serve ao estado vazio
 * da tela: "nada encontrado" seria mentira quando o problema é que ninguém
 * procurou — jogos, filmes e séries ainda não têm provider registrado. A conta
 * inclui a sessão porque provider com chave não conta para quem está sem login.
 */
export function hasProviderFor(
  mediaType: MediaType,
  signedIn: boolean,
): boolean {
  return PROVIDERS.some(
    (p) => p.mediaTypes.includes(mediaType) && (!p.requiresServer || signedIn),
  )
}

export async function searchAll(
  query: string,
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 2)
    return { groups: [], failed: [], skippedNeedingAuth: [] }

  const { mediaType, signedIn = false, enabled = GROUP_ORDER, signal } = options
  const failed: string[] = []
  const skippedNeedingAuth: string[] = []

  const eligible = PROVIDERS.filter((p) => {
    if (mediaType && !p.mediaTypes.includes(mediaType)) return false
    // Provider que só serve mídia desligada não é chamado. Um provider que
    // atende duas mídias (a TMDB faz filme e série) continua valendo enquanto
    // UMA delas estiver ligada — os resultados da outra caem no agrupamento.
    if (!p.mediaTypes.some((m) => enabled.includes(m))) return false
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

  // `enabled` manda nas duas coisas: quem aparece e em que ordem. Um resultado
  // de mídia desligada que veio de carona num provider compartilhado (a série
  // que a TMDB devolveu para quem só quer filmes) é descartado aqui.
  const groups = enabled
    .filter((type) => byType.has(type))
    .map((type) => ({
      mediaType: type,
      results: byType.get(type) as MediaSearchResult[],
    }))

  return { groups, failed, skippedNeedingAuth }
}
