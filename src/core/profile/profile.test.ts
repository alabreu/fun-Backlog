import { describe, expect, it } from 'vitest'
import { MEDIA_TYPES } from '@core/items/types'
import {
  normalizeProfile,
  profileToRow,
  sameProfile,
  type Profile,
} from './profile'

/**
 * O perfil vem de UM BANCO, escrito por uma versão anterior do app e por
 * qualquer aparelho da pessoa. Nada aqui pode derrubar o boot — o pior desfecho
 * aceitável é uma preferência voltar ao padrão.
 */

const base: Profile = {
  locale: 'pt',
  theme: 'dark',
  region: 'BR',
  nickname: 'Xand',
  safeSearch: true,
  mediaPreferences: { order: [...MEDIA_TYPES], disabled: [] },
}

describe('normalizeProfile', () => {
  it('lê a linha inteira', () => {
    const profile = normalizeProfile({
      locale: 'en',
      theme: 'light',
      region: 'PT',
      nickname: 'Xand',
      safe_search: false,
      media_preferences: { order: ['book'], disabled: ['anime'] },
    })
    expect(profile.locale).toBe('en')
    expect(profile.theme).toBe('light')
    expect(profile.region).toBe('PT')
    expect(profile.nickname).toBe('Xand')
    expect(profile.safeSearch).toBe(false)
    expect(profile.mediaPreferences.disabled).toEqual(['anime'])
    // A ordem salva não conhecia as outras mídias: elas entram no fim.
    expect(profile.mediaPreferences.order).toHaveLength(MEDIA_TYPES.length)
    expect(profile.mediaPreferences.order[0]).toBe('book')
  })

  it('linha vazia devolve os padrões', () => {
    const profile = normalizeProfile({})
    expect(profile.locale).toBe('pt')
    expect(profile.nickname).toBe(null)
    expect(profile.mediaPreferences.disabled).toEqual([])
  })

  it('não derruba nada com valor estranho', () => {
    const profile = normalizeProfile({
      locale: 'klingon',
      theme: 'roxo',
      region: 'Marte',
      nickname: 42,
      media_preferences: 'nem json',
    })
    expect(profile.locale).toBe('pt')
    expect(profile.theme).toBe('system')
    expect(profile.region).toBe(null)
    expect(profile.nickname).toBe(null)
    expect(profile.mediaPreferences.order).toHaveLength(MEDIA_TYPES.length)
  })

  it('só o false explícito desliga o filtro adulto', () => {
    // Errar para "escondeu demais" é recuperável; o contrário não.
    expect(normalizeProfile({}).safeSearch).toBe(true)
    expect(normalizeProfile({ safe_search: null }).safeSearch).toBe(true)
    expect(normalizeProfile({ safe_search: false }).safeSearch).toBe(false)
  })

  it('vazio no banco é "sem vocativo"', () => {
    expect(normalizeProfile({ nickname: '' }).nickname).toBe(null)
    expect(normalizeProfile({ nickname: '   ' }).nickname).toBe(null)
  })

  it('país nulo é "nunca escolheu", e não um país', () => {
    expect(normalizeProfile({ region: null }).region).toBe(null)
  })
})

describe('profileToRow', () => {
  it('grava o vocativo ausente como vazio, não como nulo', () => {
    // Com nulo, apagar o apelido seria indistinguível de nunca ter preenchido —
    // e a limpeza não atravessaria para o outro aparelho.
    expect(profileToRow({ ...base, nickname: null }).nickname).toBe('')
  })

  it('a volta preserva o que foi gravado', () => {
    const ida = profileToRow(base)
    expect(normalizeProfile(ida as never)).toEqual(base)
  })
})

describe('sameProfile', () => {
  it('reconhece o idêntico', () => {
    expect(sameProfile(base, { ...base })).toBe(true)
  })

  it('vocativo ausente e vazio são a mesma coisa', () => {
    // Os dois viram '' no banco; sem isto o app gravaria de novo a cada login.
    expect(sameProfile({ ...base, nickname: null }, { ...base, nickname: '' as never })).toBe(
      true,
    )
  })

  it('vê a diferença em cada campo', () => {
    expect(sameProfile(base, { ...base, locale: 'en' })).toBe(false)
    expect(sameProfile(base, { ...base, theme: 'light' })).toBe(false)
    expect(sameProfile(base, { ...base, region: null })).toBe(false)
    expect(sameProfile(base, { ...base, nickname: 'Outro' })).toBe(false)
    expect(sameProfile(base, { ...base, safeSearch: false })).toBe(false)
  })

  it('vê a diferença na ORDEM das categorias', () => {
    // Reordenar é uma preferência tanto quanto ligar e desligar.
    const invertida = {
      ...base,
      mediaPreferences: {
        ...base.mediaPreferences,
        order: [...base.mediaPreferences.order].reverse(),
      },
    }
    expect(sameProfile(base, invertida)).toBe(false)
  })

  it('vê a diferença nas categorias desligadas', () => {
    const semAnime = {
      ...base,
      mediaPreferences: { ...base.mediaPreferences, disabled: ['anime' as const] },
    }
    expect(sameProfile(base, semAnime)).toBe(false)
  })
})
