import type { Theme } from '@core/theme'

/**
 * Aplica o tema no `<html>` — o único gancho de DOM disso no app inteiro.
 *
 * `system` REMOVE o atributo em vez de escrever "system": o `src/index.css`
 * escuta `prefers-color-scheme` num seletor guardado por
 * `:root:not([data-theme='light'])`, então é a ausência do atributo que devolve
 * o controle ao aparelho. Escrever `data-theme="system"` deixaria o app preso
 * no claro, porque nenhuma regra casa com esse valor.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = theme
}
