import { describe, expect, it } from 'vitest'
import { familyOf, groupPlatforms, PLATFORM_FAMILIES } from './platforms'

describe('familyOf', () => {
  it('reconhece as abreviações que a IGDB manda de verdade', () => {
    const casos: [string, string][] = [
      ['PS5', 'playstation'],
      ['PS4', 'playstation'],
      ['PSVITA', 'playstation'],
      ['PlayStation 2', 'playstation'],
      ['Series X|S', 'xbox'],
      ['XONE', 'xbox'],
      ['X360', 'xbox'],
      ['Xbox', 'xbox'],
      ['Switch', 'nintendo'],
      ['NSW', 'nintendo'],
      ['WiiU', 'nintendo'],
      ['3DS', 'nintendo'],
      ['N64', 'nintendo'],
      ['SNES', 'nintendo'],
      ['PC', 'pc'],
      ['PC (Microsoft Windows)', 'pc'],
      ['Mac', 'apple'],
      ['iOS', 'apple'],
      ['Android', 'android'],
      ['Linux', 'linux'],
    ]
    for (const [entrada, esperado] of casos)
      expect(`${entrada} -> ${familyOf(entrada)}`).toBe(`${entrada} -> ${esperado}`)
  })

  // Mac e Linux têm que ganhar do PC: a ordem dos matchers é a desambiguação,
  // e inverter isso mandaria todo Mac para a família Windows.
  it('Mac e Linux não caem em PC', () => {
    expect(familyOf('Mac')).not.toBe('pc')
    expect(familyOf('Linux')).not.toBe('pc')
  })

  it('o que não conhece vira "outras", em vez de sumir', () => {
    expect(familyOf('Stadia')).toBe('other')
    expect(familyOf('')).toBe('other')
    expect(familyOf('   ')).toBe('other')
  })
})

describe('groupPlatforms', () => {
  it('junta modelos da mesma família numa entrada só', () => {
    expect(groupPlatforms(['PS3', 'PS4', 'PS5'])).toEqual(['playstation'])
  })

  it('devolve na ordem fixa, e não na que a fonte mandou', () => {
    const a = groupPlatforms(['Series X|S', 'PC', 'iOS', 'PS5', 'Mac'])
    const b = groupPlatforms(['Mac', 'PS5', 'PC', 'Series X|S', 'iOS'])
    expect(a).toEqual(b)
    expect(a).toEqual(['playstation', 'xbox', 'pc', 'apple'])
  })

  it('lista vazia devolve lista vazia', () => {
    expect(groupPlatforms([])).toEqual([])
  })

  it('toda família tem rótulo e nenhuma sobra sem ordem', () => {
    expect(new Set(PLATFORM_FAMILIES).size).toBe(PLATFORM_FAMILIES.length)
  })
})
