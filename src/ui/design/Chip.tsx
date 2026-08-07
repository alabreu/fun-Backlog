import type { ButtonHTMLAttributes } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_BG } from './media'

/**
 * Chip de seleção (grupo de opções mutuamente exclusivas, como o tipo do
 * feedback). `aria-pressed` sai daqui já ligado ao estado — é o que faz o leitor
 * de tela anunciar "selecionado" em vez de só ler o rótulo.
 *
 * `media` troca o preenchimento do estado SELECIONADO pela cor daquela mídia.
 * Só no selecionado de propósito: cinco chips coloridos ao mesmo tempo viram
 * uma barra de cores onde nada se destaca, e aí a cor deixa de informar qual
 * está ativo — que é justamente o que o chip precisa dizer.
 */
export interface ChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> {
  selected: boolean
  media?: MediaType
}

export function Chip({
  selected,
  media,
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  const selectedLook = media
    ? `${MEDIA_BG[media]} text-on-media`
    : 'bg-primary text-on-primary'

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`rounded-control px-4 py-2 text-body font-semibold transition active:scale-95 ${
        selected ? selectedLook : 'bg-ink/5 text-ink ring-1 ring-ink/10'
      } ${className}`}
      {...rest}
    />
  )
}
