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
  /**
   * `danger` é o chip que NÃO é uma opção como as outras.
   *
   * Existe para "Remover" convivendo na fileira de status: a pessoa pensa
   * nele como mais um estado ("fora da estante"), e a fileira é o lugar certo
   * para ele. Mas os outros chips são um toque, reversível e sem consequência;
   * este apaga a nota, as notas, o progresso e as datas, e não tem volta.
   *
   * O vermelho é o que impede o dedo de tratar os dois como iguais — e é ele
   * que segura o vizinho perigoso, já que "Abandonado" fica a poucos pixels.
   * Vermelho DE CONTORNO e não de preenchimento: preenchido, ele pareceria
   * selecionado, e "remover" nunca é um estado em que a obra está.
   */
  tone?: 'default' | 'danger'
}

export function Chip({
  selected,
  media,
  tone = 'default',
  className = '',
  type = 'button',
  ...rest
}: ChipProps) {
  const selectedLook = media
    ? `${MEDIA_BG[media]} text-on-media`
    : 'bg-primary text-on-primary'
  const idleLook =
    tone === 'danger'
      ? 'bg-ink/5 text-danger ring-1 ring-danger/40'
      : 'bg-ink/5 text-ink ring-1 ring-ink/10'

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-control px-4 py-2 text-body font-semibold transition active:scale-95 ${
        selected ? selectedLook : idleLook
      } ${className}`}
      {...rest}
    />
  )
}
