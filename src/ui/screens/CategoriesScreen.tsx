import { useMediaStore } from '@core/state/mediaStore'
import { enabledMedia, isMediaEnabled } from '@core/media/preferences'
import { mediaLabelKey } from '@core/items/status'
import type { MediaType } from '@core/items/types'
import { MediaDot, Reorderable, Screen, ScreenBody, Toggle } from '@ui/design'
import type { ReorderableItem } from '@ui/design'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useItems } from '@ui/hooks/useItems'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Editar categorias: quais mídias existem para você, e em que ordem.
 *
 * As DUAS COISAS na mesma tela, e na mesma linha, porque são a mesma decisão —
 * "o que eu quero ver, e primeiro o quê". Separar em duas telas obrigaria a
 * pessoa a ir e voltar para responder metade de uma pergunta em cada lugar.
 *
 * A CONTAGEM AO LADO DO NOME é o que torna a decisão informada: desligar anime
 * com doze animes guardados é diferente de desligar anime com zero, e a
 * consequência precisa estar visível ANTES do toque, não virar susto depois.
 * Por isso esta tela lê o catálogo INTEIRO (`allItems`) e não o filtrado — ela
 * é o único lugar do app que precisa enxergar o que está escondido.
 */
export function CategoriesScreen() {
  const { t } = useTranslation()
  const { allItems } = useItems()
  const preferences = useMediaStore((s) => s.preferences)
  const toggle = useMediaStore((s) => s.toggle)
  const move = useMediaStore((s) => s.move)

  const soUmaLigada = enabledMedia(preferences).length <= 1

  function countOf(media: MediaType): number {
    return allItems.filter((i) => i.mediaType === media).length
  }

  const rows: ReorderableItem[] = preferences.order.map((media) => {
    const name = t(mediaLabelKey(media))
    const count = countOf(media)
    const on = isMediaEnabled(preferences, media)
    // A última ligada não pode ser desligada — a trava está no núcleo, e aqui
    // ela vira um controle desabilitado para o toque não parecer quebrado.
    const travada = on && soUmaLigada

    return {
      id: media,
      name,
      content: (
        <>
          {/* Sem `label`: o nome da mídia está escrito ao lado, o ponto aqui é
              só a cor que amarra esta tela ao resto do app. */}
          <MediaDot media={media} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-body font-semibold ${
                on ? 'text-ink' : 'text-muted'
              }`}
            >
              {name}
            </span>
            <span className="block text-label text-muted">
              {count > 0
                ? t('categories.itemCount', { count })
                : t('categories.itemCountEmpty')}
              {/* Desligada com itens dentro: a linha diz onde eles foram parar,
                  em vez de deixar a pessoa achar que sumiram. */}
              {!on && ` · ${t('categories.hidden')}`}
            </span>
          </span>
          <Toggle
            checked={on}
            disabled={travada}
            onChange={() => toggle(media)}
            label={name}
          />
        </>
      ),
    }
  })

  return (
    <Screen>
      <ScreenHeader title={t('categories.title')} />

      <ScreenBody>
        <p className="mb-4 text-body text-muted">{t('categories.intro')}</p>

        <Reorderable
          items={rows}
          onMove={move}
          handleLabel={(name) => t('categories.handle', { name })}
          announce={(name, position, total) =>
            t('categories.moved', { name, position, total })
          }
        />

        <p className="mt-4 text-label text-muted">
          {t('categories.keyboardHint')}
        </p>
        {soUmaLigada && (
          <p className="mt-1 text-label text-muted">
            {t('categories.lastOneHint')}
          </p>
        )}
      </ScreenBody>
    </Screen>
  )
}
