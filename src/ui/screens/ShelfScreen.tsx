import { useMemo, useState } from 'react'
import { Heart, MagnifyingGlass } from '@phosphor-icons/react'
import { Navigate, useParams } from 'react-router'
import { filterItems, sortForShelf } from '@core/items/filter'
import { groupByFranchise } from '@core/items/franchise'
import {
  datesForStatus,
  mediaLabelKey,
  progressUnitFor,
} from '@core/items/status'
import {
  hidesWhenEmpty,
  sectionLabelKey,
  sectionOf,
  shelfSectionKeys,
} from '@core/items/sections'
import {
  ITEM_STATUSES,
  MEDIA_TYPES,
  type Item,
  type MediaType,
} from '@core/items/types'
import { hasProviderFor } from '@core/media/search'
import type { MediaSearchResult } from '@core/media/types'
import {
  Cover,
  CoverAction,
  CoverGrid,
  CoverMark,
  CoverStack,
  IconButton,
  Input,
  Screen,
  ScreenBody,
  Section,
  Toast,
} from '@ui/design'
import {
  AddStatusSheet,
  type AddChoice,
} from '@ui/components/AddStatusSheet'
import { ItemSheet, type SheetSubject } from '@ui/components/ItemSheet'
import { StackSheet } from '@ui/components/StackSheet'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useSectionState } from '@ui/hooks/useSectionState'
import { useExternalSearch } from '@ui/hooks/useExternalSearch'
import { useFlash } from '@ui/hooks/useFlash'
import { useItems } from '@ui/hooks/useItems'
import { useReleaseBackfill } from '@ui/hooks/useReleaseBackfill'
import { useTranslation } from '@ui/hooks/useTranslation'

function isMediaType(value: string | undefined): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType)
}

/**
 * A estante de UMA mídia — o destino de cada linha da home.
 *
 * A busca aqui é UMA só, e faz as duas coisas: filtra o que você já tem e, ao
 * mesmo tempo, procura nas fontes o que você ainda não tem. Antes havia um
 * campo para filtrar a estante e um botão flutuante que levava para OUTRA tela
 * de busca — duas entradas para a mesma intenção ("achar X"), e a segunda
 * ainda perguntava de novo a mídia que a navegação já tinha decidido.
 *
 * Por isso não há filtro de mídia nesta tela: estando dentro de Jogos, tudo o
 * que aparece é jogo.
 *
 * O STATUS DEIXOU DE SER FILTRO E VIROU ESTRUTURA. Os chips mostravam um estado
 * por vez e escondiam que os outros existiam — saber "quantos eu tenho
 * pausados" custava um toque e um retorno. As seções mostram a estrutura
 * inteira de uma vez, com a contagem no título, e quem quiser esconder o
 * arquivo fecha a seção (e ela continua fechada da próxima vez).
 *
 * TODAS AS SEÇÕES APARECEM, inclusive as vazias — "não tenho nada pausado" é
 * uma resposta. Mas VAZIA NASCE FECHADA: aberta, ela gasta duas linhas para
 * dizer "nada aqui", e cinco dessas empurram o conteúdo de verdade para fora da
 * tela. Com nada escondido, a ORDEM é o que organiza, e ela muda por mídia
 * (ver `SHELF_SECTIONS`).
 *
 * BUSCAR ABRE TUDO. Um acerto dentro de uma seção fechada seria o pior desfecho
 * possível: a tela diria "nada encontrado" com a resposta escondida a um toque
 * de distância.
 *
 * "Concluídos" não é uma tela à parte: é uma seção desta aqui. A retrospectiva
 * por ano — que é cross-mídia por natureza — continua em /concluidos, no menu.
 */
export function ShelfScreen() {
  const { t } = useTranslation()
  const { media } = useParams()
  const { items, error, add, update, enabled, signedIn } = useItems()

  const [selected, setSelected] = useState<SheetSubject | null>(null)
  // A obra cujo + foi tocado, esperando a pessoa dizer COMO ela entra.
  const [pendingAdd, setPendingAdd] = useState<MediaSearchResult | null>(null)
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  // A pilha de franquia cujo painel está aberto. Guarda a CHAVE e não a pilha:
  // assim a lista dentro do painel acompanha o item mudando (progresso, nota)
  // em vez de congelar no que existia quando você tocou.
  const [pilhaKey, setPilhaKey] = useState<string | null>(null)
  // Um instante só por montagem. É ele que decide o que já saiu, e precisa ser
  // estável enquanto a tela está aberta: recalculado a cada render, um item na
  // fronteira da estreia poderia trocar de seção no meio de uma rolagem.
  const [agora] = useState(() => Date.now())

  // Mídia desligada vira mídia inexistente: quem chega em /estante/anime pelo
  // histórico do navegador ou por um link antigo volta para a home, em vez de
  // cair numa estante vazia de uma categoria que ele mesmo escondeu.
  const mediaType =
    isMediaType(media) && enabled.includes(media) ? media : undefined
  const trimmed = query.trim()
  const searchingExternal = trimmed.length >= 2

  const { outcome, searching } = useExternalSearch(trimmed, {
    mediaType,
    signedIn,
    enabled: Boolean(mediaType),
  })

  // Descobre a data de estreia do que está na fila sem ela — é o que preenche
  // "Não lançados" para quem já tinha estante antes da coluna existir. Ver os
  // freios no próprio hook.
  useReleaseBackfill(items, mediaType, update, signedIn)

  const { isOpen, toggle } = useSectionState(mediaType)
  const [flash, setFlash] = useFlash()

  const visible = useMemo(
    () =>
      mediaType
        ? sortForShelf(
            filterItems(items, {
              mediaType,
              query: trimmed,
              favorite: onlyFavorites || undefined,
            }),
          )
        : [],
    [items, mediaType, trimmed, onlyFavorites],
  )

  // COM RECORTE EM CURSO, AS PILHAS SE DESFAZEM. É o mesmo raciocínio que já
  // faz a seção vazia sumir na busca: a pergunta deixou de ser "como está minha
  // estante" e passou a ser "onde está o que eu procuro" — e uma pilha
  // escondendo justamente o acerto seria o pior desfecho possível.
  const agrupando = !trimmed && !onlyFavorites

  // Os itens já filtrados, agrupados por status e na ordem de seções da mídia.
  // A contagem que aparece no título é a DESTE recorte, não a da estante
  // inteira: buscando "zelda", "Jogando 2" quer dizer "dois acertos aqui".
  //
  // BUSCANDO, SEÇÃO SEM ACERTO SOME. Seção vazia informa quando é a estante em
  // repouso ("não tenho nada pausado"), mas numa busca ela vira ruído: quatro
  // "Nada aqui" empurrando para baixo os dois resultados que interessam. A
  // pergunta mudou de "como está minha estante" para "onde está o que eu
  // procuro", e a resposta certa é só o que casa.
  const sections = useMemo(() => {
    if (!mediaType) return []
    const canonicas = shelfSectionKeys(mediaType)
    // NENHUM ITEM FICA ESCONDIDO. Filme perdeu "assistindo" e "pausado"
    // (decisão 16), e um filme gravado num deles antes disso não tem mais
    // seção — ficaria invisível na estante, com o dado intacto no banco e
    // nenhuma forma de alcançá-lo. Estados órfãos entram no fim, e somem
    // sozinhos quando o último item sai deles.
    const orfaos = ITEM_STATUSES.filter(
      (s) => !canonicas.includes(s) && visible.some((i) => i.status === s),
    )
    return [...canonicas, ...orfaos]
      .map((value) => {
        const found = visible.filter((i) => sectionOf(i, agora) === value)
        return {
          status: value,
          items: found,
          entries: agrupando
            ? groupByFranchise(found)
            : found.map((item) => ({ kind: 'item' as const, key: item.id, item })),
        }
      })
      // SEÇÃO VAZIA SOME quando há um recorte em curso — busca OU filtro de
      // favoritas. Em repouso ela informa ("não tenho nada pausado"); dentro de
      // um recorte ela vira ruído, porque a pergunta deixou de ser "como está
      // minha estante" e passou a ser "onde está o que eu quero".
      //
      // "Não lançados" é a exceção e some SEMPRE que está vazia: ali o vazio é
      // o estado normal de quase toda estante (ver `hidesWhenEmpty`).
      .filter(
        ({ status: value, items: found }) =>
          found.length > 0 ||
          (!hidesWhenEmpty(value) && !trimmed && !onlyFavorites),
      )
  }, [mediaType, visible, trimmed, onlyFavorites, agora, agrupando])

  // A PILHA ABERTA, derivada da chave: se o item mudar (progresso, favorita),
  // a lista dentro do painel muda junto. Some sozinha se a franquia deixar de
  // existir — ao tirar da estante a penúltima obra dela, por exemplo.
  const pilha = useMemo(
    () =>
      sections
        .flatMap((s) => s.entries)
        .find((e) => e.kind === 'stack' && e.key === pilhaKey),
    [sections, pilhaKey],
  )

  // A estante INTEIRA, e não o recorte: o botão não pode sumir por causa do
  // próprio filtro que ele ligou.
  const temFavorita = useMemo(
    () =>
      Boolean(mediaType) &&
      items.some((i) => i.mediaType === mediaType && i.favorite),
    [items, mediaType],
  )

  const total = useMemo(
    () =>
      mediaType ? items.filter((i) => i.mediaType === mediaType).length : 0,
    [items, mediaType],
  )

  // "provider:id" -> item, para o botão sobre a capa saber se põe ou tira.
  const mine = useMemo(() => {
    const byKey = new Map<string, Item>()
    for (const item of items)
      for (const [provider, id] of Object.entries(item.externalIds))
        if (id) byKey.set(`${provider}:${id}`, item)
    return byKey
  }, [items])

  // Resultados da fonte MENOS o que já está na estante: repetir aqui embaixo
  // uma capa que está logo acima seria a tela mostrando a mesma obra duas
  // vezes, com dois significados diferentes.
  const fresh = useMemo(
    () =>
      outcome.groups
        .flatMap((g) => g.results)
        .filter((r) => !mine.has(`${r.provider}:${r.externalId}`)),
    [outcome, mine],
  )

  const openSubject =
    selected && 'id' in selected
      ? (items.find((i) => i.id === selected.id) ?? null)
      : selected

  // URL inventada (/estante/qualquercoisa) volta para a home em vez de
  // renderizar uma estante de mídia que não existe.
  if (!mediaType) return <Navigate to="/" replace />

  // Chamado pelo painel de status: o + pergunta ANTES, então a obra já nasce
  // no estado escolhido, com as datas que o estado implica (`datesForStatus` —
  // zerado ganha as duas, jogando ganha o início). Sem toast de sucesso: o
  // painel fechando e a obra aparecendo na seção certa É a confirmação.
  async function addResult(result: MediaSearchResult, choice: AddChoice) {
    setPendingAdd(null)
    const { status } = choice
    const unit = progressUnitFor(result.mediaType)
    try {
      await add({
        mediaType: result.mediaType,
        title: result.title,
        coverUrl: result.coverUrl,
        externalIds: { [result.provider]: result.externalId },
        releasesAt: result.releaseDate,
        status,
        ...datesForStatus(status, {}, new Date().toISOString()),
        // O progresso vem do painel: ele já buscou a ficha e sabe o total
        // de verdade, que o resultado de busca muitas vezes não traz.
        progress:
          unit && choice.progress
            ? { unit, ...choice.progress }
            : unit && result.total
              ? { unit, current: 0, total: result.total }
              : undefined,
      })
    } catch {
      setFlash({ message: t('add.addFailed') })
    }
  }

  const noSource = !hasProviderFor(mediaType, signedIn)

  return (
    <Screen media={mediaType}>
      <ScreenHeader title={t(mediaLabelKey(mediaType))} />

      <ScreenBody as="main">
        {/* O campo fica SEMPRE, inclusive na estante vazia: sem o botão
            flutuante, ele é o único caminho para pôr a primeira obra aqui. */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
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
              aria-label={t('shelf.searchPlaceholder')}
              placeholder={t('shelf.searchPlaceholder')}
              className="pl-11"
            />
          </div>
          {/* SÓ QUANDO HÁ FAVORITA. Um filtro que só pode devolver estante
              vazia não é um filtro, é uma armadilha — e enquanto ninguém tocou
              num coração ele não teria como explicar o que faz.

              O coração fica PREENCHIDO nos dois estados: ele é o rótulo do
              filtro, não o estado dele. Quem diz se está ligado é o
              preenchimento do botão (ver `pressed` no `IconButton`), que é o
              mesmo sinal do chip selecionado no resto do app. */}
          {temFavorita && (
            <IconButton
              aria-label={t('shelf.onlyFavorites')}
              pressed={onlyFavorites}
              onClick={() => setOnlyFavorites((v) => !v)}
            >
              <Heart size={18} weight="fill" />
            </IconButton>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-3 text-body text-danger">
            {t('catalog.loadError')}
          </p>
        )}

        {total > 0 && (
          <div className="flex flex-col">
            {sections.map(({ status: value, items: found, entries }) => (
              <Section
                key={value}
                title={t(sectionLabelKey(value, mediaType))}
                count={found.length}
                // Buscando, a seção só existe porque tem acerto: fica aberta
                // e sem seta. Ver `collapsible` em `Section`.
                collapsible={!searchingExternal}
                open={isOpen(value, found.length)}
                onToggle={() => toggle(value, found.length)}
                emptyLabel={t('shelf.sectionEmpty')}
              >
                <CoverGrid>
                  {entries.map((entry, index) =>
                    entry.kind === 'item' ? (
                      <ItemCell
                        key={entry.key}
                        item={entry.item}
                        lazy={index > 5}
                        onOpen={() => setSelected(entry.item)}
                      />
                    ) : (
                      <li key={entry.key}>
                        <CoverStack
                          src={entry.items[0].coverUrl}
                          name={entry.name}
                          count={entry.items.length}
                          media={mediaType}
                          lazy={index > 5}
                          // A FAMÍLIA INTEIRA, não só a capa de cima: senão
                          // uma favorita agrupada sumia da estante. Na prática
                          // `sortForShelf` já traz a favorita como primeira do
                          // grupo, mas depender disso deixaria a marca à mercê
                          // da ordenação.
                          favoriteLabel={
                            entry.items.some((i) => i.favorite)
                              ? t('item.favorite')
                              : undefined
                          }
                          label={t('shelf.stack', {
                            name: entry.name,
                            count: String(entry.items.length),
                          })}
                          onClick={() => setPilhaKey(entry.key)}
                        />
                      </li>
                    ),
                  )}
                </CoverGrid>
              </Section>
            ))}
          </div>
        )}

        {/* Estante vazia e ninguém procurando: o convite. Com busca em curso
            ele sai da frente, senão competiria com os resultados. */}
        {total === 0 && !searchingExternal && (
          <div className="mt-6 rounded-card bg-surface px-5 py-8 text-center ring-1 ring-ink/5">
            <h2 className="text-title font-bold">{t('shelf.emptyTitle')}</h2>
            <p className="mx-auto mt-1 max-w-xs text-body text-muted">
              {t('shelf.emptyBody')}
            </p>
          </div>
        )}

        {/* Tem itens, mas nenhum casa com o filtro. Só faz sentido dizer isso
            quando NÃO há busca externa em curso — com ela, o vazio aqui em
            cima é normal e a resposta está logo abaixo. */}
        {total > 0 && visible.length === 0 && !searchingExternal && (
          <div className="py-10 text-center">
            <h2 className="text-title font-bold">{t('catalog.noMatchTitle')}</h2>
            <p className="mt-1 text-body text-muted">
              {t('catalog.noMatchBody')}
            </p>
          </div>
        )}

        {/* MESMA `Section` das seções de status, e não um cabeçalho próprio: os
            resultados da fonte são mais um bloco desta estante, e antes eles
            eram anunciados por um rótulo miúdo em caixa alta enquanto "Jogando"
            e "Na fila" tinham título de verdade — a mesma tela falando em dois
            tons. Vem com a contagem junto, como as outras.

            Os três vazios possíveis (sem fonte, buscando, nada encontrado)
            entram como `emptyLabel`: a `Section` já mostra essa mensagem no
            lugar do conteúdo quando a contagem é zero, com a mesma tipografia
            que eles tinham soltos aqui. */}
        {searchingExternal && (
          <Section
            className="mt-6 pb-8"
            title={t('shelf.notOnShelf')}
            count={fresh.length}
            collapsible={false}
            emptyLabel={
              noSource
                ? signedIn
                  ? t('add.noSource', { media: t(mediaLabelKey(mediaType)) })
                  : t('add.needsLogin')
                : searching
                  ? t('add.searching')
                  : t('add.noResults', { query: trimmed })
            }
          >
            <CoverGrid>
                {fresh.map((result) => (
                  <li key={`${result.provider}:${result.externalId}`}>
                    {/* Irmãos, não aninhados: botão dentro de botão é HTML
                        inválido e o leitor de tela anuncia um só. */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSelected(result)}
                        className="w-full text-left transition active:scale-95"
                      >
                        <Cover
                          src={result.coverUrl}
                          title={result.title}
                          media={result.mediaType}
                        />
                        <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
                          {result.title}
                        </span>
                        {result.year && (
                          <span className="line-clamp-1 block text-label text-muted">
                            {result.year}
                          </span>
                        )}
                      </button>
                      <CoverAction
                        added={false}
                        label={t('catalog.add')}
                        onClick={() => setPendingAdd(result)}
                      />
                    </div>
                  </li>
                ))}
            </CoverGrid>
          </Section>
        )}
      </ScreenBody>

      {/* Só ERRO chega aqui: o sucesso se mostra sozinho, com a obra
          aparecendo na seção que a pessoa acabou de escolher. */}
      {flash && <Toast>{flash.message}</Toast>}

      <AddStatusSheet
        result={pendingAdd}
        onClose={() => setPendingAdd(null)}
        onPick={(result, choice) => void addResult(result, choice)}
      />

      {/* UM PAINEL POR VEZ, e é este `open` que garante isso. Abrindo uma obra
          de dentro da coleção, o painel da coleção SAI de cena em vez de ficar
          embaixo — nada de duas camadas, dois Escape e dois arrastes, que é a
          razão de o `ItemSheet` também trocar de assunto em vez de empilhar.

          E como `pilhaKey` continua guardado, fechar a obra devolve a coleção:
          é o "voltar" sem pilha de navegação (escolha do usuário, 10/08/2026).
          Tocando numa capa solta da estante, `pilhaKey` é nulo e fechar leva
          direto ao grid, como sempre foi. */}
      {pilha?.kind === 'stack' && (
        <StackSheet
          name={pilha.name}
          items={pilha.items}
          open={!openSubject}
          onClose={() => setPilhaKey(null)}
          onOpenItem={setSelected}
        />
      )}

      <ItemSheet subject={openSubject} onClose={() => setSelected(null)} />
    </Screen>
  )
}

/**
 * A célula de uma obra da estante. Virou componente quando a pilha de franquia
 * chegou: as obras aparecem soltas no grid E dentro de uma pilha aberta, e duas
 * cópias do mesmo botão divergiriam no primeiro ajuste.
 */
function ItemCell({
  item,
  lazy,
  onOpen,
}: {
  item: Item
  lazy: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <li>
      {/* `relative` porque o `CoverMark` se ancora nele — sem isso o coração
          procura o ancestral posicionado mais próximo e vai parar no canto da
          TELA. */}
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full text-left transition active:scale-95"
      >
        {/* Sem o badge de status sobre a capa: o título da seção já diz o
            estado de todas elas, e repetir a palavra em cada capa era ruído. É
            o título que cobre a WCAG 1.4.1 pelo traço colorido. */}
        <Cover
          src={item.coverUrl}
          title={item.title}
          media={item.mediaType}
          lazy={lazy}
        />
        {item.favorite && <CoverMark label={t('item.favorite')} />}
        <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
          {item.title}
        </span>
      </button>
    </li>
  )
}
