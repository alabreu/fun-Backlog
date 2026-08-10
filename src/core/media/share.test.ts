import { describe, expect, it } from 'vitest'
import {
  parseShareParams,
  sharePath,
  shareTargetFor,
  shareUrl,
  slugify,
} from './share'

describe('apelido do link', () => {
  it('tira acento, pontuação e caixa', () => {
    expect(slugify('Frieren: Beyond Journey’s End')).toBe(
      'frieren-beyond-journey-s-end',
    )
    expect(slugify('Coração de Tinta')).toBe('coracao-de-tinta')
  })

  it('não deixa hífen sobrando na ponta', () => {
    expect(slugify('  ...Hello World!!  ')).toBe('hello-world')
  })

  // O corte em 60 pode cair em cima de um hífen; o resultado não pode terminar
  // nele, senão o link ganha uma barra torta no fim.
  it('corta o título longo sem terminar em hífen', () => {
    const apelido = slugify('a'.repeat(58) + ' bbbb cccc')
    expect(apelido.length).toBeLessThanOrEqual(60)
    expect(apelido.endsWith('-')).toBe(false)
  })

  // Título que não sobra nada depois de limpar (só símbolos, ou japonês) — o
  // caminho tem de continuar válido, sem apelido.
  it('título sem letra latina não vira apelido', () => {
    expect(slugify('進撃の巨人')).toBe('')
    expect(sharePath({
      mediaType: 'anime',
      provider: 'anilist',
      externalId: '16498',
      title: '進撃の巨人',
    })).toBe('/obra/anime/anilist/16498')
  })
})

describe('montar o link', () => {
  const alvo = {
    mediaType: 'anime' as const,
    provider: 'anilist',
    externalId: '16498',
    title: 'Attack on Titan',
  }

  it('mídia, fonte, id e apelido, nessa ordem', () => {
    expect(sharePath(alvo)).toBe('/obra/anime/anilist/16498/attack-on-titan')
  })

  it('a origem vem de fora e não duplica barra', () => {
    expect(shareUrl(alvo, 'https://fun.app/')).toBe(
      'https://fun.app/obra/anime/anilist/16498/attack-on-titan',
    )
  })
})

describe('alvo a partir do item', () => {
  it('usa o id da fonte, não o id do item', () => {
    expect(
      shareTargetFor('anime', 'Frieren', { anilist: '154587' }),
    ).toEqual({
      mediaType: 'anime',
      provider: 'anilist',
      externalId: '154587',
      title: 'Frieren',
    })
  })

  // Obra digitada à mão não tem fonte nenhuma: não há o que compartilhar, e o
  // botão precisa sumir em vez de gerar um link quebrado.
  it('sem id de fonte, não há link', () => {
    expect(shareTargetFor('game', 'Meu jogo', {})).toBeNull()
    expect(shareTargetFor('game', 'Meu jogo', { igdb: undefined })).toBeNull()
  })

  it('ignora chave que não é de provider conhecido', () => {
    expect(shareTargetFor('book', 'X', { inventado: '1' })).toBeNull()
  })

  // A ordem de PROVIDERS decide quando o item tem mais de um id — a mesma regra
  // do `detailSourceFor`, para o link citar a fonte que responde a ficha.
  it('com dois ids, manda a ordem dos providers', () => {
    const alvo = shareTargetFor('book', 'Duna', {
      googlebooks: 'abc',
      openlibrary: 'OL45804W',
    })
    expect(alvo?.provider).toBe('openlibrary')
  })
})

describe('ler o link', () => {
  it('aceita o caminho bem formado', () => {
    expect(
      parseShareParams({
        media: 'anime',
        provider: 'anilist',
        externalId: '16498',
      }),
    ).toEqual({ mediaType: 'anime', provider: 'anilist', externalId: '16498' })
  })

  it('id alfanumérico da Open Library passa', () => {
    expect(
      parseShareParams({
        media: 'book',
        provider: 'openlibrary',
        externalId: 'OL45804W',
      })?.externalId,
    ).toBe('OL45804W')
  })

  it('mídia inventada não passa', () => {
    expect(
      parseShareParams({
        media: 'podcast',
        provider: 'anilist',
        externalId: '1',
      }),
    ).toBeNull()
  })

  it('fonte desconhecida não passa', () => {
    expect(
      parseShareParams({ media: 'anime', provider: 'mal', externalId: '1' }),
    ).toBeNull()
  })

  // O ponto do `ID_DA_FONTE`: este valor vem da URL e termina numa requisição à
  // fonte. Barra e ponto-ponto são justamente o que não pode passar.
  it('id com caractere de caminho não passa', () => {
    for (const externalId of ['../secret', 'a/b', '16498 ', '', 'x'.repeat(65)])
      expect(
        parseShareParams({ media: 'anime', provider: 'anilist', externalId }),
      ).toBeNull()
  })

  it('parâmetro faltando não passa', () => {
    expect(parseShareParams({})).toBeNull()
  })
})
