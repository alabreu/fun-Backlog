/**
 * Parser de SSE do OpenRouter. É o MESMO parser nos dois modos (proxy e BYOK) —
 * o proxy repassa a resposta do OpenRouter sem alterar o formato, e é isso que
 * torna os modos intercambiáveis.
 *
 * Puro de propósito: sem rede, sem DOM, testável direto.
 */
export interface SseChunk {
  /** Texto da resposta. */
  content?: string
  /** Raciocínio (campo `reasoning` do OpenRouter), quando o modelo expõe. */
  reasoning?: string
  /** Marcador `[DONE]` — fim do stream. */
  done?: boolean
}

/**
 * Separa o buffer acumulado em eventos completos, devolvendo o resto (evento
 * parcial) para a próxima leitura. Chunks de rede não respeitam fronteira de
 * evento, então o resto SEMPRE volta para o buffer.
 */
export function splitSseEvents(buffer: string): {
  events: string[]
  rest: string
} {
  const parts = buffer.split(/\r?\n\r?\n/)
  const rest = parts.pop() ?? ''
  return { events: parts, rest }
}

/**
 * Extrai o delta de um evento SSE. Devolve null quando o evento não carrega
 * nada útil — keepalive (linhas iniciadas por `:`), JSON malformado de um chunk
 * cortado, ou delta vazio.
 */
export function parseSseEvent(event: string): SseChunk | null {
  let out: SseChunk | null = null

  for (const line of event.split(/\r?\n/)) {
    // Linhas de comentário (`: OPENROUTER PROCESSING`) são keepalive.
    if (!line.startsWith('data:')) continue

    const payload = line.slice(5).trim()
    if (!payload) continue
    if (payload === '[DONE]') return { done: true }

    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
    } catch {
      continue
    }

    const delta = (
      parsed as { choices?: { delta?: { content?: unknown; reasoning?: unknown } }[] }
    )?.choices?.[0]?.delta
    if (!delta) continue

    if (typeof delta.content === 'string' && delta.content) {
      out ??= {}
      out.content = (out.content ?? '') + delta.content
    }
    if (typeof delta.reasoning === 'string' && delta.reasoning) {
      out ??= {}
      out.reasoning = (out.reasoning ?? '') + delta.reasoning
    }
  }

  return out
}
