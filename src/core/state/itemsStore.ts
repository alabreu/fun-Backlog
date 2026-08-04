import { create } from 'zustand'
import { itemsRepository } from '@core/items/repository'
import { datesForStatus } from '@core/items/status'
import type { Item, ItemPatch, NewItem } from '@core/items/types'

/**
 * O catálogo em memória. Uma cópia só, e o repositório por baixo — a UI nunca
 * sabe se está falando com localStorage ou com o Postgres.
 *
 * Escrita é OTIMISTA: mudar o status de um item tem que responder no toque, e
 * esperar a ida ao servidor num app que se quer gostoso de usar é a diferença
 * entre "estante" e "formulário". Em caso de erro a lista é recarregada da
 * fonte, então a tela nunca fica mentindo por muito tempo.
 */
interface ItemsState {
  items: Item[]
  loading: boolean
  error: string | null
  /** Sessão ativa, resolvida pela UI — decide o repositório de cada chamada. */
  signedIn: boolean

  load: (signedIn: boolean) => Promise<void>
  add: (input: NewItem) => Promise<Item>
  update: (id: string, patch: ItemPatch) => Promise<void>
  setStatus: (id: string, status: Item['status']) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  signedIn: false,

  async load(signedIn) {
    set({ loading: true, error: null, signedIn })
    try {
      const items = await itemsRepository(signedIn).list()
      set({ items, loading: false })
    } catch {
      set({ loading: false, error: 'load-failed' })
    }
  },

  async add(input) {
    const item = await itemsRepository(get().signedIn).add(input)
    set((state) => ({ items: [item, ...state.items] }))
    return item
  },

  async update(id, patch) {
    const previous = get().items
    set({
      items: previous.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })
    try {
      await itemsRepository(get().signedIn).update(id, patch)
    } catch {
      set({ items: previous, error: 'save-failed' })
    }
  },

  /**
   * Status carrega as datas junto. Fica aqui e não na tela porque "concluir
   * carimba a data de conclusão" é regra do produto, e a migração 0004 tem um
   * check que RECUSA `done` sem `completed_at` — deixar isso na UI seria
   * esperar que toda tela futura lembre da regra.
   */
  async setStatus(id, status) {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    await get().update(id, {
      status,
      ...datesForStatus(status, item, new Date().toISOString()),
    })
  },

  async remove(id) {
    const previous = get().items
    set({ items: previous.filter((i) => i.id !== id) })
    try {
      await itemsRepository(get().signedIn).remove(id)
    } catch {
      set({ items: previous, error: 'save-failed' })
    }
  },
}))
