import { describe, expect, it, vi } from 'vitest'
import { isAdultAnime, isAdultBook } from './adult'
import { PROVIDERS, searchAll } from './search'
import type { MediaProvider, MediaSearchResult } from './types'

const result = (over: Partial<MediaSearchResult>): MediaSearchResult => ({
  provider: 'stub',
  externalId: '1',
  mediaType: 'anime',
  title: 'x',
  ...over,
})

describe('o que conta como adulto', () => {
  it('o gênero do AniList, sem depender de caixa nem de espaço', () => {
    expect(isAdultAnime(['Hentai'])).toBe(true)
    expect(isAdultAnime([' hentai '])).toBe(true)
    expect(isAdultAnime(['Ecchi', 'Comedy'])).toBe(false)
    expect(isAdultAnime([])).toBe(false)
    expect(isAdultAnime(undefined)).toBe(false)
  })

  // A DISTINÇÃO QUE O USUÁRIO PEDIU: gênero adulto, não nudez. "Ecchi" é o
  // gênero de insinuação sexual do anime e NÃO entra — se entrasse, metade das
  // comédias sumiria.
  it('ecchi não é hentai', () => {
    expect(isAdultAnime(['Ecchi'])).toBe(false)
  })

  it('a classificação do Google Books', () => {
    expect(isAdultBook('MATURE')).toBe(true)
    expect(isAdultBook('mature')).toBe(true)
    expect(isAdultBook('NOT_MATURE')).toBe(false)
    expect(isAdultBook(undefined)).toBe(false)
  })
})

describe('o filtro na busca', () => {
  function comResultados(...results: MediaSearchResult[]) {
    const stub: MediaProvider = {
      id: 'stub',
      mediaTypes: ['anime'],
      requiresServer: false,
      search: async () => results,
    }
    PROVIDERS.splice(0, PROVIDERS.length, stub)
  }

  const titulos = (o: { groups: { results: MediaSearchResult[] }[] }) =>
    o.groups.flatMap((g) => g.results.map((r) => r.title))

  it('esconde o marcado e mantém o resto', async () => {
    comResultados(
      result({ externalId: 'a', title: 'Normal' }),
      result({ externalId: 'b', title: 'Adulta', adult: true }),
    )
    expect(titulos(await searchAll('xy'))).toEqual(['Normal'])
  })

  it('desligado, nada some', async () => {
    comResultados(
      result({ externalId: 'a', title: 'Normal' }),
      result({ externalId: 'b', title: 'Adulta', adult: true }),
    )
    expect(titulos(await searchAll('xy', { safeSearch: false }))).toEqual([
      'Normal',
      'Adulta',
    ])
  })

  // O PADRÃO É O PONTO: quem chama e esquece de dizer recebe o filtro LIGADO.
  // Um filtro de segurança que falha aberto não é um filtro.
  it('sem dizer nada, vem ligado', async () => {
    comResultados(result({ title: 'Adulta', adult: true }))
    expect(titulos(await searchAll('xy'))).toEqual([])
  })

  // Fonte que não sabe dizer devolve `undefined`, e desconhecido não é adulto:
  // sumir com obra legítima é um erro que ninguém vê.
  it('sem a marca, a obra passa', async () => {
    comResultados(result({ title: 'Sem marca' }))
    expect(titulos(await searchAll('xy'))).toEqual(['Sem marca'])
  })
})

vi.mock('./server', () => ({ callMediaFunction: vi.fn() }))
