import type { HTMLAttributes } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_TEXT } from './media'

/**
 * Rótulo de seção (maiúsculas, discreto). Renderiza <h2> por padrão para manter
 * a hierarquia de headings navegável por leitor de tela — use `as="p"` só quando
 * o texto não for realmente um cabeçalho de seção.
 *
 * `media` pinta o rótulo com a cor daquela mídia: é o cabeçalho de grupo da
 * busca, onde a cor deixa a pessoa pular direto para o bloco certo sem ler os
 * cinco títulos.
 */
export interface SectionTitleProps extends HTMLAttributes<HTMLElement> {
  as?: 'h2' | 'h3' | 'p'
  media?: MediaType
}

export function SectionTitle({
  as: Tag = 'h2',
  media,
  className = '',
  ...rest
}: SectionTitleProps) {
  return (
    <Tag
      className={`text-label font-semibold uppercase tracking-wide ${
        media ? MEDIA_TEXT[media] : 'text-muted'
      } ${className}`}
      {...rest}
    />
  )
}
