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
  /** Texto digitado. Exclusivo com `imdbId` e `detailId`. */
  query?: string
  /** Id do IMDb (`tt0111161`), resolvido pela TMDB. Exclusivo com `query`. */
  imdbId?: string
  /** Id da obra NA FONTE, para pedir a ficha completa. */
  detailId?: string
  /** A TMDB separa filme de série já na URL, então o tipo vai junto. */
  detailKind?: 'movie' | 'tv'
  /**
   * Restringe a BUSCA a um tipo (`/search/tv`, `/search/movie`). Ausente = a
   * busca mista do `/search/multi`. Quem manda é a estante, que já sabe o tipo;
   * a busca unificada não manda.
   */
  searchKind?: 'movie' | 'tv'
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

  // NADA AQUI EXIGE SESSÃO desde 11/08/2026. A ficha por id abriu em 10/08
  // (link compartilhado) e a busca abriu no dia seguinte, quando ficou claro
  // que procurar um jogo sem conta devolvia uma estante de livros — sendo que o
  // link daquele mesmo jogo já abria. Quem segura a cota é o teto por IP na
  // function, e não este `if`.
  //
  // Sem sessão, o portador é a ANON KEY, e não porque ela autentique alguém:
  // o `verify_jwt` da plataforma barra a requisição antes do nosso código rodar
  // se não houver JWT nenhum do projeto, e a anon key é um. Ela já está no
  // bundle — mandá-la aqui não revela nada que não estivesse à mão.
  //
  // A sessão, quando existe, continua indo: é ela que a function usa para
  // dispensar o teto de quem se identificou.

  const response = await fetch(`${backendUrl}${MEDIA_FUNCTION_PATH}`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      apikey: backendAnonKey,
      Authorization: `Bearer ${token ?? backendAnonKey}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) throw new Error(`${request.source}-unavailable`)

  const body = (await response.json()) as { results?: T }
  if (body?.results === undefined) throw new Error(`${request.source}-unavailable`)
  return body.results
}
