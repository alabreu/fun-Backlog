import { useEffect, useMemo, useRef, useState } from 'react'
import { LinkSimple } from '@phosphor-icons/react'
import { filterItems } from '@core/items/filter'
import { mediaLabelKey, progressUnitFor, statusLabelKey } from '@core/items/status'
import type { Item, MediaType } from '@core/items/types'
import { parseMediaLink } from '@core/media/link'
import {
  hasProviderFor,
  searchAll,
  type SearchOutcome,
} from '@core/media/search'
import { findByImdbId } from '@core/media/tmdb'
import type { MediaSearchResult } from '@core/media/types'
import { ItemSheet, type SheetSubject } from '@ui/components/ItemSheet'
import {
  Badge,
  Button,
  Chip,
  ChipRow,
  Cover,
  CoverAction,
  CoverGrid,
  Field,
  Input,
  MediaDot,
  Screen,
  ScreenBody,
  SectionTitle,
} from '@ui/design'
import { ManualAddSheet } from '@ui/components/ManualAddSheet'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Espera entre a última tecla e a busca. Curto o bastante para parecer
 *  instantâneo, longo o bastante para não disparar uma request por letra. */
const DEBOUNCE_MS = 350

const EMPTY: SearchOutcome = { groups: [], failed: [], skippedNeedingAuth: [] }

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

  const [query, setQuery] = useState('')
  const [media, setMedia] = useState<MediaType | undefined>()
  const [outcome, setOutcome] = useState<SearchOutcome>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [selected, setSelected] = useState<SheetSubject | null>(null)

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

  // Link colado: derivado, não estado. O que a pessoa digitou já É a resposta.
  const link = useMemo(() => parseMediaLink(trimmed), [trimmed])

  // Com link na mão, o chip de mídia não manda: quem colou um endereço da
  // Steam quer aquele jogo, e não o que estava filtrado na tela.
  const searchQuery = link?.kind === 'query' ? link.query : trimmed
  const searchMedia = link?.kind === 'query' ? link.mediaType : media

  // Mídia escolhida que ainda não tem fonte: "nada encontrado" seria mentira,
  // porque ninguém chegou a procurar.
  const noSource =
    !link && media !== undefined && !hasProviderFor(media, signedIn)

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
                    }
                  : EMPTY,
            )
          : searchAll(searchQuery, {
              mediaType: searchMedia,
              enabled,
              signedIn,
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
            // de cada provider. Sem sessão a Edge Function recusa, e dizer
            // "pulado por falta de login" é a verdade; com sessão, é a fonte
            // que caiu.
            setOutcome({
              groups: [],
              failed: signedIn ? ['tmdb'] : [],
              skippedNeedingAuth: signedIn ? [] : ['tmdb'],
            })
            setSearching(false)
          }
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchQuery, searchMedia, active, link, noSource, signedIn, enabled])

  async function addResult(result: MediaSearchResult) {
    // O total que o provider já sabe (episódios, páginas) entra junto: é o que
    // permite mostrar "episódio 3 de 26" no detalhe sem uma segunda ida à API.
    const unit = progressUnitFor(result.mediaType)
    try {
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
      setFlash(t('add.added', { title: result.title }))
    } catch {
      setFlash(t('add.addFailed'))
    }
  }

  async function removeResult(item: Item) {
    try {
      await remove(item.id)
      setFlash(t('item.removed'))
    } catch {
      setFlash(t('item.saveFailed'))
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

        {/* Região viva: quem usa leitor de tela ouve o resultado da adição sem
            precisar caçar a mudança na lista. */}
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-body text-success"
        >
          {flash}
        </p>

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

            {shown.failed.length > 0 && (
              <p className="mt-2 text-label text-muted">
                {t('add.someFailed')}
              </p>
            )}

            {/* Convidado buscando jogo ou filme: dizer "nada encontrado" seria
                mentira — ninguém procurou, a fonte exige login (decisão 3). */}
            {searched && shown.skippedNeedingAuth.length > 0 && (
              <p className="mt-4 text-body text-muted">
                {t('add.needsLogin')}
              </p>
            )}

            {searched &&
              shown.groups.length === 0 &&
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
                <CoverGrid>
                  {group.results.map((result) => {
                    const mine = alreadyIn.get(
                      `${result.provider}:${result.externalId}`,
                    )
                    return (
                      <li key={`${result.provider}:${result.externalId}`}>
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
                                : void addResult(result)
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
