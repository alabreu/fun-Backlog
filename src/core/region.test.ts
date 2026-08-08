import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REGION,
  normalizeRegion,
  regionForLocale,
  regionFromLanguageTag,
  regionName,
  REGIONS,
  sortedRegions,
} from './region'

describe('normalizeRegion', () => {
  it('aceita o código em qualquer caixa e com espaço em volta', () => {
    expect(normalizeRegion('br')).toBe('BR')
    expect(normalizeRegion(' pt ')).toBe('PT')
  })

  it('recusa o que não está na lista, em vez de repassar', () => {
    expect(normalizeRegion('XX')).toBeNull()
    expect(normalizeRegion('BRA')).toBeNull()
    expect(normalizeRegion('')).toBeNull()
    expect(normalizeRegion(null)).toBeNull()
  })
})

describe('regionFromLanguageTag', () => {
  it('tira o país da tag do navegador', () => {
    expect(regionFromLanguageTag('pt-BR')).toBe('BR')
    expect(regionFromLanguageTag('en_US')).toBe('US')
  })

  // Sem esta parte, `zh-Hant-TW` daria país nenhum: o pedaço logo depois do
  // idioma é a ESCRITA, não o país.
  it('atravessa a escrita para achar o país', () => {
    expect(regionFromLanguageTag('zh-Hant-TW')).toBe('TW')
  })

  it('tag sem país devolve null, para a decisão passar adiante', () => {
    expect(regionFromLanguageTag('pt')).toBeNull()
    expect(regionFromLanguageTag('en')).toBeNull()
    expect(regionFromLanguageTag(undefined)).toBeNull()
  })

  it('país fora da lista não vira escolha', () => {
    expect(regionFromLanguageTag('en-ZZ')).toBeNull()
  })
})

describe('regionForLocale', () => {
  it('é o último recurso, não a fonte da verdade', () => {
    expect(regionForLocale('pt')).toBe('BR')
    expect(regionForLocale('en')).toBe('US')
  })

  it('o padrão do app está na lista', () => {
    expect(REGIONS).toContain(DEFAULT_REGION)
  })
})

describe('nomes de país', () => {
  it('vêm traduzidos pelo Intl, não de tabela nossa', () => {
    expect(regionName('DE', 'pt')).not.toBe(regionName('DE', 'en'))
  })

  it('a ordem alfabética segue o idioma da interface', () => {
    const pt = sortedRegions('pt')
    const en = sortedRegions('en')
    expect(pt).toHaveLength(REGIONS.length)
    // Mesma lista, ordens diferentes: "Alemanha" e "Germany" não caem no mesmo
    // lugar. Se isto passar a ser igual, a tela voltou a ordenar pelo código.
    expect(pt).not.toEqual(en)
    expect([...pt].sort()).toEqual([...en].sort())
  })
})
