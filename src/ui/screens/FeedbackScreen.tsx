import { useState } from 'react'
import { CheckCircle, PaperPlaneRight } from '@phosphor-icons/react'
import { submitFeedback, type FeedbackType } from '@core/feedback/submit'
import type { MessageKey } from '@core/i18n'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useAuth } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'

const TYPES: { value: FeedbackType; labelKey: MessageKey }[] = [
  { value: 'idea', labelKey: 'feedback.type.idea' },
  { value: 'bug', labelKey: 'feedback.type.bug' },
  { value: 'other', labelKey: 'feedback.type.other' },
]

/**
 * Formulário de feedback. Com backend configurado grava na tabela `feedback`
 * (aceita envio anônimo); sem backend, compõe um email via mailto:. O campo de
 * email só aparece deslogado — logado, o email da sessão já identifica.
 */
export function FeedbackScreen() {
  const { t, locale } = useTranslation()
  const { user } = useAuth()

  const [type, setType] = useState<FeedbackType>('idea')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState<'stored' | 'mailto' | null>(null)

  const canSend = message.trim().length > 0 && !busy

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    setBusy(true)
    setError(false)
    try {
      const result = await submitFeedback({
        type,
        message,
        contactEmail: email.trim() || user?.email,
        userId: user?.id ?? null,
        pageContext: window.location.pathname,
        locale,
      })
      if (result.kind === 'mailto') window.location.href = result.url
      setSent(result.kind)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('feedback.title')} />

      {sent ? (
        // role=status: a confirmação é anunciada pelo leitor de tela.
        <main
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center"
        >
          <CheckCircle size={48} weight="fill" className="text-success" aria-hidden />
          <h2 className="text-lg font-bold">{t('feedback.sentTitle')}</h2>
          <p className="max-w-xs text-balance text-muted">
            {sent === 'stored' ? t('feedback.sentBody') : t('feedback.sentMailBody')}
          </p>
          <button
            type="button"
            onClick={() => {
              setMessage('')
              setEmail('')
              setType('idea')
              setSent(null)
            }}
            className="mt-2 rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-ink/10 transition active:scale-95"
          >
            {t('feedback.another')}
          </button>
        </main>
      ) : (
        <form
          onSubmit={submit}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-8"
        >
          <p className="mb-4 text-sm text-muted">{t('feedback.intro')}</p>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('feedback.typeLabel')}
          </p>
          <div className="mb-4 flex gap-2">
            {TYPES.map((opt) => {
              const active = type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setType(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                    active
                      ? 'bg-primary text-white'
                      : 'bg-ink/5 text-ink ring-1 ring-ink/10'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              )
            })}
          </div>

          <label
            htmlFor="feedback-message"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {t('feedback.messageLabel')}
          </label>
          <textarea
            id="feedback-message"
            value={message}
            maxLength={4000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.messagePlaceholder')}
            rows={5}
            className="mb-4 w-full resize-none rounded-2xl bg-ink/5 p-4 text-sm text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40"
          />

          {!user && (
            <>
              <label
                htmlFor="feedback-email"
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {t('feedback.emailLabel')}
              </label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                maxLength={320}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('feedback.emailPlaceholder')}
                className="mb-6 w-full rounded-2xl bg-ink/5 px-4 py-3 text-sm text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40"
              />
            </>
          )}

          {error && (
            <p className="mb-3 text-sm text-danger">{t('feedback.error')}</p>
          )}

          <button
            type="submit"
            disabled={!canSend}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            <PaperPlaneRight size={18} weight="fill" aria-hidden />
            {t('feedback.send')}
          </button>
        </form>
      )}
    </div>
  )
}
