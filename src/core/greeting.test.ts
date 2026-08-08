import { describe, expect, it } from 'vitest'
import { LOCALES } from '@core/i18n'
import {
  NICKNAME_MAX,
  openingFor,
  OPENINGS,
  sanitizeNickname,
  splitOpening,
  stripVocative,
  vocativeFor,
} from './greeting'

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

describe('aberturas da home', () => {
  const dia = new Date(2026, 7, 7, 20)

  it('\u00e9 est\u00e1vel ao longo do mesmo dia', () => {
    expect(openingFor(new Date(2026, 7, 7, 8), 'pt', 'resume')).toBe(
      openingFor(new Date(2026, 7, 7, 23), 'pt', 'resume'),
    )
  })

  // Testa o MECANISMO, n\u00e3o a configura\u00e7\u00e3o de hoje: com a rota\u00e7\u00e3o desligada
  // (uma frase por estado) a frase tem que ficar; com mais de uma, tem que
  // trocar de um dia para o outro. Assim o teste sobrevive a ligar e desligar
  // a rota\u00e7\u00e3o, em vez de precisar ser reescrito junto.
  it('rotaciona com mais de uma frase, e segura quando h\u00e1 uma s\u00f3', () => {
    for (const locale of LOCALES) {
      for (const kind of ['resume', 'pick', 'start'] as const) {
        const pool = OPENINGS[locale][kind]
        const hoje = openingFor(dia, locale, kind)
        const amanha = openingFor(new Date(2026, 7, 8, 20), locale, kind)
        if (pool.length > 1) expect(hoje).not.toBe(amanha)
        else expect(hoje).toBe(amanha)
      }
    }
  })

  it('cada estado tem a sua frase — "onde paramos" numa estante vazia mentiria', () => {
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

  // Sem espaço no fim: a tela quebra a linha exatamente neste ponto.
  it('splitOpening parte no lugar do vocativo, sem espaço pendurado', () => {
    expect(splitOpening('Onde paramos, {name}?')).toEqual({
      before: 'Onde paramos,',
      after: '?',
    })
  })

  it('frase sem marcador ainda renderiza inteira', () => {
    expect(splitOpening('Ol\u00e1')).toEqual({ before: 'Ol\u00e1', after: '' })
  })
})

describe('stripVocative', () => {
  it('leva a v\u00edrgula junto — "Onde paramos,?" n\u00e3o \u00e9 frase', () => {
    expect(stripVocative('Onde paramos, {name}?')).toBe('Onde paramos?')
    expect(stripVocative('Where were we, {name}?')).toBe('Where were we?')
  })

  it('toda frase de toda l\u00edngua sobrevive sem o vocativo', () => {
    for (const locale of LOCALES) {
      for (const lista of Object.values(OPENINGS[locale])) {
        for (const frase of lista) {
          const sem = stripVocative(frase)
          expect(sem).not.toContain('{name}')
          // Nada de v\u00edrgula ou espa\u00e7o pendurado antes da pontua\u00e7\u00e3o final.
          expect(sem).not.toMatch(/[,;:\s]\?$/)
          expect(sem.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('frase sem o marcador fica intacta', () => {
    expect(stripVocative('Bora?')).toBe('Bora?')
  })

  it('vocativo \u00e9 s\u00f3 o que a pessoa escreveu', () => {
    expect(vocativeFor('Capit\u00e3')).toBe('Capit\u00e3')
    expect(vocativeFor('  Capit\u00e3  ')).toBe('Capit\u00e3')
    // Vazio n\u00e3o \u00e9 estado incompleto: \u00e9 "sem vocativo".
    expect(vocativeFor('')).toBeNull()
    expect(vocativeFor('   ')).toBeNull()
    expect(vocativeFor(null)).toBeNull()
    expect(vocativeFor()).toBeNull()
  })
})
