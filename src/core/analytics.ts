import { supabase } from '@core/backend/client'

/**
 * Rastreio mínimo de uso, para os KPIs do painel /admin (DAU/WAU/MAU, sessões
 * por dia). Eventos vão para `analytics_events` (insert-only por RLS, como o
 * feedback). Fire-and-forget: falha de rede nunca afeta o app. Sem backend
 * configurado, vira no-op — o app continua 100% local.
 *
 * Adicione eventos do seu produto com `track('nome_do_evento', {meta})`.
 */
const sessionId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function track(type: string, meta?: Record<string, unknown>): void {
  if (!supabase) return
  const db = supabase
  db.auth
    .getSession()
    .then(({ data }) =>
      db.from('analytics_events').insert({
        session_id: sessionId,
        user_id: data.session?.user.id ?? null,
        type: type.slice(0, 60),
        meta: meta ?? null,
      }),
    )
    .then(undefined, () => {})
}

let sessionTracked = false

/** Um evento de sessão por carga do app (guardado contra o double-mount do StrictMode). */
export function trackSessionStart(): void {
  if (sessionTracked) return
  sessionTracked = true
  track('session_start')
}
