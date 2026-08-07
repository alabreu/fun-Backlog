/**
 * Tema da interface. "Cérebro" portável — nada de DOM aqui; quem aplica o
 * atributo no `<html>` é a camada web (`src/ui/theme.ts`).
 *
 * Três estados, e o terceiro é o padrão de propósito: `system` acompanha o
 * `prefers-color-scheme` do aparelho, que é o que a maioria já configurou uma
 * vez e não quer reconfigurar em cada app. `light` e `dark` são a escolha de
 * quem quer o contrário do sistema em UM app — o que é comum justamente num app
 * de sofá, usado no escuro com o celular no claro.
 */
export const THEMES = ['system', 'light', 'dark'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'system'

/**
 * Tema TRAVADO para todo o app. Decisão estética: um app de entretenimento
 * pede o escuro, e oferecer a escolha diluía a identidade antes mesmo de ela
 * existir. Ver docs/decisions.md, decisão 10.
 *
 * O tema claro continua inteiro — tokens, `@media (prefers-color-scheme)` e os
 * pares de contraste conferidos no `npm run lint`. NÃO foi apagado de
 * propósito: a decisão é declaradamente provisória, e apagar transformaria uma
 * linha de volta num dia de trabalho. Quem quiser devolver a escolha ao
 * usuário põe `null` aqui — o seletor em Configurações e a persistência
 * voltam sozinhos.
 */
export const LOCKED_THEME: Theme | null = 'dark'

/** Estreita uma string arbitrária (localStorage) para um tema suportado. */
export function normalizeTheme(value: string | null | undefined): Theme | null {
  return THEMES.includes(value as Theme) ? (value as Theme) : null
}
