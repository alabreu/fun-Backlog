/** Idiomas suportados na UI. "Cérebro" portável — nada de DOM/UI aqui. */
export const LOCALES = ['pt', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pt'

/** Nome nativo de cada idioma, para o seletor. */
export const LOCALE_NAMES: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
}

/** Estreita uma string arbitrária (locale do navegador, storage) para uma suportada. */
export function normalizeLocale(
  value: string | null | undefined,
): Locale | null {
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('pt')) return 'pt'
  if (lower.startsWith('en')) return 'en'
  return null
}
