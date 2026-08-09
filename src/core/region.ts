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
 * O país deduzido do FUSO HORÁRIO (`America/Sao_Paulo` → BR).
 *
 * É a melhor pista de "onde a pessoa mora" que existe sem pedir permissão de
 * localização: o relógio do aparelho segue o lugar, não a língua. O caso que
 * motivou isto é real — um iPhone configurado em inglês declara `en-GB` no
 * `navigator.language`, e o app deduzia Reino Unido para alguém morando no
 * Brasil. O fuso não comete esse erro: idioma diz o que a pessoa FALA, fuso
 * diz onde ela ESTÁ.
 *
 * A tabela cobre os fusos dos países que oferecemos; fuso desconhecido devolve
 * `null` e a decisão desce para a pista seguinte. País com um fuso só entra
 * direto; os grandes (Brasil, EUA, Canadá…) listam os principais e os
 * compostos (`America/Argentina/Cordoba`) casam por prefixo.
 */
const TZ_EXACT: Record<string, Region> = {
  // Uma entrada por fuso — países de fuso único primeiro.
  'Europe/Vienna': 'AT', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
  'America/Bogota': 'CO', 'Europe/Prague': 'CZ', 'Europe/Copenhagen': 'DK',
  'Europe/Tallinn': 'EE', 'Europe/Helsinki': 'FI', 'Europe/Paris': 'FR',
  'Europe/London': 'GB', 'Europe/Athens': 'GR', 'Asia/Hong_Kong': 'HK',
  'Europe/Budapest': 'HU', 'Europe/Dublin': 'IE', 'Asia/Jerusalem': 'IL',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/Rome': 'IT',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Europe/Vilnius': 'LT',
  'Europe/Riga': 'LV', 'Europe/Amsterdam': 'NL', 'Europe/Oslo': 'NO',
  'America/Lima': 'PE', 'Asia/Manila': 'PH', 'Europe/Warsaw': 'PL',
  'Europe/Bucharest': 'RO', 'Europe/Stockholm': 'SE', 'Asia/Singapore': 'SG',
  'Europe/Bratislava': 'SK', 'Asia/Bangkok': 'TH', 'Europe/Istanbul': 'TR',
  'Asia/Taipei': 'TW', 'America/Caracas': 'VE', 'Africa/Johannesburg': 'ZA',
  // Brasil — todos os fusos do IANA.
  'America/Sao_Paulo': 'BR', 'America/Bahia': 'BR', 'America/Fortaleza': 'BR',
  'America/Recife': 'BR', 'America/Maceio': 'BR', 'America/Belem': 'BR',
  'America/Santarem': 'BR', 'America/Araguaina': 'BR', 'America/Manaus': 'BR',
  'America/Boa_Vista': 'BR', 'America/Porto_Velho': 'BR',
  'America/Rio_Branco': 'BR', 'America/Eirunepe': 'BR',
  'America/Campo_Grande': 'BR', 'America/Cuiaba': 'BR', 'America/Noronha': 'BR',
  // Portugal e Espanha, com as ilhas.
  'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  // EUA — os continentais mais comuns; Indiana/Kentucky/Dakota vão por prefixo.
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Phoenix': 'US', 'America/Los_Angeles': 'US', 'America/Detroit': 'US',
  'America/Boise': 'US', 'America/Anchorage': 'US', 'America/Juneau': 'US',
  'America/Menominee': 'US', 'Pacific/Honolulu': 'US', 'America/Adak': 'US',
  // Canadá.
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'America/Regina': 'CA', 'America/Moncton': 'CA', 'America/Whitehorse': 'CA',
  'America/Yellowknife': 'CA', 'America/Iqaluit': 'CA',
  // México.
  'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Merida': 'MX',
  'America/Monterrey': 'MX', 'America/Matamoros': 'MX',
  'America/Chihuahua': 'MX', 'America/Ciudad_Juarez': 'MX',
  'America/Hermosillo': 'MX', 'America/Mazatlan': 'MX', 'America/Tijuana': 'MX',
  'America/Bahia_Banderas': 'MX', 'America/Ojinaga': 'MX',
  // Resto da América do Sul e Ásia-Pacífico com mais de um fuso.
  'America/Santiago': 'CL', 'America/Punta_Arenas': 'CL', 'Pacific/Easter': 'CL',
  'Asia/Jakarta': 'ID', 'Asia/Pontianak': 'ID', 'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY',
  'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ',
  'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
}

/** Famílias inteiras de fusos: tudo sob `Australia/` é Austrália. */
const TZ_PREFIX: [string, Region][] = [
  ['Australia/', 'AU'],
  ['America/Argentina/', 'AR'],
  ['America/Indiana/', 'US'],
  ['America/Kentucky/', 'US'],
  ['America/North_Dakota/', 'US'],
]

export function regionFromTimeZone(
  zone: string | null | undefined,
): Region | null {
  if (!zone) return null
  const exact = TZ_EXACT[zone]
  if (exact) return exact
  for (const [prefix, region] of TZ_PREFIX)
    if (zone.startsWith(prefix)) return region
  return null
}

/**
 * O fuso do aparelho, pelo caminho ECMA-402 — sem DOM, então continua valendo
 * fora do navegador. Ambiente sem a API (ou com ela quebrada) devolve `null` e
 * o chute desce para a pista seguinte, em vez de derrubar o boot.
 */
export function currentTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
  } catch {
    return null
  }
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
