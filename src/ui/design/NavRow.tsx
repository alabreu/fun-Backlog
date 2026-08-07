import { CaretRight } from '@phosphor-icons/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { MediaType } from '@core/items/types'
import { MEDIA_BG } from './media'

/**
 * Linha de navegação: rótulo à esquerda, um dado à direita, chevron no fim.
 * É a "porta" para a estante de cada mídia na home.
 *
 * O `trailing` é uma fração de verdade (`8/20` = concluídos de tudo naquela
 * mídia), e não dois números soltos: barra entre números faz o cérebro ler
 * parte de um todo, então ela precisa realmente fechar.
 *
 * `media` acende uma barra da cor daquela mídia na borda esquerda. Cinco linhas
 * idênticas, distinguidas só pela palavra, obrigam a LER cada uma; a barra
 * deixa achar a estante certa de relance. Ela é `aria-hidden` porque não
 * acrescenta nada a quem ouve — o nome da mídia já é o rótulo do botão.
 *
 * O chevron é `aria-hidden` pelo mesmo motivo: a semântica de "isto navega" já
 * vem de ser um botão com nome; anunciar o ícone junto viraria leitura dupla.
 */
export interface NavRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  trailing?: ReactNode
  icon?: ReactNode
  media?: MediaType
}

export function NavRow({
  label,
  trailing,
  icon,
  media,
  className = '',
  type = 'button',
  ...rest
}: NavRowProps) {
  return (
    <button
      type={type}
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-card bg-surface px-4 py-3.5 text-left ring-1 ring-ink/5 transition active:scale-[0.99] ${className}`}
      {...rest}
    >
      {media && (
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1.5 ${MEDIA_BG[media]}`}
        />
      )}
      {icon}
      <span className="flex-1 text-body font-semibold">{label}</span>
      {trailing !== undefined && (
        <span className="text-label tabular-nums text-muted">{trailing}</span>
      )}
      <CaretRight size={16} weight="bold" aria-hidden className="text-muted" />
    </button>
  )
}
