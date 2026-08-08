import {
  SEARCH_LIMIT,
  type MediaDetail,
  type MediaProvider,
  type MediaSearchResult,
} from './types'

/**
 * Livros via Google Books — o FALLBACK da Open Library que o briefing já
 * previa, e que o `openlibrary.ts` anuncia no próprio comentário.
 *
 * Fallback, e não substituto: a Open Library continua sendo a primeira fonte
 * (catálogo aberto, capa grande, sem loja no meio) e o Google entra para tapar
 * os buracos de cobertura dela — livro brasileiro recente, técnico ou de
 * editora pequena, que a Open Library simplesmente não tem. A ordem em
 * `PROVIDERS` é o que expressa isso, e a deduplicação por título em `searchAll`
 * é o que impede a mesma obra de aparecer duas vezes.
 *
 * Sem chave: a API pública aceita busca anônima, com limite por IP — então o
 * browser chama direto, como no AniList e na Open Library.
 *
 * O país vai EXPLÍCITO em toda chamada, e não deixado por conta do IP: é ele
 * que decide se o livro está à venda e em qual loja, e a preferência que a
 * pessoa escolheu vale mais que de onde ela está conectada.
 *
 * O host está no `connect-src` da CSP em vercel.json.
 */
export const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleVolume {
  id?: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publishedDate?: string
    pageCount?: number
    description?: string
    categories?: string[]
    averageRating?: number
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  }
  saleInfo?: {
    saleability?: string
    buyLink?: string
  }
}

/**
 * A capa que a API entrega vem pequena e enfeitada. Três consertos, todos em
 * cima da URL — nenhum custa requisição:
 *
 * - `http:` → `https:`, senão o browser bloqueia como conteúdo misto.
 * - `zoom=1` → `zoom=2`, que dobra a resolução. Numa capa de 2:3 num grid de
 *   três colunas, o `zoom=1` (~128px) aparece borrado.
 * - `edge=curl` fora: é a "dobra de página" desenhada por cima da arte, que num
 *   grid de capas lê como defeito de imagem.
 */
export function googleBooksCover(url: string): string {
  return url
    .replace(/^http:/, 'https:')
    .replace(/([?&])zoom=1(&|$)/, '$1zoom=2$2')
    .replace(/([?&])edge=curl(&|$)/, '$1')
    .replace(/[?&]$/, '')
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapGoogleVolume(
  volume: GoogleVolume,
): MediaSearchResult | null {
  const info = volume.volumeInfo
  if (!volume.id || !info?.title) return null

  // `publishedDate` vem "2015", "2015-03" ou "2015-03-14" — os quatro
  // primeiros caracteres cobrem as três formas. O teste de tamanho vem antes
  // porque `Number('')` é 0, e não NaN: sem ele, livro sem data publicava no
  // ano zero.
  const date = info.publishedDate ?? ''
  const year = date.length >= 4 ? Number(date.slice(0, 4)) : NaN
  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail

  return {
    provider: 'googlebooks',
    externalId: volume.id,
    mediaType: 'book',
    title: info.title,
    coverUrl: thumb ? googleBooksCover(thumb) : undefined,
    year: Number.isInteger(year) ? year : undefined,
    total: info.pageCount || undefined,
    subtitle: info.authors?.[0] ?? info.subtitle,
  }
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapGoogleVolumeDetail(volume: GoogleVolume): MediaDetail | null {
  const base = mapGoogleVolume(volume)
  if (!base) return null

  const info = volume.volumeInfo

  // ONDE COMPRAR — o equivalente, para livro, do "onde assistir" de um filme e
  // do "onde comprar" de um jogo. Só quando está DE FATO à venda no país de
  // quem perguntou: um `buyLink` de livro indisponível leva a uma página que
  // diz "não disponível", o que é pior que não ter link.
  const buyLink =
    volume.saleInfo?.saleability === 'FOR_SALE' ? volume.saleInfo.buyLink : null

  return {
    ...base,
    // A descrição do Google vem com HTML de editora dentro (`<p>`, `<br>`).
    // Renderizar isso seria pôr marcação de terceiro na tela.
    synopsis: info?.description ? stripBookHtml(info.description) : undefined,
    genres: (info?.categories ?? []).slice(0, 6),
    // `averageRating` é 0–5; o resto do app fala em 0–100.
    score: info?.averageRating
      ? Math.round(info.averageRating * 20)
      : undefined,
    facts: buyLink
      ? [
          {
            labelKey: 'fact.buy',
            value: 'Google Play',
            values: ['Google Play'],
            links: [buyLink],
            lead: true,
          },
        ]
      : [],
  }
}

/** Mesmo problema do AniList: a API promete texto e entrega HTML. */
export function stripBookHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const googleBooksProvider: MediaProvider = {
  id: 'googlebooks',
  mediaTypes: ['book'],
  requiresServer: false,

  async search(query, { signal, region } = {}) {
    const url = new URL(GOOGLE_BOOKS_URL)
    url.searchParams.set('q', query)
    url.searchParams.set('maxResults', String(SEARCH_LIMIT))
    // Só livro: sem isto entram revistas, e uma edição da Playboy de 1974 no
    // meio da busca por um romance não ajuda ninguém.
    url.searchParams.set('printType', 'books')
    url.searchParams.set('orderBy', 'relevance')
    // O país escolhido nas configurações, e não o do IP: quem mora em Portugal
    // e navega por uma VPN brasileira ainda quer a loja portuguesa. Sem o
    // parâmetro a API às vezes recusa a chamada em vez de adivinhar.
    if (region) url.searchParams.set('country', region)

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal,
    })
    if (!response.ok) throw new Error('googlebooks-unavailable')

    const body = (await response.json()) as { items?: GoogleVolume[] }
    return (body.items ?? [])
      .map(mapGoogleVolume)
      .filter((r): r is MediaSearchResult => r !== null)
  },

  async detail(externalId, _mediaType, { signal, region } = {}) {
    const url = new URL(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(externalId)}`)
    if (region) url.searchParams.set('country', region)

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal,
    })
    if (!response.ok) throw new Error('googlebooks-unavailable')

    const mapped = mapGoogleVolumeDetail(await response.json())
    if (!mapped) throw new Error('googlebooks-unavailable')
    return mapped
  },
}
