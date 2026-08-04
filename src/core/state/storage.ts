import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * Storage JSON compartilhado para stores persistidos. Baseado no localStorage,
 * com guarda para degradar a memória onde storage não existe (SSR, ou React
 * Native antes de plugar um adapter de AsyncStorage). Trocar o backend aqui é a
 * única mudança para persistir em outras plataformas — mantém os stores
 * portáveis.
 */
const memory = new Map<string, string>()

const memoryStorage: StateStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value)
  },
  removeItem: (key) => {
    memory.delete(key)
  },
}

const webStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignora falhas de quota / modo privado.
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

export const appStorage = createJSONStorage(() =>
  typeof localStorage !== 'undefined' ? webStorage : memoryStorage,
)
