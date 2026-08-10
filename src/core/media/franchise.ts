import type { SeasonInfo } from '@core/items/seasons'

/**
 * O QUE É A MESMA OBRA E O QUE É OUTRA — a regra, num lugar só.
 *
 * O problema é do anime, e não é da API: o AniList cataloga cada temporada como
 * uma obra separada porque a INDÚSTRIA faz isso. No Japão cada cour é uma
 * produção própria, com contrato, staff e transmissão próprios. A TMDB faz o
 * contrário para série ocidental (uma obra, N temporadas), e é por isso que
 * Breaking Bad chega inteiro e Attack on Titan chega picado em seis.
 *
 * O AniList não tem "id de franquia", mas tem um GRAFO de relações — e é ele
 * que separa o que deve ser fundido do que não deve. Numa busca por "Attack on
 * Titan" voltam, misturados: as temporadas, um OVA, uma paródia chibi e um
 * compilado. Só as temporadas são a mesma obra.
 *
 * SÓ `SEQUEL` E `PREQUEL` FUNDEM, e essa é a decisão inteira. As duas dizem "a
 * mesma história, continuando" — é exatamente o que uma temporada é. Todo o
 * resto descreve uma obra DIFERENTE que por acaso compartilha o universo:
 *
 * - `SIDE_STORY` / `SPIN_OFF` — outra história no mesmo mundo ("Junior High").
 * - `SUMMARY` — recompilado do que você já viu; contá-lo dobraria episódios.
 * - `ALTERNATIVE` — outra versão da MESMA história (remake, corte diferente).
 * - `CHARACTER` — só divide personagem. É o laço mais frouxo que existe ali.
 * - `ADAPTATION` / `PARENT` / `CONTAINS` — atravessam mídia (mangá, light
 *   novel). Um mangá não é temporada de um anime.
 * - `OTHER` — o próprio manual do AniList pede que seja usado quando NÃO se
 *   sabe. Fundir pelo desconhecido é a definição de chute.
 *
 * AVISO QUE VALE ESTAR ESCRITO: este grafo é editado por usuários. Ele vai
 * errar em alguma franquia — não é hipótese, é estatística. Por isso a fusão do
 * que já está na estante pergunta antes, e por isso o carrossel veio primeiro:
 * lá um erro é uma capa estranha numa lista, aqui seria o seu progresso.
 */
export type FranchiseRelation =
  | 'PREQUEL'
  | 'SEQUEL'
  | 'PARENT'
  | 'CONTAINS'
  | 'SIDE_STORY'
  | 'SPIN_OFF'
  | 'SUMMARY'
  | 'ALTERNATIVE'
  | 'CHARACTER'
  | 'ADAPTATION'
  | 'OTHER'
  | (string & {})

/** As duas que continuam a mesma história. Ver o comentário acima. */
export function isSameWork(relation: string): boolean {
  return relation === 'SEQUEL' || relation === 'PREQUEL'
}

/**
 * Uma entrada da fonte, reduzida ao que a fusão precisa saber.
 *
 * Genérica de propósito: quem chama é o provider do AniList hoje, mas nada aqui
 * fala GraphQL. Uma fonte nova que também parta temporadas cai neste mesmo
 * formato.
 */
export interface FranchiseEntry {
  id: string
  title: string
  /** Episódios da entrada. Ausente = ainda não anunciado. */
  episodes?: number
  /** Para ordenar a cadeia. Ausente vai para o fim. */
  year?: number
  /** Ids das entradas ligadas a esta por `SEQUEL`/`PREQUEL`. */
  sameWorkIds: string[]
}

/**
 * AGRUPA as entradas que são a mesma obra.
 *
 * Union-find sobre o conjunto RECEBIDO, e não uma travessia do grafo inteiro: a
 * busca devolve as temporadas juntas (é a mesma consulta), então as arestas
 * entre elas bastam para colapsá-las num grupo. Sair caminhando o grafo pediria
 * uma requisição por elo, e numa lista de doze resultados isso é uma tempestade
 * de rede para desenhar uma tela.
 *
 * O preço é honesto e é este: uma temporada que NÃO voltou na mesma página não
 * entra no grupo, e a soma de episódios fica curta. Quem conserta é a ficha,
 * que caminha a cadeia de verdade ao abrir a obra.
 *
 * Devolve os grupos na ordem em que a fonte os entregou — a fonte ordenou por
 * relevância, e reordenar aqui jogaria fora esse trabalho.
 */
export function groupSameWork<T extends FranchiseEntry>(entries: T[]): T[][] {
  const porId = new Map<string, T>()
  for (const entry of entries) porId.set(entry.id, entry)

  const pai = new Map<string, string>()
  const raiz = (id: string): string => {
    let atual = id
    while (pai.get(atual) !== undefined && pai.get(atual) !== atual)
      atual = pai.get(atual)!
    return atual
  }
  const unir = (a: string, b: string) => {
    const [ra, rb] = [raiz(a), raiz(b)]
    if (ra !== rb) pai.set(rb, ra)
  }

  for (const entry of entries) {
    if (!pai.has(entry.id)) pai.set(entry.id, entry.id)
    for (const outro of entry.sameWorkIds) {
      // SÓ liga o que está no conjunto. Uma temporada que não voltou na busca
      // não pode virar raiz de um grupo — ela não tem título nem capa aqui, e
      // o grupo apareceria na tela sem nada para mostrar.
      if (!porId.has(outro)) continue
      if (!pai.has(outro)) pai.set(outro, outro)
      unir(entry.id, outro)
    }
  }

  const grupos = new Map<string, T[]>()
  for (const entry of entries) {
    const chave = raiz(entry.id)
    const grupo = grupos.get(chave)
    if (grupo) grupo.push(entry)
    else grupos.set(chave, [entry])
  }
  return [...grupos.values()]
}

/**
 * ORDENA uma cadeia em ordem de exibição: a mais antiga primeiro.
 *
 * Por ano, e não pelas arestas. Seguir `PREQUEL` até o começo seria mais
 * "correto" e é mais frágil: basta uma aresta faltando — e faltam, o grafo é
 * editado à mão — para a cadeia partir em duas. O ano vem preenchido em toda
 * entrada que já foi ao ar, nunca parte, e concorda com as arestas em todos os
 * casos em que as duas coisas existem.
 *
 * Empate desempata pelo id, que no AniList cresce com a data de cadastro. É
 * arbitrário, mas é ESTÁVEL — e ordem instável faria a mesma franquia mudar de
 * cara entre duas aberturas.
 */
export function orderChain<T extends FranchiseEntry>(chain: T[]): T[] {
  return [...chain].sort((a, b) => {
    const ay = a.year ?? Infinity
    const by = b.year ?? Infinity
    if (ay !== by) return ay - by
    return Number(a.id) - Number(b.id)
  })
}

/**
 * A cadeia vira a MESMA estrutura de temporadas que a TMDB já entrega.
 *
 * É o ponto do módulo inteiro: convertido aqui, o slider de temporadas, o
 * "T3 E12" e a régua contínua funcionam sem uma linha de mudança na tela. O
 * app não fica sabendo que anime é diferente — que é o que a interface
 * `MediaProvider` promete.
 *
 * Entrada sem episódios (temporada anunciada e não exibida) fica DE FORA: ela
 * não acrescenta régua para percorrer, e entraria como uma temporada de zero
 * episódios, ou seja, um marco em cima do anterior.
 */
export function chainToSeasons(chain: FranchiseEntry[]): SeasonInfo[] {
  return orderChain(chain)
    .filter((entry) => (entry.episodes ?? 0) > 0)
    .map((entry, index) => ({
      number: index + 1,
      episodes: entry.episodes as number,
    }))
}

/** A entrada que representa a obra: a primeira da cadeia. É o id que o item
 *  guarda, e é o título e a capa que a estante mostra. */
export function chainHead<T extends FranchiseEntry>(chain: T[]): T | undefined {
  return orderChain(chain)[0]
}

/** Soma dos episódios conhecidos da cadeia. `undefined` quando nenhum é
 *  conhecido — zero significaria "não tem episódio", que é outra coisa. */
export function chainTotal(chain: FranchiseEntry[]): number | undefined {
  const total = chain.reduce((soma, entry) => soma + (entry.episodes ?? 0), 0)
  return total > 0 ? total : undefined
}
