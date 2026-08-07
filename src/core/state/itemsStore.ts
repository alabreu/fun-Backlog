import { create } from 'zustand'
import { itemsToMigrate, toNewItem } from '@core/items/merge'
import {
  clearLocalItems,
  itemsRepository,
  readLocalItems,
} from '@core/items/repository'
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

  /** Itens do modo convidado que ainda não estão na conta (vazio = nada a fazer). */
  pendingLocal: Item[]
  migrating: boolean

  /**
   * O item que ACABOU de ser concluído, para a UI comemorar. Fica no store e
   * não em prop da tela porque concluir vai acontecer de vários lugares (o
   * sheet hoje, um gesto no grid amanhã) e a recompensa tem que ser a mesma.
   * É dado, não DOM — o core continua sem saber o que a tela faz com isso.
   */
  justCompleted: Item | null

  load: (signedIn: boolean) => Promise<void>
  add: (input: NewItem) => Promise<Item>
  update: (id: string, patch: ItemPatch) => Promise<void>
  setStatus: (id: string, status: Item['status']) => Promise<void>
  remove: (id: string) => Promise<void>
  migrateLocal: () => Promise<void>
  dismissLocal: () => void
  clearJustCompleted: () => void
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  signedIn: false,
  pendingLocal: [],
  migrating: false,
  justCompleted: null,

  async load(signedIn) {
    set({ loading: true, error: null, signedIn })
    try {
      const items = await itemsRepository(signedIn).list()

      // Logado, olha também o storage local: se sobrou estante de convidado
      // que a conta ainda não tem, a UI pergunta o que fazer com ela.
      const pendingLocal = signedIn
        ? itemsToMigrate(readLocalItems(), items)
        : []

      set({ items, pendingLocal, loading: false })
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

    // Só comemora quem ACABOU de chegar em "concluído". Reabrir o item e tocar
    // no mesmo chip de novo não é conquista nova, e uma celebração repetida
    // deixa de ser recompensa e vira interrupção.
    const isNewCompletion = status === 'done' && item.status !== 'done'

    await get().update(id, {
      status,
      ...datesForStatus(status, item, new Date().toISOString()),
    })

    if (isNewCompletion) {
      const updated = get().items.find((i) => i.id === id)
      if (updated) set({ justCompleted: updated })
    }
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

  /**
   * Sobe a estante de convidado para a conta. Um item por vez, e sem otimismo:
   * aqui a confirmação do servidor é o que importa, porque o storage local só
   * pode ser limpo depois que TUDO subiu. Se um item falhar, o local fica
   * intacto e a pergunta reaparece na próxima abertura — perder a estante de
   * alguém por causa de um 500 no meio da lista seria imperdoável.
   */
  async migrateLocal() {
    const { pendingLocal, signedIn } = get()
    if (!signedIn || pendingLocal.length === 0) return

    set({ migrating: true, error: null })
    const repository = itemsRepository(true)
    const created: Item[] = []

    try {
      for (const item of pendingLocal) {
        created.push(await repository.add(toNewItem(item)))
      }
    } catch {
      // Parcial: o que subiu aparece na estante, o local continua guardado.
      set((state) => ({
        items: [...created, ...state.items],
        pendingLocal: itemsToMigrate(readLocalItems(), [
          ...created,
          ...state.items,
        ]),
        migrating: false,
        error: 'migrate-failed',
      }))
      return
    }

    clearLocalItems()
    set((state) => ({
      items: [...created, ...state.items],
      pendingLocal: [],
      migrating: false,
    }))
  },

  /** "Agora não": some com a pergunta desta sessão, sem apagar nada. Ela volta
   *  na próxima abertura, de propósito — item invisível para sempre seria pior. */
  dismissLocal() {
    set({ pendingLocal: [] })
  },

  clearJustCompleted() {
    set({ justCompleted: null })
  },
}))
