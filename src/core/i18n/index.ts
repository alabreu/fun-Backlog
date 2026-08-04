import { en } from './en'
import { pt } from './pt'
import type { Locale } from './locales'

export * from './locales'

export type MessageKey = keyof typeof pt
export type TranslateParams = Record<string, string | number>

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { pt, en }

/**
 * Resolve uma mensagem para um locale, com interpolação `{nome}` opcional.
 * Cai para o português e depois para a chave crua, então uma tradução faltando
 * nunca renderiza em branco. Função pura — portável para React Native.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TranslateParams,
): string {
  const table = MESSAGES[locale] ?? MESSAGES.pt
  let message = table[key] ?? pt[key] ?? key
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.split(`{${name}}`).join(String(value))
    }
  }
  return message
}
