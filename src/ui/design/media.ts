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
