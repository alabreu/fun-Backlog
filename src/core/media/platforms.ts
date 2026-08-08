/**
 * Agrupa plataformas em FAMÍLIAS.
 *
 * A IGDB devolve modelo por modelo: "Series X|S, PC, iOS, PS5, Mac" — e num
 * jogo antigo isso vira uma lista de dez, com PS3, PS4, PS5, X360, XONE e
 * Series X|S ocupando seis linhas para dizer três coisas. Ninguém lê "em que
 * modelo exato roda"; lê "roda no que eu tenho".
 *
 * Por isso o agrupamento é o ganho principal, e o ícone vem depois: mesmo sem
 * ícone nenhum, quatro famílias são mais rápidas de ler que dez modelos.
 *
 * A ORDEM DE SAÍDA É FIXA (a de `FAMILY_ORDER`) e não a que a fonte mandou:
 * a posição de cada família na linha não deve dançar de jogo para jogo, senão
 * a memória muscular não se forma e a pessoa lê tudo de novo toda vez.
 *
 * Função pura de string[] para string[]: testável sem DOM e sem rede.
 */
export const PLATFORM_FAMILIES = [
  'playstation',
  'xbox',
  'nintendo',
  'pc',
  'apple',
  'linux',
  'android',
  'other',
] as const

export type PlatformFamily = (typeof PLATFORM_FAMILIES)[number]

/** Nome exibido. NÃO passa pela tabela de i18n: são nomes próprios, iguais em
 *  todo idioma — "PlayStation" não vira "EstaçãoDeJogo" em português. */
export const FAMILY_LABEL: Record<PlatformFamily, string> = {
  playstation: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  pc: 'PC',
  apple: 'Apple',
  linux: 'Linux',
  android: 'Android',
  other: 'Outras',
}

/**
 * Casamento por padrão e não por lista fechada de modelos: a IGDB acrescenta
 * console novo sem avisar, e uma lista fechada faria o PS6 cair em "Outras" no
 * dia do lançamento. `test` roda sobre o texto já normalizado (minúsculo, sem
 * espaço nem pontuação), então "Series X|S" e "seriesxs" são a mesma coisa.
 */
const MATCHERS: { family: PlatformFamily; test: (s: string) => boolean }[] = [
  {
    family: 'playstation',
    test: (s) => s.startsWith('ps') || s.includes('playstation'),
  },
  {
    family: 'xbox',
    // "Series X|S" e "X360" não têm a palavra "xbox" no nome.
    test: (s) =>
      s.includes('xbox') ||
      s.startsWith('xone') ||
      s.startsWith('x360') ||
      s.startsWith('series'),
  },
  {
    family: 'nintendo',
    test: (s) =>
      s.includes('nintendo') ||
      s.includes('switch') ||
      s.startsWith('nsw') ||
      s.startsWith('wii') ||
      s.startsWith('3ds') ||
      s.startsWith('nds') ||
      s.startsWith('n64') ||
      s === 'nes' ||
      s === 'snes' ||
      s === 'gb' ||
      s === 'gba' ||
      s === 'gbc' ||
      s === 'gc',
  },
  { family: 'apple', test: (s) => s === 'mac' || s.startsWith('ios') || s === 'ipad' },
  { family: 'android', test: (s) => s.includes('android') },
  { family: 'linux', test: (s) => s.includes('linux') },
  // O PC vem DEPOIS de Mac e Linux: "PC (Microsoft Windows)" contém "pc", mas
  // um Mac também roda em "PC" no sentido amplo — e aqui o rótulo quer dizer
  // Windows. Ordem é a desambiguação.
  { family: 'pc', test: (s) => s === 'pc' || s.includes('windows') || s === 'dos' },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function familyOf(platform: string): PlatformFamily {
  const clean = normalize(platform)
  if (!clean) return 'other'
  return MATCHERS.find((m) => m.test(clean))?.family ?? 'other'
}

/** As famílias presentes, sem repetição e em ordem fixa. */
export function groupPlatforms(platforms: string[]): PlatformFamily[] {
  const found = new Set(platforms.map(familyOf))
  return PLATFORM_FAMILIES.filter((family) => found.has(family))
}
