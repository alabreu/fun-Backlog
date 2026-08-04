import type { HTMLAttributes } from 'react'

/**
 * Bloco de conteúdo sobre `surface`. `padding="none"` serve para listas que
 * desenham as próprias divisórias (ver LanguageScreen).
 */
export type CardPadding = 'none' | 'sm' | 'md'

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  /** Borda mais marcada, para cards que são a única coisa na tela. */
  bordered?: boolean
  as?: 'div' | 'article'
}

export function Card({
  padding = 'sm',
  bordered = false,
  as: Tag = 'div',
  className = '',
  ...rest
}: CardProps) {
  return (
    <Tag
      className={`rounded-card bg-surface ring-1 ${
        bordered ? 'ring-ink/10' : 'ring-ink/5'
      } ${PADDING[padding]} ${className}`}
      {...rest}
    />
  )
}
