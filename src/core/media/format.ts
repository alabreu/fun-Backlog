import type { MessageKey } from '@core/i18n'

/**
 * O QUE A OBRA É dentro da franquia — e por que só algumas ganham rótulo.
 *
 * Uma franquia de anime mistura temporada, OVA, filme e especial, e sem essa
 * distinção a lista da coleção é uma pilha de títulos parecidos. Quem pediu foi
 * o usuário (10/08/2026), olhando a própria estante.
 *
 * TEMPORADA NÃO TEM RÓTULO. É o caso comum: marcá-la deixaria a lista inteira
 * marcada e nada saltaria — a ausência de rótulo é que diz "é uma temporada
 * normal". Mesmo raciocínio da capa sem marca no carrossel de franquia, onde o
 * que não tem nada é o que falta na coleção.
 *
 * A lista é FECHADA e o valor vem cru da fonte. Formato desconhecido não vira
 * rótulo: inventar "MUSIC" na tela seria pior que não dizer nada.
 */
const LABELS: Record<string, MessageKey> = {
  OVA: 'format.ova',
  ONA: 'format.ona',
  MOVIE: 'format.movie',
  SPECIAL: 'format.special',
  TV_SHORT: 'format.short',
  MUSIC: 'format.music',
}

export function formatLabelKey(format: string | undefined): MessageKey | undefined {
  return format ? LABELS[format.trim().toUpperCase()] : undefined
}
