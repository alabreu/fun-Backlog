import {
  SEARCH_LIMIT,
  type MediaDetail,
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

  async detail(externalId, _mediaType, { signal } = {}) {
    const response = await fetch(
      `https://openlibrary.org/works/${encodeURIComponent(externalId)}.json`,
      { headers: { accept: 'application/json' }, signal },
    )
    if (!response.ok) throw new Error('openlibrary-unavailable')
    return mapOpenLibraryWork(externalId, await response.json())
  },
}

// ---------------------------------------------------------------------------
// Ficha completa
// ---------------------------------------------------------------------------

interface OpenLibraryWork {
  title?: string
  /** Ora string, ora `{ value }`. A API tem as duas formas em circulação. */
  description?: string | { value?: string }
  subjects?: string[]
  covers?: number[]
}

/**
 * A ficha da Open Library é MAGRA de propósito no que ela devolve por obra:
 * autor, páginas e editora vivem nas EDIÇÕES, não na obra, e buscá-las custaria
 * uma requisição por autor e outra por edição.
 *
 * Não é problema porque o detalhe do app é ADITIVO: a tela já tem título,
 * capa, ano, autor e número de páginas — do resultado da busca ou do item
 * guardado — e o que vem daqui só acrescenta sinopse e assuntos.
 */
export function mapOpenLibraryWork(
  externalId: string,
  work: OpenLibraryWork,
): MediaDetail {
  const description =
    typeof work.description === 'string'
      ? work.description
      : work.description?.value

  return {
    provider: 'openlibrary',
    externalId,
    mediaType: 'book',
    title: work.title ?? '',
    coverUrl: work.covers?.[0]
      ? openLibraryCover(work.covers[0], 'L')
      : undefined,
    synopsis: description?.trim() || undefined,
    // "Assuntos" da Open Library são muitos e repetitivos ("Fiction",
    // "Fiction, general", "Science fiction"): os seis primeiros bastam para
    // dar o tom sem virar uma parede de etiquetas.
    genres: (work.subjects ?? []).slice(0, 6),
  }
}
