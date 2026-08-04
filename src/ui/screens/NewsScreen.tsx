import { useEffect, useState } from 'react'
import { CHANGELOG, getUnreadCount, markChangelogSeen } from '@core/changelog'
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
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('news.title')} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <p className="mb-4 text-sm text-muted">{t('news.subtitle')}</p>

        <div className="flex flex-col gap-3">
          {CHANGELOG.map((entry, index) => (
            <article
              key={entry.id}
              className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-ink/5"
            >
              <div className="mb-2 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {entry.emoji}
                </span>
                <div>
                  <h2 className="flex items-center gap-2 font-bold leading-tight">
                    {entry.title[locale]}
                    {index < newCount && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        {t('news.badgeNew')}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-muted">
                    {dateFmt.format(new Date(`${entry.date}T12:00:00`))}
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 pl-1">
                {entry.items[locale].map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/80">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
