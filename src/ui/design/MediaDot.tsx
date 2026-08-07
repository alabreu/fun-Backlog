import type { MediaType } from '@core/items/types'
import { MEDIA_BG } from './media'

/**
 * Ponto da cor da mídia, para listas MISTAS onde o item não está agrupado por
 * tipo — hoje, "na sua estante" na tela de busca. Sem ele, um filme e um livro
 * de mesmo nome ("Duna" e "Duna") ficam idênticos na tela, e a pessoa precisa
 * abrir para descobrir qual é qual.
 *
 * Fica na LEGENDA, ao lado do título, e nunca sobre a capa: a arte já é o
 * código visual do grid, e cor de marca por cima dela polui.
 *
 * `aria-hidden` porque é redundante por construção — quem usa leitor de tela
 * ouve a mídia pelo rótulo que acompanha, não por um ponto colorido. Onde não
 * houver rótulo, passe `label`, e aí ele é anunciado.
 */
export function MediaDot({
  media,
  label,
  className = '',
}: {
  media: MediaType
  /** Nome da mídia, quando o ponto for o ÚNICO sinal (WCAG 1.4.1). */
  label?: string
  className?: string
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      className={`inline-block h-2 w-2 shrink-0 rounded-control ${MEDIA_BG[media]} ${className}`}
    >
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
