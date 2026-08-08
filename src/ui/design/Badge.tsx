import type { HTMLAttributes } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_BG } from './media'

/**
 * Rótulo curto e NÃO clicável. Existe separado do `Chip` de propósito: o Chip é
 * um botão com `aria-pressed`, e usar um botão para exibir estado faz o leitor
 * de tela prometer uma ação que não existe.
 *
 * `tone="onCover"` é o caso do grid: legível sobre arte de qualquer cor, por
 * isso usa a superfície invertida (escura nos dois temas) em vez de derivar de
 * `bg`, que inverteria junto com o tema e sumiria sobre capas claras.
 *
 * `media` pinta o badge com a cor daquela mídia e ganha do `tone` — é o badge
 * de "Jogos"/"Filmes", que existe para ser reconhecido de relance. O texto
 * dentro dele continua sendo o nome da mídia: a cor acelera, não substitui.
 */
export type BadgeTone = 'neutral' | 'accent' | 'onCover'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink/5 text-muted ring-1 ring-ink/10',
  accent: 'bg-accent text-on-accent',
  onCover: 'bg-inverse/85 text-on-inverse backdrop-blur-sm',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Colore pela mídia. Tem precedência sobre `tone`. */
  media?: MediaType
}

export function Badge({
  tone = 'neutral',
  media,
  className = '',
  ...rest
}: BadgeProps) {
  const look = media ? `${MEDIA_BG[media]} text-on-media` : TONES[tone]
  return (
    <span
      // `gap-1` só tem efeito quando há dois filhos (ícone + texto): num badge
      // de texto puro não muda nada, e evita que cada chamada com ícone
      // precise lembrar de passar o espaçamento.
      className={`inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-label font-semibold ${look} ${className}`}
      {...rest}
    />
  )
}
