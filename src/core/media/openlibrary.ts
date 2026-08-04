import {
  SEARCH_LIMIT,
  type MediaProvider,
  type MediaSearchResult,
} from './types'

/**
 * Livros via Open Library (público, sem chave). O briefing já avisa que a
 * cobertura tem buracos e as capas às vezes são ruins — o Google Books entra
 * como fallback depois, atrás desta mesma interface.
 *
 * `fields` não é otimização preguiçosa: sem ele a busca devolve centenas de KB
 * por resultado (todas as edições, todos os ids), e isso no 4G do sofá é a
 * diferença entre instantâneo e travado.
 */
export const OPENLIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'
const FIELDS =
  'key,title,author_name,first_publish_year,cover_i,number_of_pages_median'

interface OpenLibraryDoc {
  key?: string
  title?: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  number_of_pages_median?: number
}

/** Capa pelo id numérico. 'M' (medium) é o tamanho que o grid usa; 'L' existe
 *  para o detalhe, se um dia a tela de item quiser a arte maior. */
export function openLibraryCover(
  coverId: number,
  size: 'M' | 'L' = 'M',
): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`
}

/** Exportado para teste: o mapeamento é a parte que quebra quando a API muda. */
export function mapOpenLibraryDoc(
  doc: OpenLibraryDoc,
): MediaSearchResult | null {
  // `key` vem como "/works/OL45804W" — o id é o último segmento.
  const id = doc.key?.split('/').filter(Boolean).pop()
  if (!id || !doc.title) return null

  return {
    provider: 'openlibrary',
    externalId: id,
    mediaType: 'book',
    title: doc.title,
    coverUrl: doc.cover_i ? openLibraryCover(doc.cover_i) : undefined,
    year: doc.first_publish_year,
    total: doc.number_of_pages_median,
    subtitle: doc.author_name?.[0],
  }
}

export const openLibraryProvider: MediaProvider = {
  id: 'openlibrary',
  mediaTypes: ['book'],
  requiresServer: false,

  async search(query, signal) {
    const url = new URL(OPENLIBRARY_SEARCH_URL)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(SEARCH_LIMIT))
    url.searchParams.set('fields', FIELDS)

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal,
    })
    if (!response.ok) throw new Error('openlibrary-unavailable')

    const body = (await response.json()) as { docs?: OpenLibraryDoc[] }
    return (body.docs ?? [])
      .map(mapOpenLibraryDoc)
      .filter((r): r is MediaSearchResult => r !== null)
  },
}
