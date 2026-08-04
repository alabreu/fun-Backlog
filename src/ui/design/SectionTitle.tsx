import type { HTMLAttributes } from 'react'

/**
 * Rótulo de seção (maiúsculas, discreto). Renderiza <h2> por padrão para manter
 * a hierarquia de headings navegável por leitor de tela — use `as="p"` só quando
 * o texto não for realmente um cabeçalho de seção.
 */
export interface SectionTitleProps extends HTMLAttributes<HTMLElement> {
  as?: 'h2' | 'h3' | 'p'
}

export function SectionTitle({
  as: Tag = 'h2',
  className = '',
  ...rest
}: SectionTitleProps) {
  return (
    <Tag
      className={`text-label font-semibold uppercase tracking-wide text-muted ${className}`}
      {...rest}
    />
  )
}
