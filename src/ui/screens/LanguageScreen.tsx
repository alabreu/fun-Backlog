import { Check } from '@phosphor-icons/react'
import { LOCALES, LOCALE_NAMES } from '@core/i18n'
import { Card, Screen, ScreenBody } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Seletor de idioma — troca o app inteiro entre português e inglês. */
export function LanguageScreen() {
  const { t, locale, setLocale } = useTranslation()

  return (
    <Screen>
      <ScreenHeader title={t('language.title')} />

      <ScreenBody>
        <p className="mb-3 text-body text-muted">{t('language.subtitle')}</p>
        <Card padding="none" bordered className="overflow-hidden">
          {LOCALES.map((code, i) => {
            const active = locale === code
            return (
              <button
                key={code}
                type="button"
                aria-pressed={active}
                onClick={() => setLocale(code)}
                className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition active:bg-ink/5 ${
                  i > 0 ? 'border-t border-ink/10' : ''
                }`}
              >
                <span className="text-body font-semibold text-ink">
                  {LOCALE_NAMES[code]}
                </span>
                {active && (
                  <Check size={20} weight="bold" className="text-primary" aria-hidden />
                )}
              </button>
            )
          })}
        </Card>
      </ScreenBody>
    </Screen>
  )
}
