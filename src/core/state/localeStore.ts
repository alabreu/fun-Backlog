import { create } from 'zustand'
import { DEFAULT_LOCALE, type Locale } from '@core/i18n'

/**
 * Idioma atual da UI. "Cérebro" portável: default português; a camada web
 * semeia do navegador/localStorage e persiste as mudanças (ver App.tsx).
 */
interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}))
