import { backendConfigured, supabase } from '@core/backend/client'
import { APP_NAME } from '@core/config'

export type FeedbackType = 'bug' | 'idea' | 'other'

export interface FeedbackInput {
  type: FeedbackType
  message: string
  contactEmail?: string
  /** Preenchido pela UI quando há sessão (o insert também é aceito anônimo). */
  userId?: string | null
  /** Rota/tela atual, para contexto ao triar. */
  pageContext?: string
  locale?: string
}

export type FeedbackResult =
  | { kind: 'stored' }
  | { kind: 'mailto'; url: string }

/**
 * Envia feedback para o backend (tabela `feedback`, RLS insert-only — ver
 * supabase/migrations/0001_feedback.sql). Sem backend configurado, cai num
 * mailto: pré-preenchido, para a feature funcionar no dia zero de um app novo.
 * Os tamanhos são cortados no cliente para nunca esbarrar nas constraints.
 */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<FeedbackResult> {
  if (backendConfigured && supabase) {
    const { error } = await supabase.from('feedback').insert({
      type: input.type,
      message: input.message.trim().slice(0, 4000),
      contact_email: (input.contactEmail?.trim() ?? '').slice(0, 320) || null,
      user_id: input.userId ?? null,
      page_context: (input.pageContext ?? '').slice(0, 500) || null,
      source: 'in_app',
    })
    if (error) throw new Error(error.message)
    return { kind: 'stored' }
  }

  const to = (import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined) ?? ''
  const subject = `[${APP_NAME}] ${input.type}`
  const body =
    `${input.message.trim()}\n\n—\n` +
    `email: ${input.contactEmail?.trim() || '—'}\n` +
    `${APP_NAME} v${__APP_VERSION__} · ${input.locale ?? ''}`
  const url =
    `mailto:${to}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  return { kind: 'mailto', url }
}
