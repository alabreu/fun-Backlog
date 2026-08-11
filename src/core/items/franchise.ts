import {
  familyPrefix,
  groupByFamily,
  normalizeTitle,
  stripSequelMarkers,
} from '@core/title'
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
 * DUAS FONTES, nesta ordem:
 *
 * 1. O CAMPO DA FONTE (`item.franchise`), quando ele existe. É o melhor que
 *    pode haver: alguém catalogou aquilo como pertencente àquela série, e é a
 *    única coisa capaz de juntar obras cujos TÍTULOS não se parecem — "Shingeki
 *    no Kyojin" e "Attack on Titan" são o caso que motivou a coluna.
 * 2. O TÍTULO, como antes: prefixo antes dos dois pontos mais a normalização
 *    de temporada. É o que sobra para série, anime e livro, cujas fontes não
 *    têm o conceito, e para tudo que foi catalogado antes da migração 0008.
 *
 * A MESMA NORMALIZAÇÃO NOS DOIS CAMINHOS, e não é detalhe: durante o backfill a
 * estante tem itens dos dois tipos ao mesmo tempo, e é ela que faz um jogo já
 * preenchido ("The Legend of Zelda") continuar na mesma pilha do vizinho que
 * ainda não foi ("The Legend of Zelda: Ocarina of Time" → mesmo prefixo). Sem
 * isso, a estante se desmontaria e remontaria enquanto a varredura roda.
 */
export function shelfFamilyKey(item: Item): string {
  return normalizeTitle(stripSequelMarkers(familyPrefix(item.franchise ?? item.title)))
}

/**
 * O nome da família como ele aparece na tela — sem normalizar, que é a versão
 * para comparar, não para ler.
 *
 * SAI DA MESMA FONTE DA CHAVE, e tinha que sair: é o campo da fonte que permite
 * uma pilha juntar títulos que não se parecem, e nessa pilha o título do
 * primeiro membro seria um rótulo mentiroso — "Super Mario Odyssey" escrito
 * sobre uma pilha que também tem Mario Kart nomeia um membro, não a família.
 */
export function shelfFamilyName(item: Item): string {
  return item.franchise
    ? stripCollectionWord(item.franchise)
    : stripSequelMarkers(familyPrefix(item.title))
}

/**
 * Tira a palavra "coleção" do nome que a fonte deu.
 *
 * A TMDB batiza as sagas assim — "Coleção Duna", "Duna - Coleção" —, porque
 * lá o nome é o de uma entidade do catálogo. Numa pilha da estante o cabeçalho
 * já É a coleção, e repetir a palavra em cada uma delas é o app narrando a
 * própria estrutura. A IGDB não faz isso, e passa intacta.
 *
 * Só na ponta e só a palavra inteira: "Coleção" no meio de um nome de verdade
 * fica, e um nome que é SÓ essa palavra volta inteiro em vez de virar vazio.
 */
function stripCollectionWord(name: string): string {
  const limpo = name
    .replace(/^\s*(?:cole[çc][ãa]o|collection|saga)\s*[-–—:]?\s*/i, '')
    .replace(/\s*[-–—:]?\s*(?:cole[çc][ãa]o|collection|saga)\s*$/i, '')
    .trim()
  return limpo.length > 0 ? limpo : name.trim()
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
  return groupByFamily(items, shelfFamilyKey, minimo).map((e) =>
    e.kind === 'one'
      ? { kind: 'item', key: e.item.id, item: e.item }
      : {
          kind: 'stack',
          key: `stack:${e.key}`,
          name: shelfFamilyName(e.members[0]),
          items: e.members,
        },
  )
}
