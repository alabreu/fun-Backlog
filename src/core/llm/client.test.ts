import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageKey } from '@core/config'
import {
  getUserKey,
  proxyConfigured,
  resolveLlmMode,
  setUserKey,
} from './client'

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

describe('chave BYOK', () => {
  it('não existe até o usuário colar uma', () => {
    expect(getUserKey()).toBeNull()
  })

  it('grava e apaga sob o prefixo do app', () => {
    setUserKey('sk-or-v1-exemplo')
    expect(getUserKey()).toBe('sk-or-v1-exemplo')
    // Derivado de STORAGE_PREFIX, não escrito à mão: o prefixo muda em todo
    // app criado a partir do template, e o literal quebrava na renomeação.
    expect(store.has(storageKey('llm-key'))).toBe(true)

    setUserKey(null)
    expect(getUserKey()).toBeNull()
  })
})

describe('resolveLlmMode', () => {
  it('pré-condição: sem backend configurado no ambiente de teste', () => {
    expect(proxyConfigured).toBe(false)
  })

  it('sem chave e sem sessão, o LLM fica indisponível', async () => {
    await expect(resolveLlmMode()).resolves.toBe('unavailable')
  })

  it('chave do usuário tem precedência — não consome a cota do operador', async () => {
    setUserKey('sk-or-v1-exemplo')
    await expect(resolveLlmMode()).resolves.toBe('byok')
  })
})
