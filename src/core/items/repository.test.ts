import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageKey } from '@core/config'
import { localItemsRepository, toRow } from './repository'
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

describe('toRow', () => {
  // O BUG QUE ESTE BLOCO EXISTE PARA IMPEDIR: apagar a nota mandava um UPDATE
  // vazio. `{ rating: undefined }` é "limpe" e `{}` é "não mexa", e a versão
  // anterior (`patch.rating !== undefined`) lia os dois como a segunda coisa —
  // então na conta a nota era impossível de tirar, e voltava sozinha ao
  // recarregar. No modo convidado nunca deu: ali o update é um spread.
  it('chave presente com vazio vira NULL — é assim que se apaga', () => {
    expect(toRow({ rating: undefined })).toEqual({ rating: null })
    expect(toRow({ notes: undefined })).toEqual({ notes: null })
    expect(toRow({ progress: undefined })).toEqual({ progress: null })
    expect(toRow({ completedAt: undefined })).toEqual({ completed_at: null })
  })

  it('chave ausente não entra no UPDATE', () => {
    expect(toRow({ status: 'done' })).toEqual({ status: 'done' })
  })

  // `favorite` e `tags` nasceram em migrações posteriores: mandá-las num banco
  // que ainda não as tem derruba o update INTEIRO, levando junto a mudança que
  // a pessoa queria salvar.
  it('não inventa coluna que o patch não mencionou', () => {
    const row = toRow({ rating: 5 })
    expect('favorite' in row).toBe(false)
    expect('tags' in row).toBe(false)
    expect('added_at' in row).toBe(false)
  })

  it('traduz o nome do campo para a coluna', () => {
    expect(toRow({ coverUrl: 'https://x/y.jpg', startedAt: '2026-01-01' })).toEqual({
      cover_url: 'https://x/y.jpg',
      started_at: '2026-01-01',
    })
  })
})
