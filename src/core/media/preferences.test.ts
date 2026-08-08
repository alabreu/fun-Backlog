import { describe, expect, it } from 'vitest'
import { MEDIA_TYPES } from '@core/items/types'
import {
  DEFAULT_PREFERENCES,
  enabledMedia,
  isMediaEnabled,
  moveMedia,
  normalizePreferences,
  parsePreferences,
  serializePreferences,
  toggleMedia,
} from './preferences'

describe('normalizePreferences', () => {
  it('sem nada salvo, tudo ligado na ordem canônica', () => {
    expect(normalizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES)
    expect(normalizePreferences(null).order).toEqual([...MEDIA_TYPES])
  })

  // O caso de quem atualiza o app: a ordem salva é de uma versão que não
  // conhecia a mídia nova. Ela tem que APARECER, não nascer invisível.
  it('mídia que a ordem salva não conhece entra no fim', () => {
    const prefs = normalizePreferences({ order: ['book', 'game'] })
    expect(prefs.order.slice(0, 2)).toEqual(['book', 'game'])
    expect([...prefs.order].sort()).toEqual([...MEDIA_TYPES].sort())
  })

  it('descarta lixo: repetido, desconhecido e o que não é lista', () => {
    const prefs = normalizePreferences({
      order: ['book', 'book', 'vinil', 42, null],
      disabled: 'anime',
    })
    expect(prefs.order[0]).toBe('book')
    expect(prefs.order).toHaveLength(MEDIA_TYPES.length)
    expect(prefs.disabled).toEqual([])
  })

  it('desligada que não existe mais some da lista', () => {
    expect(normalizePreferences({ disabled: ['vinil', 'anime'] }).disabled).toEqual(
      ['anime'],
    )
  })

  // A trava, no ponto onde ela protege de verdade: um localStorage adulterado
  // (ou de uma versão com bug) não pode abrir o app sem nenhuma categoria.
  it('tudo desligado no armazenamento volta com tudo ligado', () => {
    const prefs = normalizePreferences({ disabled: [...MEDIA_TYPES] })
    expect(prefs.disabled).toEqual([])
    expect(enabledMedia(prefs)).toHaveLength(MEDIA_TYPES.length)
  })
})

describe('enabledMedia', () => {
  it('respeita a ordem escolhida, não a canônica', () => {
    const prefs = normalizePreferences({
      order: ['book', 'anime', 'game', 'movie', 'series'],
      disabled: ['anime'],
    })
    expect(enabledMedia(prefs)).toEqual(['book', 'game', 'movie', 'series'])
  })
})

describe('toggleMedia', () => {
  it('desliga e religa', () => {
    const off = toggleMedia(DEFAULT_PREFERENCES, 'anime')
    expect(isMediaEnabled(off, 'anime')).toBe(false)
    expect(isMediaEnabled(toggleMedia(off, 'anime'), 'anime')).toBe(true)
  })

  it('não desliga a última ligada', () => {
    let prefs = DEFAULT_PREFERENCES
    for (const media of MEDIA_TYPES) prefs = toggleMedia(prefs, media)
    expect(enabledMedia(prefs)).toHaveLength(1)
    // Insistir no interruptor da que sobrou não muda nada.
    const ultima = enabledMedia(prefs)[0]
    expect(toggleMedia(prefs, ultima)).toBe(prefs)
  })

  // Religar tem que devolver a categoria ao LUGAR dela, e não ao fim da fila.
  it('religar não mexe na posição', () => {
    const prefs = normalizePreferences({ order: ['anime', 'game', 'movie', 'series', 'book'] })
    const voltou = toggleMedia(toggleMedia(prefs, 'anime'), 'anime')
    expect(enabledMedia(voltou)[0]).toBe('anime')
  })
})

describe('moveMedia', () => {
  const base = ['game', 'movie', 'series', 'anime', 'book'] as const

  it('move para cima e para baixo', () => {
    expect(moveMedia([...base], 3, 0)).toEqual([
      'anime',
      'game',
      'movie',
      'series',
      'book',
    ])
    expect(moveMedia([...base], 0, 4)).toEqual([
      'movie',
      'series',
      'anime',
      'book',
      'game',
    ])
  })

  it('índice inválido ou parado devolve a mesma ordem', () => {
    const order = [...base]
    expect(moveMedia(order, 2, 2)).toBe(order)
    expect(moveMedia(order, -1, 0)).toBe(order)
    expect(moveMedia(order, 0, 99)).toBe(order)
  })

  it('não perde nem duplica ninguém', () => {
    const movido = moveMedia([...base], 4, 1)
    expect([...movido].sort()).toEqual([...base].sort())
  })
})

describe('parsePreferences', () => {
  it('ida e volta preserva a escolha', () => {
    const prefs = toggleMedia(
      normalizePreferences({ order: ['book', 'game', 'movie', 'series', 'anime'] }),
      'anime',
    )
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs)
  })

  it('JSON quebrado não derruba o boot', () => {
    expect(parsePreferences('{isso não é json')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
  })
})
