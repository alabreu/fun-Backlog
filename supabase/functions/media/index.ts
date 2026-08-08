// Proxy de busca de mídia: o browser fala com esta function, ela fala com a
// IGDB (jogos) e a TMDB (filmes e séries). As chaves são secrets do servidor e
// NUNCA entram no bundle:
//
//   supabase secrets set IGDB_CLIENT_ID=... IGDB_CLIENT_SECRET=... TMDB_READ_TOKEN=...
//   supabase functions deploy media
//
// UMA function para as duas fontes, e não uma por fonte, porque o que elas têm
// em comum é justamente a parte perigosa: o portão de autenticação. Duplicar
// isso em dois arquivos é duplicar o lugar onde dá para errar. O que difere
// entre as fontes — credencial, formato da query, forma da resposta — está
// isolado em `searchIgdb` e `searchTmdb`, e uma requisição só toca uma delas.
//
// A function é PASSA-ADIANTE de propósito: ela devolve a resposta da fonte quase
// crua, e quem traduz para o formato do app é `core/media/{igdb,tmdb}.ts`. O
// mapeamento é a parte que quebra quando a API de terceiro muda, então ele fica
// onde o `npm test` alcança — aqui em Deno, ele não teria teste nenhum.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Deno + Supabase Edge Runtime (não existem tipos globais no tsconfig do app).
declare const Deno: { env: { get(key: string): string | undefined } }

const CONFIG = {
  /** Quantos resultados pedir. Espelha o SEARCH_LIMIT de core/media/types.ts. */
  limit: 12,
  /** Uma busca menor que isso não é busca, é tecla solta. Espelha o cliente. */
  minQuery: 2,
  /** Teto de tamanho: título de obra não passa disso, e o resto é abuso. */
  maxQuery: 100,
  /** Idioma pedido à TMDB: traz título, sinopse e — quando existe — o pôster
   *  nacional. A TMDB cai no padrão sozinha quando não há versão localizada. */
  tmdbLanguage: 'pt-BR',
  /** Cache em memória. A IGDB permite 4 req/s NA APLICAÇÃO INTEIRA (não por
   *  usuário), então duas pessoas buscando "zelda" ao mesmo tempo já andam
   *  perto do teto. 60s cobre a repetição de quem apaga uma letra e redigita. */
  cacheTtlMs: 60_000,
  cacheMax: 200,
}

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_URL = 'https://api.igdb.com/v4/games'
const TMDB_URL = 'https://api.themoviedb.org/3'

// Restrinja para a origin do app em produção (`supabase secrets set
// ALLOWED_ORIGIN=https://seu-app.vercel.app`).
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}

/** Toda resposta — inclusive as de erro — sai com CORS. Sem isso, uma falha de
 *  rede vira erro opaco de CORS no browser e o usuário vê "Failed to fetch". */
function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

/** Nunca repassar o corpo do erro da fonte: um 401 da Twitch descreve o estado
 *  da nossa credencial, e isso não é assunto do cliente. */
function mapUpstream(status: number): { status: number; code: string } {
  if (status === 429) return { status: 429, code: 'rate_limited' }
  if (status === 401 || status === 403) return { status: 503, code: 'unavailable' }
  if (status >= 500) return { status: 503, code: 'unavailable' }
  return { status: 502, code: 'upstream' }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, { at: number; body: unknown }>()

function cacheGet(key: string): unknown | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > CONFIG.cacheTtlMs) {
    cache.delete(key)
    return undefined
  }
  return hit.body
}

function cacheSet(key: string, body: unknown): void {
  // Map preserva ordem de inserção, então a primeira chave é a mais velha.
  if (cache.size >= CONFIG.cacheMax) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), body })
}

// ---------------------------------------------------------------------------
// IGDB (jogos) — autenticação de APLICAÇÃO, não de usuário. Ver decisão 7.
// ---------------------------------------------------------------------------

/** Token de aplicação da Twitch. Vale ~60 dias; guardado em memória porque é um
 *  segredo do servidor sem dono — instância fria só paga uma requisição a mais.
 *  A margem de 60s evita usar um token que expira no meio do voo. */
let igdbToken: { value: string; expiresAt: number } | null = null

async function igdbAccessToken(forceRenew = false): Promise<string> {
  if (!forceRenew && igdbToken && Date.now() < igdbToken.expiresAt - 60_000)
    return igdbToken.value

  const id = Deno.env.get('IGDB_CLIENT_ID')
  const secret = Deno.env.get('IGDB_CLIENT_SECRET')
  if (!id || !secret) throw new UpstreamError(503)

  const url = new URL(TWITCH_TOKEN_URL)
  url.searchParams.set('client_id', id)
  url.searchParams.set('client_secret', secret)
  url.searchParams.set('grant_type', 'client_credentials')

  const response = await fetch(url, { method: 'POST' })
  if (!response.ok) throw new UpstreamError(response.status)

  const body = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }
  if (!body.access_token) throw new UpstreamError(502)

  igdbToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return igdbToken.value
}

/**
 * A busca vai DENTRO de uma string da APICalypse (`search "…";`), então um `"`
 * no texto do usuário fecharia a string e o resto viraria query. Isto não é
 * higiene: é a defesa contra injeção nesta function. Removemos em vez de
 * escapar porque nenhum título de jogo depende destes caracteres, e remover não
 * tem caso de canto — escapar tem.
 */
function escapeApicalypse(query: string): string {
  return query.replace(/["\\;\r\n]/g, ' ').trim()
}

// Campos escolhidos por serem estáveis há anos na v4. Filtrar por
// `category`/`game_type` tiraria DLC e bundles dos resultados, mas a IGDB vem
// renomeando esse campo — um `where` numa coluna que sumiu derruba a busca
// INTEIRA, e resultado sujo é melhor que resultado nenhum.
const IGDB_FIELDS = 'fields name,first_release_date,cover.image_id,platforms.abbreviation;'

/** Manda uma query APICalypse, renovando o token uma vez se levar 401. */
async function askIgdb(body: string): Promise<unknown> {
  const run = async (token: string) =>
    await fetch(IGDB_URL, {
      method: 'POST',
      headers: {
        'Client-ID': Deno.env.get('IGDB_CLIENT_ID') ?? '',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body,
    })

  let response = await run(await igdbAccessToken())
  // 401 aqui quase sempre é token vencido antes da hora prevista (a Twitch pode
  // invalidar). Uma renovação forçada e uma segunda tentativa — só uma, senão
  // uma credencial errada vira laço infinito contra a Twitch.
  if (response.status === 401) response = await run(await igdbAccessToken(true))

  if (!response.ok) throw new UpstreamError(response.status)
  return await response.json()
}

async function searchIgdb(query: string): Promise<unknown> {
  const safe = escapeApicalypse(query)
  if (safe.length < CONFIG.minQuery) return []

  const found = await askIgdb(
    `search "${safe}"; ${IGDB_FIELDS} limit ${CONFIG.limit};`,
  )
  if (Array.isArray(found) && found.length > 0) return found

  // REDE DE SEGURANÇA para palavra incompleta.
  //
  // O `search` da IGDB exige PALAVRAS INTEIRAS: "the last of u" não acha "The
  // Last of Us", e "starcr" não acha "StarCraft". Como a tela busca enquanto a
  // pessoa digita, isso significa que o resultado só aparece na última letra —
  // e some se ela parar no meio. A TMDB casa parcial, então filmes e séries
  // apareciam e jogos não, o que parecia defeito nosso.
  //
  // `name ~ *"…"*` é substring, sem acento nem relevância, e por isso é
  // FALLBACK e não o caminho principal: o `search` também casa nomes
  // alternativos e ordena por relevância, coisas que este aqui não faz.
  //
  // `total_rating_count` ordena por quantidade de avaliações — o mais próximo
  // de "conhecido" que a IGDB oferece — senão viria em ordem de id, com os
  // jogos mais antigos primeiro.
  try {
    return await askIgdb(
      `where name ~ *"${safe}"*; ${IGDB_FIELDS} sort total_rating_count desc; limit ${CONFIG.limit};`,
    )
  } catch {
    // Falhou o fallback: devolve o vazio do `search`, que é o comportamento
    // de antes. Uma rede de segurança não pode derrubar o que ela protege.
    return found
  }
}

// ---------------------------------------------------------------------------
// TMDB (filmes e séries)
// ---------------------------------------------------------------------------

async function tmdbGet(path: string, params: Record<string, string>) {
  const token = Deno.env.get('TMDB_READ_TOKEN')
  if (!token) throw new UpstreamError(503)

  const url = new URL(`${TMDB_URL}${path}`)
  url.searchParams.set('language', CONFIG.tmdbLanguage)
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, value)

  // O Read Access Token (v4) viaja no header. A chave v3 iria na query string,
  // onde vaza para log de proxy e histórico — por isso escolhemos o v4.
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!response.ok) throw new UpstreamError(response.status)
  return await response.json()
}

async function searchTmdb(query: string): Promise<unknown> {
  // `multi` traz filme e série na mesma chamada (e pessoas, que o cliente
  // descarta) — uma requisição em vez de duas para a mesma digitação.
  return await tmdbGet('/search/multi', {
    query,
    include_adult: 'false',
  })
}

/**
 * Resolve um id do IMDb (`tt0111161`) para a ficha da TMDB. É o que faz "colar
 * link do IMDb" funcionar sem o IMDb ter API utilizável: o id é a chave
 * universal, e quem devolve a capa é a TMDB. Ver decisão 8.
 */
async function findByImdb(imdbId: string): Promise<unknown> {
  return await tmdbGet(`/find/${imdbId}`, { external_source: 'imdb_id' })
}

// ---------------------------------------------------------------------------

class UpstreamError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`upstream-${status}`)
    this.status = status
  }
}

/** Só o formato canônico do IMDb entra: `tt` seguido de 7 a 9 dígitos. Sem
 *  isto, o valor do cliente iria direto para o caminho da URL da TMDB. */
const IMDB_ID = /^tt\d{7,9}$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json(503, { error: 'unavailable' })

  // 1. AUTH PRIMEIRO. `verify_jwt` do Supabase NÃO basta: a anon key também é
  //    um JWT válido do projeto, então sem esta checagem qualquer pessoa com a
  //    chave pública (que está no bundle) usaria a nossa cota da IGDB/TMDB.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json(401, { error: 'unauthenticated' })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !userData?.user) return json(401, { error: 'unauthenticated' })

  // 2. Validar o body antes de gastar rede com terceiro.
  let body: { source?: unknown; query?: unknown; imdbId?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const source = body?.source
  if (source !== 'igdb' && source !== 'tmdb')
    return json(400, { error: 'invalid_source' })

  const imdbId = typeof body?.imdbId === 'string' ? body.imdbId.trim() : ''
  const query = typeof body?.query === 'string' ? body.query.trim() : ''

  if (imdbId) {
    if (source !== 'tmdb') return json(400, { error: 'invalid_source' })
    if (!IMDB_ID.test(imdbId)) return json(400, { error: 'invalid_imdb_id' })
  } else {
    if (query.length < CONFIG.minQuery) return json(400, { error: 'query_too_short' })
    if (query.length > CONFIG.maxQuery) return json(400, { error: 'query_too_long' })
  }

  // 3. Cache antes da chamada externa (ver CONFIG.cacheTtlMs).
  const key = imdbId ? `${source}:imdb:${imdbId}` : `${source}:q:${query.toLowerCase()}`
  const cached = cacheGet(key)
  if (cached !== undefined) return json(200, { results: cached })

  try {
    const results = imdbId
      ? await findByImdb(imdbId)
      : source === 'igdb'
        ? await searchIgdb(query)
        : await searchTmdb(query)

    cacheSet(key, results)
    return json(200, { results })
  } catch (error) {
    if (error instanceof UpstreamError) {
      const mapped = mapUpstream(error.status)
      return json(mapped.status, { error: mapped.code })
    }
    return json(503, { error: 'unavailable' })
  }
})
