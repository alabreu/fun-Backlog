import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { filterItems, sortForShelf } from '@core/items/filter'
import { mediaLabelKey, statusLabelKey } from '@core/items/status'
import {
  ITEM_STATUSES,
  MEDIA_TYPES,
  type Item,
  type ItemStatus,
  type MediaType,
} from '@core/items/types'
import {
  Badge,
  Button,
  Chip,
  Cover,
  CoverGrid,
  Fab,
  Input,
  Screen,
  ScreenBody,
} from '@ui/design'
import { ItemSheet } from '@ui/components/ItemSheet'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

function isMediaType(value: string | undefined): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType)
}

/**
 * A estante de UMA mídia — o destino de cada linha da home.
 *
 * Foi aqui que os filtros vieram parar. Na home antiga eles disputavam espaço
 * com as capas: duas faixas de chips antes de qualquer arte. Com a mídia já
 * escolhida pela navegação, sobra uma faixa só (status) e o grid começa mais
 * perto do topo.
 *
 * "Concluídos" não é uma tela à parte: é o filtro de status desta aqui. A
 * retrospectiva por ano — que é cross-mídia por natureza — continua em
 * /concluidos, no menu.
 */
export function ShelfScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { media } = useParams()
  const { items, error } = useItems()

  const [selected, setSelected] = useState<Item | null>(null)
  const [status, setStatus] = useState<ItemStatus | undefined>()
  const [query, setQuery] = useState('')

  const mediaType = isMediaType(media) ? media : undefined

  const visible = useMemo(
    () =>
      mediaType
        ? sortForShelf(filterItems(items, { mediaType, status, query }))
        : [],
    [items, mediaType, status, query],
  )

  const total = useMemo(
    () =>
      mediaType ? items.filter((i) => i.mediaType === mediaType).length : 0,
    [items, mediaType],
  )

  const openItem = selected
    ? (items.find((i) => i.id === selected.id) ?? null)
    : null

  // URL inventada (/estante/qualquercoisa) volta para a home em vez de
  // renderizar uma estante de mídia que não existe.
  if (!mediaType) return <Navigate to="/" replace />

  return (
    <Screen>
      <ScreenHeader title={t(mediaLabelKey(mediaType))} />

      <ScreenBody as="main">
        {total === 0 ? (
          <div className="mt-6 rounded-card bg-surface px-5 py-8 text-center ring-1 ring-ink/5">
            <h2 className="text-title font-bold">{t('shelf.emptyTitle')}</h2>
            <p className="mx-auto mt-1 max-w-xs text-body text-muted">
              {t('shelf.emptyBody')}
            </p>
            <Button className="mt-4" onClick={() => navigate('/buscar')}>
              {t('home.emptyAction')}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <MagnifyingGlass
                size={18}
                weight="bold"
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('catalog.searchPlaceholder')}
                placeholder={t('catalog.searchPlaceholder')}
                className="pl-11"
              />
            </div>

            <div className="-mx-gutter mb-4 flex gap-2 overflow-x-auto px-gutter pb-1">
              <Chip selected={!status} onClick={() => setStatus(undefined)}>
                {t('catalog.filterAll')}
              </Chip>
              {ITEM_STATUSES.map((value) => (
                <Chip
                  key={value}
                  selected={status === value}
                  onClick={() =>
                    setStatus(status === value ? undefined : value)
                  }
                  className="whitespace-nowrap"
                >
                  {t(statusLabelKey(value, mediaType))}
                </Chip>
              ))}
            </div>

            {error && (
              <p role="alert" className="mb-3 text-body text-danger">
                {t('catalog.loadError')}
              </p>
            )}

            {visible.length === 0 ? (
              <div className="py-10 text-center">
                <h2 className="text-title font-bold">
                  {t('catalog.noMatchTitle')}
                </h2>
                <p className="mt-1 text-body text-muted">
                  {t('catalog.noMatchBody')}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-label text-muted">
                  {t('catalog.count', { count: visible.length, total })}
                </p>
                <CoverGrid className="pb-20">
                  {visible.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="w-full text-left transition active:scale-95"
                      >
                        <div className="relative">
                          <Cover
                            src={item.coverUrl}
                            title={item.title}
                            media={item.mediaType}
                            lazy={index > 5}
                          />
                          {item.status !== 'backlog' && (
                            <Badge
                              tone="onCover"
                              className="absolute bottom-1.5 left-1.5"
                            >
                              {t(statusLabelKey(item.status, item.mediaType))}
                            </Badge>
                          )}
                        </div>
                        <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
                          {item.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </CoverGrid>
              </>
            )}
          </>
        )}
      </ScreenBody>

      <Fab label={t('home.searchFab')} onClick={() => navigate('/buscar')}>
        <MagnifyingGlass size={24} weight="bold" />
      </Fab>

      <ItemSheet item={openItem} onClose={() => setSelected(null)} />
    </Screen>
  )
}
