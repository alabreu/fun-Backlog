import { useCallback } from 'react'
import {
  translate,
  type Locale,
  type MessageKey,
  type TranslateParams,
} from '@core/i18n'
import { useLocaleStore } from '@core/state/localeStore'

export interface Translation {
  /** Traduz uma chave no idioma ativo, com interpolação opcional. */
  t: (key: MessageKey, params?: TranslateParams) => string
  locale: Locale
  setLocale: (locale: Locale) => void
}

/**
 * Função de tradução vinculada ao idioma atual. Componentes que a usam
 * re-renderizam quando o idioma muda (assinam o store de locale).
 */
export function useTranslation(): Translation {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) =>
      translate(locale, key, params),
    [locale],
  )
  return { t, locale, setLocale }
}
