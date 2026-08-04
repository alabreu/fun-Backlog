import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageKey } from '@core/config'
import { localItemsRepository } from './repository'
import type { NewItem } from './types'

// localStorage não existe no ambiente node do vitest — stub em memória.
const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  })
})

const bebop: NewItem = {
  mediaType: 'anime',
  title: 'Cowboy Bebop',
  externalIds: { anilist: '1' },
}

describe('repositório local (modo convidado)', () => {
  it('começa vazio', async () => {
    expect(await localItemsRepository.list()).toEqual([])
  })

  it('completa os campos que a UI não fornece', async () => {
    const item = await localItemsRepository.add(bebop)

    expect(item.id).toBeTruthy()
    expect(item.status).toBe('backlog')
    expect(item.tags).toEqual([])
    expect(Date.parse(item.addedAt)).not.toBeNaN()
  })

  it('guarda sob o prefixo do app e devolve o mais novo primeiro', async () => {
    await localItemsRepository.add(bebop)
    await localItemsRepository.add({ ...bebop, title: 'Shirobako' })

    expect(store.has(storageKey('items'))).toBe(true)
    const titles = (await localItemsRepository.list()).map((i) => i.title)
    expect(titles).toEqual(['Shirobako', 'Cowboy Bebop'])
  })

  it('atualiza só os campos do patch', async () => {
    const item = await localItemsRepository.add(bebop)
    const updated = await localItemsRepository.update(item.id, {
      status: 'done',
      rating: 5,
    })

    expect(updated.status).toBe('done')
    expect(updated.rating).toBe(5)
    expect(updated.title).toBe('Cowboy Bebop')
    expect((await localItemsRepository.list())[0].status).toBe('done')
  })

  it('reclama ao atualizar item que não existe', async () => {
    await expect(
      localItemsRepository.update('sumiu', { status: 'done' }),
    ).rejects.toThrow('item-not-found')
  })

  it('remove sem levar os vizinhos junto', async () => {
    const first = await localItemsRepository.add(bebop)
    await localItemsRepository.add({ ...bebop, title: 'Shirobako' })

    await localItemsRepository.remove(first.id)
    const remaining = await localItemsRepository.list()
    expect(remaining.map((i) => i.title)).toEqual(['Shirobako'])
  })

  it('trata storage corrompido como catálogo vazio, sem explodir', async () => {
    store.set(storageKey('items'), '{isso não é json}')
    expect(await localItemsRepository.list()).toEqual([])
  })
})
