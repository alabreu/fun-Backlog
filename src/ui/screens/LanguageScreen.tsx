import { Check } from '@phosphor-icons/react'
import { LOCALES, LOCALE_NAMES } from '@core/i18n'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Seletor de idioma — troca o app inteiro entre português e inglês. */
export function LanguageScreen() {
  const { t, locale, setLocale } = useTranslation()

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('language.title')} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <p className="mb-3 text-sm text-muted">{t('language.subtitle')}</p>
        <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10">
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
                <span className="text-sm font-semibold text-ink">
                  {LOCALE_NAMES[code]}
                </span>
                {active && (
                  <Check size={20} weight="bold" className="text-primary" aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
