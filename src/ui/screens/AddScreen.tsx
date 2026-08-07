import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus } from '@phosphor-icons/react'
import { mediaLabelKey, progressUnitFor } from '@core/items/status'
import { MEDIA_TYPES, type MediaType } from '@core/items/types'
import {
  hasProviderFor,
  searchAll,
  type SearchOutcome,
} from '@core/media/search'
import type { MediaSearchResult } from '@core/media/types'
import {
  Badge,
  Button,
  Chip,
  Cover,
  CoverGrid,
  Field,
  Input,
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
 * A adição à mão é a EXCEÇÃO, e a tela trata assim: ela só aparece como um
 * link discreto no fim dos resultados, depois de a pessoa ter procurado e não
 * encontrado. Deixar o formulário aberto no topo, como estava, competia com os
 * resultados e sugeria que digitar tudo à mão fosse o caminho normal.
 */
export function AddScreen() {
  const { t } = useTranslation()
  const { items, add, signedIn } = useItems()

  const [query, setQuery] = useState('')
  const [media, setMedia] = useState<MediaType | undefined>()
  const [outcome, setOutcome] = useState<SearchOutcome>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // Chaves "provider:id" do que já está na estante, para marcar os duplicados
  // na lista em vez de deixar a pessoa adicionar de novo e descobrir depois.
  const alreadyIn = useMemo(() => {
    const keys = new Set<string>()
    for (const item of items)
      for (const [provider, id] of Object.entries(item.externalIds))
        if (id) keys.add(`${provider}:${id}`)
    return keys
  }, [items])

  const trimmed = query.trim()
  const active = trimmed.length >= 2
  const shown = active ? outcome : EMPTY

  // Mídia escolhida que ainda não tem fonte: "nada encontrado" seria mentira,
  // porque ninguém chegou a procurar.
  const noSource = media !== undefined && !hasProviderFor(media, signedIn)

  useEffect(() => {
    if (!active || noSource) return

    const timer = setTimeout(() => {
      setSearching(true)
      // Cancela a busca anterior: sem isso, uma resposta lenta de duas letras
      // atrás pode chegar depois e sobrescrever o resultado atual.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      searchAll(trimmed, {
        mediaType: media,
        signedIn,
        signal: controller.signal,
      })
        .then((result) => {
          if (!controller.signal.aborted) {
            setOutcome(result)
            setSearching(false)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [trimmed, active, media, noSource, signedIn])

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
            gesto natural de quem já sabe o que procura. */}
        <div className="-mx-gutter mt-3 flex gap-2 overflow-x-auto px-gutter pb-1">
          <Chip
            selected={media === undefined}
            onClick={() => setMedia(undefined)}
          >
            {t('catalog.filterAll')}
          </Chip>
          {MEDIA_TYPES.map((type) => (
            <Chip
              key={type}
              selected={media === type}
              onClick={() => setMedia(type)}
              className="whitespace-nowrap"
            >
              {t(mediaLabelKey(type))}
            </Chip>
          ))}
        </div>

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
            {active && searching && (
              <p className="mt-4 text-body text-muted">{t('add.searching')}</p>
            )}

            {shown.failed.length > 0 && (
              <p className="mt-2 text-label text-muted">
                {t('add.someFailed')}
              </p>
            )}

            {searched && shown.groups.length === 0 && (
              <p className="mt-4 text-body text-muted">
                {t('add.noResults', { query: trimmed })}
              </p>
            )}

            {shown.groups.map((group) => (
              <section key={group.mediaType} className="mt-5">
                <SectionTitle className="mb-2">
                  {t(mediaLabelKey(group.mediaType))}
                </SectionTitle>
                <CoverGrid>
                  {group.results.map((result) => {
                    const known = alreadyIn.has(
                      `${result.provider}:${result.externalId}`,
                    )
                    return (
                      <li key={`${result.provider}:${result.externalId}`}>
                        <button
                          type="button"
                          disabled={known}
                          onClick={() => void addResult(result)}
                          className="w-full text-left transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                          <div className="relative">
                            <Cover src={result.coverUrl} title={result.title} />
                            <Badge
                              tone="onCover"
                              className="absolute bottom-1.5 left-1.5"
                            >
                              {known ? (
                                <Check size={12} weight="bold" />
                              ) : (
                                <Plus size={12} weight="bold" />
                              )}
                              <span className="sr-only">
                                {known ? t('add.alreadyIn') : t('catalog.add')}
                              </span>
                            </Badge>
                          </div>
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

        {/* Crédito das fontes. A parte da TMDB é EXIGIDA pela licença gratuita
            deles e fica nesta tela porque é aqui que os dados aparecem — não é
            rodapé decorativo. Ver docs/decisions.md, decisão 8. */}
        <p className="mt-10 mb-2 text-label text-muted">{t('add.sources')}</p>
      </ScreenBody>

      <ManualAddSheet
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        initialTitle={trimmed}
        initialMedia={media}
      />
    </Screen>
  )
}
