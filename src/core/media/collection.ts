import { STACK_MIN } from '@core/items/franchise'
import type { Item } from '@core/items/types'
import { groupByFamily } from '@core/title'
import { familyKey, familyName } from './search'
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

/**
 * A PILHA DE FRANQUIA NA BUSCA — as mesmas regras da estante, do outro lado.
 *
 * Chegou depois (10/08/2026) e por um motivo medido em gente: um testador não
 * conseguiu achar uma obra porque a lista de resultados vinha entupida de
 * temporadas da mesma série. Na estante a pilha arruma a prateleira; aqui ela
 * limpa a resposta.
 *
 * A ORDEM DE ENTRADA É PRESERVADA e a pilha nasce na posição do melhor
 * colocado, então o que a fonte considerou mais relevante continua no topo — é
 * o que impede o agrupamento de esconder justamente o que a pessoa digitou. O
 * nome e a capa da pilha são os desse melhor colocado (ver `sortByFranchise`,
 * que já o traz para a frente da família).
 */
export type ResultEntry =
  | { kind: 'result'; key: string; result: MediaSearchResult }
  | { kind: 'stack'; key: string; name: string; results: MediaSearchResult[] }

export function groupResultsByFranchise(
  results: MediaSearchResult[],
  minimo: number = STACK_MIN,
): ResultEntry[] {
  const idDe = (r: MediaSearchResult) => `${r.provider}:${r.externalId}`
  return groupByFamily(results, familyKey, minimo).map((e) =>
    e.kind === 'one'
      ? { kind: 'result', key: idDe(e.item), result: e.item }
      : {
          kind: 'stack',
          key: `stack:${e.key}`,
          name: familyName(e.members[0]),
          results: e.members,
        },
  )
}

/**
 * ORDEM CRESCENTE DE LANÇAMENTO — a ordem de ler uma coleção (escolha do
 * usuário, 10/08/2026).
 *
 * Vale só DENTRO do painel de uma franquia, e é o contrário da lista de
 * resultados, que continua do mais novo para o mais velho. A diferença não é
 * incoerência: na lista a pergunta é "o que saiu de novo?", e dentro da coleção
 * é "por onde eu começo?".
 *
 * Sem data vai para o FIM, e o ano serve de reserva quando a data cheia falta —
 * a maioria dos resultados tem ano e nem toda fonte dá o dia.
 */
export function sortByRelease<T extends { releaseDate?: string; year?: number }>(
  obras: T[],
): T[] {
  const quando = (o: T) =>
    o.releaseDate ? Date.parse(o.releaseDate) : o.year ? Date.UTC(o.year, 0, 1) : NaN
  return [...obras]
    .map((o, i) => ({ o, i, t: quando(o) }))
    .sort((a, b) => {
      const semA = Number.isNaN(a.t)
      const semB = Number.isNaN(b.t)
      if (semA !== semB) return semA ? 1 : -1
      if (semA) return a.i - b.i
      return a.t === b.t ? a.i - b.i : a.t - b.t
    })
    .map((x) => x.o)
}
