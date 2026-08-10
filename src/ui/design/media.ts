import type { MediaType } from '@core/items/types'

/**
 * A cor de cada mídia, como classe. Serve para ESCANEAR: nas linhas das
 * estantes, nos chips de filtro e nos cabeçalhos de grupo da busca, a cor chega
 * antes da leitura — o que é literalmente mais rápido que ler, porque cor é
 * pré-atentiva e texto não.
 *
 * Duas regras que não podem ser quebradas por quem usar isto:
 *
 * 1. A COR NUNCA VAI SOZINHA. O rótulo ("Jogos", "Filmes") acompanha sempre.
 *    É a WCAG 1.4.1, e é o que faz o recurso não excluir quem não distingue
 *    turquesa de azul — para essa pessoa, a tela continua exatamente como era.
 * 2. NADA DISSO ENCOSTA NAS CAPAS. A arte da capa já é o código visual do
 *    grid; cinco cores de marca ao redor dela poluem em vez de organizar.
 *
 * Mapas explícitos, e não `bg-media-${type}`: o Tailwind lê o código como
 * texto e não gera classe que ele não viu escrita por inteiro.
 *
 * Isto é conhecimento DO PRODUTO dentro de `design/`, e é intencional — o
 * CLAUDE.md manda variantes específicas do Fun Backlog (grid de capas, badge de
 * status) morarem aqui, com token semântico próprio.
 */
export const MEDIA_TEXT: Record<MediaType, string> = {
  game: 'text-media-game',
  movie: 'text-media-movie',
  series: 'text-media-series',
  anime: 'text-media-anime',
  book: 'text-media-book',
}

export const MEDIA_BG: Record<MediaType, string> = {
  game: 'bg-media-game',
  movie: 'bg-media-movie',
  series: 'bg-media-series',
  anime: 'bg-media-anime',
  book: 'bg-media-book',
}

/**
 * Versões suaves, e existem para UM caso: o fallback da capa, quando a obra não
 * tem arte nenhuma.
 *
 * Isso não contradiz a regra de não encostar nas capas — contorna o motivo
 * dela. A regra existe porque cor de marca compete com a arte; onde não há
 * arte, não há competição, só um retângulo cinza com uma letra. Assim que a
 * imagem carrega, o tint fica atrás dela e some.
 *
 * A opacidade é o que separa "a estante é colorida" de "a estante é um
 * arco-íris": doze capas em cor cheia gritariam mais que qualquer pôster.
 */
export const MEDIA_TINT: Record<MediaType, string> = {
  game: 'bg-media-game/15',
  movie: 'bg-media-movie/15',
  series: 'bg-media-series/15',
  anime: 'bg-media-anime/15',
  book: 'bg-media-book/15',
}

/**
 * O começo do degradê do topo da estante — a "atmosfera" da tela.
 *
 * Segundo caso em que a cor aparece sem rótulo colado, e vale pelo mesmo
 * raciocínio do tint: aqui ela não INFORMA nada que o título "Jogos" logo em
 * cima já não diga. É ambiente. Quem não distingue as cores lê o título e não
 * perde absolutamente nada — que é o teste que a regra 1 exige.
 *
 * 12% é o teto do "sutil": medido na tela, 18% já competia com as capas da
 * primeira fileira — que é justamente o que o degradê deveria emoldurar.
 */
export const MEDIA_GRADIENT: Record<MediaType, string> = {
  game: 'from-media-game/12',
  movie: 'from-media-movie/12',
  series: 'from-media-series/12',
  anime: 'from-media-anime/12',
  book: 'from-media-book/12',
}

/**
 * A LUZ no rodapé da capa — um degradê da cor da mídia subindo do fundo.
 *
 * Segunda exceção deliberada à regra 2 do topo deste arquivo ("nada disso
 * encosta nas capas"), e vale a pena registrar por quê: o que a regra proíbe é
 * cor de marca COMPETINDO com a arte. Aqui ela não compete — ela ilumina. Fica
 * no terço de baixo, onde o pôster costuma ter o logotipo sobre fundo escuro, e
 * some antes de chegar na imagem principal.
 *
 * É `to-t` (de baixo para cima) e não uma borda: borda emoldura, luz banha. A
 * diferença importa porque a informação aqui é SUGESTÃO — "isto é um anime" —,
 * não um rótulo. Quem precisa do rótulo tem o nome escrito (ver a legenda para
 * leitor de tela no cartão do carrossel).
 *
 * A OPACIDADE É UMA POR COR, e não uma só para as cinco. Com 30% para todas, o
 * âmbar quase sumia sobre pôster de tom quente — mesmo matiz, luminosidade
 * parecida — enquanto o magenta já gritava. Os valores abaixo saíram de medir,
 * em ΔE (CIELAB), quanto cada cor MUDA o pixel sobre cinco fundos
 * representativos (escuro, médio, claro, quente, frio), e ajustar o alfa até o
 * PIOR fundo de cada uma chegar perto de ΔE 18 — o limiar de "dá para notar
 * sem procurar".
 *
 *   cor       alfa   pior fundo   melhor fundo
 *   índigo     28%       17.9         27.0
 *   ciano      29%       17.9         28.3
 *   magenta    20%       18.3         22.2   (era a que mais pintava)
 *   âmbar      34%       15.1         39.7   (era a que sumia)
 *   verde      29%       17.8         37.3
 *
 * O âmbar tem teto: acima de 34% ele passa de 40 de ΔE sobre pôster escuro, e
 * aí deixa de iluminar e vira tinta. É o preço de uma cor clara e quente — ela
 * some no que é claro e quente. Igualar perfeitamente exigiria mudar o matiz,
 * o que quebraria a associação com a cor da mídia.
 *
 * AO MEXER EM QUALQUER COR DA PALETA, refaça a conta: estes números são
 * derivados dela, não escolhidos no olho.
 */
export const MEDIA_GLOW: Record<MediaType, string> = {
  game: 'from-media-game/28',
  movie: 'from-media-movie/29',
  series: 'from-media-series/20',
  anime: 'from-media-anime/34',
  book: 'from-media-book/29',
}

/**
 * O CONTORNO que amarra as obras de uma coleção aberta.
 *
 * TERCEIRA exceção deliberada à regra 2 do topo ("nada disso encosta nas
 * capas"), e a que mais precisa de justificativa, porque é literalmente uma
 * borda em volta da arte — o que a regra descreve ao proibir.
 *
 * O que a salva é ser TEMPORÁRIA e RARA. A regra existe porque cinco cores de
 * marca em volta de doze capas viram poluição permanente; este contorno só
 * aparece enquanto uma pilha está aberta, em quatro ou cinco capas, e some no
 * toque seguinte. Ele não decora a arte: ele responde "quais destas são as da
 * coleção que eu acabei de abrir", que é uma pergunta que a arte não responde e
 * a posição no grid também não — as obras da pilha ficam lado a lado com as
 * soltas da mesma seção.
 *
 * E ele não carrega informação sozinho (WCAG 1.4.1): o nome de cada obra está
 * escrito embaixo dela, e quem usa leitor de tela tem a pilha anunciando quantas
 * obras são. Para quem não distingue as cores, sobra a mesma tela de sempre mais
 * um contorno neutro — nada é perdido.
 */
export const MEDIA_RING: Record<MediaType, string> = {
  game: 'ring-media-game',
  movie: 'ring-media-movie',
  series: 'ring-media-series',
  anime: 'ring-media-anime',
  book: 'ring-media-book',
}

/** A inicial desenhada sobre o tint. */
export const MEDIA_INITIAL: Record<MediaType, string> = {
  game: 'text-media-game/70',
  movie: 'text-media-movie/70',
  series: 'text-media-series/70',
  anime: 'text-media-anime/70',
  book: 'text-media-book/70',
}

/**
 * A cor de cada FAMÍLIA de plataforma, para o texto e o ícone da ficha.
 *
 * Vale a mesma regra 1 do topo do arquivo: o nome está sempre escrito ao lado,
 * então a cor reforça e nunca informa sozinha. E vale uma regra a mais, própria
 * daqui — cor de PLATAFORMA não pode invadir a leitura de cor de MÍDIA. Por
 * isso ela aparece num lugar só, a linha "Plataformas" da ficha, e nunca numa
 * capa, linha de estante ou chip de filtro.
 *
 * Apple e "Outras" ficam em `muted` de propósito: a maçã é monocromática por
 * natureza e "Outras" não é marca nenhuma — inventar cor para elas seria dar
 * significado a um agrupamento que não tem.
 */
export const PLATFORM_TEXT: Record<string, string> = {
  playstation: 'text-platform-playstation',
  xbox: 'text-platform-xbox',
  nintendo: 'text-platform-nintendo',
  pc: 'text-platform-pc',
  linux: 'text-platform-linux',
  android: 'text-platform-android',
  apple: 'text-muted',
  other: 'text-muted',
}

/**
 * Os sete tons de gênero, na ordem dos tokens. Índice e não nome de propósito:
 * quem escolhe é o hash em `core/media/genres.ts`, e a tela só pinta.
 */
export const GENRE_TEXT: string[] = [
  'text-genre-1',
  'text-genre-2',
  'text-genre-3',
  'text-genre-4',
  'text-genre-5',
  'text-genre-6',
  'text-genre-7',
]

