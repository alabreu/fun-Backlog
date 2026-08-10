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
  /** Quantos resultados DEVOLVER. Espelha o SEARCH_LIMIT de core/media/types.ts. */
  limit: 20,
  /**
   * Quantos PEDIR à IGDB EM CADA uma das duas consultas de `buscaIgdb`.
   *
   * Buscar "zelda" devolve mais de cem entradas — remasters, ports, DLCs,
   * versões regionais — e o `search` da IGDB ordena por semelhança de string,
   * não por relevância para gente. Nessa ordem, "Zelda's Adventure" ganha de
   * "The Legend of Zelda: Tears of the Kingdom", que tem o nome mais longo.
   */
  igdbPool: 50,
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
// `total_rating_count` não aparece na tela: é só o critério de ordenação.
const IGDB_FIELDS_BASE =
  'fields name,first_release_date,cover.image_id,platforms.abbreviation,' +
  'total_rating_count'

/**
 * A FRANQUIA ("The Legend of Zelda"), que o cliente usa para manter os títulos
 * de uma série vizinhos na lista em vez de intercalados por popularidade.
 *
 * ERA `collection.name`, E ESSE ERA O ERRO. Na IGDB, "collection" é a SÉRIE, e
 * ela é bem mais fina do que o nome sugere: existe uma coleção chamada "The
 * Legend of Zelda: Breath of the Wild", contendo o jogo e suas edições. Pedir
 * a coleção dava a cada Zelda um nome de grupo diferente, e um grupo de um só
 * não muda de lugar — por isso a ordenação por franquia não teve efeito
 * nenhum na tela. O guarda-chuva é `franchise`, o que a igdb.com mostra em
 * /franchises/the-legend-of-zelda.
 *
 * Continua uma LISTA DE CANDIDATOS porque o nome do campo é a parte que não dá
 * para garantir daqui: a IGDB está renomeando os dois pares para o plural
 * (`franchises` substitui `franchise`) e um campo inexistente não devolve "sem
 * franquia" — devolve 400 e derruba a busca inteira. A function tenta o
 * primeiro, e ao levar 400 desce para o próximo; a string vazia no fim é a
 * desistência, e mesmo ela é sobrevivível: sem o campo, o cliente agrupa pelo
 * título antes dos dois pontos.
 *
 * A escolha fica LEMBRADA na instância: o custo de descobrir é pago uma vez por
 * instância fria, não a cada tecla digitada.
 */
const IGDB_COLLECTION_FIELDS = [
  'franchises.name',
  'franchise.name',
  'collection.name',
  '',
]
let colecaoEscolhida = 0

function igdbFields(): string {
  const extra = IGDB_COLLECTION_FIELDS[colecaoEscolhida]
  return `${IGDB_FIELDS_BASE}${extra ? ',' + extra : ''};`
}

// A ficha pede bem mais campos que a busca — e só a ficha paga por eles, uma
// obra por vez. Pedir isto na LISTA multiplicaria o payload por doze.
const IGDB_DETAIL_FIELDS =
  'fields name,summary,storyline,first_release_date,cover.image_id,' +
  'platforms.abbreviation,genres.name,game_modes.name,total_rating,' +
  'involved_companies.developer,involved_companies.publisher,' +
  'involved_companies.company.name,franchises'

/**
 * "Onde comprar" — Steam, Epic, GOG, itch. Fica SEPARADO do resto dos campos
 * porque `websites.category` é justamente o tipo de coluna que a IGDB vem
 * renomeando, e um campo extinto não devolve "sem links": devolve erro e
 * derruba a ficha inteira. Separado, `detailIgdb` tenta de novo sem ele.
 */
const IGDB_WEBSITE_FIELDS = ',websites.url,websites.category'

/** Manda uma query APICalypse, renovando o token uma vez se levar 401. */
async function askIgdb(body: string, url = IGDB_URL): Promise<unknown> {
  const run = async (token: string) =>
    await fetch(url, {
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

/**
 * Ordena por "conhecido" e corta no limite de exibição.
 *
 * `total_rating_count` é o mais próximo de popularidade que a IGDB oferece.
 * Quem não tem avaliação nenhuma vai para o fim em vez de sumir: um jogo
 * obscuro que casa exatamente com o que a pessoa digitou ainda é resposta.
 */
function byPopularity(rows: unknown): unknown {
  if (!Array.isArray(rows)) return rows
  return [...rows]
    .sort(
      (a, b) =>
        ((b as { total_rating_count?: number })?.total_rating_count ?? 0) -
        ((a as { total_rating_count?: number })?.total_rating_count ?? 0),
    )
    .slice(0, CONFIG.limit)
}

/** Junta os dois lotes SEM repetir, e reordena o conjunto por popularidade. */
function mergeById(lotes: unknown[]): unknown[] {
  const porId = new Map<number, unknown>()
  for (const lote of lotes) {
    if (!Array.isArray(lote)) continue
    for (const jogo of lote) {
      const id = (jogo as { id?: number })?.id
      // Vence a PRIMEIRA ocorrência: os dois lotes trazem os mesmos campos, e
      // manter a primeira preserva a ordem de chegada em caso de empate.
      if (typeof id === 'number' && !porId.has(id)) porId.set(id, jogo)
    }
  }
  return byPopularity([...porId.values()]) as unknown[]
}

/**
 * DIAGNÓSTICO da busca de jogos.
 *
 * O suficiente para separar hipóteses sem abrir a resposta inteira: contagem e
 * status de erro por consulta. NÃO registra o texto buscado nem nada do
 * usuário. (A sonda que devolvia isto na resposta HTTP foi removida quando o
 * caso do "zelda" fechou — o defeito era pedir `collection.name` em vez de
 * `franchises.name`.)
 */
function diag(dados: Record<string, unknown>): void {
  console.log(JSON.stringify({ diag: 'igdb-search', ...dados }))
}

/** Roda uma consulta e devolve o erro em vez de lançar: com duas em paralelo,
 *  uma falhando não pode levar a outra junto. */
async function tentar(
  q: string,
): Promise<{ linhas: unknown; erro: number }> {
  try {
    return { linhas: await askIgdb(q), erro: 0 }
  } catch (error) {
    return { linhas: null, erro: error instanceof UpstreamError ? error.status : 0 }
  }
}

/**
 * DUAS CHAMADAS SIMPLES, em paralelo, no mesmo endpoint `/v4/games` que o resto
 * da function usa.
 *
 * POR QUE DUAS. O `search` da IGDB ordena por semelhança de string, não por
 * relevância para gente — e numa franquia grande isso é fatal: pedindo as N
 * primeiras, os títulos que a pessoa procura podem nem estar no lote, e aí
 * nenhuma reordenação os recupera. A segunda consulta é substring burra
 * ordenada por avaliações, e é ela que garante os campeões da franquia.
 *
 * Era um `multiquery` — um endpoint e uma sintaxe que eu NÃO consegui verificar
 * (a documentação da IGDB é inacessível do ambiente onde este código é escrito),
 * e que, se falhasse, caía em silêncio no caminho antigo. Trocar por duas
 * chamadas comuns custa uma requisição a mais contra o limite da IGDB e elimina
 * uma classe inteira de falha invisível. Com o cache de 60s, a conta fecha.
 */
async function buscaIgdb(safe: string, fields: string): Promise<unknown> {
  const [relevancia, popularidade] = await Promise.all([
    // Casa nome alternativo, acento e ordem de palavras.
    tentar(`search "${safe}"; ${fields} limit ${CONFIG.igdbPool};`),
    // Substring burra ordenada por avaliações: é esta que garante que os
    // campeões da franquia estejam no lote, independente da relevância.
    tentar(
      `where name ~ *"${safe}"*; ${fields} sort total_rating_count desc; limit ${CONFIG.igdbPool};`,
    ),
  ])

  // As duas falharam: 400 sobe para o chamador trocar o campo de franquia; o
  // resto vira indisponibilidade normal.
  if (relevancia.erro && popularidade.erro) {
    diag({ erros: [relevancia.erro, popularidade.erro] })
    const status =
      relevancia.erro === 400 || popularidade.erro === 400 ? 400 : relevancia.erro
    throw new UpstreamError(status || 503)
  }

  const juntos = mergeById([relevancia.linhas, popularidade.linhas])

  diag({
    campo: IGDB_COLLECTION_FIELDS[colecaoEscolhida] || '(nenhum)',
    erros: [relevancia.erro, popularidade.erro],
    rel: Array.isArray(relevancia.linhas) ? relevancia.linhas.length : -1,
    pop: Array.isArray(popularidade.linhas) ? popularidade.linhas.length : -1,
    fim: juntos.length,
  })

  return juntos
}

async function searchIgdb(query: string): Promise<unknown> {
  const safe = escapeApicalypse(query)
  if (safe.length < CONFIG.minQuery) return []

  // Desce a lista de candidatos a campo de franquia enquanto a IGDB recusar o
  // nome. Só o 400 faz descer: 429 e 503 são a fonte ocupada ou fora do ar, e
  // desistir da franquia por causa deles perderia a feature para sempre por um
  // problema passageiro.
  for (;;) {
    try {
      return await buscaIgdb(safe, igdbFields())
    } catch (error) {
      const campoRuim = error instanceof UpstreamError && error.status === 400
      const restam = colecaoEscolhida < IGDB_COLLECTION_FIELDS.length - 1
      if (!campoRuim || !restam) throw error
      colecaoEscolhida++
      diag({
        campoRecusado: true,
        proximo: IGDB_COLLECTION_FIELDS[colecaoEscolhida] || '(nenhum)',
      })
    }
  }
}

/** Ficha de UM jogo. `where id = N` e não `search`: aqui o id é exato. */
async function detailIgdb(id: string): Promise<unknown> {
  const numeric = Number(id)
  if (!Number.isInteger(numeric) || numeric <= 0) throw new UpstreamError(400)

  const ask = async (fields: string) =>
    await askIgdb(`where id = ${numeric}; ${fields}; limit 1;`)

  let rows: unknown
  try {
    rows = await ask(IGDB_DETAIL_FIELDS + IGDB_WEBSITE_FIELDS)
  } catch {
    // REDE DE SEGURANÇA: se a IGDB tirar `websites.category` do ar, a ficha
    // continua abrindo — só sem os links de loja. Perder um extra é aceitável;
    // perder a sinopse, o elenco e as plataformas junto não é.
    rows = await ask(IGDB_DETAIL_FIELDS)
  }
  // A IGDB sempre devolve ARRAY, mesmo para um id só. O app espera o objeto.
  const jogo = Array.isArray(rows) ? (rows[0] ?? null) : null
  if (!jogo || typeof jogo !== 'object') return jogo

  return {
    ...(jogo as Record<string, unknown>),
    franchiseGames: await franchiseGamesIgdb(jogo as Record<string, unknown>),
  }
}

/**
 * OS OUTROS JOGOS DA FRANQUIA — o carrossel do fim da ficha.
 *
 * Requisição SEPARADA, e não `franchises.games.name` embutido, por dois
 * motivos. O primeiro é o mesmo de `IGDB_WEBSITE_FIELDS`: um campo que a IGDB
 * renomear não devolve "sem franquia", devolve erro e derruba a ficha inteira —
 * separado, o `catch` custa o carrossel e nada mais. O segundo é que expansão
 * de dois níveis multiplica o payload da ficha por uma franquia inteira, e a
 * maioria das aberturas nem rola até o carrossel.
 *
 * `total_rating_count desc` porque um limite de 24 numa franquia de cinquenta
 * jogos tem de cortar por alguma coisa, e "o que mais gente jogou" é a única
 * ordem que serve tanto para reencontrar quanto para descobrir. Ordenar por
 * data deixaria de fora justamente o clássico.
 */
const IGDB_FRANCHISE_LIMIT = 24

async function franchiseGamesIgdb(
  jogo: Record<string, unknown>,
): Promise<unknown[]> {
  // `franchises` é a lista (o guarda-chuva); `collection` é a série fina. A
  // primeira é a que a igdb.com mostra em /franchises/… — ver a nota longa
  // em IGDB_COLLECTION_FIELDS.
  const franquias = jogo.franchises
  const ids = Array.isArray(franquias)
    ? franquias
        .map((f) => (typeof f === 'object' && f ? (f as { id?: unknown }).id : f))
        .filter((id): id is number => Number.isInteger(id))
    : []
  if (ids.length === 0) return []

  // SÓ A PRIMEIRA franquia. Em APICalypse, `= (a,b)` é "contém TODOS", não
  // "contém algum" — passar a lista inteira estreitaria a busca para os jogos
  // que pertencem às duas franquias ao mesmo tempo, que costumam ser zero.
  // Jogo com mais de uma franquia é raro, e a primeira é a principal.
  try {
    const rows = await askIgdb(
      `where franchises = (${ids[0]}) & id != ${Number(jogo.id)};` +
        ' fields name,first_release_date,cover.image_id;' +
        ` sort total_rating_count desc; limit ${IGDB_FRANCHISE_LIMIT};`,
    )
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
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

async function searchTmdb(
  query: string,
  kind?: 'tv' | 'movie',
): Promise<unknown> {
  // COM `kind`, a busca é do tipo. Quem pede é a estante, que já sabe se é de
  // filme ou de série: aí as 20 vagas da resposta são todas do que a pessoa
  // está olhando, em vez de disputadas por filme, série e pessoa.
  //
  // Sem `kind`, `multi` — ele traz filme e série na mesma chamada (e pessoas,
  // que o cliente descarta), que é uma requisição em vez de duas para a mesma
  // digitação na busca unificada.
  //
  // Cuidado ao mexer: a resposta do `/search/tv` e do `/search/movie` NÃO traz
  // `media_type` em cada item — quem chamou é que sabe o tipo.
  return await tmdbGet(kind ? `/search/${kind}` : '/search/multi', {
    query,
    include_adult: 'false',
  })
}

/**
 * Ficha de um filme ou série. `append_to_response` junta elenco e "onde
 * assistir" NA MESMA requisição — sem ele seriam três idas à TMDB para montar
 * uma tela só.
 */
async function detailTmdb(id: string, kind: 'movie' | 'tv'): Promise<unknown> {
  const numeric = Number(id)
  if (!Number.isInteger(numeric) || numeric <= 0) throw new UpstreamError(400)

  // `release_dates` só existe para filme — pedir numa série devolve erro na
  // requisição INTEIRA, então o append muda com o tipo.
  const ficha = await tmdbGet(`/${kind}/${numeric}`, {
    append_to_response:
      kind === 'movie'
        ? 'credits,watch/providers,release_dates'
        : 'credits,watch/providers',
  })
  if (!ficha || typeof ficha !== 'object') return ficha

  return {
    ...(ficha as Record<string, unknown>),
    collectionParts: await collectionPartsTmdb(ficha as Record<string, unknown>),
  }
}

/**
 * OS OUTROS FILMES DA SAGA.
 *
 * A ficha do filme já traz `belongs_to_collection`, mas só com id e nome — os
 * MEMBROS exigem outra chamada, e `append_to_response` não cobre coleção. Então
 * é uma ida a mais, e só ela: paga apenas o filme que pertence a alguma saga.
 *
 * SÉRIE NÃO TEM ISTO. A TMDB não modela franquia para TV — não é campo que
 * esquecemos de pedir, é conceito que não existe lá. Série sai daqui com lista
 * vazia e a seção some da tela, que é a resposta honesta.
 *
 * O `catch` devolve vazio: perder o carrossel é aceitável, perder a ficha do
 * filme por causa dele não é.
 */
async function collectionPartsTmdb(
  ficha: Record<string, unknown>,
): Promise<unknown[]> {
  const colecao = ficha.belongs_to_collection
  const id =
    colecao && typeof colecao === 'object'
      ? (colecao as { id?: unknown }).id
      : undefined
  if (!Number.isInteger(id)) return []

  try {
    const body = await tmdbGet(`/collection/${id as number}`, {})
    const parts = (body as { parts?: unknown })?.parts
    return Array.isArray(parts) ? parts : []
  } catch {
    return []
  }
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
  let body: {
    source?: unknown
    query?: unknown
    imdbId?: unknown
    detailId?: unknown
    detailKind?: unknown
    searchKind?: unknown
  }
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
  const detailId = typeof body?.detailId === 'string' ? body.detailId.trim() : ''
  // Só os dois caminhos que a TMDB tem: qualquer outra coisa iria para a URL.
  const detailKind = body?.detailKind === 'tv' ? 'tv' : 'movie'
  // A busca por tipo é OPCIONAL — ausente cai no `multi`. Lista fechada pelo
  // mesmo motivo do `detailKind`: este valor vira caminho de URL.
  const searchKind =
    body?.searchKind === 'tv' || body?.searchKind === 'movie'
      ? body.searchKind
      : undefined

  if (detailId) {
    // Id da fonte é sempre numérico nas duas. Barrar aqui é o que impede o
    // valor do cliente de virar caminho de URL ou trecho de query.
    if (!/^\d{1,12}$/.test(detailId)) return json(400, { error: 'invalid_detail_id' })
  } else if (imdbId) {
    if (source !== 'tmdb') return json(400, { error: 'invalid_source' })
    if (!IMDB_ID.test(imdbId)) return json(400, { error: 'invalid_imdb_id' })
  } else {
    if (query.length < CONFIG.minQuery) return json(400, { error: 'query_too_short' })
    if (query.length > CONFIG.maxQuery) return json(400, { error: 'query_too_long' })
  }

  // 3. Cache antes da chamada externa (ver CONFIG.cacheTtlMs).
  const key = detailId
    ? `${source}:d:${detailKind}:${detailId}`
    : imdbId
      ? `${source}:imdb:${imdbId}`
      // O TIPO ENTRA NA CHAVE. Sem ele, a busca de "succession" na estante de
      // séries e a mesma palavra na busca unificada dividiriam a entrada, e
      // quem chegasse depois receberia a resposta do endpoint errado.
      : `${source}:q:${searchKind ?? 'multi'}:${query.toLowerCase()}`
  const cached = cacheGet(key)
  if (cached !== undefined) return json(200, { results: cached })

  try {
    const results = detailId
      ? source === 'igdb'
        ? await detailIgdb(detailId)
        : await detailTmdb(detailId, detailKind)
      : imdbId
        ? await findByImdb(imdbId)
        : source === 'igdb'
          ? await searchIgdb(query)
          : await searchTmdb(query, searchKind)

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
