import { Check } from '@phosphor-icons/react'
import { LOCALES, LOCALE_NAMES } from '@core/i18n'
import { regionName, sortedRegions, type Region } from '@core/region'
import { useRegionStore } from '@core/state/regionStore'
import { Card, Screen, ScreenBody, SectionTitle } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Idioma e país — duas preferências na mesma tela porque a pessoa procura as
 * duas no mesmo lugar, e DUAS listas porque são eixos independentes: dá para
 * ler o app em inglês morando em Portugal, e o app precisa acertar as duas
 * coisas. Ver `core/region.ts`.
 */
export function LanguageScreen() {
  const { t, locale, setLocale } = useTranslation()
  const region = useRegionStore((s) => s.region)
  const setRegion = useRegionStore((s) => s.setRegion)

  return (
    <Screen>
      <ScreenHeader title={t('language.title')} />

      <ScreenBody>
        <SectionTitle>{t('language.languageSection')}</SectionTitle>
        <p className="mb-3 text-body text-muted">{t('language.subtitle')}</p>
        <Card padding="none" bordered className="overflow-hidden">
          {LOCALES.map((code, i) => (
            <ChoiceRow
              key={code}
              label={LOCALE_NAMES[code]}
              selected={locale === code}
              first={i === 0}
              onSelect={() => setLocale(code)}
            />
          ))}
        </Card>

        <div className="mt-6">
          <SectionTitle>{t('language.regionSection')}</SectionTitle>
          <p className="mb-3 text-body text-muted">
            {t('language.regionSubtitle')}
          </p>
          <Card padding="none" bordered className="overflow-hidden">
            {sortedRegions(locale).map((code: Region, i) => (
              <ChoiceRow
                key={code}
                label={regionName(code, locale)}
                selected={region === code}
                first={i === 0}
                onSelect={() => setRegion(code)}
              />
            ))}
          </Card>
        </div>
      </ScreenBody>
    </Screen>
  )
}

/** Uma linha das duas listas. `aria-pressed` e não `radio` porque a escolha
 *  vale na hora do toque — não há "confirmar" para o grupo esperar. */
function ChoiceRow({
  label,
  selected,
  first,
  onSelect,
}: {
  label: string
  selected: boolean
  first: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition active:bg-ink/5 ${
        first ? '' : 'border-t border-ink/10'
      }`}
    >
      <span className="text-body font-semibold text-ink">{label}</span>
      {selected && (
        <Check size={20} weight="bold" className="text-primary" aria-hidden />
      )}
    </button>
  )
}
