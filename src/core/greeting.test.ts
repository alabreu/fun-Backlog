import { describe, expect, it } from 'vitest'
import { LOCALES } from '@core/i18n'
import {
  dayNumber,
  NICKNAME_MAX,
  openingFor,
  OPENINGS,
  rerollVocative,
  sanitizeNickname,
  splitOpening,
  VOCATIVES,
  vocativeFor,
} from './greeting'

function at(hour: number): Date {
  return new Date(2026, 7, 6, hour, 30)
}

describe('vocativeFor', () => {
  it('é estável ao longo do mesmo dia', () => {
    const manha = vocativeFor(at(8), 'pt')
    const noite = vocativeFor(at(22), 'pt')
    expect(manha).toBe(noite)
  })

  it('muda de um dia para o outro', () => {
    const hoje = vocativeFor(new Date(2026, 7, 6, 10), 'pt')
    const amanha = vocativeFor(new Date(2026, 7, 7, 10), 'pt')
    expect(hoje).not.toBe(amanha)
  })

  it('percorre a lista inteira antes de repetir', () => {
    const lista = VOCATIVES.pt
    const vistos = new Set(
      Array.from({ length: lista.length }, (_, i) =>
        vocativeFor(new Date(2026, 7, 6 + i, 10), 'pt'),
      ),
    )
    expect(vistos.size).toBe(lista.length)
  })

  it('cada idioma tem a sua lista, não a tradução da outra', () => {
    const dia = at(10)
    expect(VOCATIVES.pt).not.toEqual(VOCATIVES.en)
    expect(VOCATIVES.pt).toContain('Comandante')
    // "Captain" é neutro em inglês; "Capitão" não seria em português.
    expect(VOCATIVES.en).toContain('Captain')
    expect(VOCATIVES.pt).not.toContain('Capitão')
    expect(vocativeFor(dia, 'pt')).not.toBe(vocativeFor(dia, 'en'))
  })

  it('o apelido escolhido ganha de tudo', () => {
    expect(vocativeFor(at(10), 'pt', 'Capitã')).toBe('Capitã')
  })

  it('apelido em branco não conta como escolha', () => {
    const padrao = vocativeFor(at(10), 'pt')
    expect(vocativeFor(at(10), 'pt', '   ')).toBe(padrao)
    expect(vocativeFor(at(10), 'pt', null)).toBe(padrao)
  })

  it('nunca devolve vazio, em nenhum idioma', () => {
    for (const locale of LOCALES) {
      expect(vocativeFor(at(10), locale)).toBeTruthy()
    }
  })

  it('data anterior à época não estoura o índice', () => {
    expect(vocativeFor(new Date(1969, 0, 1, 10), 'pt')).toBeTruthy()
    expect(dayNumber(new Date(1969, 0, 1))).toBeLessThan(0)
  })
})

describe('sanitizeNickname', () => {
  it('devolve null para o que não é escolha', () => {
    expect(sanitizeNickname('')).toBeNull()
    expect(sanitizeNickname('   ')).toBeNull()
    expect(sanitizeNickname(null)).toBeNull()
    expect(sanitizeNickname(undefined)).toBeNull()
  })

  it('achata espaço e quebra de linha coladas de outro lugar', () => {
    expect(sanitizeNickname('  Capit\u00e3   Marvel \n')).toBe('Capit\u00e3 Marvel')
  })

  it('corta no teto em vez de deixar a sauda\u00e7\u00e3o tomar a tela', () => {
    const longo = 'a'.repeat(NICKNAME_MAX + 20)
    expect(sanitizeNickname(longo)).toHaveLength(NICKNAME_MAX)
  })
})

describe('rerollVocative', () => {
  const dia = new Date(2026, 7, 7, 20)

  it('carimba o dia do sorteio, que \u00e9 o que o faz expirar', () => {
    const sorteio = rerollVocative(dia, 'pt', 'Comandante', () => 0)
    expect(sorteio.day).toBe(dayNumber(dia))
    expect(VOCATIVES.pt).toContain(sorteio.vocative)
  })

  it('nunca devolve a palavra que j\u00e1 est\u00e1 na tela', () => {
    for (const atual of VOCATIVES.pt) {
      for (const r of [0, 0.5, 0.999]) {
        expect(rerollVocative(dia, 'pt', atual, () => r).vocative).not.toBe(atual)
      }
    }
  })

  it('random devolvendo 1 n\u00e3o estoura o fim da lista', () => {
    const sorteio = rerollVocative(dia, 'en', 'Captain', () => 1)
    expect(VOCATIVES.en).toContain(sorteio.vocative)
  })

  it('o sorteio vale hoje e s\u00f3 hoje', () => {
    const sorteio = rerollVocative(dia, 'pt', 'Comandante', () => 0)
    expect(vocativeFor(dia, 'pt', null, sorteio)).toBe(sorteio.vocative)

    const amanha = new Date(2026, 7, 8, 20)
    expect(vocativeFor(amanha, 'pt', null, sorteio)).toBe(
      vocativeFor(amanha, 'pt'),
    )
  })

  it('apelido fixo ganha do sorteio', () => {
    const sorteio = rerollVocative(dia, 'pt', 'Comandante', () => 0)
    expect(vocativeFor(dia, 'pt', 'Capit\u00e3', sorteio)).toBe('Capit\u00e3')
  })
})

describe('aberturas da home', () => {
  const dia = new Date(2026, 7, 7, 20)

  it('\u00e9 est\u00e1vel ao longo do mesmo dia e muda no dia seguinte', () => {
    expect(openingFor(new Date(2026, 7, 7, 8), 'pt', 'resume')).toBe(
      openingFor(new Date(2026, 7, 7, 23), 'pt', 'resume'),
    )
    const hoje = openingFor(dia, 'pt', 'resume')
    const amanha = openingFor(new Date(2026, 7, 8, 20), 'pt', 'resume')
    expect(hoje).not.toBe(amanha)
  })

  it('cada estado tem a sua frase', () => {
    const kinds = ['resume', 'pick', 'start'] as const
    const frases = kinds.map((k) => openingFor(dia, 'pt', k))
    expect(new Set(frases).size).toBe(kinds.length)
  })

  it('toda frase, em todo idioma, tem o lugar do vocativo', () => {
    for (const locale of LOCALES) {
      for (const lista of Object.values(OPENINGS[locale])) {
        for (const frase of lista) expect(frase).toContain('{name}')
      }
    }
  })

  it('data anterior \u00e0 \u00e9poca n\u00e3o estoura o \u00edndice', () => {
    expect(openingFor(new Date(1969, 0, 1, 10), 'pt', 'pick')).toBeTruthy()
  })

  it('splitOpening parte no lugar do vocativo', () => {
    expect(splitOpening('Onde paramos, {name}?')).toEqual({
      before: 'Onde paramos, ',
      after: '?',
    })
  })

  it('frase sem marcador ainda renderiza inteira', () => {
    expect(splitOpening('Ol\u00e1')).toEqual({ before: 'Ol\u00e1', after: '' })
  })
})
