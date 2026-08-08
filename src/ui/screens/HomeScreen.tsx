import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { getUnreadCount } from '@core/changelog'
import {
  openingFor,
  SHOW_VOCATIVE,
  splitOpening,
  stripVocative,
  vocativeFor,
} from '@core/greeting'
import { useNicknameStore } from '@core/state/nicknameStore'
import { mediaLabelKey, progressLabelKey } from '@core/items/status'
import {
  inProgress,
  shelfProgress,
  suggestFromBacklog,
} from '@core/items/stats'
import type { Item } from '@core/items/types'
import {
  Avatar,
  Badge,
  Button,
  Cover,
  IconButton,
  MediaDot,
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
import { useAuth } from '@ui/hooks/useAuth'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A home: saudação, o que você está consumindo agora, e as portas para cada
 * estante.
 *
 * A ordem não é decorativa. Quem abre este app no sofá quase sempre quer
 * VOLTAR a algo que já começou — então isso é a primeira dobra, sem nenhum
 * toque. Catalogar é a segunda intenção, e por isso a busca é um ícone no
 * cabeçalho e não um botão flutuante: o flutuante cobria conteúdo e disputava
 * a atenção com o carrossel, que é o que a tela existe para mostrar.
 */
export function HomeScreen() {
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const { items, enabled, loading } = useItems()
  const { user } = useAuth()
  const nickname = useNicknameStore((s) => s.nickname)
  const reroll = useNicknameStore((s) => s.reroll)

  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [unread] = useState(() => getUnreadCount())

  // Um instante só por montagem: saudação e sugestão do dia têm que ser
  // estáveis enquanto a tela está aberta, senão mudariam a cada re-render.
  const [now] = useState(() => new Date())

  const active = useMemo(() => inProgress(items, enabled), [items, enabled])
  const suggestions = useMemo(
    () => suggestFromBacklog(items, now),
    [items, now],
  )

  const openItem = selected
    ? (items.find((i) => i.id === selected.id) ?? null)
    : null

  const emptyShelf = !loading && items.length === 0

  // A abertura fala do estado em que a tela está: "Onde paramos?" com algo em
  // andamento, "O que vai ser hoje?" com a fila cheia e nada começado. É ela
  // que tornou dispensáveis os rótulos que ficavam sobre os carrosséis.
  const phrase = openingFor(
    now,
    locale,
    emptyShelf ? 'start' : active.length > 0 ? 'resume' : 'pick',
  )
  const opening = splitOpening(phrase)

  return (
    <Screen>
      <header className="flex items-start justify-between gap-2 px-gutter pb-4 pt-6">
        <div className="min-w-0">
          {/* Com vocativo, a quebra é FIXA: frase numa linha, nome na
              seguinte. O nome ganha o peso de uma linha inteira em vez de cair
              onde a sobra de espaço deixar, e a altura do cabeçalho para de
              mudar conforme o vocativo do dia é "Fera" ou "Sobrevivente".
              Sem vocativo não há o que quebrar — a frase é uma linha só. */}
          <h1 className="text-display font-extrabold tracking-tight text-balance">
            {SHOW_VOCATIVE ? (
              <>
                <span className="block">{opening.before}</span>
                <span className="block">
                  <span className="text-accent">
                    {vocativeFor(now, locale, nickname, reroll)}
                  </span>
                  {opening.after}
                </span>
              </>
            ) : (
              stripVocative(phrase)
            )}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            aria-label={t('home.searchFab')}
            onClick={() => navigate('/buscar')}
          >
            <MagnifyingGlass size={20} weight="bold" />
          </IconButton>
          <IconButton
            aria-label={
              unread > 0 ? t('home.menuButtonUnread') : t('home.menuButton')
            }
            onClick={() => setMenuOpen(true)}
            // `overflow-hidden` porque a foto preenche o botão inteiro e
            // precisa ser recortada pelo raio dele.
            className="relative overflow-hidden"
          >
            <Avatar src={user?.avatarUrl} />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-control bg-accent ring-2 ring-bg"
              />
            )}
          </IconButton>
        </div>
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
          // Sem rótulo: o cabeçalho já disse "onde paramos", e as capas com
          // progresso dizem o resto. Uma legenda aqui explicaria o óbvio.
          <section>
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
              {/* Aqui a linha FICA: sem ela, este carrossel é visualmente
                  idêntico ao de "em andamento", e a pessoa não teria como
                  saber que são coisas que ela ainda não começou. */}
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
        <div className="flex flex-col gap-2 pb-4">
          {enabled.map((mediaType) => {
            const { completed, total } = shelfProgress(items, mediaType)
            return (
              <NavRow
                key={mediaType}
                media={mediaType}
                label={t(mediaLabelKey(mediaType))}
                trailing={total > 0 ? `${completed}/${total}` : undefined}
                onClick={() => navigate(`/estante/${mediaType}`)}
              />
            )
          })}
        </div>
      </ScreenBody>

      <ItemSheet subject={openItem} onClose={() => setSelected(null)} />
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
        <Cover
          src={item.coverUrl}
          title={item.title}
          media={item.mediaType}
          lazy={!eager}
        />
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
      {/* O ponto vem ANTES do título, não depois.
          À direita ele encostava na borda do card e, num carrossel horizontal,
          a borda direita de um card fica a 12px do título do PRÓXIMO — o ponto
          verde de um livro lia como se fosse do anime ao lado. À esquerda ele
          fica grudado no que descreve, e é como o resto do app já usa (linha da
          estante, cabeçalho da busca, lista mista).
          O `mt-1.5` centra a bolinha de 8px na primeira linha de 20px. */}
      <span className="mt-2 flex items-start gap-1.5">
        <MediaDot
          media={item.mediaType}
          label={t(mediaLabelKey(item.mediaType))}
          className="mt-1.5"
        />
        <span className="line-clamp-2 text-body font-semibold">
          {item.title}
        </span>
      </span>
    </button>
  )
}
