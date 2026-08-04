import { useState } from 'react'
import { CheckCircle, PaperPlaneRight } from '@phosphor-icons/react'
import { submitFeedback, type FeedbackType } from '@core/feedback/submit'
import type { MessageKey } from '@core/i18n'
import {
  Button,
  Chip,
  Field,
  Input,
  Screen,
  ScreenBody,
  SectionTitle,
  Textarea,
} from '@ui/design'
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
    <Screen>
      <ScreenHeader title={t('feedback.title')} />

      {sent ? (
        // role=status: a confirmação é anunciada pelo leitor de tela.
        <ScreenBody as="main" centered role="status">
          <CheckCircle size={48} weight="fill" className="text-success" aria-hidden />
          <h2 className="text-title font-bold">{t('feedback.sentTitle')}</h2>
          <p className="max-w-xs text-balance text-muted">
            {sent === 'stored' ? t('feedback.sentBody') : t('feedback.sentMailBody')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => {
              setMessage('')
              setEmail('')
              setType('idea')
              setSent(null)
            }}
          >
            {t('feedback.another')}
          </Button>
        </ScreenBody>
      ) : (
        <ScreenBody as="form" onSubmit={submit}>
          <p className="mb-4 text-body text-muted">{t('feedback.intro')}</p>

          <SectionTitle as="p" className="mb-2">
            {t('feedback.typeLabel')}
          </SectionTitle>
          <div className="mb-4 flex gap-2">
            {TYPES.map((opt) => (
              <Chip
                key={opt.value}
                selected={type === opt.value}
                onClick={() => setType(opt.value)}
              >
                {t(opt.labelKey)}
              </Chip>
            ))}
          </div>

          <Field label={t('feedback.messageLabel')} className="mb-4">
            {(id) => (
              <Textarea
                id={id}
                value={message}
                maxLength={4000}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback.messagePlaceholder')}
                rows={5}
              />
            )}
          </Field>

          {!user && (
            <Field label={t('feedback.emailLabel')} className="mb-6">
              {(id) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  maxLength={320}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('feedback.emailPlaceholder')}
                />
              )}
            </Field>
          )}

          {error && (
            <p className="mb-3 text-body text-danger">{t('feedback.error')}</p>
          )}

          <Button type="submit" fullWidth disabled={!canSend}>
            <PaperPlaneRight size={18} weight="fill" aria-hidden />
            {t('feedback.send')}
          </Button>
        </ScreenBody>
      )}
    </Screen>
  )
}
