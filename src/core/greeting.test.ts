import { describe, expect, it } from 'vitest'
import { LOCALES } from '@core/i18n'
import {
  dayNumber,
  greetingKey,
  periodFor,
  VOCATIVES,
  vocativeFor,
} from './greeting'

function at(hour: number): Date {
  return new Date(2026, 7, 6, hour, 30)
}

describe('periodFor', () => {
  it('divide o dia nas quatro faixas', () => {
    expect(periodFor(at(7))).toBe('morning')
    expect(periodFor(at(14))).toBe('afternoon')
    expect(periodFor(at(20))).toBe('evening')
    expect(periodFor(at(2))).toBe('night')
  })

  it('acerta as bordas', () => {
    expect(periodFor(at(4))).toBe('night')
    expect(periodFor(at(5))).toBe('morning')
    expect(periodFor(at(11))).toBe('morning')
    expect(periodFor(at(12))).toBe('afternoon')
    expect(periodFor(at(17))).toBe('afternoon')
    expect(periodFor(at(18))).toBe('evening')
    expect(periodFor(at(22))).toBe('evening')
    expect(periodFor(at(23))).toBe('night')
  })

  it('devolve uma chave de mensagem que existe', () => {
    expect(greetingKey(at(9))).toBe('home.greeting.morning')
  })
})

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
