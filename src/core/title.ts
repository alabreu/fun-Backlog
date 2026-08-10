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
 * Reduz o título ao NOME DA SÉRIE, tirando o que só diz "qual desta série".
 *
 * Duas regras, e as duas nasceram de caso real na estante (10/08/2026):
 *
 * 1. CORTA NO PRIMEIRO MARCADOR de temporada, não no fim. A primeira versão
 *    só tirava sufixo, e por isso "Attack on Titan Final Season THE FINAL
 *    CHAPTERS Special 1" escapava inteiro: as palavras estão no MEIO, seguidas
 *    de mais título. Cortando dali para a frente, ele volta a ser "Attack on
 *    Titan" — e "Harry Potter and the Deathly Hallows Part 1" também.
 *
 * 2. TIRA NÚMERO SOLTO NO FIM. "JUJUTSU KAISEN 0" é a mesma série que "JUJUTSU
 *    KAISEN", e "Spider-Man 2" é a mesma que "Spider-Man". Isto é decisão de
 *    produto, não detalhe técnico: vale para TODAS as mídias, então a estante
 *    de jogos passa a empilhar sequência numerada junto do original. Foi
 *    escolhido assim de propósito — agrupar franquia é o pedido, e uma
 *    sequência numerada é o caso mais óbvio de franquia que existe.
 *
 * O que ela NÃO faz, e é o que a mantém previsível: só corta número precedido
 * de ESPAÇO, então "1917" e "Se7en" ficam inteiros; e o marcador de temporada
 * exige a palavra com o número junto (`Season 4`, `Part 2`) ou uma forma
 * específica (`Final Season`), então não dispara por acaso no meio de um nome.
 *
 * "Dune: Part Two" segue intocado — o número vem por extenso, e o prefixo antes
 * dos dois pontos já resolvia aquele caso.
 *
 * Em laço porque as duas regras se alimentam ("X Season 2" → "X", e "X 2" → "X").
 */
const MARCADOR_TEMPORADA =
  /\s+(?:(?:the\s+)?final\s+season|season\s+\d+|\d+(?:st|nd|rd|th)\s+season|(?:part|cour)\s+\d+|temporada\s+\d+|\d+ª?\s+temporada)\b/i

/** Número solto no fim, precedido de espaço. */
const NUMERO_FINAL = /\s+\d+\s*$/

export function stripSequelMarkers(title: string): string {
  let atual = title.trim()
  for (;;) {
    // Fatia, e não `replace`: o corte leva TUDO que vem depois do marcador, e
    // não só o marcador em si.
    const marcador = atual.search(MARCADOR_TEMPORADA)
    const cortado = (marcador >= 0 ? atual.slice(0, marcador) : atual)
      .replace(NUMERO_FINAL, '')
      .trim()
    // Cortar TUDO não é cortar: um título que é só "Season 2" continua sendo o
    // nome daquela obra, e devolver string vazia a jogaria num balde com todas
    // as outras sem nome.
    if (cortado === atual || cortado.length === 0) return atual
    atual = cortado
  }
}
