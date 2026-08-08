import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Navigate, useParams } from 'react-router'
import { filterItems, sortForShelf } from '@core/items/filter'
import {
  mediaLabelKey,
  progressUnitFor,
  shelfSections,
  statusLabelKey,
} from '@core/items/status'
import { MEDIA_TYPES, type Item, type MediaType } from '@core/items/types'
import { hasProviderFor } from '@core/media/search'
import type { MediaSearchResult } from '@core/media/types'
import {
  Cover,
  CoverAction,
  CoverGrid,
  Input,
  Screen,
  ScreenBody,
  Section,
  SectionTitle,
} from '@ui/design'
import { ItemSheet, type SheetSubject } from '@ui/components/ItemSheet'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useSectionState } from '@ui/hooks/useSectionState'
import { useExternalSearch } from '@ui/hooks/useExternalSearch'
import { useItems } from '@ui/hooks/useItems'
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
  const { items, error, add, enabled, signedIn } = useItems()

  const [selected, setSelected] = useState<SheetSubject | null>(null)
  const [query, setQuery] = useState('')

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

  const { isOpen, toggle } = useSectionState(mediaType)

  const visible = useMemo(
    () =>
      mediaType
        ? sortForShelf(filterItems(items, { mediaType, query: trimmed }))
        : [],
    [items, mediaType, trimmed],
  )

  // Os itens já filtrados, agrupados por status e na ordem de seções da mídia.
  // A contagem que aparece no título é a DESTE recorte, não a da estante
  // inteira: buscando "zelda", "Jogando 2" quer dizer "dois acertos aqui".
  //
  // BUSCANDO, SEÇÃO SEM ACERTO SOME. Seção vazia informa quando é a estante em
  // repouso ("não tenho nada pausado"), mas numa busca ela vira ruído: quatro
  // "Nada aqui" empurrando para baixo os dois resultados que interessam. A
  // pergunta mudou de "como está minha estante" para "onde está o que eu
  // procuro", e a resposta certa é só o que casa.
  const sections = useMemo(
    () =>
      mediaType
        ? shelfSections(mediaType)
            .map((value) => ({
              status: value,
              items: visible.filter((i) => i.status === value),
            }))
            .filter(({ items: found }) => !trimmed || found.length > 0)
        : [],
    [mediaType, visible, trimmed],
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

  async function addResult(result: MediaSearchResult) {
    const unit = progressUnitFor(result.mediaType)
    await add({
      mediaType: result.mediaType,
      title: result.title,
      coverUrl: result.coverUrl,
      externalIds: { [result.provider]: result.externalId },
      progress:
        unit && result.total
          ? { unit, current: 0, total: result.total }
          : undefined,
    })
  }

  const noSource = !hasProviderFor(mediaType, signedIn)

  return (
    <Screen media={mediaType}>
      <ScreenHeader title={t(mediaLabelKey(mediaType))} />

      <ScreenBody as="main">
        {/* O campo fica SEMPRE, inclusive na estante vazia: sem o botão
            flutuante, ele é o único caminho para pôr a primeira obra aqui. */}
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
            aria-label={t('shelf.searchPlaceholder')}
            placeholder={t('shelf.searchPlaceholder')}
            className="pl-11"
          />
        </div>

        {error && (
          <p role="alert" className="mb-3 text-body text-danger">
            {t('catalog.loadError')}
          </p>
        )}

        {total > 0 && (
          <div className="flex flex-col">
            {sections.map(({ status: value, items: found }) => (
              <Section
                key={value}
                title={t(statusLabelKey(value, mediaType))}
                count={found.length}
                // Com busca em curso, aberto SEMPRE: ver o cabeçalho do arquivo.
                open={searchingExternal || isOpen(value, found.length)}
                onToggle={() => toggle(value, found.length)}
                emptyLabel={t('shelf.sectionEmpty')}
              >
                <CoverGrid>
                  {found.map((item, index) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="w-full text-left transition active:scale-95"
                      >
                        {/* Sem o badge de status sobre a capa: o título da
                            seção já diz o estado de todas elas, e repetir a
                            palavra em cada capa era ruído. É o título que
                            cobre a WCAG 1.4.1 pelo traço colorido. */}
                        <Cover
                          src={item.coverUrl}
                          title={item.title}
                          media={item.mediaType}
                          lazy={index > 5}
                        />
                        <span className="mt-1.5 line-clamp-2 block text-label font-semibold">
                          {item.title}
                        </span>
                      </button>
                    </li>
                  ))}
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

        {searchingExternal && (
          <section className="mt-6 pb-8">
            <SectionTitle media={mediaType} className="mb-2">
              {t('shelf.notOnShelf')}
            </SectionTitle>

            {noSource ? (
              <p className="text-body text-muted">
                {signedIn
                  ? t('add.noSource', { media: t(mediaLabelKey(mediaType)) })
                  : t('add.needsLogin')}
              </p>
            ) : searching ? (
              <p className="text-body text-muted">{t('add.searching')}</p>
            ) : fresh.length === 0 ? (
              <p className="text-body text-muted">
                {t('add.noResults', { query: trimmed })}
              </p>
            ) : (
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
                        onClick={() => void addResult(result)}
                      />
                    </div>
                  </li>
                ))}
              </CoverGrid>
            )}
          </section>
        )}
      </ScreenBody>

      <ItemSheet subject={openSubject} onClose={() => setSelected(null)} />
    </Screen>
  )
}
