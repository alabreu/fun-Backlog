import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import {
  openingFor,
  splitOpening,
  stripVocative,
  vocativeFor,
} from '@core/greeting'
import { useNicknameStore } from '@core/state/nicknameStore'
import {
  mediaLabelKey,
  progressLabelKey,
  progressUnitFor,
} from '@core/items/status'
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
  NavRow,
  Rail,
  RailItem,
  Skeleton,
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

  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)

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
  const vocative = vocativeFor(nickname)

  return (
    <Screen>
      <header className="flex items-start justify-between gap-2 px-gutter pb-4 pt-6">
        <div className="min-w-0">
          {/* Com apelido escrito, a quebra é FIXA: frase numa linha, nome na
              seguinte, para o nome ganhar o peso de uma linha inteira em vez de
              cair onde a sobra de espaço deixar. Sem apelido não há o que
              quebrar — a frase é uma linha só. */}
          <h1 className="text-display font-extrabold tracking-tight text-balance">
            {vocative ? (
              <>
                <span className="block">{opening.before}</span>
                <span className="block">
                  <span className="text-accent">{vocative}</span>
                  {opening.after}
                </span>
              </>
            ) : (
              stripVocative(phrase)
            )}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <IconButton
            aria-label={t('home.searchFab')}
            onClick={() => navigate('/buscar')}
          >
            <MagnifyingGlass size={20} weight="bold" />
          </IconButton>
          {/* Sem sinal de não lido aqui: ele vive no item "Novidades" DENTRO
              do menu, que é onde a pessoa vai resolvê-lo. Um ponto no avatar
              anunciava algo que ela só entenderia depois de abrir o menu e
              procurar. `overflow-hidden` recorta a foto no raio do botão. */}
          <IconButton
            aria-label={t('home.menuButton')}
            onClick={() => setMenuOpen(true)}
            className="overflow-hidden"
          >
            <Avatar src={user?.avatarUrl} />
          </IconButton>
        </div>
      </header>

      <ScreenBody as="main">
        {/* QUATRO estados para o herói. Antes eram três, e o quarto — ainda
            carregando — não desenhava nada: os três testes davam falso ao mesmo
            tempo, então a lista de estantes nascia colada no topo e descia
            quando o carrossel chegava.

            O esqueleto tem a MESMA altura de um card do carrossel, que é o
            desfecho de longe mais comum: quem abre o app tem algo em andamento.
            Nos outros dois (estante vazia, ou fila sem nada começado) ainda
            sobra um ajuste — reservar a altura de um deles pioraria o caso
            comum para melhorar o raro. */}
        {loading ? (
          <HeroSkeleton />
        ) : emptyShelf ? (
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
/**
 * O herói enquanto a estante carrega. Espelha o `ItemCard` abaixo: mesma trilha,
 * mesma largura de item, capa 2:3 e uma linha de título. Se o card mudar de
 * forma, este precisa mudar junto — é a única maneira de a altura continuar
 * batendo, e a altura é a razão de ele existir.
 */
function HeroSkeleton() {
  const { t } = useTranslation()
  return (
    <section aria-busy="true">
      {/* Sem isto o leitor de tela ouve silêncio até a estante chegar: o
          esqueleto é `aria-hidden`, então não há nada para ele ler. */}
      <p role="status" className="sr-only">
        {t('home.loading')}
      </p>
      <Rail>
        {[0, 1, 2].map((i) => (
          <RailItem key={i}>
            <Skeleton shape="cover" />
            <Skeleton shape="line" className="mt-2 w-3/4" />
          </RailItem>
        ))}
      </Rail>
    </section>
  )
}

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
  const unit = progressUnitFor(item.mediaType)

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
          glow
          lazy={!eager}
        />
        {/* A UNIDADE VEM DA MÍDIA, e não do que está gravado no item. Parece a
            mesma coisa e não é: um jogo antigo tem `unit: 'hour'` guardado, de
            antes de o campo de horas sair (decisão 21), e pedir o rótulo dessa
            unidade devolvia `undefined` — o selo aparecia com um buraco no
            lugar do nome. Perguntar à mídia faz o dado órfão simplesmente não
            desenhar nada. */}
        {unit && progress && progress.current > 0 && (
          <Badge tone="onCover" className="absolute bottom-1.5 left-1.5">
            {`${t(progressLabelKey(unit))} ${progress.current}${
              progress.total ? `/${progress.total}` : ''
            }`}
          </Badge>
        )}
      </div>
      {/* A MÍDIA saiu do título e foi para a luz no rodapé da capa: o ponto
          colorido brigava por atenção com a arte que ele deveria acompanhar.
          O nome da mídia continua aqui para leitor de tela — sem ele a única
          pista de "isto é um anime" seria uma cor, que é exatamente o que a
          WCAG 1.4.1 proíbe. */}
      <span className="mt-2 block text-body font-semibold">
        <span className="sr-only">{t(mediaLabelKey(item.mediaType))}: </span>
        <span className="line-clamp-2">{item.title}</span>
      </span>
    </button>
  )
}
