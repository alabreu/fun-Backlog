/**
 * TÍTULOS: as regras de texto que decidem quando dois nomes são a mesma coisa.
 *
 * Vive solto no `core/` — e não dentro de `core/media/` ou de `core/items/` —
 * porque os dois lados precisam: a busca agrupa RESULTADOS por franquia, a
 * estante agrupa ITENS. `core/media` já importa de `core/items`, então pôr isto
 * num dos dois fecharia um ciclo entre eles.
 *
 * Nada aqui conhece obra, provider ou estante: entra string, sai string.
 */

/**
 * O título reduzido ao que ele tem de conteúdo: sem caixa, sem acento e sem
 * pontuação. "O Senhor dos Anéis:" e "O senhor dos aneis" viram a mesma coisa,
 * que é o que a pessoa vê na tela.
 */
export function normalizeTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      // Tira o acento (a combinação que o NFD separou) e depois tudo que não
      // for letra ou número.
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  )
}

/**
 * O TÍTULO ANTES DOS DOIS PONTOS. Não é gambiarra — é como a indústria nomeia:
 * "The Legend of Zelda: Breath of the Wild", "Final Fantasy VII: Remake", "O
 * Senhor dos Anéis: A Sociedade do Anel". O prefixo é literalmente o nome da
 * série, escrito pelo próprio editor.
 *
 * Sem separador, devolve o título inteiro — e é isso que faz "The Legend of
 * Zelda" (1986, sem subtítulo) cair no mesmo grupo que os que têm subtítulo.
 *
 * Só os separadores que introduzem SUBTÍTULO. O hífen exige espaço dos dois
 * lados: sem isso, "Spider-Man" viraria a família "Spider". E um prefixo de uma
 * letra só é descartado (volta o título inteiro), senão "A: alguma coisa"
 * viraria a família "A".
 */
export function familyPrefix(title: string): string {
  const prefixo = title.split(/\s*:\s*|\s+[–—-]\s+/)[0]
  return prefixo.length >= 2 ? prefixo : title
}

/**
 * Tira o sufixo de TEMPORADA do fim do título: "Attack on Titan Season 2" e
 * "Dandadan 2nd Season" viram a mesma família do título sem sufixo.
 *
 * Existe por causa do anime, onde a temporada quase nunca é subtítulo depois
 * dos dois pontos — ela é uma palavra colada no fim, e por isso `familyPrefix`
 * sozinho devolvia uma família por temporada.
 *
 * A LISTA É FECHADA E EXPLÍCITA, de propósito. A tentação é cortar qualquer
 * número no fim ("Spider-Man 2", "Final Fantasy VII"), e aí o alcance vira
 * imprevisível: passa a agrupar sequência com original em toda mídia, o que é
 * uma decisão de produto bem maior do que "temporadas do mesmo anime". Só casa
 * o que diz a palavra: `Season`, `Temporada`, `Part`, `Cour`.
 *
 * Por isso também "Dune: Part Two" não é afetado — a palavra vem por extenso,
 * e de qualquer forma o prefixo já resolve aquele caso.
 *
 * Em laço porque "X Season 2 Part 2" existe; o `break` quando nada muda é o que
 * garante que o laço termina mesmo se um padrão casar com string vazia.
 */
const SUFIXO_TEMPORADA =
  /\s+(?:(?:the\s+)?final\s+season|season\s+\d+|\d+(?:st|nd|rd|th)\s+season|(?:part|cour)\s+\d+|temporada\s+\d+|\d+ª?\s+temporada)\s*$/i

export function stripSeasonSuffix(title: string): string {
  let atual = title.trim()
  for (;;) {
    const cortado = atual.replace(SUFIXO_TEMPORADA, '').trim()
    // Cortar TUDO não é cortar: um título que é só "Season 2" continua sendo o
    // nome daquela obra, e devolver string vazia a jogaria num balde com todas
    // as outras sem nome.
    if (cortado === atual || cortado.length === 0) return atual
    atual = cortado
  }
}
