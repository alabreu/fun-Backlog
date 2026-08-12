import { useEffect, useMemo, useRef, useState } from 'react'
import { LinkSimple } from '@phosphor-icons/react'
import { filterItems } from '@core/items/filter'
import {
  datesForStatus,
  mediaLabelKey,
  progressUnitFor,
  statusLabelKey,
} from '@core/items/status'
import type { Item, MediaType } from '@core/items/types'
import { parseMediaLink } from '@core/media/link'
import {
  hasProviderFor,
  searchAll,
  type SearchOutcome,
} from '@core/media/search'
import { findByImdbId } from '@core/media/tmdb'
import type { MediaSearchResult } from '@core/media/types'
import { groupResultsByFranchise } from '@core/media/collection'
import { useRegionStore } from '@core/state/regionStore'
import { useSafeSearchStore } from '@core/state/safeSearchStore'
import {
  AddStatusSheet,
  type AddChoice,
} from '@ui/components/AddStatusSheet'
import { ItemSheet, type SheetSubject } from '@ui/components/ItemSheet'
import { SignInPrompt } from '@ui/components/SignInPrompt'
import {
  Badge,
  Button,
  Chip,
  ChipRow,
  Cover,
  CoverAction,
  CoverGrid,
  CoverStack,
  Field,
  Input,
  MediaDot,
  Screen,
  ScreenBody,
  SectionTitle,
  Toast,
} from '@ui/design'
import { ManualAddSheet } from '@ui/components/ManualAddSheet'
import { SearchStackSheet } from '@ui/components/SearchStackSheet'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useFlash } from '@ui/hooks/useFlash'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Espera entre a última tecla e a busca. Curto o bastante para parecer
 *  instantâneo, longo o bastante para não disparar uma request por letra. */
const DEBOUNCE_MS = 350

const EMPTY: SearchOutcome = {
  groups: [],
  failed: [],
  skippedNeedingAuth: [],
  rateLimited: false,
}

/**
 * Buscar e adicionar — a mesma intenção vista de dois ângulos: se a obra já
 * existe numa fonte, um toque no resultado a põe na estante.
 *
 * A busca é UNIFICADA em três sentidos:
 *
 * 1. Ela procura ANTES na própria estante. Sem isso, quem já tem "Hollow
 *    Knight" catalogado busca, vê o resultado externo e adiciona de novo — o
 *    app deixando a pessoa duplicar o próprio acervo.
 * 2. Ela aceita LINK COLADO. Quem viu o jogo na Steam ou o filme no Letterboxd
 *    não deveria ter que reler o título e redigitar (ver core/media/link.ts).
 * 3. A adição à mão é a EXCEÇÃO, e só aparece no fim, depois de a pessoa ter
 *    procurado e não encontrado.
 */
export function AddScreen() {
  const { t } = useTranslation()
  const { items, add, remove, enabled, signedIn } = useItems()
  // Livro é onde o país pesa: decide a loja e se a obra está à venda.
  const region = useRegionStore((s) => s.region)
  const safeSearch = useSafeSearchStore((s) => s.safeSearch)

  const [query, setQuery] = useState('')
  const [media, setMedia] = useState<MediaType | undefined>()
  const [outcome, setOutcome] = useState<SearchOutcome>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [flash, setFlash] = useFlash()
  const [manualOpen, setManualOpen] = useState(false)
  // A coleção aberta. Dois campos pelo mesmo motivo da estante: zerando a chave
  // ao fechar, o painel esvazia antes de terminar de descer.
  const [pilhaAberta, setPilhaAberta] = useState<{
    key: string
    open: boolean
  } | null>(null)
  const [selected, setSelected] = useState<SheetSubject | null>(null)
  // A obra cujo + foi tocado, esperando a pessoa dizer COMO ela entra.
  const [pendingAdd, setPendingAdd] = useState<MediaSearchResult | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  // "provider:id" -> item da estante. Mapa e não Set porque o botão sobre a
  // capa precisa REMOVER, e para isso precisa do id do item.
  const alreadyIn = useMemo(() => {
    const byKey = new Map<string, Item>()
    for (const item of items)
      for (const [provider, id] of Object.entries(item.externalIds))
        if (id) byKey.set(`${provider}:${id}`, item)
    return byKey
  }, [items])

  const trimmed = query.trim()
  const active = trimmed.length >= 2
  const shown = active ? outcome : EMPTY

  // A pilha aberta, procurada em TODOS os grupos: a chave é única por família,
  // e refazer o agrupamento aqui é o que mantém a lista viva quando o resultado
  // da busca muda embaixo do painel.
  const pilha = useMemo(
    () =>
      shown.groups
        .flatMap((g) => groupResultsByFranchise(g.results))
        .find((e) => e.kind === 'stack' && e.key === pilhaAberta?.key),
    [shown, pilhaAberta?.key],
  )

  // Link colado: derivado, não estado. O que a pessoa digitou já É a resposta.
  const link = useMemo(() => parseMediaLink(trimmed), [trimmed])

  // Com link na mão, o chip de mídia não manda: quem colou um endereço da
  // Steam quer aquele jogo, e não o que estava filtrado na tela.
  const searchQuery = link?.kind === 'query' ? link.query : trimmed
  const searchMedia = link?.kind === 'query' ? link.mediaType : media

  // Mídia escolhida que ainda não tem fonte: "nada encontrado" seria mentira,
  // porque ninguém chegou a procurar.
  const noSource =
    !link && media !== undefined && !hasProviderFor(media)

  // O que já está na estante, casando com o mesmo texto. Local e instantâneo:
  // não passa por rede nem espera o debounce.
  const onShelf = useMemo(
    () =>
      active
        ? filterItems(items, { query: searchQuery, mediaType: searchMedia })
        : [],
    [items, active, searchQuery, searchMedia],
  )

  useEffect(() => {
    if (!active || noSource) return

    const timer = setTimeout(() => {
      setSearching(true)
      // Cancela a busca anterior: sem isso, uma resposta lenta de duas letras
      // atrás pode chegar depois e sobrescrever o resultado atual.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      // Link do IMDb é o único caso EXATO: em vez de procurar por texto e
      // torcer, resolvemos o id pela TMDB e devolvemos a obra certa.
      const running =
        link?.kind === 'imdb'
          ? findByImdbId(link.imdbId, controller.signal).then(
              (found): SearchOutcome =>
                found
                  ? {
                      groups: [
                        { mediaType: found.mediaType, results: [found] },
                      ],
                      failed: [],
                      skippedNeedingAuth: [],
                      rateLimited: false,
                    }
                  : EMPTY,
            )
          : searchAll(searchQuery, {
              mediaType: searchMedia,
              enabled,
              region,
              safeSearch,
              signal: controller.signal,
            })

      running
        .then((result) => {
          if (!controller.signal.aborted) {
            setOutcome(result)
            setSearching(false)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            // Só o caminho do IMDb chega aqui — `searchAll` já engole a falha
            // de cada provider. Deixou de depender de sessão em 11/08/2026:
            // a function responde a quem não tem conta, então quem chega aqui
            // é fonte fora do ar ou teto por IP estourado, e nos dois casos a
            // verdade é "a fonte não respondeu".
            setOutcome({
              groups: [],
              failed: ['tmdb'],
              skippedNeedingAuth: [],
              rateLimited: false,
            })
            setSearching(false)
          }
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery, searchMedia, active, link, noSource, signedIn, enabled, region, safeSearch])

  // Chamado pelo painel de status: o + pergunta ANTES, então a obra já nasce
  // no estado escolhido, com as datas que o estado implica (`datesForStatus`).
  // O total que o provider já sabe (episódios, páginas) entra junto: é o que
  // permite mostrar "episódio 3 de 26" no detalhe sem uma segunda ida à API.
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
      // Aqui o sucesso AINDA fala: nesta tela a obra não aparece em seção
      // nenhuma — o resultado só ganha o check na capa, e um check pequeno num
      // grid cheio é fácil de não ver.
      setFlash({ message: t('add.added', { title: result.title }) })
    } catch {
      setFlash({ message: t('add.addFailed') })
    }
  }

  async function removeResult(item: Item) {
    try {
      await remove(item.id)
      setFlash({ message: t('item.removed') })
    } catch {
      setFlash({ message: t('item.saveFailed') })
    }
  }

  // O link de "não achou" só faz sentido depois de uma busca de verdade: é a
  // saída de quem procurou e não encontrou, não uma alternativa à busca.
  const searched = active && !searching

  return (
    <Screen>
      <ScreenHeader title={t('add.title')} />

      <ScreenBody as="main">
        <Field label={t('add.searchLabel')}>
          {(id) => (
            <Input
              id={id}
              type="search"
              value={query}
              placeholder={t('add.searchPlaceholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </Field>

        {/* Filtro de mídia logo abaixo do campo: escolher antes de digitar é o
            gesto natural de quem já sabe o que procura. Com um link colado ele
            some — o endereço já disse a mídia, e deixar um chip aceso que não
            manda em nada seria a interface mentindo. */}
        {link ? (
          <p className="mt-3 flex items-center gap-1.5 text-label text-muted">
            <LinkSimple size={14} aria-hidden />
            {t('add.fromLink')}
          </p>
        ) : (
          <ChipRow className="mt-2">
            <Chip
              selected={media === undefined}
              onClick={() => setMedia(undefined)}
            >
              {t('catalog.filterAll')}
            </Chip>
            {enabled.map((type) => (
              <Chip
                key={type}
                media={type}
                selected={media === type}
                onClick={() => setMedia(type)}
                className="whitespace-nowrap"
              >
                {t(mediaLabelKey(type))}
              </Chip>
            ))}
          </ChipRow>
        )}

        {noSource ? (
          <p className="mt-6 text-body text-muted">
            {t('add.noSource', { media: t(mediaLabelKey(media)) })}
          </p>
        ) : (
          <>
            {/* A estante ANTES das fontes: o que você já tem é sempre a
                resposta mais relevante para o que você acabou de digitar. */}
            {onShelf.length > 0 && (
              <section className="mt-5">
                <SectionTitle className="mb-2">
                  {t('add.onShelf')}
                </SectionTitle>
                <CoverGrid>
                  {onShelf.map((item) => (
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
                          />
                          <Badge
                            tone="onCover"
                            className="absolute bottom-1.5 left-1.5"
                          >
                            {t(statusLabelKey(item.status, item.mediaType))}
                          </Badge>
                        </div>
                        {/* Lista MISTA: sem o ponto, "Duna" filme e "Duna"
                            livro ficam idênticos na tela. O `label` vai junto
                            porque aqui a cor é o único sinal da mídia. */}
                        <span className="mt-1.5 flex items-start gap-1.5">
                          <MediaDot
                            media={item.mediaType}
                            label={t(mediaLabelKey(item.mediaType))}
                            className="mt-1"
                          />
                          <span className="line-clamp-2 text-label font-semibold">
                            {item.title}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </CoverGrid>
              </section>
            )}

            {active && searching && (
              <p className="mt-4 text-body text-muted">{t('add.searching')}</p>
            )}

            {/* O TETO GANHA DO "não respondeu": os dois nascem do mesmo
                resultado vazio, mas só um tem conserto do lado de quem lê.
                Mostrar os dois seria dar duas explicações para a mesma tela
                sem resposta, e a genérica enterraria a acionável. */}
            {shown.rateLimited ? (
              <div className="mt-4">
                <SignInPrompt reason="rateLimited" />
              </div>
            ) : (
              shown.failed.length > 0 && (
                <p className="mt-2 text-label text-muted">
                  {t('add.someFailed')}
                </p>
              )
            )}

            {/* NUNCA DISPARA HOJE, e fica de propósito. A busca com chave
                abriu para convidado em 11/08/2026 (decisão 27), então
                `skippedNeedingAuth` vem sempre vazio. Este bloco e o
                `SignInPrompt` são o caminho de VOLTA já escrito: se o teto por
                IP não segurar a cota, fechar a porta é uma linha em
                `searchAll` — e a tela já sabe o que dizer quando ela fechar. */}
            {searched && shown.skippedNeedingAuth.length > 0 && (
              <div className="mt-4">
                <SignInPrompt />
              </div>
            )}

            {/* "Nada encontrado" SOME quando o teto explica o vazio: não é
                que a obra não exista, é que ninguém chegou a procurar. Dois
                motivos para a mesma tela vazia, e o segundo desmentiria o
                primeiro. */}
            {searched &&
              shown.groups.length === 0 &&
              !shown.rateLimited &&
              shown.skippedNeedingAuth.length === 0 && (
                <p className="mt-4 text-body text-muted">
                  {link
                    ? t('add.linkNotFound')
                    : t('add.noResults', { query: trimmed })}
                </p>
              )}

            {shown.groups.map((group) => (
              <section key={group.mediaType} className="mt-5">
                <SectionTitle media={group.mediaType} className="mb-2">
                  {t(mediaLabelKey(group.mediaType))}
                </SectionTitle>
                {/* PILHA DE FRANQUIA, igual à estante (10/08/2026): um
                    testador não achou a obra que procurava porque a lista vinha
                    entupida de temporadas da mesma série. A pilha nasce na
                    posição do melhor colocado e veste a capa dele, então o mais
                    relevante continua à vista — some o entulho. */}
                <CoverGrid>
                  {groupResultsByFranchise(group.results).map((entry) => {
                    if (entry.kind === 'stack')
                      return (
                        <li key={entry.key}>
                          <CoverStack
                            src={entry.results[0].coverUrl}
                            name={entry.name}
                            count={entry.results.length}
                            media={group.mediaType}
                            label={t('shelf.stack', {
                              name: entry.name,
                              count: String(entry.results.length),
                            })}
                            onClick={() =>
                              setPilhaAberta({ key: entry.key, open: true })
                            }
                          />
                        </li>
                      )
                    const result = entry.result
                    const mine = alreadyIn.get(
                      `${result.provider}:${result.externalId}`,
                    )
                    return (
                      <li key={entry.key}>
                        {/* Dois irmãos, não um dentro do outro: botão dentro
                            de botão é HTML inválido. O container posicionado
                            é o que deixa o +/- flutuar sobre a capa. */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSelected(mine ?? result)}
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
                            {(result.year || result.subtitle) && (
                              <span className="line-clamp-1 block text-label text-muted">
                                {[result.year, result.subtitle]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                          </button>
                          <CoverAction
                            added={Boolean(mine)}
                            label={
                              mine ? t('add.removeFromShelf') : t('catalog.add')
                            }
                            onClick={() =>
                              mine
                                ? void removeResult(mine)
                                : setPendingAdd(result)
                            }
                          />
                        </div>
                      </li>
                    )
                  })}
                </CoverGrid>
              </section>
            ))}
          </>
        )}

        {/* No fim de tudo, e só depois de procurar: discreto de propósito. */}
        {(searched || noSource) && (
          <Button
            variant="ghost"
            fullWidth
            className="mt-8"
            onClick={() => setManualOpen(true)}
          >
            {t('add.manualLink')}
          </Button>
        )}
      </ScreenBody>

      <ManualAddSheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        initialTitle={searchQuery}
        initialMedia={searchMedia}
      />

      {/* O detalhe do item vem do mesmo componente da estante: tocar em algo
          que você já tem tem que fazer a MESMA coisa em qualquer tela. */}
      {/* Item da estante é reidratado do store a cada render, para o sheet
          refletir uma edição feita nele mesmo. Resultado de busca não tem o
          que reidratar — ele é o dado da fonte, e não muda. */}
      {flash && <Toast>{flash.message}</Toast>}

      <AddStatusSheet
        result={pendingAdd}
        onClose={() => setPendingAdd(null)}
        onPick={(result, choice) => void addResult(result, choice)}
      />

      {/* UM PAINEL POR VEZ: abrindo uma obra da coleção, esta sai de cena e a
          ficha entra; fechando a ficha, a coleção volta. Mesma regra da
          estante, e o motivo é o mesmo — sheet empilhado em celular são duas
          camadas, dois Escape e dois arrastes. */}
      <SearchStackSheet
        name={pilha?.kind === 'stack' ? pilha.name : ''}
        results={pilha?.kind === 'stack' ? pilha.results : []}
        items={items}
        open={Boolean(pilhaAberta?.open) && !selected}
        onClose={() =>
          setPilhaAberta((atual) => (atual ? { ...atual, open: false } : null))
        }
        onOpenResult={setSelected}
      />

      <ItemSheet
        subject={
          selected && 'id' in selected
            ? (items.find((i) => i.id === selected.id) ?? null)
            : selected
        }
        onClose={() => setSelected(null)}
      />
    </Screen>
  )
}
