import { describe, expect, it } from 'vitest'
import { matchWatchCandidate, type WatchSubject } from './watch'
import type { MediaSearchResult } from './types'

/**
 * O casamento anime→TMDB. Os testes aqui são de DUAS naturezas, e a segunda é a
 * que importa mais: metade prova que o casamento certo acontece, metade prova
 * que o casamento ERRADO não acontece. Ver o comentário do topo de `watch.ts` —
 * o desfecho ruim desta função não é a lista vazia, é a lista de outra obra.
 */

function tmdb(
  title: string,
  extra: Partial<MediaSearchResult> = {},
): MediaSearchResult {
  return {
    provider: 'tmdb',
    externalId: '1',
    mediaType: 'series',
    title,
    ...extra,
  }
}

const anime = (title: string, extra: Partial<WatchSubject> = {}): WatchSubject => ({
  mediaType: 'anime',
  title,
  ...extra,
})

describe('matchWatchCandidate', () => {
  it('casa o título idêntico', () => {
    const alvo = tmdb('Jujutsu Kaisen')
    expect(matchWatchCandidate(anime('Jujutsu Kaisen'), [alvo])).toBe(alvo)
  })

  it('ignora caixa, acento e pontuação', () => {
    const alvo = tmdb('SPY×FAMILY')
    expect(matchWatchCandidate(anime('Spy x Family'), [alvo])).toBe(alvo)
  })

  it('casa o "x" de crossover escrito das duas formas', () => {
    // Grafias reais: o AniList usa o sinal de multiplicação, a TMDB usa a letra.
    const alvo = tmdb('Hunter x Hunter')
    expect(matchWatchCandidate(anime('HUNTER×HUNTER'), [alvo])).toBe(alvo)
  })

  it('não derruba o "x" que é o nome da obra', () => {
    // "X-Men" não pode virar "Men" e casar com qualquer coisa.
    expect(matchWatchCandidate(anime('X-Men'), [tmdb('Men')])).toBe(null)
  })

  it('casa a temporada do AniList com a série da TMDB', () => {
    // O caso que motiva a função inteira: as duas fontes recortam a mesma
    // história de jeitos diferentes.
    const alvo = tmdb('Attack on Titan', { year: 2013 })
    const casado = matchWatchCandidate(
      anime('Attack on Titan Season 3', { year: 2018 }),
      [alvo],
    )
    expect(casado).toBe(alvo)
  })

  it('prefere a ficha exata à da série quando as duas existem', () => {
    const serie = tmdb('Demon Slayer', { externalId: 'serie' })
    const exata = tmdb('Demon Slayer: Kimetsu no Yaiba', { externalId: 'exata' })
    // A exata vem DEPOIS na lista: quem decide é o passe, não a posição.
    const casado = matchWatchCandidate(
      anime('Demon Slayer: Kimetsu no Yaiba'),
      [serie, exata],
    )
    expect(casado?.externalId).toBe('exata')
  })

  it('casa pelo título original quando a TMDB responde traduzido', () => {
    const alvo = tmdb('Cavaleiros do Zodíaco', { subtitle: 'Saint Seiya' })
    expect(matchWatchCandidate(anime('Saint Seiya'), [alvo])).toBe(alvo)
  })

  it('respeita a ordem de relevância da TMDB dentro do mesmo passe', () => {
    const primeiro = tmdb('Fruits Basket', { externalId: 'a' })
    const segundo = tmdb('Fruits Basket', { externalId: 'b' })
    expect(
      matchWatchCandidate(anime('Fruits Basket'), [primeiro, segundo])
        ?.externalId,
    ).toBe('a')
  })

  it('casa um filme tanto quanto uma série', () => {
    const alvo = tmdb('Your Name.', { mediaType: 'movie', year: 2016 })
    const casado = matchWatchCandidate(
      anime('Your Name.', { year: 2016 }),
      [alvo],
    )
    expect(casado?.mediaType).toBe('movie')
  })

  it('usa o título alternativo quando o principal não casa', () => {
    const alvo = tmdb('Shingeki no Kyojin')
    const casado = matchWatchCandidate(
      anime('Attack on Titan', { altTitle: 'Shingeki no Kyojin' }),
      [alvo],
    )
    expect(casado).toBe(alvo)
  })

  // -------------------------------------------------------------------------
  // O que NÃO pode casar
  // -------------------------------------------------------------------------

  it('não casa nome parecido', () => {
    // O caso real da decisão 18: o grafo do AniList já ligou "Death Parade" a
    // "Death Note". Aqui as duas não podem se encontrar nem por engano.
    expect(matchWatchCandidate(anime('Death Note'), [tmdb('Death Parade')])).toBe(
      null,
    )
  })

  it('não casa por prefixo', () => {
    expect(matchWatchCandidate(anime('Fate/Zero'), [tmdb('Fate')])).toBe(null)
  })

  it('não devolve o primeiro resultado só porque a busca foi feita', () => {
    // Sem casamento nenhum, a resposta é silêncio — e não "o mais relevante".
    const candidatos = [tmdb('Outra Coisa'), tmdb('Mais Outra')]
    expect(matchWatchCandidate(anime('Nanatsu no Taizai'), candidatos)).toBe(null)
  })

  it('recusa a série que estreou DEPOIS da temporada procurada', () => {
    // Nome idêntico e ainda assim impossível: um remake de 2024 não é a
    // temporada que a pessoa assistiu em 2013.
    const remake = tmdb('Ranma ½', { year: 2024 })
    expect(matchWatchCandidate(anime('Ranma ½', { year: 2013 }), [remake])).toBe(
      null,
    )
  })

  it('aceita um ano de margem na virada', () => {
    // Estreia em dezembro no Japão, janeiro no resto: as fontes discordam.
    const alvo = tmdb('Bocchi the Rock!', { year: 2023 })
    expect(
      matchWatchCandidate(anime('Bocchi the Rock!', { year: 2022 }), [alvo]),
    ).toBe(alvo)
  })

  it('não deixa o ano decidir quando um dos lados não tem', () => {
    const alvo = tmdb('Frieren', { year: 2023 })
    expect(matchWatchCandidate(anime('Frieren'), [alvo])).toBe(alvo)
  })

  it('devolve null sem candidato nenhum', () => {
    expect(matchWatchCandidate(anime('Qualquer Coisa'), [])).toBe(null)
  })

  it('não casa obra sem nome com obra sem nome', () => {
    // Título que normaliza para vazio não pode virar uma chave que casa com
    // todas as outras vazias.
    expect(matchWatchCandidate(anime('!!!'), [tmdb('???')])).toBe(null)
  })
})
