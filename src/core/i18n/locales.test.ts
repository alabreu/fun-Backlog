import { describe, expect, it } from 'vitest'
import { normalizeLocale } from './locales'

describe('normalizeLocale', () => {
  it('estreita variantes regionais para o idioma base', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt')
    expect(normalizeLocale('pt-PT')).toBe('pt')
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('en-GB')).toBe('en')
  })

  it('ignora maiúsculas (locale de navegador varia)', () => {
    expect(normalizeLocale('PT-br')).toBe('pt')
    expect(normalizeLocale('EN')).toBe('en')
  })

  it('devolve null para idioma não suportado ou entrada vazia', () => {
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale('es-MX')).toBeNull()
    expect(normalizeLocale('')).toBeNull()
    expect(normalizeLocale(null)).toBeNull()
    expect(normalizeLocale(undefined)).toBeNull()
  })
})
