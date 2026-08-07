import type { MediaType } from '@core/items/types'

/**
 * Colar link: a pessoa está no navegador, viu um jogo na Steam ou um filme no
 * Letterboxd, e quer aquilo na estante sem digitar o nome de novo.
 *
 * A estratégia é deliberadamente MISTA, e é o que faz isso caber num arquivo:
 *
 * - Quando a URL carrega um id que sabemos resolver — hoje só o `tt…` do IMDb,
 *   que a TMDB traduz (ver decisão 8) — resolvemos a obra EXATA.
 * - Em todo o resto, extraímos o título do slug e caímos na busca normal. É
 *   menos preciso, mas funciona para Steam, Letterboxd, IGDB, Goodreads,
 *   AniList e para qualquer site que ninguém mapeou — inclusive os que sequer
 *   têm API. Um resolvedor por site cobriria seis endereços e falharia no
 *   sétimo; ler o slug cobre a web.
 *
 * O host conhecido ainda ajuda numa coisa: ele diz QUE MÍDIA é, então colar um
 * link da Steam não traz filme homônimo junto.
 */

export type MediaLink =
  /** Obra identificada: resolvível sem adivinhar. */
  | { kind: 'imdb'; imdbId: string }
  /** Título extraído do endereço, para cair na busca por texto. */
  | { kind: 'query'; query: string; mediaType?: MediaType }

/** Que mídia cada host publica. Serve para não misturar resultados: quem colou
 *  um link da Steam quer o jogo, não o filme com o mesmo nome. */
const MEDIA_BY_HOST: { match: RegExp; mediaType: MediaType }[] = [
  { match: /(^|\.)store\.steampowered\.com$/, mediaType: 'game' },
  { match: /(^|\.)igdb\.com$/, mediaType: 'game' },
  { match: /(^|\.)letterboxd\.com$/, mediaType: 'movie' },
  { match: /(^|\.)anilist\.co$/, mediaType: 'anime' },
  { match: /(^|\.)myanimelist\.net$/, mediaType: 'anime' },
  { match: /(^|\.)openlibrary\.org$/, mediaType: 'book' },
  { match: /(^|\.)goodreads\.com$/, mediaType: 'book' },
]

const IMDB_HOST = /(^|\.)imdb\.com$/
const IMDB_ID = /\b(tt\d{7,9})\b/
/** A TMDB separa filme de série no caminho, então dá para saber qual é. */
const TMDB_HOST = /(^|\.)themoviedb\.org$/

/**
 * Um slug de URL vira título legível: `dune-part-two` → `dune part two`.
 *
 * O `\d+-` da frente sai porque vários sites prefixam o id (a TMDB usa
 * `/movie/693134-dune-part-two`, o Goodreads usa `/book/show/2767052-the-hunger-games`)
 * e "693134" na busca não acha nada.
 */
export function slugToTitle(slug: string): string {
  let text = slug
  try {
    text = decodeURIComponent(slug)
  } catch {
    // Percent-encoding quebrado: segue com o texto cru, que ainda serve.
  }
  return text
    .replace(/\.(html?|php)$/i, '')
    .replace(/^\d+[-_]/, '')
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Aceita com e sem esquema: ninguém cola "https://" quando copia do meio de
 *  uma mensagem, mas `new URL` exige. O teste de ponto-sem-espaço evita tratar
 *  uma busca comum ("half-life 2") como endereço. */
function toUrl(input: string): URL | null {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null
  try {
    if (/^https?:\/\//i.test(text)) return new URL(text)
    if (/^[\w-]+(\.[\w-]+)+\//.test(text)) return new URL(`https://${text}`)
  } catch {
    return null
  }
  return null
}

/**
 * Devolve `null` quando o texto não é um endereço — e é assim que a tela de
 * busca decide se trata a digitação como link ou como título.
 */
export function parseMediaLink(input: string): MediaLink | null {
  const url = toUrl(input)
  if (!url) return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  // IMDb: o único caso em que o endereço identifica a obra sem ambiguidade.
  if (IMDB_HOST.test(host)) {
    const found = IMDB_ID.exec(url.pathname)
    if (found) return { kind: 'imdb', imdbId: found[1] }
  }

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  // Último segmento que não seja só número: é onde mora o slug. `/anime/21/`
  // termina em número (o id), e o título está no segmento anterior — ou em
  // nenhum, quando a URL é curta.
  const slug = [...segments].reverse().find((s) => !/^\d+$/.test(s))
  if (!slug) return null

  const query = slugToTitle(slug)
  if (query.length < 2) return null

  let mediaType = MEDIA_BY_HOST.find((entry) => entry.match.test(host))?.mediaType
  if (!mediaType && TMDB_HOST.test(host))
    mediaType = segments[0] === 'tv' ? 'series' : segments[0] === 'movie' ? 'movie' : undefined

  return { kind: 'query', query, mediaType }
}
