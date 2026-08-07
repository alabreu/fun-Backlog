import { create } from 'zustand'
import { DEFAULT_THEME, type Theme } from '@core/theme'

/**
 * Tema escolhido. Mesma forma do `localeStore`: o store guarda só o valor, e a
 * camada web semeia do localStorage, aplica no `<html>` e persiste (App.tsx).
 */
interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,
  setTheme: (theme) => set({ theme }),
}))
