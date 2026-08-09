import { describe, expect, it } from 'vitest'
import { coverFileName, fullSizeCoverUrl } from './image'

describe('fullSizeCoverUrl', () => {
  it('dobra a resolução da IGDB pelo sufixo de retina', () => {
    expect(
      fullSizeCoverUrl(
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
      ),
    ).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.jpg')
  })

  // Idempotente: pedir o dobro do dobro daria `t_cover_big_2x_2x`, que a IGDB
  // não conhece — e uma URL inválida some com a imagem em vez de aumentá-la.
  it('não empilha o sufixo numa url que já é 2x', () => {
    const url =
      'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1wyy.jpg'
    expect(fullSizeCoverUrl(url)).toBe(url)
  })

  it('pede o arquivo original da TMDB', () => {
    expect(fullSizeCoverUrl('https://image.tmdb.org/t/p/w342/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/original/abc.jpg',
    )
  })

  it('sobe a capa da Open Library para o tamanho grande', () => {
    expect(
      fullSizeCoverUrl('https://covers.openlibrary.org/b/id/8231856-M.jpg'),
    ).toBe('https://covers.openlibrary.org/b/id/8231856-L.jpg')
  })

  it('sobe o zoom do Google Books sem mexer no resto da query', () => {
    expect(
      fullSizeCoverUrl(
        'https://books.google.com/books/content?id=X&printsec=frontcover&img=1&zoom=2',
      ),
    ).toBe(
      'https://books.google.com/books/content?id=X&printsec=frontcover&img=1&zoom=3',
    )
  })

  // Host desconhecido e capa adicionada à mão caem no mesmo caso: devolver a
  // própria url é o que mantém a funcionalidade inteira para elas.
  it('devolve a própria url quando não conhece a fonte', () => {
    const url = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/x.jpg'
    expect(fullSizeCoverUrl(url)).toBe(url)
    expect(fullSizeCoverUrl('https://exemplo.com/minha-capa.png')).toBe(
      'https://exemplo.com/minha-capa.png',
    )
  })
})

describe('coverFileName', () => {
  it('usa o título, não o hash da CDN', () => {
    expect(
      coverFileName(
        'The Legend of Zelda: Breath of the Wild',
        'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3p2d.jpg',
      ),
    ).toBe('the-legend-of-zelda-breath-of-the-wild.jpg')
  })

  it('tira acento e pontuação que quebram nome de arquivo', () => {
    expect(coverFileName('Coração: a "obra"', 'https://x/y.png')).toBe(
      'coracao-a-obra.png',
    )
  })

  // A query da url do Google Books contém pontos e barras; ler a extensão dali
  // daria um nome inválido.
  it('lê a extensão do caminho, não da query', () => {
    expect(
      coverFileName('Duna', 'https://books.google.com/books/content?id=X&zoom=3'),
    ).toBe('duna.jpg')
  })

  it('título sem nenhuma letra ainda gera um nome usável', () => {
    expect(coverFileName('★★★', 'https://x/y.jpg')).toBe('capa.jpg')
  })
})
