import type { Locale } from '@core/i18n'

/**
 * A saudação da home: "Boa noite, Comandante".
 *
 * Duas decisões de produto moram aqui.
 *
 * 1. O VOCATIVO NÃO FLEXIONA EM GÊNERO. A alternativa seria perguntar o gênero
 *    no cadastro — mais uma fricção na entrada, mais um dado sensível guardado
 *    para nada, e uma lista de opções que nunca contempla todo mundo. Trocar
 *    isso por um vocativo mais bonito é um péssimo negócio. As palavras abaixo
 *    servem a qualquer pessoa.
 *
 * 2. AS LISTAS SÃO INDEPENDENTES POR IDIOMA, e não traduções uma da outra.
 *    "Captain" é neutro em inglês; "Capitão" não é em português. Cada idioma
 *    escolhe as palavras que funcionam nele — por isso isto é dado de core e
 *    não uma chave da tabela de i18n (que só guarda string, não lista).
 *
 * Função pura de (data, idioma, apelido): dá para testar sem DOM e sem relógio.
 */
export const VOCATIVES: Record<Locale, string[]> = {
  pt: [
    'Comandante',
    'Protagonista',
    'Lenda',
    'Fera',
    'Craque',
    'Chefe',
    'Maratonista',
    'Viajante',
    'Nômade',
    'Sobrevivente',
    'Player 1',
    'Boss',
  ],
  en: [
    'Captain',
    'Champion',
    'Legend',
    'Protagonist',
    'Wanderer',
    'Survivor',
    'Player One',
    'Boss',
    'Ace',
    'Explorer',
    'Marathoner',
    'Chief',
  ],
}

/**
 * Teto do apelido escolhido à mão. A saudação é uma linha só, ao lado de "Boa
 * noite," — um nome de sessenta caracteres não estoura o layout (ele quebra),
 * mas rouba a tela inteira de quem só queria ver o que está jogando.
 */
export const NICKNAME_MAX = 24

/**
 * Limpa o apelido digitado. Devolve `null` quando não sobra nada — e é esse
 * `null` que significa "volte a rotacionar", tanto no campo vazio quanto no
 * campo com três espaços.
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
 * Sorteio válido por UM dia. Guardar o dia junto do vocativo é o que faz o
 * botão de sortear não virar uma terceira forma de escolher apelido fixo:
 * amanhã o `day` não confere mais e a rotação volta sozinha, sem ninguém
 * precisar limpar nada.
 */
export interface DailyReroll {
  /** `dayNumber` do dia em que o sorteio foi feito. */
  day: number
  vocative: string
}

/**
 * O vocativo do dia. Determinístico a partir da data: estável enquanto a
 * pessoa usa o app hoje, diferente amanhã. Sortear a cada abertura faria
 * parecer defeito em vez de ritual.
 *
 * Precedência: apelido escolhido à mão > sorteio de hoje > rotação. Quem quis
 * ser Capitã ou Xerife decidiu, e o app obedece; quem só não gostou da palavra
 * de hoje sorteia outra sem sair do modo automático.
 */
export function vocativeFor(
  date: Date,
  locale: Locale,
  custom?: string | null,
  reroll?: DailyReroll | null,
): string {
  const chosen = custom?.trim()
  if (chosen) return chosen

  if (reroll?.vocative && reroll.day === dayNumber(date)) return reroll.vocative

  const list = VOCATIVES[locale] ?? VOCATIVES.pt
  // Módulo sobre um contador crescente: percorre a lista inteira antes de
  // repetir, em vez de sortear e às vezes cair no mesmo de ontem.
  return list[((dayNumber(date) % list.length) + list.length) % list.length]
}

/**
 * Sorteia um vocativo diferente do que está na tela — sortear e cair no mesmo
 * faria o botão parecer quebrado. `random` é injetável para o teste poder
 * fixar o resultado.
 */
export function rerollVocative(
  date: Date,
  locale: Locale,
  current: string,
  random: () => number = Math.random,
): DailyReroll {
  const list = VOCATIVES[locale] ?? VOCATIVES.pt
  const options = list.filter((word) => word !== current)
  // Lista de um elemento só (ou o improvável de tudo ser igual): devolve o que
  // há, em vez de sortear em array vazio e retornar undefined.
  const pool = options.length > 0 ? options : list
  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
  return { day: dayNumber(date), vocative: pool[index] }
}
