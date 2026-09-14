import { describe, expect, it } from 'vitest'
import {
  anilistTrailer,
  dailymotionTrailer,
  pickIgdbTrailer,
  pickTmdbTrailer,
  youtubeTrailer,
  type TmdbVideo,
} from './trailer'

describe('endereços do trailer', () => {
  it('monta o link de assistir e a miniatura a partir do id do YouTube', () => {
    expect(youtubeTrailer('dQw4w9WgXcQ')).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    })
  })

  // O id vem de terceiro e vira URL. Um id com barra ou interrogação montaria
  // um endereço que não é o que parece.
  it('recusa id que não tem cara de id', () => {
    expect(youtubeTrailer('../../algo')).toBeNull()
    expect(youtubeTrailer('abc?x=1')).toBeNull()
    expect(youtubeTrailer('')).toBeNull()
    expect(dailymotionTrailer('x-com-traco')).toBeNull()
  })

  it('o Dailymotion vai sem miniatura — o endereço dela não sai do id', () => {
    expect(dailymotionTrailer('x8abcde')).toEqual({
      url: 'https://www.dailymotion.com/video/x8abcde',
    })
  })
})

describe('trailer do AniList', () => {
  it('usa a miniatura que o AniList manda, e não a que montaríamos', () => {
    expect(
      anilistTrailer({
        id: 'dQw4w9WgXcQ',
        site: 'youtube',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      }),
    ).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    })
  })

  it('sem a miniatura deles, monta a nossa', () => {
    expect(anilistTrailer({ id: 'dQw4w9WgXcQ', site: 'youtube' })).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    })
  })

  it('abre o Dailymotion no Dailymotion', () => {
    const trailer = anilistTrailer({ id: 'x8abcde', site: 'dailymotion' })
    expect(trailer?.url).toBe('https://www.dailymotion.com/video/x8abcde')
  })

  // Montar um id de Dailymotion como se fosse do YouTube daria um link que abre
  // numa página de erro — pior do que não oferecer trailer nenhum.
  it('não adivinha o site quando ele falta ou é desconhecido', () => {
    expect(anilistTrailer({ id: 'x8abcde' })).toBeNull()
    expect(anilistTrailer({ id: 'x8abcde', site: 'vimeo' })).toBeNull()
  })

  it('sem trailer nenhum devolve null', () => {
    expect(anilistTrailer(null)).toBeNull()
    expect(anilistTrailer({ id: '  ', site: 'youtube' })).toBeNull()
  })
})

describe('escolha do trailer na TMDB', () => {
  const video = (over: Partial<TmdbVideo> = {}): TmdbVideo => ({
    key: 'dQw4w9WgXcQ',
    site: 'YouTube',
    type: 'Trailer',
    official: true,
    iso_639_1: 'en',
    ...over,
  })

  // A lista da TMDB mistura trailer, teaser, clipe e bastidores. Pegar o
  // primeiro traria "Behind the Scenes" com a mesma frequência do trailer.
  it('ignora o que não é trailer nem teaser', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', type: 'Behind the Scenes' }),
        video({ key: 'bbbbbbbbbbb', type: 'Clip' }),
        video({ key: 'ccccccccccc', type: 'Trailer' }),
      ])?.url,
    ).toContain('ccccccccccc')
  })

  it('trailer ganha de teaser, mesmo vindo depois', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', type: 'Teaser' }),
        video({ key: 'bbbbbbbbbbb', type: 'Trailer' }),
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  it('português ganha de inglês', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', iso_639_1: 'en' }),
        video({ key: 'bbbbbbbbbbb', iso_639_1: 'pt' }),
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  it('inglês ganha do resto', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', iso_639_1: 'ja' }),
        video({ key: 'bbbbbbbbbbb', iso_639_1: 'en' }),
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  // O tipo vale mais que o idioma: um teaser em português continua sendo um
  // teaser, e quem tocou no bloco pediu o trailer.
  it('o tipo pesa mais que o idioma', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', type: 'Teaser', iso_639_1: 'pt' }),
        video({ key: 'bbbbbbbbbbb', type: 'Trailer', iso_639_1: 'en' }),
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  it('oficial desempata quando tipo e idioma são iguais', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa', official: false }),
        video({ key: 'bbbbbbbbbbb', official: true }),
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  it('empate total mantém a ordem da TMDB, que é a de relevância', () => {
    expect(
      pickTmdbTrailer([
        video({ key: 'aaaaaaaaaaa' }),
        video({ key: 'bbbbbbbbbbb' }),
      ])?.url,
    ).toContain('aaaaaaaaaaa')
  })

  // Vimeo abriria, mas a miniatura dele exige uma segunda ida à rede — e um
  // cartão de trailer sem imagem não é um cartão de trailer.
  it('só YouTube', () => {
    expect(pickTmdbTrailer([video({ site: 'Vimeo' })])).toBeNull()
  })

  it('lista vazia ou ausente devolve null', () => {
    expect(pickTmdbTrailer([])).toBeNull()
    expect(pickTmdbTrailer(null)).toBeNull()
  })
})

describe('escolha do trailer na IGDB', () => {
  // A IGDB não tem campo de tipo, só um nome livre.
  it('prefere o vídeo que se chama trailer', () => {
    expect(
      pickIgdbTrailer([
        { video_id: 'aaaaaaaaaaa', name: 'Developer Diary' },
        { video_id: 'bbbbbbbbbbb', name: 'Launch Trailer' },
      ])?.url,
    ).toContain('bbbbbbbbbbb')
  })

  // Ao contrário do "onde assistir", aqui errar custa ver um diário de
  // desenvolvimento DO MESMO JOGO — e não ir procurar a obra onde ela não está.
  it('sem ninguém chamado trailer, vale o primeiro', () => {
    expect(
      pickIgdbTrailer([
        { video_id: 'aaaaaaaaaaa', name: 'Gameplay' },
        { video_id: 'bbbbbbbbbbb', name: 'Interview' },
      ])?.url,
    ).toContain('aaaaaaaaaaa')
  })

  it('vídeo sem id não conta', () => {
    expect(pickIgdbTrailer([{ name: 'Trailer' }])).toBeNull()
    expect(pickIgdbTrailer(undefined)).toBeNull()
  })
})
