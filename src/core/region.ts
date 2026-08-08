/**
 * País da pessoa — o "onde eu estou", que é um eixo SEPARADO do idioma.
 *
 * Idioma e país parecem a mesma coisa e não são: quem mora em Portugal e usa o
 * app em português precisa ver os streamings portugueses, não os brasileiros; e
 * um brasileiro que prefere a interface em inglês continua assinando Globoplay.
 * Por isso são duas preferências, na mesma tela mas em listas diferentes.
 *
 * Quem consome isto hoje é o "onde assistir" da TMDB, que devolve um bloco de
 * serviços POR PAÍS na mesma resposta — a escolha aqui decide qual bloco a
 * ficha mostra. "Em cartaz" e link de compra usarão a mesma preferência.
 *
 * "Cérebro" portável: nada de DOM. `Intl` é ECMA-402, não navegador — existe em
 * React Native também, e é ele que evita mantermos 45 nomes de país traduzidos
 * à mão em duas tabelas.
 */
import type { Locale } from './i18n'

/**
 * Países oferecidos. São os mercados que a TMDB cobre com dados de streaming de
 * verdade — a lista dela passa de noventa, mas boa parte devolve bloco vazio, e
 * um país que nunca mostra nada só faz a lista rolar mais.
 *
 * Códigos ISO 3166-1 alfa-2, que é o que a TMDB usa como chave.
 */
export const REGIONS = [
  'AR', 'AT', 'AU', 'BE', 'BR', 'CA', 'CH', 'CL', 'CO', 'CZ',
  'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HK', 'HU',
  'ID', 'IE', 'IL', 'IN', 'IT', 'JP', 'KR', 'LT', 'LV', 'MX',
  'MY', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PL', 'PT', 'RO', 'SE',
  'SG', 'SK', 'TH', 'TR', 'TW', 'US', 'VE', 'ZA',
] as const

export type Region = (typeof REGIONS)[number]

export const DEFAULT_REGION: Region = 'BR'

/**
 * O país que combina com um idioma, quando não há nada melhor.
 *
 * É chute, e chute de última instância: só vale quando o navegador não disse o
 * país (um `en` solto, sem subtag) e não há escolha salva. Errar aqui custa uma
 * lista de streaming do país errado até a pessoa trocar — barato o suficiente
 * para não valer perguntar no primeiro uso.
 */
const REGION_FOR_LOCALE: Record<Locale, Region> = { pt: 'BR', en: 'US' }

export function regionForLocale(locale: Locale): Region {
  return REGION_FOR_LOCALE[locale] ?? DEFAULT_REGION
}

/** Estreita uma string arbitrária (storage, navegador) para um país da lista. */
export function normalizeRegion(
  value: string | null | undefined,
): Region | null {
  if (!value) return null
  const upper = value.trim().toUpperCase()
  return (REGIONS as readonly string[]).includes(upper)
    ? (upper as Region)
    : null
}

/**
 * Tira o país de uma tag de idioma (`pt-BR` → `BR`, `en-US` → `US`).
 *
 * É a melhor pista que existe no boot: o `navigator.language` costuma trazer o
 * país de verdade, e ele vale mais que qualquer mapa idioma→país nosso. Tag sem
 * país (`pt`, `en`) devolve `null` e a decisão passa para `regionForLocale`.
 */
export function regionFromLanguageTag(
  tag: string | null | undefined,
): Region | null {
  if (!tag) return null
  // `pt-BR`, `zh-Hant-TW`: o país é o primeiro pedaço de duas letras depois do
  // idioma. Um pedaço de quatro letras é escrita (`Hant`), não país.
  for (const part of tag.split(/[-_]/).slice(1)) {
    const found = normalizeRegion(part)
    if (found) return found
  }
  return null
}

/**
 * Nome do país no idioma da interface. Cai para o código quando o ambiente não
 * tem `Intl.DisplayNames` — "BR" é feio, mas é melhor que uma linha em branco.
 */
export function regionName(region: Region, locale: Locale): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(region) ?? region
    )
  } catch {
    return region
  }
}

/** A lista em ordem alfabética DO IDIOMA ATUAL — "Alemanha" e "Germany" não
 *  caem no mesmo lugar, e ordenar pelo código deixaria as duas erradas. */
export function sortedRegions(locale: Locale): Region[] {
  const collator = new Intl.Collator(locale)
  return [...REGIONS].sort((a, b) =>
    collator.compare(regionName(a, locale), regionName(b, locale)),
  )
}
