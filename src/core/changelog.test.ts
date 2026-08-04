import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHANGELOG, getUnreadCount, markChangelogSeen } from './changelog'

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

describe('changelog não lido', () => {
  it('quem nunca abriu tem tudo como não lido (a feature se anuncia)', () => {
    expect(getUnreadCount()).toBe(CHANGELOG.length)
  })

  it('zera depois de marcar como visto', () => {
    markChangelogSeen()
    expect(getUnreadCount()).toBe(0)
  })

  it('id desconhecido no storage conta tudo como não lido', () => {
    store.set('meu-app.changelog-last-seen', 'id-que-nao-existe')
    expect(getUnreadCount()).toBe(CHANGELOG.length)
  })
})
