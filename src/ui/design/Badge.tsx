import type { HTMLAttributes } from 'react'

/**
 * Rótulo curto e NÃO clicável. Existe separado do `Chip` de propósito: o Chip é
 * um botão com `aria-pressed`, e usar um botão para exibir estado faz o leitor
 * de tela prometer uma ação que não existe.
 *
 * `tone="onCover"` é o caso do grid: legível sobre arte de qualquer cor, por
 * isso usa a superfície invertida (escura nos dois temas) em vez de derivar de
 * `bg`, que inverteria junto com o tema e sumiria sobre capas claras.
 */
export type BadgeTone = 'neutral' | 'accent' | 'onCover'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink/5 text-muted ring-1 ring-ink/10',
  accent: 'bg-accent text-on-accent',
  onCover: 'bg-inverse/85 text-on-inverse backdrop-blur-sm',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 text-label font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    />
  )
}
