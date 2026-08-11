import { create } from 'zustand'
import type { MediaType } from '@core/items/types'
import {
  DEFAULT_PREFERENCES,
  moveMedia,
  normalizePreferences,
  toggleMedia,
  type MediaPreferences,
} from '@core/media/preferences'

/**
 * Quais categorias você quer ver, e em que ordem.
 *
 * Mesma forma do `nicknameStore` e do `localeStore`: o "cérebro" guarda só o
 * valor e as transições; a camada web semeia do localStorage e persiste (ver
 * App.tsx). Desde 11/08/2026 SEGUE A CONTA junto das outras preferências —
 * `useProfileSync` e a tabela `profiles` da migração 0009. Foi esta store que
 * puxou a sincronia: com uma preferência só a tabela não se pagava, com a
 * terceira ela passou a se pagar.
 *
 * As transições chamam as funções puras de `core/media/preferences` em vez de
 * mexer no estado à mão: a trava do "pelo menos uma ligada" mora lá, e store
 * que reimplementa regra é store que diverge.
 */
interface MediaState {
  preferences: MediaPreferences
  setPreferences: (value: unknown) => void
  toggle: (media: MediaType) => void
  move: (from: number, to: number) => void
}

export const useMediaStore = create<MediaState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  setPreferences: (value) => set({ preferences: normalizePreferences(value) }),
  toggle: (media) =>
    set((s) => ({ preferences: toggleMedia(s.preferences, media) })),
  move: (from, to) =>
    set((s) => ({
      preferences: {
        ...s.preferences,
        order: moveMedia(s.preferences.order, from, to),
      },
    })),
}))
