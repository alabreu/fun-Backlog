import type { MessageKey } from '@core/i18n'
import { releasesInFuture } from '@core/media/release'
import { shelfSections, statusLabelKey } from './status'
import type { Item, ItemStatus, MediaType } from './types'

/**
 * AS SEÇÕES DA ESTANTE — e por que elas não são mais só os status.
 *
 * "Não lançado" é propriedade da OBRA, não da sua relação com ela: a sua
 * relação continua sendo "está na minha fila". Por isso ele NÃO virou um sexto
 * `ItemStatus` — o enum é pequeno e fechado de propósito (ver `types.ts`), e um
 * valor a mais se espalharia por rótulo, cor, peso de ordenação, estados
 * válidos por mídia e o `check` do banco, para descrever algo que o item nem
 * decide.
 *
 * O item continua `backlog`. Quem se divide é a APRESENTAÇÃO: a fila vira duas
 * seções na hora de desenhar, do mesmo jeito que a pilha de franquia é uma
 * leitura da lista e não um dado novo.
 *
 * E a divisão se desfaz sozinha. Como o critério é a data comparada com o
 * relógio, no dia da estreia a obra volta para "Na fila" sem toque, sem
 * requisição e sem escrita no banco.
 */
export type ShelfSectionKey = ItemStatus | 'unreleased'

/** Em que seção este item cai AGORA. */
export function sectionOf(item: Item, now: number = Date.now()): ShelfSectionKey {
  // SÓ A FILA se divide. Uma obra não lançada que alguém marcou como
  // "assistindo" tem um problema maior do que a seção — e mover para cá o que
  // a pessoa disse que está consumindo seria o app contradizendo-a.
  if (item.status !== 'backlog') return item.status
  return releasesInFuture(Date.parse(item.releasesAt ?? ''), now)
    ? 'unreleased'
    : 'backlog'
}

/**
 * A ordem das seções, com "Não lançados" LOGO DEPOIS da fila (escolha do
 * usuário, 10/08/2026) — é de lá que essas obras saíram, e vizinhas elas leem
 * como "a fila, e o que ainda vem".
 */
export function shelfSectionKeys(mediaType: MediaType): ShelfSectionKey[] {
  const base = shelfSections(mediaType)
  const i = base.indexOf('backlog')
  if (i < 0) return [...base]
  return [...base.slice(0, i + 1), 'unreleased', ...base.slice(i + 1)]
}

export function sectionLabelKey(
  key: ShelfSectionKey,
  mediaType: MediaType,
): MessageKey {
  return key === 'unreleased'
    ? 'status.unreleased'
    : statusLabelKey(key, mediaType)
}

/**
 * "Não lançados" SOME quando está vazia, ao contrário das outras.
 *
 * As outras aparecem vazias porque "não tenho nada pausado" é uma resposta
 * sobre a sua estante. Aqui o vazio é o estado NORMAL — quase toda estante não
 * tem nada por vir —, e uma seção permanentemente vazia gastaria duas linhas
 * para dizer "nada", em toda mídia, para sempre.
 */
export function hidesWhenEmpty(key: ShelfSectionKey): boolean {
  return key === 'unreleased'
}
