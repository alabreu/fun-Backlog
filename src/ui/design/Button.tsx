import type { ButtonHTMLAttributes } from 'react'

/**
 * Botão do design system. Três variantes e dois tamanhos cobrem tudo o que as
 * telas prontas usam — se você precisar de uma quarta, ela entra AQUI, não numa
 * classe solta na tela.
 *
 * `buttonClasses` é exportado à parte porque nem todo botão é um <button>: o
 * link de doação é um <a> e precisa parecer igual. Receita de classe + componente
 * é o par que evita a cópia divergir.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'quiet'
  | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md'

/**
 * `danger` é uma SECUNDÁRIA vermelha, e não uma primária vermelha: uma ação
 * destrutiva não pode ter o peso visual de um call to action. Ela precisa ser
 * legível como "cuidado", e não convidativa como "faça isto".
 *
 * O anel também é `danger` (e não `ink/10`): sem ele, no tema escuro, sobrava
 * só o texto vermelho e o botão perdia a borda que o separa do painel.
 */
/**
 * `quiet` é a `ghost` REBAIXADA: mesma ausência de fundo, mas em `muted` em vez
 * da cor primária. Existe para a ação que precisa estar ao alcance sem disputar
 * a atenção com o rótulo ao lado dela — "Limpar" ao lado de "NOTA" era o caso:
 * em `ghost`, as duas linhas tinham o mesmo peso e o botão lia como um segundo
 * título.
 *
 * É TOKEN e não opacidade. Baixar o alfa do texto parece a mesma coisa e não é:
 * a opacidade sai do controle do tema e derruba o contraste abaixo do AA em
 * cima de qualquer fundo, enquanto `muted` é uma cor auditada pelo
 * `check-contrast` nos dois temas.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary font-semibold',
  secondary: 'bg-surface text-ink font-semibold ring-1 ring-ink/10',
  ghost: 'text-primary font-medium',
  quiet: 'text-muted font-medium',
  danger: 'bg-surface text-danger font-semibold ring-1 ring-danger/40',
}

/**
 * `xs` é a ação que acompanha um RÓTULO, não uma decisão da tela — "Limpar" ao
 * lado de "NOTA". Ela usa `text-label` para ficar do tamanho do rótulo com que
 * divide a linha: em `sm` (text-body) o botão era maior que o título ao lado
 * dele, e o que deveria ser saída discreta lia como o assunto da seção.
 *
 * O ALVO NÃO ENCOLHE JUNTO: `min-h-11` mantém os 44px da WCAG 2.5.5 mesmo com
 * o texto pequeno. Como a variante que a usa não tem fundo, o alvo extra é
 * invisível — parece miúdo, acerta grande, que é exatamente o que se quer.
 */
const SIZES: Record<ButtonSize, string> = {
  xs: 'px-3 min-h-11 text-label',
  sm: 'px-5 py-2.5 text-body',
  md: 'px-6 py-3.5 text-body',
}

export interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: ButtonStyleOptions = {}): string {
  return [
    'inline-flex items-center justify-center gap-2 rounded-control transition',
    'active:scale-95 disabled:opacity-40 disabled:active:scale-100',
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    />
  )
}
