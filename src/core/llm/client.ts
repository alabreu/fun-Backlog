import {
  backendAnonKey,
  backendConfigured,
  backendUrl,
  supabase,
} from '@core/backend/client'
import { APP_NAME, storageKey } from '@core/config'
import { LLM, LLM_PROXY_PATH, OPENROUTER_URL } from './config'
import { parseSseEvent, splitSseEvents } from './sse'

/**
 * Cliente de LLM: dois modos atrás de UMA interface de streaming. Quem chama
 * não sabe qual está ativo — só recebe tokens.
 *
 * - `proxy`: chama a Edge Function `llm`, que guarda a chave do OpenRouter como
 *   secret do servidor e aplica cota. É o modo que consome a cota do operador.
 * - `byok`: o usuário colou a chave OpenRouter DELE (guardada só no
 *   localStorage deste navegador) e o browser fala direto com o OpenRouter.
 *   Não consome cota nem crédito do operador.
 *
 * Precedência em RUNTIME (não em build-time): chave própria > sessão > nada.
 * Isso destrava o caso útil de o power user escapar do rate limit com a chave
 * dele, sem o operador pagar.
 */
export type LlmMode = 'byok' | 'proxy' | 'unavailable'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type LlmErrorCode =
  | 'unauthenticated'
  | 'daily_limit_reached'
  | 'busy'
  | 'rate_limited'
  | 'unavailable'
  | 'invalid_key'
  | 'too_long'
  | 'aborted'

export class LlmError extends Error {
  readonly code: LlmErrorCode
  constructor(code: LlmErrorCode) {
    super(code)
    this.name = 'LlmError'
    this.code = code
  }
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  /** Recebe cada pedaço de texto conforme chega. */
  onToken: (text: string) => void
  /** Recebe o raciocínio, quando o modelo expõe (`reasoning` do OpenRouter). */
  onThinking?: (text: string) => void
  signal?: AbortSignal
}

const KEY_STORAGE = storageKey('llm-key')

/** Se o proxy é possível neste build (Edge Function + backend configurados). */
export const proxyConfigured = backendConfigured

/** Chave do próprio usuário, se ele colou uma. Só existe neste navegador. */
export function getUserKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE) || null
  } catch {
    return null
  }
}

/** Salva (ou remove, com `null`) a chave do usuário. */
export function setUserKey(key: string | null): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key)
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    // Ignora falhas de quota / modo privado.
  }
}

/** Qual modo vale agora. Assíncrono porque checar a sessão é assíncrono. */
export async function resolveLlmMode(): Promise<LlmMode> {
  if (getUserKey()) return 'byok'
  if (!supabase || !backendConfigured) return 'unavailable'
  const { data } = await supabase.auth.getSession()
  return data.session ? 'proxy' : 'unavailable'
}

/** Espelha os limites do servidor para falhar antes de gastar rede. */
function validate(messages: ChatMessage[]): void {
  if (messages.length === 0 || messages.length > LLM.maxMessages)
    throw new LlmError('too_long')
  let total = 0
  for (const m of messages) {
    if (m.content.length > LLM.maxCharsPerMessage) throw new LlmError('too_long')
    total += m.content.length
  }
  if (total > LLM.maxCharsTotal) throw new LlmError('too_long')
}

function mapStatus(status: number): LlmErrorCode {
  if (status === 401 || status === 403) return 'unauthenticated'
  if (status === 429) return 'rate_limited'
  if (status === 400) return 'too_long'
  return 'unavailable'
}

/**
 * Faz a requisição e entrega os tokens. Resolve o modo, monta a chamada certa e
 * consome o SSE — o parser é o mesmo nos dois caminhos.
 */
export async function streamChat(opts: StreamChatOptions): Promise<void> {
  validate(opts.messages)

  const mode = await resolveLlmMode()
  if (mode === 'unavailable') throw new LlmError('unauthenticated')

  let response: Response
  try {
    response =
      mode === 'byok'
        ? await requestByok(opts)
        : await requestProxy(opts)
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new LlmError('aborted')
    throw new LlmError('unavailable')
  }

  if (!response.ok || !response.body) {
    // O servidor manda um código tipado; o OpenRouter (BYOK) não, então cai no
    // mapeamento por status.
    let code: LlmErrorCode = mapStatus(response.status)
    if (mode === 'byok' && (response.status === 401 || response.status === 403))
      code = 'invalid_key'
    else {
      try {
        const body = (await response.json()) as { error?: string }
        if (body?.error === 'daily_limit_reached') code = 'daily_limit_reached'
        else if (body?.error === 'busy') code = 'busy'
      } catch {
        // resposta sem corpo JSON — mantém o mapeamento por status
      }
    }
    throw new LlmError(code)
  }

  await consume(response.body, opts)
}

async function requestProxy(opts: StreamChatOptions): Promise<Response> {
  const { data } = await supabase!.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new LlmError('unauthenticated')

  return await fetch(`${backendUrl}${LLM_PROXY_PATH}`, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'content-type': 'application/json',
      apikey: backendAnonKey,
      Authorization: `Bearer ${token}`,
    },
    // Só `messages` — o modelo e os limites são decididos no servidor.
    body: JSON.stringify({ messages: opts.messages }),
  })
}

async function requestByok(opts: StreamChatOptions): Promise<Response> {
  const key = getUserKey()
  if (!key) throw new LlmError('invalid_key')

  return await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${key}`,
      'X-Title': APP_NAME,
    },
    body: JSON.stringify({
      model: LLM.byokModel,
      stream: true,
      max_tokens: LLM.maxTokens,
      messages: opts.messages,
    }),
  })
}

/** Loop de leitura + parser de SSE, comum aos dois modos. */
async function consume(
  body: ReadableStream<Uint8Array>,
  opts: StreamChatOptions,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const { events, rest } = splitSseEvents(buffer)
      buffer = rest

      for (const event of events) {
        const chunk = parseSseEvent(event)
        if (!chunk) continue
        if (chunk.done) return
        if (chunk.content) opts.onToken(chunk.content)
        if (chunk.reasoning) opts.onThinking?.(chunk.reasoning)
      }
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw new LlmError('aborted')
    throw new LlmError('unavailable')
  } finally {
    reader.releaseLock()
  }
}
