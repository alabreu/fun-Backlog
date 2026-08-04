import { useMemo, useState } from 'react'
import { MagnifyingGlass, Plus, User } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { APP_NAME } from '@core/config'
import { getUnreadCount } from '@core/changelog'
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
  IconButton,
  Input,
  Screen,
  ScreenBody,
} from '@ui/design'
import { ItemSheet } from '@ui/components/ItemSheet'
import { MenuSheet } from '@ui/components/MenuSheet'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A estante — a tela principal. Capas primeiro, texto só o necessário: o
 * briefing pede que isso pareça uma prateleira, não uma planilha.
 *
 * Os filtros são chips e não selects porque um select esconde as opções atrás
 * de um toque e de uma lista do sistema; com backlog grande, ver as mídias
 * disponíveis de relance é metade do valor.
 */
export function CatalogScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, loading, error, signedIn } = useItems()

  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | undefined>()
  const [status, setStatus] = useState<ItemStatus | undefined>()
  const [query, setQuery] = useState('')
  const [unread] = useState(() => getUnreadCount())

  const visible = useMemo(
    () => sortForShelf(filterItems(items, { mediaType, status, query })),
    [items, mediaType, status, query],
  )

  // O item aberto vem da lista viva, não do estado congelado do clique: sem
  // isso, mudar o status dentro do sheet não se refletiria nele mesmo.
  const openItem = selected
    ? (items.find((i) => i.id === selected.id) ?? null)
    : null

  const empty = !loading && items.length === 0

  return (
    <Screen>
      <header className="flex items-center justify-between gap-2 px-gutter pb-2 pt-3">
        <h1 className="text-display font-extrabold tracking-tight">
          {APP_NAME}
        </h1>
        <div className="flex items-center gap-1">
          <IconButton
            aria-label={t('catalog.add')}
            onClick={() => navigate('/adicionar')}
          >
            <Plus size={20} weight="bold" />
          </IconButton>
          <IconButton
            aria-label={
              unread > 0 ? t('home.menuButtonUnread') : t('home.menuButton')
            }
            onClick={() => setMenuOpen(true)}
            className="relative"
          >
            <User size={20} weight="bold" />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-control bg-accent ring-2 ring-bg"
              />
            )}
          </IconButton>
        </div>
      </header>

      {empty ? (
        <ScreenBody as="main" centered>
          <h2 className="text-title font-bold">{t('catalog.emptyTitle')}</h2>
          <p className="max-w-xs text-body text-muted">
            {t('catalog.emptyBody')}
          </p>
          <Button onClick={() => navigate('/adicionar')}>
            {t('catalog.emptyAction')}
          </Button>
        </ScreenBody>
      ) : (
        <ScreenBody as="main">
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

          {/* Duas faixas roláveis: mídia e status. `-mx-gutter`/`px-gutter`
              deixam os chips sangrarem até a borda, sinalizando que rolam. */}
          <div className="-mx-gutter mb-2 flex gap-2 overflow-x-auto px-gutter pb-1">
            <Chip selected={!mediaType} onClick={() => setMediaType(undefined)}>
              {t('catalog.filterAll')}
            </Chip>
            {MEDIA_TYPES.map((type) => (
              <Chip
                key={type}
                selected={mediaType === type}
                onClick={() =>
                  setMediaType(mediaType === type ? undefined : type)
                }
                className="whitespace-nowrap"
              >
                {t(mediaLabelKey(type))}
              </Chip>
            ))}
          </div>

          <div className="-mx-gutter mb-4 flex gap-2 overflow-x-auto px-gutter pb-1">
            <Chip selected={!status} onClick={() => setStatus(undefined)}>
              {t('catalog.filterAll')}
            </Chip>
            {ITEM_STATUSES.map((value) => (
              <Chip
                key={value}
                selected={status === value}
                onClick={() => setStatus(status === value ? undefined : value)}
                className="whitespace-nowrap"
              >
                {/* Sem mídia escolhida o rótulo precisa de um representante;
                    'game' é só a fonte da palavra, não um filtro embutido. */}
                {t(statusLabelKey(value, mediaType ?? 'game'))}
              </Chip>
            ))}
          </div>

          {error && (
            <p role="alert" className="mb-3 text-body text-danger">
              {t('catalog.loadError')}
            </p>
          )}

          {!signedIn && items.length > 0 && (
            <p className="mb-3 text-label text-muted">
              {t('catalog.guestNote')}
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
                {t('catalog.count', {
                  count: visible.length,
                  total: items.length,
                })}
              </p>
              <CoverGrid>
                {visible.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="group w-full text-left transition active:scale-95"
                    >
                      <div className="relative">
                        <Cover
                          src={item.coverUrl}
                          title={item.title}
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
        </ScreenBody>
      )}

      <ItemSheet item={openItem} onClose={() => setSelected(null)} />
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  )
}
