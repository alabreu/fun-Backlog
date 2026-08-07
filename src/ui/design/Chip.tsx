import type { ButtonHTMLAttributes } from 'react'

/**
 * Chip de seleção (grupo de opções mutuamente exclusivas, como o tipo do
 * feedback). `aria-pressed` sai daqui já ligado ao estado — é o que faz o leitor
 * de tela anunciar "selecionado" em vez de só ler o rótulo.
 */
export interface ChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> {
  selected: boolean
}

export function Chip({
  selected,
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`rounded-control px-4 py-2 text-body font-semibold transition active:scale-95 ${
        selected
          ? 'bg-primary text-on-primary'
          : 'bg-ink/5 text-ink ring-1 ring-ink/10'
      } ${className}`}
      {...rest}
    />
  )
}
