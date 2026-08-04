import { Heart } from '@phosphor-icons/react'
import { donateConfigured, donateUrl } from '@core/donate'
import { buttonClasses, Screen, ScreenBody } from '@ui/design'
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
    <Screen>
      <ScreenHeader title={t('donate.title')} />

      <ScreenBody as="main" centered className="gap-4">
        {!donateConfigured ? (
          <p className="text-body text-muted">{t('donate.soon')}</p>
        ) : (
          <>
            <Heart size={48} weight="fill" className="text-accent" />
            <p className="max-w-xs text-balance text-body text-muted">
              {t('donate.body')}
            </p>
            {/* <a> com a receita de classe do Button: é um link de verdade
                (nova aba), mas precisa parecer o botão primário. */}
            <a
              href={donateUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ className: 'mt-2' })}
            >
              <Heart size={18} weight="fill" />
              {t('donate.button')}
            </a>
            <p className="text-label text-muted">{t('donate.thanks')}</p>
          </>
        )}
      </ScreenBody>
    </Screen>
  )
}
