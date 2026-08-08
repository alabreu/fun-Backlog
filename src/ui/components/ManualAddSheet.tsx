import { useState } from 'react'
import { mediaLabelKey } from '@core/items/status'
import type { MediaType } from '@core/items/types'
import { Button, Chip, Field, Input, Sheet } from '@ui/design'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Adicionar à mão, para o que as fontes não têm.
 *
 * Vive num sheet e não solto na tela de busca porque é a saída de EXCEÇÃO: o
 * caminho normal é tocar num resultado. Antes este formulário ficava aberto
 * embaixo do campo de busca, competindo com os resultados e sugerindo que
 * digitar tudo à mão fosse o fluxo esperado.
 *
 * `mediaType` chega da tela: se a pessoa estava filtrando por Livros quando
 * não achou, o sheet já abre em Livros.
 */
export function ManualAddSheet({
  open,
  onClose,
  initialTitle,
  initialMedia,
}: {
  open: boolean
  onClose: () => void
  /** O que a pessoa digitou na busca — quase sempre é o título que ela quer. */
  initialTitle: string
  initialMedia?: MediaType
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={open} onClose={onClose} label={t('add.manualTitle')}>
      {/* `key` remonta o formulário a cada abertura, então ele nasce com o
          título que está na busca AGORA, e não com o de duas buscas atrás. */}
      {open && (
        <ManualForm
          key={`${initialTitle}:${initialMedia ?? ''}`}
          initialTitle={initialTitle}
          initialMedia={initialMedia}
          onClose={onClose}
        />
      )}
    </Sheet>
  )
}

function ManualForm({
  initialTitle,
  initialMedia,
  onClose,
}: {
  initialTitle: string
  initialMedia?: MediaType
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { add, enabled } = useItems()

  const [title, setTitle] = useState(initialTitle)
  // O padrão é a PRIMEIRA categoria ligada, não 'game' fixo: quem desligou
  // jogos abriria o painel com uma opção que nem está na lista.
  const [media, setMedia] = useState<MediaType>(initialMedia ?? enabled[0])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || busy) return

    setBusy(true)
    setFailed(false)
    try {
      await add({ mediaType: media, title: clean, externalIds: {} })
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-title font-bold">{t('add.manualTitle')}</h2>

      <Field label={t('add.manualTitleLabel')}>
        {(id) => (
          <Input
            id={id}
            value={title}
            placeholder={t('add.manualTitlePlaceholder')}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>

      <fieldset>
        <legend className="mb-2 text-label font-semibold uppercase tracking-wide text-muted">
          {t('add.manualMediaLabel')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {enabled.map((type) => (
            <Chip
              key={type}
              media={type}
              selected={media === type}
              onClick={() => setMedia(type)}
            >
              {t(mediaLabelKey(type))}
            </Chip>
          ))}
        </div>
      </fieldset>

      {failed && (
        <p role="alert" className="text-body text-danger">
          {t('add.addFailed')}
        </p>
      )}

      <Button type="submit" fullWidth disabled={!title.trim() || busy}>
        {t('add.manualSubmit')}
      </Button>
    </form>
  )
}
