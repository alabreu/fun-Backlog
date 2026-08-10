import { sectionLabelKey, sectionOf } from '@core/items/sections'
import { progressLabelKey, progressUnitFor } from '@core/items/status'
import type { Item } from '@core/items/types'
import { sortByRelease } from '@core/media/collection'
import { formatLabelKey } from '@core/media/format'
import type { MediaDetail } from '@core/media/types'
import { StackSheet, type StackRow } from './StackSheet'
import { useCollectionDetails } from '@ui/hooks/useCollectionDetails'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * A coleção da ESTANTE — obras suas, com estado e progresso.
 *
 * Separado do `StackSheet` porque o painel em si não deve saber de status,
 * progresso nem de fichas de fonte: ele desenha linhas. Quem monta as linhas é
 * este adaptador, e o irmão dele (`SearchStackSheet`) monta as da busca.
 *
 * A FICHA DE CADA OBRA É BUSCADA AO ABRIR (ver `useCollectionDetails`), e é ela
 * que traz as duas coisas que o item não guarda: a data de lançamento (para a
 * ordem) e o formato (para dizer o que é OVA e o que é temporada). Enquanto elas
 * não chegam a lista aparece na ordem que já tinha e sem selo — preferível a
 * segurar a lista inteira esperando a fonte mais lenta.
 */
export function ShelfStackSheet({
  name,
  items,
  open,
  onClose,
  onOpenItem,
}: {
  name: string
  items: Item[]
  open: boolean
  onClose: () => void
  onOpenItem: (item: Item) => void
}) {
  const { t } = useTranslation()
  const { fichas } = useCollectionDetails(items, open)

  // A data da ficha ganha da gravada: ela é mais nova, e numa obra anunciada é
  // justamente a data que muda.
  const ordenadas = sortByRelease(
    items.map((item) => ({
      item,
      ficha: fichas.get(item.id),
      releaseDate: fichas.get(item.id)?.releaseDate ?? item.releasesAt,
      year: fichas.get(item.id)?.year,
    })),
  )

  const rows: StackRow[] = ordenadas.map(({ item, ficha }) => ({
    key: item.id,
    coverUrl: item.coverUrl,
    title: item.title,
    media: item.mediaType,
    line: linhaDeEstado(item, ficha, t),
    badge: rotuloDeFormato(ficha, t),
    mark: item.favorite ? { tone: 'favorite', label: t('item.favorite') } : undefined,
    onOpen: () => onOpenItem(item),
  }))

  return (
    <StackSheet
      name={name}
      rows={rows}
      count={items.length}
      open={open}
      onClose={onClose}
    />
  )
}

type T = ReturnType<typeof useTranslation>['t']

export function rotuloDeFormato(
  ficha: { format?: string } | undefined,
  t: T,
): string | undefined {
  const key = formatLabelKey(ficha?.format)
  return key ? t(key) : undefined
}

/**
 * "Assistindo · Episódio 8/12" — o estado e onde você parou, numa linha.
 *
 * O ESTADO VEM DA SEÇÃO e não do status cru, para a lista concordar com a
 * estante que está atrás: uma obra da fila que ainda não estreou lê "Não
 * lançados" aqui também, em vez de "Na fila" — que seria o painel dizendo uma
 * coisa e o grid dizendo outra sobre o mesmo item.
 *
 * A UNIDADE VEM DA MÍDIA, e não do que está gravado: um jogo antigo tem
 * `unit: 'hour'` guardado de antes de o campo de horas sair (decisão 21), e
 * pedir o rótulo dessa unidade devolvia `undefined` — um buraco no meio da
 * linha. Perguntar à mídia faz o dado órfão simplesmente não desenhar nada.
 */
function linhaDeEstado(item: Item, ficha: MediaDetail | undefined, t: T): string {
  // A ficha recém-chegada pode dizer que a obra não saiu antes de a data ser
  // gravada; usar a data dela aqui mantém painel e grid de acordo.
  const comData = ficha?.releaseDate
    ? { ...item, releasesAt: ficha.releaseDate }
    : item
  const estado = t(sectionLabelKey(sectionOf(comData), item.mediaType))
  const unit = progressUnitFor(item.mediaType)
  const progress = item.progress
  if (!unit || !progress || progress.current <= 0) return estado

  const posicao = `${t(progressLabelKey(unit))} ${progress.current}${
    progress.total ? `/${progress.total}` : ''
  }`
  return `${estado} · ${posicao}`
}
