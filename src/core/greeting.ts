import type { Locale } from '@core/i18n'

/**
 * O vocativo da home — "Onde paramos, Capitã?".
 *
 * ELE É SÓ O QUE A PESSOA ESCREVEU. Sem nada escrito, não há vocativo: a home
 * mostra "Onde paramos?" e ponto.
 *
 * Houve uma versão com lista de sugestões neutras, rotação diária e um botão de
 * sortear. Saiu por decisão do usuário (08/08/2026): o app inventava um apelido
 * para quem nunca pediu um, e apelido dado por software é a piada que fica sem
 * graça no terceiro dia. Escrever o próprio é uma escolha; receber um não é.
 * O código está no git para quem quiser reler.
 *
 * Funções puras: dá para testar sem DOM e sem relógio.
 */

/**
 * Teto do apelido. A frase é uma linha só — um nome de sessenta caracteres não
 * estoura o layout (ele quebra), mas rouba a tela inteira de quem só queria ver
 * o que está jogando.
 */
export const NICKNAME_MAX = 24

/**
 * Limpa o apelido digitado. Devolve `null` quando não sobra nada — e é esse
 * `null` que significa "sem vocativo", tanto no campo vazio quanto no campo
 * com três espaços.
 */
export function sanitizeNickname(value: string | null | undefined): string | null {
  if (!value) return null
  // Quebra de linha e espaço duplo viram um espaço: colar de outro lugar não
  // pode deixar a saudação com um buraco no meio.
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX)
  return clean.length > 0 ? clean : null
}

/**
 * A ABERTURA da home — a frase que abre a tela, com o vocativo dentro.
 *
 * Ela substituiu duas coisas que diziam a mesma coisa duas vezes: uma saudação
 * por horário ("Boa noite,") seguida de um rótulo de seção ("Continue de onde
 * parou"). O rótulo explicava o carrossel que estava logo abaixo dele, visível,
 * com capas — ninguém precisava da legenda.
 *
 * Três conjuntos porque a home tem TRÊS estados, e a frase precisa ser
 * verdadeira em cada um: "Onde paramos?" é ótimo com algo em andamento e é uma
 * mentira numa estante vazia.
 *
 * Como em VOCATIVES, as listas são independentes por idioma e não traduções
 * uma da outra — o que soa natural em português não é o que soa natural em
 * inglês. `{name}` é onde o vocativo entra; a tela pinta essa parte de accent.
 *
 * A ROTAÇÃO ESTÁ DESLIGADA por decisão do usuário (08/08/2026): cada estado
 * tem UMA frase. A mecânica continua de pé — `openingFor` segue sorteando por
 * dia — então voltar a rotacionar é acrescentar frases a estas listas, e nada
 * mais. Os três estados permanecem porque a diferença entre eles não é
 * estilo: "Onde paramos?" numa estante vazia é mentira, e continuaria sendo.
 */
export type OpeningKind =
  /** Há algo em andamento: o carrossel é de continuar. */
  | 'resume'
  /** Nada em andamento, mas há fila: o carrossel é de sugestão. */
  | 'pick'
  /** Estante vazia: não há carrossel nenhum. */
  | 'start'

export const OPENINGS: Record<Locale, Record<OpeningKind, string[]>> = {
  pt: {
    resume: ['Onde paramos, {name}?'],
    pick: ['O que vai ser hoje, {name}?'],
    start: ['Bora começar, {name}?'],
  },
  en: {
    // "Where we left off?" é pedaço de frase em inglês ("...pick up where we
    // left off"), não pergunta. "Where were we?" é a pergunta equivalente — e
    // é curta, que é o que a quebra em duas linhas pede.
    resume: ['Where were we, {name}?'],
    pick: ['What will it be, {name}?'],
    start: ['Shall we start, {name}?'],
  },
}

const NAME_SLOT = '{name}'

/**
 * Tira o vocativo da frase, junto com a pontuação que o introduzia:
 * "Onde paramos, {name}?" vira "Onde paramos?". É o caminho de quem não
 * escreveu apelido nenhum — a maioria.
 *
 * A vírgula tem que ir junto. Sem isso sobraria "Onde paramos,?", que não é
 * uma frase — e é o tipo de erro que só aparece na tela, nunca no teste de quem
 * escreveu a string.
 */
export function stripVocative(phrase: string): string {
  return phrase.replace(/[,;:\s]*\{name\}/, '').trim()
}

/**
 * A abertura do dia, para um estado. Mesma cadência do vocativo — uma por dia,
 * determinística — porque uma frase que troca a cada render parece defeito.
 */
export function openingFor(
  date: Date,
  locale: Locale,
  kind: OpeningKind,
): string {
  const list = (OPENINGS[locale] ?? OPENINGS.pt)[kind]
  return list[((dayNumber(date) % list.length) + list.length) % list.length]
}

/**
 * Parte a frase no lugar do vocativo, para a tela poder pintar só ele de
 * accent. Devolver duas strings (e não a frase montada) é o que permite isso
 * sem a tela precisar saber onde o `{name}` estava — nem interpolar HTML.
 *
 * `before` vem sem o espaço final porque a tela quebra a linha exatamente
 * aqui ("Onde paramos," / "Sobrevivente?"). Espaço em fim de linha não some
 * sozinho: ele desloca o texto quando a linha é centralizada e conta para a
 * largura quando não é.
 */
export function splitOpening(phrase: string): { before: string; after: string } {
  const at = phrase.indexOf(NAME_SLOT)
  // Frase sem o marcador ainda renderiza inteira, em vez de sumir da tela.
  if (at < 0) return { before: phrase, after: '' }
  return {
    before: phrase.slice(0, at).trimEnd(),
    after: phrase.slice(at + NAME_SLOT.length),
  }
}

/** Dia absoluto desde a época, no fuso local. É a semente de tudo que muda
 *  uma vez por dia — vocativo e sugestões usam a mesma. */
export function dayNumber(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(local.getTime() / 86_400_000)
}

/**
 * O vocativo, ou `null` quando não há. `null` e não string vazia: quem chama
 * precisa DECIDIR entre duas frases diferentes ("Onde paramos, Capitã?" e
 * "Onde paramos?"), e string vazia deixaria a decisão escorregar para um
 * `if (!x)` acidental que renderiza a vírgula solta.
 */
export function vocativeFor(custom?: string | null): string | null {
  return sanitizeNickname(custom)
}
