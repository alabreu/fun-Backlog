import { useMemo, useState } from 'react'
import { MagnifyingGlass, User } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { getUnreadCount } from '@core/changelog'
import { greetingKey, vocativeFor } from '@core/greeting'
import { mediaLabelKey, progressLabelKey } from '@core/items/status'
import {
  inProgress,
  shelfProgress,
  suggestFromBacklog,
} from '@core/items/stats'
import { MEDIA_TYPES, type Item } from '@core/items/types'
import {
  Badge,
  Button,
  Cover,
  Fab,
  IconButton,
  NavRow,
  Rail,
  RailItem,
  Screen,
  ScreenBody,
  SectionTitle,
} from '@ui/design'
import { ItemSheet } from '@ui/components/ItemSheet'
import { MenuSheet } from '@ui/components/MenuSheet'
import { MergeSheet } from '@ui/components/MergeSheet'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A home: saudação, o que você está consumindo agora, e as portas para cada
 * estante.
 *
 * A ordem não é decorativa. Quem abre este app no sofá quase sempre quer
 * VOLTAR a algo que já começou — então isso é a primeira dobra, sem nenhum
 * toque. Catalogar é a segunda intenção, e mora no botão flutuante.
 */
export function HomeScreen() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const { items, loading } = useItems()

  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [unread] = useState(() => getUnreadCount())

  // Um instante só por montagem: saudação e sugestão do dia têm que ser
  // estáveis enquanto a tela está aberta, senão mudariam a cada re-render.
  const [now] = useState(() => new Date())

  const active = useMemo(() => inProgress(items), [items])
  const suggestions = useMemo(
    () => suggestFromBacklog(items, now),
    [items, now],
  )

  const openItem = selected
    ? (items.find((i) => i.id === selected.id) ?? null)
    : null

  const emptyShelf = !loading && items.length === 0

  return (
    <Screen>
      <header className="flex items-start justify-between gap-2 px-gutter pb-4 pt-3">
        <div className="min-w-0">
          <h1 className="text-display font-extrabold tracking-tight">
            {t(greetingKey(now))},
          </h1>
          <p className="text-display font-extrabold tracking-tight text-accent">
            {vocativeFor(now, locale)}
          </p>
        </div>
        <IconButton
          aria-label={
            unread > 0 ? t('home.menuButtonUnread') : t('home.menuButton')
          }
          onClick={() => setMenuOpen(true)}
          className="relative shrink-0"
        >
          <User size={20} weight="bold" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-control bg-accent ring-2 ring-bg"
            />
          )}
        </IconButton>
      </header>

      <ScreenBody as="main">
        {/* Três estados para o herói, e a diferença entre eles importa:
            estante vazia é um convite, fila sem nada em andamento é um
            empurrão, e em andamento é o carrossel de continuar. */}
        {emptyShelf ? (
          <div className="rounded-card bg-surface px-5 py-8 text-center ring-1 ring-ink/5">
            <h2 className="text-title font-bold">{t('home.emptyTitle')}</h2>
            <p className="mx-auto mt-1 max-w-xs text-body text-muted">
              {t('home.emptyBody')}
            </p>
            <Button className="mt-4" onClick={() => navigate('/buscar')}>
              {t('home.emptyAction')}
            </Button>
          </div>
        ) : active.length > 0 ? (
          <section>
            <SectionTitle className="mb-2">{t('home.inProgress')}</SectionTitle>
            <Rail>
              {active.map((item, index) => (
                <RailItem key={item.id}>
                  <ItemCard
                    item={item}
                    eager={index < 2}
                    onOpen={() => setSelected(item)}
                  />
                </RailItem>
              ))}
            </Rail>
          </section>
        ) : (
          suggestions.length > 0 && (
            <section>
              <SectionTitle className="mb-1">
                {t('home.suggestionsTitle')}
              </SectionTitle>
              <p className="mb-2 text-body text-muted">
                {t('home.suggestionsBody')}
              </p>
              <Rail>
                {suggestions.map((item, index) => (
                  <RailItem key={item.id}>
                    <ItemCard
                      item={item}
                      eager={index < 2}
                      onOpen={() => setSelected(item)}
                    />
                  </RailItem>
                ))}
              </Rail>
            </section>
          )
        )}

        <SectionTitle className="mb-2 mt-6">{t('home.shelves')}</SectionTitle>
        <div className="flex flex-col gap-2 pb-20">
          {MEDIA_TYPES.map((mediaType) => {
            const { completed, total } = shelfProgress(items, mediaType)
            return (
              <NavRow
                key={mediaType}
                label={t(mediaLabelKey(mediaType))}
                trailing={total > 0 ? `${completed}/${total}` : undefined}
                onClick={() => navigate(`/estante/${mediaType}`)}
              />
            )
          })}
        </div>
      </ScreenBody>

      <Fab label={t('home.searchFab')} onClick={() => navigate('/buscar')}>
        <MagnifyingGlass size={24} weight="bold" />
      </Fab>

      <ItemSheet item={openItem} onClose={() => setSelected(null)} />
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <MergeSheet />
    </Screen>
  )
}

/**
 * Card do carrossel. Diferente da célula do grid: aqui cabe o PROGRESSO, e é
 * ele que transforma "olha o que você começou" em "continue daqui".
 */
function ItemCard({
  item,
  eager,
  onOpen,
}: {
  item: Item
  eager: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const progress = item.progress

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left transition active:scale-95"
    >
      <div className="relative">
        <Cover src={item.coverUrl} title={item.title} lazy={!eager} />
        {progress && progress.current > 0 && (
          <Badge tone="onCover" className="absolute bottom-1.5 left-1.5">
            {/* Horas não levam rótulo antes do número: "Horas 42" sai torto em
                qualquer idioma, enquanto "Episódio 12/26" pede o rótulo para
                não virar um número solto. */}
            {progress.unit === 'hour'
              ? t('home.progressHours', { current: progress.current })
              : `${t(progressLabelKey(progress.unit))} ${progress.current}${
                  progress.total ? `/${progress.total}` : ''
                }`}
          </Badge>
        )}
      </div>
      <span className="mt-2 line-clamp-2 block text-body font-semibold">
        {item.title}
      </span>
    </button>
  )
}
