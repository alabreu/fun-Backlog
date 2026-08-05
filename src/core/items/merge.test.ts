import { describe, expect, it } from 'vitest'
import { itemsToMigrate, toNewItem } from './merge'
import type { Item } from './types'

function item(over: Partial<Item> = {}): Item {
  return {
    id: Math.random().toString(36).slice(2),
    mediaType: 'anime',
    title: 'Cowboy Bebop',
    externalIds: {},
    status: 'backlog',
    tags: [],
    addedAt: '2026-01-15T00:00:00.000Z',
    ...over,
  }
}

describe('itemsToMigrate', () => {
  it('sem nada na conta, sobe a estante local inteira', () => {
    const local = [item({ title: 'A' }), item({ title: 'B' })]
    expect(itemsToMigrate(local, [])).toHaveLength(2)
  })

  it('pula o que a conta já tem pelo id externo', () => {
    const local = [item({ externalIds: { anilist: '1' } })]
    const remote = [
      item({ title: 'Outro nome', externalIds: { anilist: '1' } }),
    ]
    expect(itemsToMigrate(local, remote)).toEqual([])
  })

  it('pula o que a conta já tem por título e mídia, ignorando caixa e acento', () => {
    const local = [item({ title: 'Pokémon Violet', mediaType: 'game' })]
    const remote = [item({ title: 'pokemon violet', mediaType: 'game' })]
    expect(itemsToMigrate(local, remote)).toEqual([])
  })

  it('mesmo título em mídias diferentes não é duplicata', () => {
    const local = [item({ title: 'Duna', mediaType: 'book' })]
    const remote = [item({ title: 'Duna', mediaType: 'movie' })]
    expect(itemsToMigrate(local, remote)).toHaveLength(1)
  })

  it('dois locais iguais entre si sobem uma vez só', () => {
    const local = [item({ title: 'Akira' }), item({ title: 'akira  ' })]
    expect(itemsToMigrate(local, [])).toHaveLength(1)
  })

  it('estante local vazia não gera trabalho', () => {
    expect(itemsToMigrate([], [item()])).toEqual([])
  })
})

describe('toNewItem', () => {
  it('preserva a data em que a pessoa adicionou o item', () => {
    const original = item({ addedAt: '2026-01-15T00:00:00.000Z' })
    expect(toNewItem(original).addedAt).toBe('2026-01-15T00:00:00.000Z')
  })

  it('conserta "concluído" sem data — o check do banco recusaria a linha', () => {
    const broken = item({
      status: 'done',
      completedAt: undefined,
      addedAt: '2026-01-15T00:00:00.000Z',
    })
    expect(toNewItem(broken).completedAt).toBe('2026-01-15T00:00:00.000Z')
  })

  it('não carrega data de conclusão de quem não está concluído', () => {
    const odd = item({
      status: 'active',
      completedAt: '2026-02-02T00:00:00.000Z',
    })
    expect(toNewItem(odd).completedAt).toBeUndefined()
  })

  it('leva nota, notas, progresso e tags junto', () => {
    const full = item({
      rating: 5,
      notes: 'Melhor trilha sonora já feita.',
      progress: { unit: 'episode', current: 12, total: 26 },
      tags: ['clássico'],
    })
    const migrated = toNewItem(full)
    expect(migrated.rating).toBe(5)
    expect(migrated.notes).toBe('Melhor trilha sonora já feita.')
    expect(migrated.progress).toEqual({
      unit: 'episode',
      current: 12,
      total: 26,
    })
    expect(migrated.tags).toEqual(['clássico'])
  })
})
