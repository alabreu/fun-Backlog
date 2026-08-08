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
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

/**
 * `danger` é uma SECUNDÁRIA vermelha, e não uma primária vermelha: uma ação
 * destrutiva não pode ter o peso visual de um call to action. Ela precisa ser
 * legível como "cuidado", e não convidativa como "faça isto".
 *
 * O anel também é `danger` (e não `ink/10`): sem ele, no tema escuro, sobrava
 * só o texto vermelho e o botão perdia a borda que o separa do painel.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary font-semibold',
  secondary: 'bg-surface text-ink font-semibold ring-1 ring-ink/10',
  ghost: 'text-primary font-medium',
  danger: 'bg-surface text-danger font-semibold ring-1 ring-danger/40',
}

const SIZES: Record<ButtonSize, string> = {
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
