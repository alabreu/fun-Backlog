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

/**
 * Como o grão é pintado. Interruptor de build, para dar para sentir os dois no
 * aparelho e voltar numa linha:
 *
 * - `background`: o grão é `background-image` no body e nas superfícies
 *   opacas. Fundo pinta ABAIXO do conteúdo, então **nunca** encosta numa capa
 *   nem no texto.
 * - `overlay`: a receita literal do tutor-brew — uma camada `fixed` por cima
 *   de tudo, com `mix-blend-mode: screen`. Mais presente e mais coesa (a
 *   textura atravessa a tela inteira em vez de recomeçar em cada superfície),
 *   ao custo de cair TAMBÉM sobre as capas e o texto.
 *
 * ATENÇÃO: os dois modos deixam o fundo com uma luminância diferente, e o
 * `theme-color` do index.html precisa acompanhar — senão as barras do Safari
 * voltam a aparecer como faixas. Ver docs/decisions.md, decisão 11.
 */
export type GrainMode = 'background' | 'overlay'

export const GRAIN_MODE: GrainMode = 'overlay'

/** Marca o modo no <html>; o CSS desliga o grão de fundo quando é overlay. */
export function applyGrainMode(mode: GrainMode): void {
  document.documentElement.dataset.grain = mode
}
