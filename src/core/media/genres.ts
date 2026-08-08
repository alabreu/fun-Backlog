/**
 * A cor de um gênero.
 *
 * NÃO EXISTEM CORES SUFICIENTES PARA UM CÓDIGO DE VERDADE, e essa é a decisão
 * de partida. A conta:
 *
 *   IGDB          23 gêneros fixos
 *   TMDB          19 (filme) + 16 (série), ~24 distintos
 *   AniList       18 fixos
 *   Open Library  ILIMITADO — usamos `subjects`, um vocabulário aberto com
 *                 milhares de valores ("Nebula Award Winner", "Ecology",
 *                 "Dune (Imaginary place)")
 *
 * São ~65 valores distintos nas três fontes fechadas, mais uma fonte que não
 * tem fim. Ninguém distingue 65 matizes, e nenhum mapa fixo cobre um
 * vocabulário aberto.
 *
 * Então a cor aqui NÃO INFORMA: ela é textura. Sete tons pastel, sorteados por
 * um hash do nome. Duas consequências que precisam ser ditas em voz alta:
 *
 * - É ESTÁVEL. "Shooter" é sempre da mesma cor, em toda obra, em toda sessão,
 *   em qualquer aparelho. Cor que muda a cada abertura pareceria defeito.
 * - COLIDE, e tudo bem. Dois gêneros diferentes podem cair no mesmo tom. Como
 *   a cor não carrega informação nenhuma — o nome está escrito —, colisão não
 *   perde nada. Trocar isso por um mapa fixo de 65 cores seria fingir um
 *   código que ninguém consegue aprender.
 *
 * Função pura de string para índice: testável e igual em todo lugar.
 */
export const GENRE_COLOR_COUNT = 7

/**
 * Hash FNV-1a de 32 bits. Escolhido por ser minúsculo e bem distribuído para
 * strings curtas — o requisito aqui não é criptografia, é que "Adventure" e
 * "Adventures" caiam em baldes diferentes com boa frequência.
 */
export function genreColorIndex(genre: string): number {
  // Normaliza antes: "Sci-Fi", "sci fi" e "SCI-FI" são o mesmo gênero para
  // fontes diferentes, e não podem sair em cores diferentes na mesma tela.
  const key = genre.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!key) return 0

  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    // Multiplicação pelo primo do FNV, em aritmética de 32 bits sem estourar.
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % GENRE_COLOR_COUNT
}

/**
 * As cores de uma LISTA de gêneros, já sem repetição entre vizinhos.
 *
 * O hash sozinho colide com frequência alta: com sete cores e três gêneros, a
 * chance de dois caírem no mesmo tom passa de um terço. E colisão que na teoria
 * "não perde informação" na prática vira "Role-playing (RPG) · Adventure" em
 * dois tons idênticos lado a lado, que lê como defeito — foi o que apareceu na
 * primeira versão, na tela.
 *
 * A saída mantém as duas propriedades que importam: cada gênero PREFERE a sua
 * cor de sempre, e só anda para a próxima livre quando aquela já foi usada
 * nesta lista. Como uma obra mostra poucos gêneros e a paleta tem sete, na
 * maioria das vezes ninguém precisa andar.
 */
export function genreColorIndexes(genres: string[]): number[] {
  const used = new Set<number>()
  return genres.map((genre) => {
    const wanted = genreColorIndex(genre)
    let index = wanted
    // Só anda enquanto houver cor livre — com mais gêneros que cores, os
    // últimos repetem, e aí repetir é o único desfecho possível.
    for (let step = 0; step < GENRE_COLOR_COUNT && used.has(index); step += 1)
      index = (index + 1) % GENRE_COLOR_COUNT
    used.add(index)
    return index
  })
}
