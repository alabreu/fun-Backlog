import { familyPrefix, normalizeTitle, stripSequelMarkers } from '@core/title'
import type { Item } from './types'

/**
 * AGRUPAR FRANQUIA NA ESTANTE — as obras de uma mesma série viram uma pilha.
 *
 * Diferença que importa em relação à tentativa que foi revertida (decisão 18):
 * aqui NADA SE FUNDE. Isto é uma leitura da lista, calculada a cada render a
 * partir do título; o item no banco continua intocado. Se o agrupamento errar,
 * o custo é uma capa no lugar errado — não um catálogo corrompido. Foi essa
 * diferença que permitiu voltar ao assunto.
 *
 * É por não fundir que o FORMATO NÃO IMPORTA aqui. A unificação revertida
 * precisava dele — ela jogava tudo numa régua de progresso só, e um filme
 * entrando como "temporada" quebrava a conta (foi o caso Evangelion). A pilha
 * só desenha junto: cada obra guarda o próprio progresso, a própria nota e a
 * própria ficha. Então OVA, especial e filme da mesma série pertencem à pilha
 * tanto quanto a segunda temporada, e não existe filtro de formato em lugar
 * nenhum deste arquivo — de propósito.
 *
 * E agrupa DENTRO DE UM STATUS, nunca através deles (escolha do usuário,
 * 10/08/2026). Esta função recebe os itens de UMA seção, e é isso que dissolve
 * a tensão da tela: a espinha da estante é o status, uma franquia atravessa
 * status, e uma pilha que atravessasse teria de morar em duas seções ao mesmo
 * tempo. Com Ocarina zerado e Tears of the Kingdom jogando, são duas capas
 * soltas, cada uma na sua seção — que é a verdade.
 */

/**
 * A FAMÍLIA de um item da estante.
 *
 * É o prefixo antes dos dois pontos MAIS a normalização de temporada — e é a
 * segunda parte que separa esta chave da chave da busca (`familyKey` em
 * `core/media/search.ts`). O caso que a motivou é o anime: "Dandadan 2nd
 * Season" não tem dois pontos, então só o prefixo devolvia uma família por
 * temporada, que é exatamente o problema que este agrupamento veio resolver.
 *
 * O item da estante NÃO guarda o campo de franquia da fonte — ele nem existe na
 * tabela. Gravá-lo é o passo seguinte planejado (precisa de migração e de um
 * backfill do que já está catalogado); enquanto isso, o título é o que temos, e
 * ele resolve a maioria.
 */
export function shelfFamilyKey(item: Item): string {
  return normalizeTitle(stripSequelMarkers(familyPrefix(item.title)))
}

/** O nome da família como ele aparece na tela — sem normalizar, que é a versão
 *  para comparar, não para ler. */
export function shelfFamilyName(item: Item): string {
  return stripSequelMarkers(familyPrefix(item.title))
}

/**
 * Quantos itens da mesma família bastam para virar pilha.
 *
 * Dois. É um número, não uma arquitetura: se empilhar de menos ou de mais, este
 * é o dígito para mexer.
 */
export const STACK_MIN = 2

/** Uma célula do grid: ou uma obra sozinha, ou a pilha de uma franquia. */
export type ShelfEntry =
  | { kind: 'item'; key: string; item: Item }
  | { kind: 'stack'; key: string; name: string; items: Item[] }

/**
 * Transforma a lista de uma seção nas células que o grid desenha.
 *
 * A ORDEM DE ENTRADA É PRESERVADA, e é o que faz isto não bagunçar nada: a
 * pilha nasce na posição do seu MELHOR colocado (o primeiro membro que aparece
 * na lista já ordenada), e quem não tem família fica exatamente onde estava.
 * Como `sortForShelf` já põe favorita na frente, uma franquia com favorita
 * dentro mantém a primeira fileira.
 *
 * Dentro da pilha, a ordem também é a que chegou — a mesma da estante.
 */
export function groupByFranchise(
  items: Item[],
  minimo: number = STACK_MIN,
): ShelfEntry[] {
  const familias = new Map<string, Item[]>()
  for (const item of items) {
    const chave = shelfFamilyKey(item)
    const atual = familias.get(chave)
    if (atual) atual.push(item)
    else familias.set(chave, [item])
  }

  const entradas: ShelfEntry[] = []
  const jaSaiu = new Set<string>()

  for (const item of items) {
    const chave = shelfFamilyKey(item)
    const familia = familias.get(chave) as Item[]

    // Título que normaliza para nada (um item chamado "???") não pode virar
    // família com os outros sem nome: cada um fica sozinho.
    if (familia.length < minimo || chave === '') {
      entradas.push({ kind: 'item', key: item.id, item })
      continue
    }

    if (jaSaiu.has(chave)) continue
    jaSaiu.add(chave)
    entradas.push({
      kind: 'stack',
      key: `stack:${chave}`,
      name: shelfFamilyName(familia[0]),
      items: familia,
    })
  }

  return entradas
}
