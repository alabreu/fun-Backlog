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

/**
 * O PESO VISUAL DE CADA SEÇÃO (escolha do usuário, 10/08/2026).
 *
 * Antes toda seção tinha exatamente a mesma cara, e o único jeito de saber onde
 * você estava era LER o título. Densidades diferentes dizem isso antes da
 * leitura — é o mesmo argumento que trocou os chips por seções e a expansão no
 * grid por painel: a estrutura tem de ser vista, não decifrada.
 *
 * A RÉGUA É O QUE DÁ PARA FAZER AGORA, e não "o que é mais importante" — que é
 * vago e muda de pessoa para pessoa:
 *
 *   carrossel → estou no meio disto
 *   grade     → posso escolher isto hoje  (a fila, e o que ainda vai estrear)
 *   lista     → já resolvi, ou parei      (pausado, concluído, abandonado)
 *
 * O QUE ESTÁ EM CURSO VIROU CARROSSEL (escolha do usuário, 11/08/2026), e não
 * uma grade de duas colunas. A diferença que importa é de ALTURA: em grade,
 * cada duas obras em andamento empurram a fila uma fileira para baixo, e com
 * seis obras a seção seguinte já nascia fora da primeira dobra (medido em
 * 10/08/2026: topo em 1034px numa janela de 844px). Na horizontal a seção tem
 * altura FIXA — cabem duas, seis ou vinte sem custar um pixel a mais de
 * rolagem vertical, e o que passa do fim se alcança arrastando.
 *
 * Isto resolve, de lado, o item "teto para a seção em destaque" que estava no
 * backlog: não há mais teto a definir, porque não há mais crescimento vertical.
 *
 * PAUSADO FICA NA LISTA porque parado é parado: se a obra estivesse viva, ela
 * estaria em "assistindo". "Não lançados" fica na GRADE apesar de não dar para
 * fazer nada com ela — é a estante da expectativa, o único lugar onde a capa
 * faz trabalho emocional, e são uma ou duas obras.
 *
 * O QUE ISTO NÃO É: economia de rolagem. Medido na estante real, a grade de 3
 * colunas custa 69px de altura por item e uma linha compacta custa mais que
 * isso — a lista troca três itens por fileira por um. O que ela compra é peso
 * e informação (na linha cabe o estado, o progresso e a nota; na célula de
 * 111px não cabe nada além da capa e do título). Quem resolve rolagem é o
 * colapso da seção, que já existe.
 */
export type SectionDensity = 'carousel' | 'grid' | 'list'

export function sectionDensity(key: ShelfSectionKey): SectionDensity {
  if (key === 'active') return 'carousel'
  if (key === 'backlog' || key === 'unreleased') return 'grid'
  return 'list'
}
