import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item, NewItem } from '@core/items/types'

/**
 * O QUE ESTE ARQUIVO GUARDA são as duas promessas dos eventos de produto, e
 * nenhuma das duas é sobre "o evento foi disparado":
 *
 * 1. O TÍTULO NÃO VAI JUNTO. O painel quer saber quanto se cataloga, não o
 *    quê. Mandar o nome da obra faria da tabela de eventos uma segunda cópia
 *    da estante das pessoas, fora do RLS que protege a primeira — e é o tipo
 *    de campo que alguém acrescenta um dia "porque seria útil no gráfico".
 * 2. MIGRAR NÃO É ADICIONAR. Subir a estante de convidado para a conta é a
 *    mesma estante mudando de casa; contá-la daria um pico de adições no dia
 *    em que alguém criou conta, e o painel leria isso como uso.
 */

const track = vi.fn()
vi.mock('@core/analytics', () => ({ track: (...args: unknown[]) => track(...args) }))

const adicionados: NewItem[] = []
let guardados: Item[] = []

vi.mock('@core/items/repository', () => ({
  itemsRepository: () => ({
    list: async () => [],
    add: async (input: NewItem) => {
      adicionados.push(input)
      return { ...input, id: `id-${adicionados.length}`, addedAt: 'agora', tags: [], status: input.status ?? 'backlog' } as Item
    },
    update: async () => {},
    remove: async () => {},
  }),
  readLocalItems: () => guardados,
  clearLocalItems: () => {
    guardados = []
  },
}))

const { useItemsStore } = await import('./itemsStore')

function item(over: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    mediaType: 'game',
    title: 'Hollow Knight: Silksong',
    externalIds: { igdb: '228530' },
    status: 'backlog',
    tags: [],
    addedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('eventos de produto do catálogo', () => {
  beforeEach(() => {
    track.mockClear()
    adicionados.length = 0
    guardados = []
    useItemsStore.setState({
      items: [],
      pendingLocal: [],
      signedIn: false,
      justCompleted: null,
      error: null,
      loading: false,
    })
  })

  it('adicionar conta a mídia e a fonte, e nunca o título', async () => {
    await useItemsStore.getState().add({
      mediaType: 'game',
      title: 'Hollow Knight: Silksong',
      externalIds: { igdb: '228530' },
    })

    expect(track).toHaveBeenCalledWith('item_added', {
      media: 'game',
      source: 'igdb',
      status: 'backlog',
    })
    const [, meta] = track.mock.calls[0] as [string, Record<string, unknown>]
    expect(JSON.stringify(meta)).not.toContain('Silksong')
    // Nem o id da obra: ele aponta para ela tão bem quanto o nome.
    expect(JSON.stringify(meta)).not.toContain('228530')
  })

  it('obra digitada à mão se identifica como manual', async () => {
    await useItemsStore
      .getState()
      .add({ mediaType: 'book', title: 'Um caderno', externalIds: {} })

    expect(track).toHaveBeenCalledWith(
      'item_added',
      expect.objectContaining({ source: 'manual' }),
    )
  })

  it('concluir conta uma vez, e tocar de novo no mesmo chip não conta', async () => {
    useItemsStore.setState({ items: [item()] })

    await useItemsStore.getState().setStatus('i1', 'done')
    await useItemsStore.getState().setStatus('i1', 'done')

    const conclusoes = track.mock.calls.filter((c) => c[0] === 'item_completed')
    expect(conclusoes).toHaveLength(1)
  })

  it('mover para outro status não conta como conclusão', async () => {
    useItemsStore.setState({ items: [item()] })

    await useItemsStore.getState().setStatus('i1', 'active')
    await useItemsStore.getState().setStatus('i1', 'paused')

    expect(track.mock.calls.filter((c) => c[0] === 'item_completed')).toHaveLength(0)
  })

  it('migrar a estante de convidado não conta como adicionar', async () => {
    useItemsStore.setState({
      signedIn: true,
      pendingLocal: [item({ id: 'l1' }), item({ id: 'l2' })],
    })

    await useItemsStore.getState().migrateLocal()

    expect(adicionados).toHaveLength(2)
    expect(track.mock.calls.filter((c) => c[0] === 'item_added')).toHaveLength(0)
  })
})
