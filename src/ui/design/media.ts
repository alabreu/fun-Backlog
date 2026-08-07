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
