import { describe, expect, it } from 'vitest'
import { isUnreleasedTmdbStatus, releasesInFuture } from './release'

const AGORA = Date.parse('2026-08-09T00:00:00Z')

describe('releasesInFuture', () => {
  it('data no futuro é obra que ainda não existe', () => {
    expect(releasesInFuture(Date.parse('2027-01-01T00:00:00Z'), AGORA)).toBe(true)
  })

  it('data no passado é obra que existe', () => {
    expect(releasesInFuture(Date.parse('2013-04-07T00:00:00Z'), AGORA)).toBe(false)
  })

  // "Não sei quando sai" é diferente de "não saiu". Tratar os dois igual
  // esconderia progresso e nota de toda obra sem data na fonte.
  it('sem data não é o mesmo que não lançada', () => {
    expect(releasesInFuture(undefined, AGORA)).toBe(false)
    expect(releasesInFuture(Number.NaN, AGORA)).toBe(false)
  })

  it('lançada hoje já conta como lançada', () => {
    expect(releasesInFuture(AGORA, AGORA)).toBe(false)
  })
})

describe('isUnreleasedTmdbStatus', () => {
  it('reconhece os estados de pré-lançamento, com a capitalização deles', () => {
    for (const s of ['Planned', 'In Production', 'Post Production', 'Rumored'])
      expect(isUnreleasedTmdbStatus(s)).toBe(true)
  })

  // Cancelada DEPOIS de ir ao ar é assistível: esconder o progresso ali
  // perderia o que a pessoa já viu.
  it('o que já existe não entra, inclusive o interrompido', () => {
    for (const s of ['Released', 'Ended', 'Returning Series', 'Canceled'])
      expect(isUnreleasedTmdbStatus(s)).toBe(false)
  })

  it('ausente é false, não um chute', () => {
    expect(isUnreleasedTmdbStatus(undefined)).toBe(false)
    expect(isUnreleasedTmdbStatus('')).toBe(false)
  })
})
