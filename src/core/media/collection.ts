import type { Item } from '@core/items/types'
import type { MediaSearchResult } from './types'

/**
 * O ESTADO DE UMA OBRA DENTRO DA SUA COLEÇÃO — o que o carrossel "da mesma
 * franquia" precisa saber para dizer, de relance, o que está faltando.
 *
 * Vive em `core/media` e não em `core/items` por causa da direção das
 * dependências: `core/media` já importa o tipo do item, e o contrário fecharia
 * um ciclo entre as duas pastas.
 *
 * Três estados, e a fronteira que importa é a primeira: `missing` é a resposta à
 * pergunta que a pessoa faz ao abrir a seção ("o que falta na minha coleção?").
 * Os outros dois existem para NÃO responder essa pergunta errado — sem separar
 * "terminei" de "está na estante", uma franquia inteira já catalogada e só pela
 * metade pareceria completa.
 */
export type CollectionState = 'done' | 'shelved' | 'missing'

/**
 * Casa pelo par provider+id, que é o mesmo critério do resto do app.
 *
 * NÃO casa por título de propósito: dois provedores grafam o mesmo nome de
 * jeitos diferentes, e um falso positivo aqui esconderia da lista justamente
 * uma obra que a pessoa não tem — que é o oposto do que a seção existe para
 * fazer. Errar para "está faltando" é recuperável (a pessoa abre e vê); errar
 * para "você já tem" é invisível.
 */
export function collectionState(
  result: MediaSearchResult,
  items: Item[],
): CollectionState {
  const meu = items.find(
    (i) => i.externalIds[result.provider] === result.externalId,
  )
  if (!meu) return 'missing'
  // ABANDONADO NÃO É TERMINADO. Os dois saem da fila, mas a pergunta aqui é
  // sobre a coleção, e uma obra largada no meio continua sendo algo que você
  // pode querer retomar — marcá-la como concluída esconderia isso.
  return meu.status === 'done' ? 'done' : 'shelved'
}

/**
 * Ordena o carrossel com O QUE FALTA NA FRENTE (escolha do usuário,
 * 10/08/2026).
 *
 * A ordem da fonte é de lançamento, e ela tem valor — é o que deixa entender a
 * sequência da série. Trocá-la é uma troca consciente: a seção passa a responder
 * "o que falta" antes de "como a série é", porque a primeira é a pergunta que
 * faz alguém rolar até o fim da ficha.
 *
 * DENTRO DE CADA GRUPO A ORDEM DA FONTE É PRESERVADA (ordenação estável), então
 * a cronologia sobrevive onde ela ainda cabe: as faltantes ficam em ordem de
 * lançamento entre si, e as suas também.
 */
const PESO: Record<CollectionState, number> = {
  missing: 0,
  shelved: 1,
  done: 2,
}

export function sortByCollection(
  related: MediaSearchResult[],
  items: Item[],
): MediaSearchResult[] {
  return related
    .map((r, i) => ({ r, i, peso: PESO[collectionState(r, items)] }))
    .sort((a, b) => (a.peso === b.peso ? a.i - b.i : a.peso - b.peso))
    .map((x) => x.r)
}
