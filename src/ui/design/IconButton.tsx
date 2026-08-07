import type { ButtonHTMLAttributes } from 'react'

/**
 * Botão redondo só de ícone (voltar, menu). O `aria-label` é OBRIGATÓRIO no
 * tipo: um botão sem texto visível e sem nome acessível é invisível para leitor
 * de tela, e é o erro mais fácil de cometer com este componente.
 */
export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  'aria-label': string
}

export function IconButton({
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-surface text-ink ring-1 ring-ink/10 transition active:scale-90 ${className}`}
      {...rest}
    />
  )
}
