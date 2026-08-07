import { useState } from 'react'
import { Star, Trash } from '@phosphor-icons/react'
import {
  mediaLabelKey,
  progressLabelKey,
  progressUnitFor,
  statusLabelKey,
} from '@core/items/status'
import { ITEM_STATUSES, type Item } from '@core/items/types'
import {
  Badge,
  Button,
  Chip,
  Cover,
  Field,
  Input,
  Sheet,
  Textarea,
} from '@ui/design'
import { SectionTitle } from '@ui/design'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Detalhe do item, como bottom sheet e não página dedicada: mexer em status ou
 * progresso é uma ação de dois toques a partir da estante, e uma rota inteira
 * (com navegação, voltar e perda de scroll do grid) cobraria caro por isso.
 * Quando o detalhe crescer — elenco, tempo estimado, onde assistir — vale
 * reabrir a decisão.
 */
export function ItemSheet({
  item,
  onClose,
}: {
  item: Item | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      label={item?.title ?? t('common.close')}
    >
      {/* `key` remonta o detalhe ao trocar de item, e é isso que zera as notas
          rascunhadas e a confirmação de remoção. Um effect de reset faria o
          mesmo com um render a mais e um cascading-render que o lint de hooks
          barra — com razão. */}
      {item && <ItemDetail key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  )
}

function ItemDetail({ item, onClose }: { item: Item; onClose: () => void }) {
  const { t, locale } = useTranslation()
  const { update, setStatus, remove } = useItems()

  const [notes, setNotes] = useState(item.notes ?? '')
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  const unit = progressUnitFor(item.mediaType)

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      new Date(iso),
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <Cover src={item.coverUrl} title={item.title} lazy={false} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-bold">{item.title}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge>{t(mediaLabelKey(item.mediaType))}</Badge>
            {item.completedAt && (
              <Badge tone="accent">
                {t('item.completedAt', {
                  date: formatDate(item.completedAt),
                })}
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-label text-muted">
            {t('item.addedAt', { date: formatDate(item.addedAt) })}
          </p>
        </div>
      </div>

      <div>
        <SectionTitle className="mb-2">{t('item.statusLabel')}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {ITEM_STATUSES.map((value) => (
            <Chip
              key={value}
              selected={item.status === value}
              onClick={() => {
                void setStatus(item.id, value)
                // Concluir fecha o sheet: a comemoração assume a tela, e
                // deixar o detalhe aberto atrás dela transforma o momento de
                // recompensa em duas camadas empilhadas.
                if (value === 'done' && item.status !== 'done') onClose()
              }}
            >
              {t(statusLabelKey(value, item.mediaType))}
            </Chip>
          ))}
        </div>
      </div>

      {unit && (
        <Field label={t('item.progressLabel')}>
          {(id) => (
            <div className="flex items-center gap-2">
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={item.progress?.current ?? ''}
                aria-label={t(progressLabelKey(unit))}
                onChange={(e) => {
                  const current = Number(e.target.value)
                  void update(item.id, {
                    progress: Number.isFinite(current)
                      ? { unit, current, total: item.progress?.total }
                      : undefined,
                  })
                }}
                className="w-28"
              />
              <span className="text-body text-muted">
                {item.progress?.total
                  ? t('item.progressOf', { total: item.progress.total })
                  : t(progressLabelKey(unit))}
              </span>
            </div>
          )}
        </Field>
      )}

      <div>
        <SectionTitle className="mb-2">{t('item.ratingLabel')}</SectionTitle>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => {
            const on = (item.rating ?? 0) >= value
            return (
              <button
                key={value}
                type="button"
                aria-label={t('item.ratingValue', { value })}
                aria-pressed={item.rating === value}
                onClick={() =>
                  void update(item.id, {
                    // Tocar na nota atual limpa: é o gesto que as pessoas
                    // já esperam de estrelas, e evita um botão só para isso.
                    rating: item.rating === value ? undefined : value,
                  })
                }
                className="p-1 transition active:scale-90"
              >
                <Star
                  size={26}
                  weight={on ? 'fill' : 'regular'}
                  className={on ? 'text-accent' : 'text-muted'}
                />
              </button>
            )
          })}
        </div>
      </div>

      <Field label={t('item.notesLabel')}>
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            value={notes}
            placeholder={t('item.notesPlaceholder')}
            onChange={(e) => setNotes(e.target.value)}
            // Salva ao sair do campo, não a cada tecla: escrever uma nota
            // longa não deve virar uma escrita por caractere no banco.
            onBlur={() => {
              if (notes !== (item.notes ?? ''))
                void update(item.id, { notes: notes || undefined })
            }}
          />
        )}
      </Field>

      {confirmingRemove ? (
        <div className="flex flex-col gap-2">
          <p className="text-body font-semibold">{t('item.removeConfirm')}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingRemove(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void remove(item.id)
                onClose()
              }}
            >
              {t('common.remove')}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmingRemove(true)}
          className="self-start"
        >
          <Trash size={18} weight="bold" />
          {t('common.remove')}
        </Button>
      )}
    </div>
  )
}
