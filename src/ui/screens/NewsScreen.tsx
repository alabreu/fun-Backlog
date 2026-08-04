import { useEffect, useState } from 'react'
import { CHANGELOG, getUnreadCount, markChangelogSeen } from '@core/changelog'
import { Card, Screen, ScreenBody } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * "Novidades" — o changelog do produto, mais novo primeiro. Captura quantas
 * entradas eram novas ANTES de marcar como visto, para as pílulas "novo" ainda
 * aparecerem na abertura em que o usuário finalmente olha.
 */
export function NewsScreen() {
  const { t, locale } = useTranslation()
  const [newCount] = useState(() => getUnreadCount())

  useEffect(() => {
    markChangelogSeen()
  }, [])

  const dateFmt = new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Screen>
      <ScreenHeader title={t('news.title')} />

      <ScreenBody>
        <p className="mb-4 text-body text-muted">{t('news.subtitle')}</p>

        <div className="flex flex-col gap-3">
          {CHANGELOG.map((entry, index) => (
            <Card key={entry.id} as="article" padding="md" className="shadow-sm">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-display" aria-hidden>
                  {entry.emoji}
                </span>
                <div>
                  <h2 className="flex items-center gap-2 font-bold leading-tight">
                    {entry.title[locale]}
                    {index < newCount && (
                      <span className="rounded-control bg-accent px-2 py-0.5 text-label font-bold uppercase text-on-accent">
                        {t('news.badgeNew')}
                      </span>
                    )}
                  </h2>
                  <p className="text-label text-muted">
                    {dateFmt.format(new Date(`${entry.date}T12:00:00`))}
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 pl-1">
                {entry.items[locale].map((item, i) => (
                  <li key={i} className="flex gap-2 text-body text-ink/80">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-control bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </ScreenBody>
    </Screen>
  )
}
