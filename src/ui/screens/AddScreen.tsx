import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus } from '@phosphor-icons/react'
import { mediaLabelKey, progressUnitFor } from '@core/items/status'
import { MEDIA_TYPES, type MediaType } from '@core/items/types'
import { searchAll, type SearchOutcome } from '@core/media/search'
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
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/** Espera entre a última tecla e a busca. Curto o bastante para parecer
 *  instantâneo, longo o bastante para não disparar uma request por letra. */
const DEBOUNCE_MS = 350

const EMPTY: SearchOutcome = { groups: [], failed: [], skippedNeedingAuth: [] }

/**
 * Adicionar item. Uma caixa só, todas as mídias — "fricção zero para
 * adicionar": quem está no sofá não quer escolher a aba certa antes de digitar.
 *
 * Hoje as fontes públicas (AniList, Open Library) respondem sem login. As que
 * exigem chave (jogos, filmes, séries) entram quando as Edge Functions
 * existirem; até lá o formulário à mão cobre as cinco mídias.
 */
export function AddScreen() {
  const { t } = useTranslation()
  const { items, add, signedIn } = useItems()

  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState<SearchOutcome>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const [manualTitle, setManualTitle] = useState('')
  const [manualMedia, setManualMedia] = useState<MediaType>('game')

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

  // Busca curta demais não é um estado a guardar, é um estado a DERIVAR: por
  // isso `active` filtra na renderização em vez de um setState no effect
  // (que dispararia render em cascata — e o lint de hooks reclama com razão).
  const shown = active ? outcome : EMPTY

  useEffect(() => {
    if (!active) return

    const timer = setTimeout(() => {
      setSearching(true)
      // Cancela a busca anterior: sem isso, uma resposta lenta de duas letras
      // atrás pode chegar depois e sobrescrever o resultado atual.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      searchAll(trimmed, { signedIn, signal: controller.signal })
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
  }, [trimmed, active, signedIn])

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

  async function addManual(e: React.FormEvent) {
    e.preventDefault()
    const title = manualTitle.trim()
    if (!title) return
    try {
      await add({ mediaType: manualMedia, title, externalIds: {} })
      setFlash(t('add.added', { title }))
      setManualTitle('')
    } catch {
      setFlash(t('add.addFailed'))
    }
  }

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

        <p className="mt-2 text-label text-muted">
          {signedIn ? t('add.hint') : t('add.needsLogin')}
        </p>

        {/* Uma região viva: quem usa leitor de tela ouve o resultado da adição
            sem precisar caçar a mudança na lista. */}
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-body text-success"
        >
          {flash}
        </p>

        {active && searching && (
          <p className="mt-4 text-body text-muted">{t('add.searching')}</p>
        )}

        {shown.failed.length > 0 && (
          <p className="mt-2 text-label text-muted">{t('add.someFailed')}</p>
        )}

        {active && !searching && shown.groups.length === 0 && (
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

        <form onSubmit={addManual} className="mt-8">
          <SectionTitle className="mb-2">{t('add.manualTitle')}</SectionTitle>

          <Field label={t('add.manualTitleLabel')}>
            {(id) => (
              <Input
                id={id}
                value={manualTitle}
                placeholder={t('add.manualTitlePlaceholder')}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            )}
          </Field>

          <fieldset className="mt-3">
            <legend className="mb-2 text-label font-semibold uppercase tracking-wide text-muted">
              {t('add.manualMediaLabel')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((type) => (
                <Chip
                  key={type}
                  selected={manualMedia === type}
                  onClick={() => setManualMedia(type)}
                >
                  {t(mediaLabelKey(type))}
                </Chip>
              ))}
            </div>
          </fieldset>

          <Button
            type="submit"
            fullWidth
            disabled={!manualTitle.trim()}
            className="mt-4"
          >
            {t('add.manualSubmit')}
          </Button>
        </form>
      </ScreenBody>
    </Screen>
  )
}
