import { describe, expect, it } from 'vitest'
import {
  hidesWhenEmpty,
  sectionDensity,
  sectionOf,
  shelfSectionKeys,
} from './sections'
import type { Item, ItemStatus } from './types'

const HOJE = Date.parse('2026-08-10T12:00:00.000Z')

function item(over: Partial<Item> = {}): Item {
  return {
    id: 'x',
    mediaType: 'anime',
    title: 'Uma obra',
    externalIds: {},
    status: 'backlog',
    tags: [],
    addedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('em que seção o item cai', () => {
  it('sem data, fica na fila — desconhecido não é "não lançado"', () => {
    expect(sectionOf(item(), HOJE)).toBe('backlog')
  })

  it('data no futuro tira da fila', () => {
    expect(sectionOf(item({ releasesAt: '2026-12-01' }), HOJE)).toBe('unreleased')
  })

  it('data no passado fica na fila', () => {
    expect(sectionOf(item({ releasesAt: '2024-04-17' }), HOJE)).toBe('backlog')
  })

  it('data ilegível não tira ninguém do lugar', () => {
    expect(sectionOf(item({ releasesAt: 'qualquer coisa' }), HOJE)).toBe('backlog')
  })

  // Se a pessoa disse que está assistindo, o app não a contradiz — mesmo com a
  // fonte afirmando que a obra não estreou.
  it('só a FILA se divide', () => {
    for (const s of ['active', 'paused', 'done', 'abandoned'] as ItemStatus[])
      expect(sectionOf(item({ status: s, releasesAt: '2026-12-01' }), HOJE)).toBe(s)
  })

  // O critério é a comparação com o relógio, então a virada acontece sozinha.
  it('a obra migra sozinha no dia da estreia', () => {
    const obra = item({ releasesAt: '2026-09-01' })
    expect(sectionOf(obra, Date.parse('2026-08-31T23:00:00Z'))).toBe('unreleased')
    expect(sectionOf(obra, Date.parse('2026-09-02T00:00:00Z'))).toBe('backlog')
  })
})

describe('ordem das seções', () => {
  it('"não lançados" vem logo depois da fila', () => {
    expect(shelfSectionKeys('anime')).toEqual([
      'active',
      'backlog',
      'unreleased',
      'done',
      'paused',
      'abandoned',
    ])
  })

  // Filme abre com a fila, então a nova seção entra em segundo lugar lá.
  it('respeita a ordem própria de cada mídia', () => {
    expect(shelfSectionKeys('movie')).toEqual([
      'backlog',
      'unreleased',
      'done',
      'abandoned',
    ])
  })

  it('só "não lançados" some quando vazia', () => {
    expect(hidesWhenEmpty('unreleased')).toBe(true)
    expect(hidesWhenEmpty('backlog')).toBe(false)
    expect(hidesWhenEmpty('done')).toBe(false)
  })
})

describe('peso visual da seção', () => {
  // Horizontal, e não uma grade maior: em grade cada duas obras empurram a
  // seção seguinte uma fileira para baixo; na horizontal a altura é fixa.
  it('só o que está em curso vira carrossel', () => {
    expect(sectionDensity('active')).toBe('carousel')
  })

  // "Não lançados" acompanha a fila apesar de não dar para fazer nada com ela:
  // é a estante da expectativa, e é onde a capa faz trabalho emocional.
  it('a fila e o que ainda estreia ficam na grade', () => {
    expect(sectionDensity('backlog')).toBe('grid')
    expect(sectionDensity('unreleased')).toBe('grid')
  })

  // Pausado é o caso que se discute: parado é parado — se a obra estivesse
  // viva, ela estaria em "assistindo".
  it('o que parou ou acabou vira lista', () => {
    for (const s of ['paused', 'done', 'abandoned'] as const)
      expect(sectionDensity(s)).toBe('list')
  })

  // A estante de filme não tem "assistindo" nem "pausado" (decisão 16), então
  // ela nasce sem destaque nenhum — e isso é resultado válido, não um furo.
  it('sem seção em curso, nada vira carrossel', () => {
    const densidades = shelfSectionKeys('movie').map(sectionDensity)
    expect(densidades).not.toContain('carousel')
    expect(densidades).toContain('grid')
    expect(densidades).toContain('list')
  })
})
