import { useEffect, useState } from 'react'
import { supabase } from '@core/backend/client'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

interface Metrics {
  total_users: number
  dau: number
  wau: number
  mau: number
  feedback_count: number
  sessions_by_day: { day: string; sessions: number }[]
}

interface FeedbackRow {
  id: string
  type: string
  message: string
  contact_email: string | null
  created_at: string
}

/**
 * Painel do operador em /admin — KPIs + inbox de feedback. Rota escondida
 * (sem link no menu; acesso por URL ou 5 toques na versão do MenuSheet) e
 * lazy-loaded, então o código não entra no bundle dos usuários comuns. A
 * segurança real está no banco: as RPCs admin_metrics()/admin_feedback() são
 * SECURITY DEFINER e negam quem não está na allowlist public.admins — esta
 * tela só mostra "restrito" quando o banco nega.
 */
export function AdminScreen() {
  const { t, locale } = useTranslation()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  // Sem backend configurado já nasce negado (evita setState síncrono no effect).
  const [state, setState] = useState<'loading' | 'denied' | 'ready'>(() =>
    supabase ? 'loading' : 'denied',
  )

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    db.rpc('admin_metrics').then(async ({ data, error }) => {
      if (error || !data) {
        setState('denied')
        return
      }
      setMetrics(data as Metrics)
      const fb = await db.rpc('admin_feedback', { p_limit: 20, p_offset: 0 })
      if (!fb.error && fb.data) setFeedback(fb.data as FeedbackRow[])
      setState('ready')
    })
  }, [])

  const dateFmt = new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
  })

  const tiles: { label: string; value: number }[] = metrics
    ? [
        { label: t('admin.users'), value: metrics.total_users },
        { label: t('admin.dau'), value: metrics.dau },
        { label: t('admin.wau'), value: metrics.wau },
        { label: t('admin.mau'), value: metrics.mau },
        { label: t('admin.feedback'), value: metrics.feedback_count },
      ]
    : []

  const maxSessions = Math.max(
    1,
    ...(metrics?.sessions_by_day.map((d) => d.sessions) ?? [1]),
  )

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('admin.title')} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {state === 'loading' ? null : state === 'denied' ? (
          <p className="mt-10 text-center text-sm text-muted">
            {t('admin.restricted')}
          </p>
        ) : (
          metrics && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {tiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-2xl bg-surface p-3 text-center ring-1 ring-ink/5"
                  >
                    <p className="text-xl font-extrabold">{tile.value}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted">
                      {tile.label}
                    </p>
                  </div>
                ))}
              </div>

              <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('admin.sessionsByDay')}
              </h2>
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-ink/5">
                {metrics.sessions_by_day.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted">
                    {t('admin.noData')}
                  </p>
                ) : (
                  <div className="flex h-24 items-end gap-1">
                    {metrics.sessions_by_day.map((d) => (
                      <div
                        key={d.day}
                        title={`${dateFmt.format(new Date(`${d.day}T12:00:00`))}: ${d.sessions}`}
                        className="flex-1 rounded-t bg-primary/70"
                        style={{
                          height: `${(d.sessions / maxSessions) * 100}%`,
                          minHeight: 2,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('admin.feedbackInbox')}
              </h2>
              {feedback.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted">
                  {t('admin.feedbackEmpty')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {feedback.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-2xl bg-surface p-3 ring-1 ring-ink/5"
                    >
                      <p className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 font-semibold uppercase">
                          {row.type}
                        </span>
                        {dateFmt.format(new Date(row.created_at))}
                        {row.contact_email && <span>· {row.contact_email}</span>}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{row.message}</p>
                    </article>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}
