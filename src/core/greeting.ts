import type { Locale, MessageKey } from '@core/i18n'

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

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

const PERIOD_KEYS: Record<GreetingPeriod, MessageKey> = {
  morning: 'home.greeting.morning',
  afternoon: 'home.greeting.afternoon',
  evening: 'home.greeting.evening',
  night: 'home.greeting.night',
}

/**
 * Quatro faixas, mesmo que o português use "boa noite" em duas delas: o inglês
 * distingue evening de night, e achatar aqui tiraria essa nuance de lá para
 * sempre. Cada idioma resolve isso na sua tabela de mensagens.
 */
export function periodFor(date: Date): GreetingPeriod {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

export function greetingKey(date: Date): MessageKey {
  return PERIOD_KEYS[periodFor(date)]
}

/** Dia absoluto desde a época, no fuso local. É a semente de tudo que muda
 *  uma vez por dia — vocativo e sugestões usam a mesma. */
export function dayNumber(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(local.getTime() / 86_400_000)
}

/**
 * O vocativo do dia. Determinístico a partir da data: estável enquanto a
 * pessoa usa o app hoje, diferente amanhã. Sortear a cada abertura faria
 * parecer defeito em vez de ritual.
 *
 * Um apelido escolhido nas configurações ganha de tudo — quem quis ser Capitã
 * ou Xerife decidiu, e o app obedece.
 */
export function vocativeFor(
  date: Date,
  locale: Locale,
  custom?: string | null,
): string {
  const chosen = custom?.trim()
  if (chosen) return chosen

  const list = VOCATIVES[locale] ?? VOCATIVES.pt
  // Módulo sobre um contador crescente: percorre a lista inteira antes de
  // repetir, em vez de sortear e às vezes cair no mesmo de ontem.
  return list[((dayNumber(date) % list.length) + list.length) % list.length]
}
