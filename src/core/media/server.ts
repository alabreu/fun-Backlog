import {
  backendAnonKey,
  backendConfigured,
  backendUrl,
  supabase,
} from '@core/backend/client'

/**
 * A ponte para a Edge Function `media`, usada pelos providers que têm chave
 * (IGDB, TMDB). O browser nunca fala com essas APIs direto — não porque a
 * resposta seja secreta, mas porque a CHAVE seria: qualquer coisa que chega ao
 * bundle é extraível em trinta segundos de DevTools.
 *
 * Continua passando pela costura de `core/backend/client.ts` de propósito: o
 * dia em que o backend deixar de ser Supabase, a URL da function muda em um
 * lugar só. Ver README.
 */
export const MEDIA_FUNCTION_PATH = '/functions/v1/media'

export type MediaSource = 'igdb' | 'tmdb'

interface MediaRequest {
  source: MediaSource
  /** Texto digitado. Exclusivo com `imdbId`. */
  query?: string
  /** Id do IMDb (`tt0111161`), resolvido pela TMDB. Exclusivo com `query`. */
  imdbId?: string
}

/**
 * Chama a function e devolve o payload cru da fonte. O erro é sempre genérico:
 * `searchAll` só precisa saber que este provider falhou para seguir com os
 * outros, e distinguir "sem sessão" de "IGDB fora do ar" na tela de busca seria
 * ruído — em ambos os casos a pessoa não tem o que fazer a respeito.
 */
export async function callMediaFunction<T>(
  request: MediaRequest,
  signal?: AbortSignal,
): Promise<T> {
  if (!supabase || !backendConfigured)
    throw new Error(`${request.source}-unavailable`)

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error(`${request.source}-unauthenticated`)

  const response = await fetch(`${backendUrl}${MEDIA_FUNCTION_PATH}`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      apikey: backendAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) throw new Error(`${request.source}-unavailable`)

  const body = (await response.json()) as { results?: T }
  if (body?.results === undefined) throw new Error(`${request.source}-unavailable`)
  return body.results
}
