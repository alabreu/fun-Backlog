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

/** Estreita uma string arbitrária (localStorage) para um tema suportado. */
export function normalizeTheme(value: string | null | undefined): Theme | null {
  return THEMES.includes(value as Theme) ? (value as Theme) : null
}
