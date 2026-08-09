import { useMemo, useState } from 'react'
import { mediaLabelKey } from '@core/items/status'
import {
  completedInYear,
  summarizeCompleted,
  yearsWithCompletions,
} from '@core/items/stats'
import {
  Badge,
  Chip,
  ChipRow,
  Cover,
  CoverGrid,
  Screen,
  ScreenBody,
  SectionTitle,
  Stat,
} from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A estante de troféus — "o ano em revista" do briefing.
 *
 * Diferença deliberada para o catálogo: aqui a ordem é cronológica inversa e
 * não por status, porque isto não é uma fila a resolver, é um histórico a
 * revisitar. E os números vêm ANTES das capas: o valor da tela é o agregado
 * ("48 horas de jogo neste ano"), não a navegação item a item.
 */
export function CompletedScreen() {
  const { t, locale } = useTranslation()
  const { items, enabled, loading } = useItems()

  const years = useMemo(() => yearsWithCompletions(items), [items])

  // `null` = a pessoa ainda não escolheu, e aí vale o ano mais recente com
  // conclusões. Derivar em vez de semear com um effect evita render em cascata
  // e o caso chato de a semente rodar antes de os itens carregarem.
  const [chosen, setChosen] = useState<number | 'all' | null>(null)
  const year =
    chosen === null ? years[0] : chosen === 'all' ? undefined : chosen

  const shown = useMemo(() => completedInYear(items, year), [items, year])
  const summary = useMemo(
    () => summarizeCompleted(shown, enabled),
    [shown, enabled],
  )

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  })

  if (!loading && years.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('completed.title')} />
        <ScreenBody as="main" centered>
          <h2 className="text-title font-bold">{t('completed.emptyTitle')}</h2>
          <p className="max-w-xs text-body text-muted">
            {t('completed.emptyBody')}
          </p>
        </ScreenBody>
      </Screen>
    )
  }

  return (
    <Screen>
      <ScreenHeader title={t('completed.title')} />

      <ScreenBody as="main">
        {years.length > 1 && (
          <ChipRow className="mb-3">
            <Chip selected={chosen === 'all'} onClick={() => setChosen('all')}>
              {t('completed.allYears')}
            </Chip>
            {years.map((value) => (
              <Chip
                key={value}
                selected={year === value}
                onClick={() => setChosen(value)}
              >
                {value}
              </Chip>
            ))}
          </ChipRow>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Stat
            emphasis
            value={summary.total}
            label={t('completed.statTotal')}
          />
          {/* Cada unidade só aparece se alguém registrou progresso nela —
              "0 páginas" não é troféu, é ruído. */}
          {summary.hoursPlayed > 0 && (
            <Stat
              value={summary.hoursPlayed}
              label={t('completed.statHours')}
            />
          )}
          {summary.episodesWatched > 0 && (
            <Stat
              value={summary.episodesWatched}
              label={t('completed.statEpisodes')}
            />
          )}
          {summary.pagesRead > 0 && (
            <Stat value={summary.pagesRead} label={t('completed.statPages')} />
          )}
        </div>

        {summary.byMedia.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {summary.byMedia.map(({ mediaType, count }) => (
              <Badge key={mediaType} media={mediaType}>
                {count} · {t(mediaLabelKey(mediaType))}
              </Badge>
            ))}
          </div>
        )}

        <SectionTitle className="mb-2 mt-6">
          {year === undefined
            ? t('completed.allYears')
            : t('completed.yearHeading', { year })}
        </SectionTitle>

        <CoverGrid>
          {shown.map((item, index) => (
            <li key={item.id}>
              <div className="relative">
                <Cover
                  src={item.coverUrl}
                  title={item.title}
                  media={item.mediaType}
                  lazy={index > 5}
                />
                {/* O selo só existe quando há data. O app parou de carimbá-la
                    (decisão 16), então a maioria das capas não tem — e um
                    `new Date(undefined)` aqui imprimiria "Invalid Date" em
                    cima da arte. As datas que sobraram são de antes, ou virão
                    de uma importação que traga a de verdade. */}
                {item.completedAt && (
                  <Badge tone="onCover" className="absolute bottom-1.5 left-1.5">
                    {dateFmt.format(new Date(item.completedAt))}
                  </Badge>
                )}
              </div>
              <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
                {item.title}
              </span>
              {item.rating && (
                <span className="block text-label text-accent">
                  {'★'.repeat(item.rating)}
                </span>
              )}
            </li>
          ))}
        </CoverGrid>
      </ScreenBody>
    </Screen>
  )
}
