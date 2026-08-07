import { describe, expect, it } from 'vitest'
import { parseMediaLink, slugToTitle } from './link'

describe('slugToTitle', () => {
  it('troca separadores por espaço', () => {
    expect(slugToTitle('dune-part-two')).toBe('dune part two')
    expect(slugToTitle('the_last_of_us')).toBe('the last of us')
  })

  it('tira o id que vários sites prefixam no slug', () => {
    expect(slugToTitle('693134-dune-part-two')).toBe('dune part two')
    expect(slugToTitle('2767052-the-hunger-games')).toBe('the hunger games')
  })

  it('decodifica acento vindo de percent-encoding', () => {
    expect(slugToTitle('cora%C3%A7%C3%A3o-de-tinta')).toBe('coração de tinta')
  })

  it('sobrevive a percent-encoding quebrado', () => {
    expect(slugToTitle('mal-%formado')).toBe('mal %formado')
  })
})

describe('parseMediaLink', () => {
  it('não trata texto comum como link', () => {
    expect(parseMediaLink('zelda')).toBeNull()
    expect(parseMediaLink('half-life 2')).toBeNull()
    expect(parseMediaLink('')).toBeNull()
  })

  it('resolve o IMDb pelo id, que é o caso exato', () => {
    expect(parseMediaLink('https://www.imdb.com/title/tt0111161/')).toEqual({
      kind: 'imdb',
      imdbId: 'tt0111161',
    })
  })

  it('aceita endereço colado sem o esquema', () => {
    expect(parseMediaLink('imdb.com/title/tt0903747/')).toEqual({
      kind: 'imdb',
      imdbId: 'tt0903747',
    })
  })

  it('extrai título e mídia da Steam', () => {
    expect(
      parseMediaLink('https://store.steampowered.com/app/292030/The_Witcher_3/'),
    ).toEqual({ kind: 'query', query: 'The Witcher 3', mediaType: 'game' })
  })

  it('extrai título e mídia do Letterboxd', () => {
    expect(parseMediaLink('https://letterboxd.com/film/dune-part-two/')).toEqual(
      { kind: 'query', query: 'dune part two', mediaType: 'movie' },
    )
  })

  it('pega o slug quando a URL termina no id', () => {
    expect(parseMediaLink('https://anilist.co/anime/21/One-Piece/')).toEqual({
      kind: 'query',
      query: 'One Piece',
      mediaType: 'anime',
    })
  })

  it('distingue filme de série na TMDB pelo caminho', () => {
    expect(
      parseMediaLink('https://www.themoviedb.org/tv/1396-breaking-bad'),
    ).toEqual({ kind: 'query', query: 'breaking bad', mediaType: 'series' })
    expect(
      parseMediaLink('https://www.themoviedb.org/movie/693134-dune-part-two'),
    ).toEqual({ kind: 'query', query: 'dune part two', mediaType: 'movie' })
  })

  it('funciona em site desconhecido, só sem saber a mídia', () => {
    expect(parseMediaLink('https://exemplo.com/obras/a-montanha-magica')).toEqual(
      { kind: 'query', query: 'a montanha magica', mediaType: undefined },
    )
  })

  it('ignora query string e âncora', () => {
    expect(
      parseMediaLink('https://letterboxd.com/film/parasite/?utm_source=x#elenco'),
    ).toMatchObject({ query: 'parasite' })
  })

  it('devolve null quando não sobra título nenhum', () => {
    expect(parseMediaLink('https://letterboxd.com/')).toBeNull()
    expect(parseMediaLink('https://exemplo.com/1/2/3')).toBeNull()
  })
})
