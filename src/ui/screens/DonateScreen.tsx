import { Heart } from '@phosphor-icons/react'
import { donateConfigured, donateUrl } from '@core/donate'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * "Apoiar o app" — doação via Stripe Payment Link, aberto em nova aba (a página
 * de pagamento é hospedada pelo Stripe). O item do menu só aparece quando o
 * link está configurado; a tela ainda mostra um aviso amigável se alguém chegar
 * pela URL sem configuração.
 */
export function DonateScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('donate.title')} />

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        {!donateConfigured ? (
          <p className="text-sm text-muted">{t('donate.soon')}</p>
        ) : (
          <>
            <Heart size={48} weight="fill" className="text-accent" />
            <p className="max-w-xs text-balance text-sm text-muted">
              {t('donate.body')}
            </p>
            <a
              href={donateUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white transition active:scale-95"
            >
              <Heart size={18} weight="fill" />
              {t('donate.button')}
            </a>
            <p className="text-xs text-muted">{t('donate.thanks')}</p>
          </>
        )}
      </main>
    </div>
  )
}
