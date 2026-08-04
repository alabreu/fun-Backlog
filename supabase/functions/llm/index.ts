// Proxy de LLM: o browser fala com esta function, ela fala com o OpenRouter.
// A chave do OpenRouter é secret do servidor e NUNCA entra no bundle:
//
//   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
//   supabase functions deploy llm
//
// Não existe VITE_OPENROUTER_API_KEY — uma env var VITE_* vai para o bundle
// público e é extraível em 30 segundos de DevTools. Quem quiser usar a própria
// chave usa o modo BYOK (core/llm/client.ts), que guarda a chave DO USUÁRIO no
// localStorage dele e fala direto com o OpenRouter, sem passar por aqui.
//
// A ordem das etapas abaixo é deliberada — ver comentários em cada uma.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Deno + Supabase Edge Runtime (não existem tipos globais no tsconfig do app).
declare const Deno: { env: { get(key: string): string | undefined } }
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

// ---------------------------------------------------------------------------
// Config do app. É isto que muda de produto para produto.
// ---------------------------------------------------------------------------
const CONFIG = {
  /** Modelos que este proxy aceita. Serve de trava de custo — ver `resolveModel`.
   *  Para trocar de modelo, mexa AQUI (e no `byokModel` de core/llm/config.ts),
   *  nunca aceitando o `model` que o cliente mandar.
   *
   *  Alternativas, se o produto pedir mais capacidade:
   *    'anthropic/claude-opus-5'   — o mais capaz, e o mais caro
   *    'anthropic/claude-sonnet-5' — meio-termo */
  allowedModels: ['deepseek/deepseek-v4-flash-latest'],
  /** O modelo que roda de fato: o "Latest" da família V4 Flash, que o próprio
   *  OpenRouter redireciona para a release mais nova da linha. Assim o template
   *  acompanha os lançamentos da DeepSeek sem ninguém editar este arquivo.
   *
   *  O custo é a outra face: o comportamento pode mudar sob os seus pés numa
   *  release nova. Se algum app precisar de saída reproduzível, troque por uma
   *  versão fixa da família (ex.: 'deepseek/deepseek-v4-flash-0731') e assuma
   *  a atualização manual. */
  defaultModel: 'deepseek/deepseek-v4-flash-latest',
  /** Prompt de sistema do produto (persona, regras). Vazio = sem system. */
  systemPrompt: '',
  dailyLimitPerUser: 40,
  dailyLimitGlobal: 2000,
  maxTokens: 1024,
  maxMessages: 30,
  maxCharsPerMessage: 8000,
  maxCharsTotal: 24000,
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

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
 *  rede vira erro opaco de CORS no browser e o mapeamento de erro amigável do
 *  cliente nunca roda: o usuário vê "Failed to fetch". */
function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })
}

/** Nunca repassar o corpo do erro do OpenRouter: um 402 vem com "you have X
 *  credits left" e vazaria o estado financeiro da conta para o cliente. */
function mapUpstream(status: number): { status: number; code: string } {
  if (status === 429) return { status: 429, code: 'rate_limited' }
  if (status === 401 || status === 402 || status === 403)
    return { status: 503, code: 'unavailable' }
  if (status >= 500) return { status: 503, code: 'unavailable' }
  return { status: 502, code: 'upstream' }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Valida e RECONSTRÓI as mensagens. Não repassamos o objeto do cliente: ele
 *  pode enfiar chaves extras (payload gigante que escapa dos limites, ou
 *  parâmetros de roteamento do OpenRouter). Só `role` e `content` sobrevivem, e
 *  um único `system`, no índice 0. */
function sanitizeMessages(raw: unknown): ChatMessage[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return 'invalid_messages'
  if (raw.length > CONFIG.maxMessages) return 'too_many_messages'

  const out: ChatMessage[] = []
  let total = 0

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { role?: unknown; content?: unknown }
    const role = item?.role
    const content = item?.content
    if (role !== 'system' && role !== 'user' && role !== 'assistant')
      return 'invalid_role'
    if (typeof content !== 'string' || content.length === 0)
      return 'invalid_content'
    if (content.length > CONFIG.maxCharsPerMessage) return 'message_too_long'
    if (role === 'system' && i !== 0) return 'system_not_first'

    total += content.length
    if (total > CONFIG.maxCharsTotal) return 'conversation_too_long'

    out.push({ role, content })
  }

  return out
}

/** O `model` que o cliente manda é IGNORADO. Essa é a proteção mais importante
 *  e a mais fácil de esquecer: sem ela qualquer um força o modelo mais caro e a
 *  conta é sua. A allowlist revalida o default (defesa contra erro de digitação
 *  na config acima). Para escolher modelo por feature, mapeie aqui no servidor
 *  a partir de um campo `preset` — nunca do nome do modelo. */
function resolveModel(): string {
  return CONFIG.allowedModels.includes(CONFIG.defaultModel)
    ? CONFIG.defaultModel
    : CONFIG.allowedModels[0]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!openrouterKey || !supabaseUrl || !serviceKey)
    return json(503, { error: 'unavailable' })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // 1. AUTH PRIMEIRO. Sem sessão válida, nada mais acontece.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json(401, { error: 'unauthenticated' })
  const { data: userData, error: userError } = await admin.auth.getUser(jwt)
  const user = userData?.user
  if (userError || !user) return json(401, { error: 'unauthenticated' })

  // 2. VALIDAR O BODY ANTES DE TOCAR NO CONTADOR. Requisição malformada não
  //    pode queimar cota de quem mandou.
  let body: { messages?: unknown }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const messages = sanitizeMessages(body?.messages)
  if (typeof messages === 'string') return json(400, { error: messages })

  // 3. Modelo resolvido no servidor (ver resolveModel).
  const model = resolveModel()

  // 4. Cota: incrementa atomicamente, checa o resultado, ESTORNA se estourou.
  //    Checar-depois-incrementar seria a ordem errada (corrida entre o select e
  //    o update); incrementar-e-estornar é o que o contador atômico permite.
  const day = new Date().toISOString().slice(0, 10)
  const spend = async (delta: number) =>
    await admin.rpc('add_llm_usage', {
      p_user_id: user.id,
      p_day: day,
      p_delta: delta,
    })

  const { data: counts, error: usageError } = await spend(1)
  if (usageError || !counts) return json(503, { error: 'unavailable' })

  const { user_count: userCount, global_count: globalCount } = counts as {
    user_count: number
    global_count: number
  }
  if (userCount > CONFIG.dailyLimitPerUser) {
    await spend(-1)
    return json(429, { error: 'daily_limit_reached' })
  }
  if (globalCount > CONFIG.dailyLimitGlobal) {
    await spend(-1)
    return json(429, { error: 'busy' })
  }

  // 5. Upstream. `usage.include` liga a telemetria de tokens/custo (etapa 6).
  const finalMessages = CONFIG.systemPrompt
    ? [
        { role: 'system' as const, content: CONFIG.systemPrompt },
        ...messages.filter((m) => m.role !== 'system'),
      ]
    : messages

  let upstream: Response
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: CONFIG.maxTokens,
        messages: finalMessages,
        usage: { include: true },
      }),
    })
  } catch {
    await spend(-1)
    return json(503, { error: 'unavailable' })
  }

  if (!upstream.ok || !upstream.body) {
    // Estorno: o usuário não recebeu nada, então não deve pagar a cota.
    await spend(-1)
    const mapped = mapUpstream(upstream.status)
    return json(mapped.status, { error: mapped.code })
  }

  // 6. Telemetria best-effort: divide o stream em dois. Um ramo vai direto ao
  //    cliente (zero latência adicional), o outro é consumido em background
  //    para extrair tokens e custo real. waitUntil segura a function viva —
  //    sem ele o log morre quando a resposta retorna. Nunca pode afetar a
  //    resposta, por isso todo o corpo é try/catch silencioso.
  const [toClient, toLog] = upstream.body.tee()
  try {
    EdgeRuntime.waitUntil(logUsage(admin, user.id, model, toLog))
  } catch {
    void toLog.cancel().catch(() => {})
  }

  return new Response(toClient, {
    headers: {
      ...CORS,
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  })
})

/** Lê o ramo de telemetria até o fim e grava o último bloco `usage` do
 *  OpenRouter em analytics_events. Falha aqui é silenciosa por design. */
async function logUsage(
  admin: ReturnType<typeof createClient>,
  userId: string,
  model: string,
  stream: ReadableStream<Uint8Array>,
): Promise<void> {
  try {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage: Record<string, unknown> | null = null

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        for (const line of part.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload) as { usage?: Record<string, unknown> }
            if (json.usage) usage = json.usage
          } catch {
            // chunk parcial ou keepalive — ignora
          }
        }
      }
    }

    if (!usage) return
    await admin.from('analytics_events').insert({
      session_id: 'server',
      user_id: userId,
      type: 'llm_completion',
      meta: {
        model,
        prompt_tokens: usage.prompt_tokens ?? null,
        completion_tokens: usage.completion_tokens ?? null,
        cost: usage.cost ?? null,
      },
    })
  } catch {
    // Telemetria é best-effort.
  }
}
