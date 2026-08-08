import { ArrowSquareOut } from '@phosphor-icons/react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

/**
 * Link para FORA do app.
 *
 * Existe como componente porque um link externo tem três coisas que ninguém
 * lembra de repetir: abre em aba nova (a pessoa não perde a estante), leva
 * `rel="noopener noreferrer"` (o site de destino não recebe controle da nossa
 * janela nem de onde o clique veio) e mostra o ícone de "sai daqui" — que é o
 * aviso de que o toque troca de contexto, e o que 3.2.5 do WCAG pede.
 *
 * O sublinhado NÃO é decoração: é a segunda pista de "isto é clicável", ao lado
 * do ícone. Cor sozinha reprovaria em 1.4.1.
 */
export interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> {
  href: string
  children?: ReactNode
  /** Tamanho do ícone. 14 acompanha o texto de corpo; 16 fica melhor solto. */
  iconSize?: number
}

export function ExternalLink({
  href,
  children,
  iconSize = 14,
  className = '',
  ...rest
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-body font-semibold underline decoration-ink/30 underline-offset-2 ${className}`}
      {...rest}
    >
      {children}
      <ArrowSquareOut size={iconSize} aria-hidden />
    </a>
  )
}
