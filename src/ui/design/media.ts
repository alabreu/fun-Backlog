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

/**
 * O traço de 2px na capa do que está EM ANDAMENTO.
 *
 * É a única vez que a cor de mídia encosta numa capa, e vale a exceção porque
 * aqui ela não compete com a arte: fica na borda, por fora do retângulo da
 * imagem, e o que ela diz não é "isto é um jogo" (o grid inteiro já é de jogos)
 * e sim "é NESTE que você está". Numa estante de trinta capas, achar o que está
 * em andamento era ler título por título.
 *
 * 2px e não mais: o traço tem que existir de relance e sumir quando a pessoa
 * está olhando a arte, não emoldurar a capa como um quadro.
 */
export const MEDIA_RING: Record<MediaType, string> = {
  game: 'ring-2 ring-media-game',
  movie: 'ring-2 ring-media-movie',
  series: 'ring-2 ring-media-series',
  anime: 'ring-2 ring-media-anime',
  book: 'ring-2 ring-media-book',
}
