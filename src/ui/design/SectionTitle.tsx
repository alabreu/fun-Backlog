import type { HTMLAttributes, ReactNode } from 'react'
import type { MediaType } from '@core/items/types'
import { MediaDot } from './MediaDot'
import { MEDIA_TEXT } from './media'

/**
 * Rótulo de seção (maiúsculas, discreto). Renderiza <h2> por padrão para manter
 * a hierarquia de headings navegável por leitor de tela — use `as="p"` só quando
 * o texto não for realmente um cabeçalho de seção.
 *
 * `media` acende um ponto da cor da mídia antes do rótulo E pinta o texto na
 * mesma cor. Os dois juntos, e não só um: o ponto é o que se vê de relance
 * rolando a página, e o texto colorido é o que amarra o bloco inteiro àquela
 * mídia. É o cabeçalho de grupo da busca, onde a pessoa pula direto para o
 * bloco certo sem ler os cinco títulos.
 */
export interface SectionTitleProps extends HTMLAttributes<HTMLElement> {
  as?: 'h2' | 'h3' | 'p'
  media?: MediaType
  children?: ReactNode
}

export function SectionTitle({
  as: Tag = 'h2',
  media,
  children,
  className = '',
  ...rest
}: SectionTitleProps) {
  return (
    <Tag
      className={`text-label font-semibold uppercase tracking-wide ${
        media ? `flex items-center gap-1.5 ${MEDIA_TEXT[media]}` : 'text-muted'
      } ${className}`}
      {...rest}
    >
      {media && <MediaDot media={media} />}
      {children}
    </Tag>
  )
}
