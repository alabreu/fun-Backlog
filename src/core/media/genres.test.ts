import { describe, expect, it } from 'vitest'
import {
  GENRE_COLOR_COUNT,
  genreColorIndex,
  genreColorIndexes,
} from './genres'

describe('genreColorIndex', () => {
  it('sempre cai dentro da paleta', () => {
    const amostra = [
      'Shooter',
      'Role-playing (RPG)',
      'Adventure',
      'Slice of Life',
      'Nebula Award Winner',
      'Ficção científica',
      '',
      '   ',
      '???',
    ]
    for (const g of amostra) {
      const i = genreColorIndex(g)
      expect(Number.isInteger(i)).toBe(true)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(GENRE_COLOR_COUNT)
    }
  })

  // A promessa central: cor que muda a cada abertura pareceria defeito.
  it('é estável para o mesmo gênero', () => {
    expect(genreColorIndex('Shooter')).toBe(genreColorIndex('Shooter'))
  })

  // Fontes diferentes escrevem o mesmo gênero de jeitos diferentes; sair em
  // duas cores na mesma tela seria a interface inventando uma distinção.
  it('ignora caixa, hífen e espaço', () => {
    const base = genreColorIndex('Sci-Fi')
    expect(genreColorIndex('sci fi')).toBe(base)
    expect(genreColorIndex('SCI-FI')).toBe(base)
    expect(genreColorIndex('  Sci  Fi  ')).toBe(base)
  })

  it('distribui razoavelmente uma lista real de gêneros', () => {
    const reais = [
      'Point-and-click', 'Fighting', 'Shooter', 'Music', 'Platform', 'Puzzle',
      'Racing', 'Real Time Strategy (RTS)', 'Role-playing (RPG)', 'Simulator',
      'Sport', 'Strategy', 'Turn-based strategy (TBS)', 'Tactical',
      'Hack and slash/Beat em up', 'Quiz/Trivia', 'Pinball', 'Adventure',
      'Indie', 'Arcade', 'Visual Novel', 'Card & Board Game', 'MOBA',
      'Action', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance',
      'Sci-Fi', 'Slice of Life', 'Supernatural', 'Thriller',
    ]
    const baldes = new Array<number>(GENRE_COLOR_COUNT).fill(0)
    for (const g of reais) baldes[genreColorIndex(g)] += 1

    // Nenhuma cor pode ficar sem uso, e nenhuma pode levar mais de um terço da
    // lista — senão a tela vira monocromática e a "variedade" não acontece.
    expect(Math.min(...baldes)).toBeGreaterThan(0)
    expect(Math.max(...baldes)).toBeLessThan(reais.length / 3)
  })
})

describe('genreColorIndexes', () => {
  it('nunca repete cor enquanto houver cor livre', () => {
    const listas = [
      ['Shooter', 'Role-playing (RPG)', 'Adventure'],
      ['Action', 'Adventure', 'Comedy', 'Drama'],
      ['Fiction', 'Science fiction', 'Ecology'],
    ]
    for (const lista of listas) {
      const cores = genreColorIndexes(lista)
      expect(new Set(cores).size).toBe(lista.length)
    }
  })

  it('cada gênero fica na cor de sempre quando ela está livre', () => {
    const [primeira] = genreColorIndexes(['Shooter'])
    expect(primeira).toBe(genreColorIndex('Shooter'))
  })

  it('mais gêneros que cores ainda devolve uma cor para cada um', () => {
    const muitos = Array.from({ length: GENRE_COLOR_COUNT + 4 }, (_, i) => `g${i}`)
    const cores = genreColorIndexes(muitos)
    expect(cores).toHaveLength(muitos.length)
    for (const c of cores) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThan(GENRE_COLOR_COUNT)
    }
  })

  it('lista vazia não estoura', () => {
    expect(genreColorIndexes([])).toEqual([])
  })
})
