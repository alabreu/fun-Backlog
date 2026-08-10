import { statusLabelKey } from '@core/items/status'
import type { Item } from '@core/items/types'
import { collectionState, sortByRelease } from '@core/media/collection'
import { formatLabelKey } from '@core/media/format'
import type { MediaSearchResult } from '@core/media/types'
import { StackSheet, type StackRow } from './StackSheet'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A coleção da BUSCA — resultados da fonte, e o que deles já é seu.
 *
 * Aqui não há ficha para buscar: o resultado da busca já traz ano, data e
 * formato, então a lista nasce completa e na ordem certa. É o irmão do
 * `ShelfStackSheet`, que precisa ir à rede porque o item guardado não tem
 * nenhuma das duas coisas.
 *
 * A MARCA DA COLEÇÃO vem junto, com o mesmo vocabulário do carrossel de
 * franquia: visto verde para terminado, marcador para o que está na estante,
 * nada para o que falta. Sem ela, uma pilha de seis temporadas não responde a
 * pergunta que leva alguém a abri-la — "quais destas eu já tenho?".
 */
export function SearchStackSheet({
  name,
  results,
  items,
  open,
  onClose,
  onOpenResult,
}: {
  name: string
  results: MediaSearchResult[]
  /** A estante, para saber o que já é seu. */
  items: Item[]
  open: boolean
  onClose: () => void
  onOpenResult: (result: MediaSearchResult) => void
}) {
  const { t } = useTranslation()

  const rows: StackRow[] = sortByRelease(results).map((result) => {
    const estado = collectionState(result, items)
    const formato = formatLabelKey(result.format)
    return {
      key: `${result.provider}:${result.externalId}`,
      coverUrl: result.coverUrl,
      title: result.title,
      media: result.mediaType,
      // O ANO é o que a busca tem para oferecer, e numa coleção ordenada por
      // lançamento ele é justamente o que explica a ordem.
      line: result.year ? String(result.year) : undefined,
      badge: formato ? t(formato) : undefined,
      // Sem marca é o que falta na sua coleção — a ausência é o sinal, como no
      // carrossel de franquia. O rótulo escrito vai junto porque um ícone
      // sozinho não diz nada a leitor de tela, e aqui não há texto ao lado que
      // o repita.
      mark:
        estado === 'missing'
          ? undefined
          : {
              tone: estado,
              label:
                estado === 'done'
                  ? t(statusLabelKey('done', result.mediaType))
                  : t('add.onShelf'),
            },
      onOpen: () => onOpenResult(result),
    }
  })

  return (
    <StackSheet
      name={name}
      rows={rows}
      count={results.length}
      open={open}
      onClose={onClose}
    />
  )
}
